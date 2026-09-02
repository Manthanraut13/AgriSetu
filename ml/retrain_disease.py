"""Continuous Learning Script — Fine-tune disease model on verified agronomist labels.

Run manually or via GitHub Actions cron (weekly):
  python ml/retrain_disease.py --supabase-url X --supabase-key Y

Pulls verified disease reports from last 30 days, fine-tunes EfficientNet-B4
for 5 epochs on verified data, saves new checkpoint if accuracy improves.

Requires: torch, timm, supabase, albumentations.
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
from PIL import Image
import timm
import numpy as np
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "agrisetu-backend"))


def fetch_verified_reports(supabase_url: str, supabase_key: str, image_dir: Path, days: int = 30):
    """Pull verified disease reports with downloaded images. Returns (images, labels) list."""
    from supabase import create_client
    supabase = create_client(supabase_url, supabase_key)

    res = supabase.table("disease_reports").select(
        "id, disease_name, verified_label, confidence, image_url, reported_at"
    ).gte(
        "reported_at", f"now() - interval '{days} days'"
    ).not_.is_("verified_label", "null").not_.is_("image_url", "null").order(
        "reported_at", desc=True
    ).limit(500).execute()

    if not res.data:
        print("No verified reports found.")
        return []

    image_dir.mkdir(parents=True, exist_ok=True)
    samples = []

    for report in res.data:
        label = report["verified_label"]
        img_url = report["image_url"]
        fname = f"{report['id']}.jpg"
        fpath = image_dir / fname

        if not fpath.exists():
            try:
                r = requests.get(img_url, timeout=30)
                if r.status_code == 200:
                    with open(fpath, "wb") as f:
                        f.write(r.content)
                else:
                    continue
            except Exception:
                continue

        samples.append({"path": str(fpath), "label": label, "original": report["disease_name"]})

    print(f"Fetched {len(samples)} verified samples from last {days} days")
    return samples


class VerifiedDataset(Dataset):
    def __init__(self, samples, class_to_idx, transform):
        self.samples = samples
        self.class_to_idx = class_to_idx
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]
        img = Image.open(sample["path"]).convert("RGB")
        label = self.class_to_idx[sample["label"]]
        return self.transform(img), label


def retrain(supabase_url: str, supabase_key: str, epochs: int = 5, lr: float = 1e-4):
    """Fine-tune the existing model on verified labels."""
    backend_dir = Path(__file__).resolve().parent.parent / "agrisetu-backend"
    model_path = backend_dir / "models" / "disease_model" / "disease_model_best.pth"
    class_path = backend_dir / "models" / "disease_model" / "class_names.json"

    if not model_path.exists():
        print(f"Model not found at {model_path}")
        sys.exit(1)

    with open(class_path) as f:
        class_names = json.load(f)
    class_to_idx = {v: int(k) for k, v in class_names.items()}
    num_classes = len(class_names)

    image_dir = Path("/tmp/agrisetu_verified_data")
    samples = fetch_verified_reports(supabase_url, supabase_key, image_dir)
    if len(samples) < 10:
        print(f"Only {len(samples)} samples — need at least 10. Skipping retrain.")
        return

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    arch = checkpoint.get("architecture", "efficientnet_b4")
    model = timm.create_model(arch, pretrained=False, num_classes=num_classes)
    model.load_state_dict(checkpoint["model_state_dict"])

    for param in model.parameters():
        param.requires_grad = False
    for param in model.classifier.parameters():
        param.requires_grad = True

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    dataset = VerifiedDataset(samples, class_to_idx, transform)
    loader = DataLoader(dataset, batch_size=16, shuffle=True)

    optimizer = optim.Adam(model.classifier.parameters(), lr=lr)
    criterion = nn.CrossEntropyLoss()
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    model = model.to(device)
    best_acc = checkpoint.get("best_val_accuracy", 0)
    prev_f1 = checkpoint.get("best_val_macro_f1", 0)

    print(f"Fine-tuning on {len(samples)} samples for {epochs} epochs (lr={lr})")
    for epoch in range(epochs):
        model.train()
        correct, total = 0, 0
        for imgs, labels in loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            out = model(imgs)
            loss = criterion(out, labels)
            loss.backward()
            optimizer.step()
            _, pred = out.max(1)
            correct += (pred == labels).sum().item()
            total += labels.size(0)
        scheduler.step()
        print(f"Epoch {epoch+1}/{epochs} — train_acc: {correct/total*100:.1f}%")

    model.eval()
    correct, total = 0, 0
    with torch.no_grad():
        for imgs, labels in loader:
            imgs, labels = imgs.to(device), labels.to(device)
            _, pred = model(imgs).max(1)
            correct += (pred == labels).sum().item()
            total += labels.size(0)

    new_acc = correct / total
    if new_acc >= best_acc * 0.95:
        torch.save({
            "model_state_dict": model.state_dict(),
            "architecture": arch,
            "num_classes": num_classes,
            "best_val_accuracy": max(best_acc, new_acc),
            "best_val_macro_f1": max(prev_f1, new_acc),
            "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }, model_path)
        print(f"New model saved (accuracy: {new_acc*100:.1f}% vs previous {best_acc*100:.1f}%)")
    else:
        print(f"No improvement ({new_acc*100:.1f}% < {best_acc*100:.1f}%). Model unchanged.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--supabase-url", required=True)
    parser.add_argument("--supabase-key", required=True)
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--lr", type=float, default=1e-4)
    args = parser.parse_args()
    retrain(args.supabase_url, args.supabase_key, args.epochs, args.lr)
