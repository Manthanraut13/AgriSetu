# Phase 2 Guide — Disease Model Expansion (Free Tier Only)

All steps in this guide use **zero paid services**. Every tool and platform
mentioned has a free tier sufficient for the prototype-to-production transition.

---

## Overview

Phase 2 expands the disease diagnostic from ~14 plant species / 38 classes to
50+ classes covering BRICS crops, adds a disease alert system, and builds a
continuous learning pipeline — all on free tiers.

**What you will build:**
1. Expanded disease dataset (50+ classes) from free public sources
2. Trained EfficientNet-B4 model on Google Colab (free T4 GPU)
3. Model hosted in Supabase Storage (free 500MB)
4. Disease alert engine (runs on existing Render free instance)
5. Continuous learning review pipeline (Supabase + simple UI)

---

## Part 1 — Free Tier Accounts to Create

| Service | Tier | What You Get | Action |
|---|---|---|---|
| Google Colab | Free | T4 GPU, ~12h/session, 15GB RAM | Sign in with Google at colab.research.google.com |
| Kaggle | Free | Datasets, 30 GPU hrs/week | Sign up → Enable GPU in notebook settings |
| Roboflow | Free | 1,000 training images free, annotation tools | Sign up at roboflow.com (for dataset prep) |
| Hugging Face | Free | Model hosting (10GB), dataset hosting | Sign up at huggingface.co (for model weights) |

**You already have (from Phase 1):**
- Supabase free (500MB storage — enough for model weights + disease reports)
- Render free (backend hosting)
- Vercel free (frontend)

No additional accounts needed.

---

## Part 2 — Build the Expanded Dataset (50+ Classes)

### Step 2.1: Download Free Public Datasets

These datasets are free and cover BRICS-relevant crops:

**Primary sources:**

| Dataset | Classes | Size | Source |
|---|---|---|---|
| PlantVillage (augmented) | 38 classes (14 species) | ~1.5 GB | Kaggle: `emmarex/plantvillage` |
| PlantDoc | 27 classes (13 species) | ~250 MB | GitHub: `pratikkayal/PlantDoc-Dataset` |
| Rice Disease Dataset | 5 classes | ~100 MB | Kaggle: `minhhuy271199/rice-disease-dataset` |
| Wheat Disease Dataset | 4 classes | ~50 MB | Kaggle search: `wheat disease leaf` |
| Cassava Disease | 5 classes | ~200 MB | Kaggle: `check12/cassava-disease` |

**Download commands (run in Colab or local):**

```python
# In Google Colab
!pip install kaggle
!mkdir -p /content/datasets

# PlantVillage (main dataset)
!kaggle datasets download -d emmarex/plantvillage -p /content/datasets --unzip

# Rice diseases
!kaggle datasets download -d minhhuy271199/rice-disease-dataset -p /content/datasets/rice --unzip

# Cassava
!kaggle datasets download -d check12/cassava-disease -p /content/datasets/cassava --unzip
```

### Step 2.2: Merge and Restructure into 50+ Classes

Use this Colab script to merge datasets into a unified folder structure:

```python
import os
import shutil
from pathlib import Path

# Target classes (50+ covering BRICS crops)
TARGET_CLASSES = {
    # From PlantVillage (keep all 38)
    # Already structured correctly in plantvillage/

    # Add from Rice dataset
    "Rice_Bacterial_Blight": "rice_bacterial_blight",
    "Rice_Blast": "rice_blast",
    "Rice_Brown_Spot": "rice_brown_spot",
    "Rice_Tungro": "rice_tungro",
    "Rice_Healthy": "rice_healthy",

    # Add from Wheat dataset
    "Wheat_Rust": "wheat_rust",
    "Wheat_Yellow_Rust": "wheat_yellow_rust",
    "Wheat_Spot_Blight": "wheat_spot_blight",
    "Wheat_Healthy": "wheat_healthy",

    # Add from Cassava dataset
    "Cassava_Bacterial_Blight": "cassava_bacterial_blight",
    "Cassava_Brown_Streak": "cassava_brown_streak",
    "Cassava_Green_Mottle": "cassava_green_mottle",
    "Cassava_Mosaic": "cassava_mosaic",
    "Cassava_Healthy": "cassava_healthy",

    # Add from PlantDoc (new species not in PlantVillage)
    "Blueberry_Healthy": "blueberry_healthy",
    "Blueberry_Rust": "blueberry_rust",
    "Cherry_Healthy": "cherry_healthy",
    "Cherry_Powdery_Mildew": "cherry_powdery_mildew",
    "Corn_Common_Rust": "corn_common_rust",
    "Corn_Gray_Leaf_Spot": "corn_gray_leaf_spot",
    "Corn_Healthy": "corn_healthy",
    "Corn_Northern_Leaf_Blight": "corn_northern_leaf_blight",
    "Grape_Black_Rot": "grape_black_rot",
    "Grape_Healthy": "grape_healthy",
    "Grape_Leaf_Black": "grape_leaf_black",
    "Orange_Canker": "orange_canker",
    "Orange_Healthy": "orange_healthy",
    "Peach_Bacterial_Spot": "peach_bacterial_spot",
    "Peach_Healthy": "peach_healthy",
    "Pepper_Bacterial_Spot": "pepper_bacterial_spot",
    "Pepper_Healthy": "pepper_healthy",
    "Potato_Early_Blight": "potato_early_blight",
    "Potato_Healthy": "potato_healthy",
    "Potato_Late_Blight": "potato_late_blight",
    "Raspberry_Healthy": "raspberry_healthy",
    "Raspberry_Yellow_Rust": "raspberry_yellow_rust",
    "Soybean_Healthy": "soybean_healthy",
    "Soybean_Rust": "soybean_rust",
    "Squash_Powdery_Mildew": "squash_powdery_mildew",
    "Squash_Healthy": "squash_healthy",
    "Strawberry_Healthy": "strawberry_healthy",
    "Strawberry_Leaf_Scorch": "strawberry_leaf_scorch",
    "Tomato_Bacterial_Spot": "tomato_bacterial_spot",
    "Tomato_Early_Blight": "tomato_early_blight",
    "Tomato_Healthy": "tomato_healthy",
    "Tomato_Late_Blight": "tomato_late_blight",
    "Tomato_Leaf_Mold": "tomato_leaf_mold",
    "Tomato_Septoria_Leaf_Spot": "tomato_septoria_leaf_spot",
    "Tomato_Spider_Mites": "tomato_spider_mites",
    "Tomato_Target_Spot": "tomato_target_spot",
    "Tomato_Yellow_Leaf_Curl": "tomato_yellow_leaf_curl",
    "Tomato_Mosaic_Virus": "tomato_mosaic_virus",
}

# Create target directory
target_dir = Path("/content/datasets/merged_50plus")
target_dir.mkdir(parents=True, exist_ok=True)

print(f"Target: {len(TARGET_CLASSES)} classes")
print("Manual step: copy images from each source dataset into target folders")
print("Each target folder should have 100-500 images for balanced training")
```

### Step 2.3: Balance and Augment the Dataset

```python
import albumentations as A
from albumentations.pytorch import ToTensorV2
import cv2
import numpy as np
from pathlib import Path

# Augmentation pipeline for training
train_aug = A.Compose([
    A.RandomResizedCrop(224, 224, scale=(0.8, 1.0)),
    A.HorizontalFlip(p=0.5),
    A.RandomBrightnessContrast(p=0.3),
    A.Rotate(limit=15, p=0.3),
    A.GaussNoise(var_limit=(10, 50), p=0.2),
    A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ToTensorV2(),
])

def augment_class(class_dir, target_count=300):
    """Augment images in a class directory to reach target_count."""
    images = list(class_dir.glob("*.jpg")) + list(class_dir.glob("*.png"))
    current = len(images)

    if current >= target_count:
        print(f"  {class_dir.name}: {current} images (OK)")
        return

    needed = target_count - current
    augmented_dir = class_dir / "augmented"
    augmented_dir.mkdir(exist_ok=True)

    for i in range(needed):
        src = images[i % current]
        img = cv2.imread(str(src))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        augmented = train_aug(image=img)["image"]
        augmented = (augmented.permute(1, 2, 0).numpy() * 255).astype(np.uint8)
        cv2.imwrite(str(augmented_dir / f"aug_{i:04d}.jpg"), cv2.cvtColor(augmented, cv2.COLOR_RGB2BGR))

    print(f"  {class_dir.name}: {current} -> {target_count} (+{needed} augmented)")

# Run augmentation
for class_dir in sorted(target_dir.iterdir()):
    if class_dir.is_dir():
        augment_class(class_dir, target_count=300)
```

---

## Part 3 — Train on Google Colab (Free T4 GPU)

### Step 3.1: Open Colab and Enable GPU

1. Go to colab.research.google.com
2. New notebook → Runtime → Change runtime type → **T4 GPU**
3. Run this cell to verify:

```python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None'}")
```

### Step 3.2: Upload Dataset to Colab

```python
# Option A: Mount Google Drive (if dataset is there)
from google.colab import drive
drive.mount('/content/drive')
!cp -r /content/drive/MyDrive/agrisetu/datasets/merged_50plus /content/datasets/

# Option B: Download from Kaggle directly
!pip install kaggle -q
# Upload your kaggle.json first via files panel
!mkdir -p ~/.kaggle && cp kaggle.json ~/.kaggle/ && chmod 600 ~/.kaggle/kaggle.json
!kaggle datasets download -d your-username/merged-50plus -p /content/datasets --unzip
```

### Step 3.3: Train EfficientNet-B4

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models
from pathlib import Path
import json
import time

# ── Config ──────────────────────────────────────────────────
DATA_DIR = Path("/content/datasets/merged_50plus")
BATCH_SIZE = 32
NUM_EPOCHS = 15
LEARNING_RATE = 1e-3
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
SAVE_DIR = Path("/content/drive/MyDrive/agrisetu/models")  # or /content/models

# ── Data ────────────────────────────────────────────────────
train_transform = transforms.Compose([
    transforms.RandomResizedCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

val_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

full_dataset = datasets.ImageFolder(DATA_DIR, transform=train_transform)
class_names = full_dataset.classes
num_classes = len(class_names)

# 80/20 split
train_size = int(0.8 * len(full_dataset))
val_size = len(full_dataset) - train_size
train_dataset, val_dataset = torch.utils.data.random_split(
    full_dataset, [train_size, val_size]
)
val_dataset.dataset.transform = val_transform

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=2)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

print(f"Classes: {num_classes}")
print(f"Train: {train_size}, Val: {val_size}")

# ── Model ───────────────────────────────────────────────────
model = models.efficientnet_b4(weights=models.EfficientNet_B4_Weights.IMAGENET1K_V1)

# Replace classifier head
for param in model.features.parameters():
    param.requires_grad = False  # freeze backbone initially

model.classifier = nn.Sequential(
    nn.Dropout(p=0.3),
    nn.Linear(model.classifier[1].in_features, 512),
    nn.ReLU(),
    nn.Dropout(p=0.2),
    nn.Linear(512, num_classes),
)

model = model.to(DEVICE)

# ── Training ────────────────────────────────────────────────
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.classifier.parameters(), lr=LEARNING_RATE)
scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=3, factor=0.5)

best_val_acc = 0.0
history = []

for epoch in range(NUM_EPOCHS):
    # Train
    model.train()
    train_loss, train_correct, train_total = 0.0, 0, 0

    for images, labels in train_loader:
        images, labels = images.to(DEVICE), labels.to(DEVICE)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        train_loss += loss.item()
        _, predicted = outputs.max(1)
        train_total += labels.size(0)
        train_correct += predicted.eq(labels).sum().item()

    # Validate
    model.eval()
    val_loss, val_correct, val_total = 0.0, 0, 0

    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            outputs = model(images)
            loss = criterion(outputs, labels)
            val_loss += loss.item()
            _, predicted = outputs.max(1)
            val_total += labels.size(0)
            val_correct += predicted.eq(labels).sum().item()

    train_acc = 100.0 * train_correct / train_total
    val_acc = 100.0 * val_correct / val_total
    scheduler.step(val_loss)

    history.append({
        "epoch": epoch + 1,
        "train_acc": round(train_acc, 2),
        "val_acc": round(val_acc, 2),
        "train_loss": round(train_loss / len(train_loader), 4),
        "val_loss": round(val_loss / len(val_loader), 4),
    })

    print(f"Epoch {epoch+1}/{NUM_EPOCHS} | "
          f"Train: {train_acc:.1f}% | Val: {val_acc:.1f}%")

    # Save best model
    if val_acc > best_val_acc:
        best_val_acc = val_acc
        SAVE_DIR.mkdir(parents=True, exist_ok=True)
        torch.save({
            "model_state_dict": model.state_dict(),
            "class_names": class_names,
            "num_classes": num_classes,
            "val_acc": val_acc,
            "epoch": epoch + 1,
            "architecture": "efficientnet_b4",
        }, SAVE_DIR / "disease_model_best.pth")
        print(f"  -> Saved (val_acc: {val_acc:.1f}%)")

# ── Save class names JSON ──────────────────────────────────
class_names_dict = {str(i): name for i, name in enumerate(class_names)}
with open(SAVE_DIR / "class_names.json", "w") as f:
    json.dump(class_names_dict, f, indent=2)

print(f"\nTraining complete. Best val accuracy: {best_val_acc:.1f}%")
print(f"Model saved to: {SAVE_DIR / 'disease_model_best.pth'}")
print(f"Class names saved to: {SAVE_DIR / 'class_names.json'}")
```

### Step 3.4: Export to ONNX (Optional — for smaller deployment)

```python
# Export to ONNX for faster CPU inference (optional)
dummy_input = torch.randn(1, 3, 224, 224).to(DEVICE)
torch.onnx.export(
    model, dummy_input, SAVE_DIR / "disease_model.onnx",
    input_names=["input"], output_names=["output"],
    dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
)
print("ONNX model exported")
```

---

## Part 4 — Upload Model to Supabase Storage (Free 500MB)

### Step 4.1: Create Storage Bucket

In Supabase Dashboard → Storage → New Bucket:
- Name: `disease-models`
- Public: **No** (private)

### Step 4.2: Upload Weights

```python
from supabase import create_client

SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_KEY = "your-service-role-key"  # from .env
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Upload model weights
with open("/content/models/disease_model_best.pth", "rb") as f:
    supabase.storage.from_("disease-models").upload(
        "v2/disease_model_best.pth",
        f,
        {"content-type": "application/octet-stream"},
    )

# Upload class names
with open("/content/models/class_names.json", "rb") as f:
    supabase.storage.from_("disease-models").upload(
        "v2/class_names.json",
        f,
        {"content-type": "application/json"},
    )

print("Model uploaded to Supabase Storage")

# Get signed URL for download (backend uses this at startup)
url = supabase.storage.from_("disease-models").get_public_url("v2/disease_model_best.pth")
print(f"Public URL: {url}")
```

### Step 4.3: Update Backend to Download Weights

Add to `services/disease_model.py` in `load_cnn_model()`:

```python
import os
import tempfile

def _download_model_weights():
    """Download model weights from Supabase Storage if not local."""
    local_path = "models/disease_model/disease_model_best.pth"
    if os.path.exists(local_path):
        return local_path

    try:
        from config import settings
        from supabase import create_client
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

        # Download weights
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        res = supabase.storage.from_("disease-models").download("v2/disease_model_best.pth")
        with open(local_path, "wb") as f:
            f.write(res)

        # Download class names
        classes_path = "models/disease_model/class_names.json"
        res = supabase.storage.from_("disease-models").download("v2/class_names.json")
        with open(classes_path, "w") as f:
            f.write(res.decode())

        logger.info("Downloaded model weights from Supabase Storage")
        return local_path
    except Exception as e:
        logger.warning(f"Could not download model weights: {e}")
        return None
```

---

## Part 5 — Model Version Management (Supabase Free)

### Step 5.1: Create the model_versions Table

Run in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL,
  version TEXT NOT NULL,
  accuracy FLOAT,
  f1_score FLOAT,
  classes JSONB,
  weights_url TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_versions_type ON model_versions(model_type);
```

### Step 5.2: Register a New Model Version

```python
supabase.table("model_versions").insert({
    "model_type": "disease_cnn",
    "version": "2.0.0",
    "accuracy": 0.89,
    "f1_score": 0.87,
    "classes": json.load(open("class_names.json")),
    "weights_url": "disease-models/v2/disease_model_best.pth",
    "is_active": True,
    "notes": "Expanded to 50+ classes. EfficientNet-B4. Trained on PlantVillage + PlantDoc + Rice + Wheat + Cassava.",
}).execute()
```

---

## Part 6 — Disease Alert Engine (Runs on Render Free)

### Step 6.1: Create the disease_alerts Table

```sql
CREATE TABLE IF NOT EXISTS disease_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_name TEXT NOT NULL,
  country TEXT DEFAULT 'IN',
  district TEXT,
  disease_name TEXT NOT NULL,
  crop TEXT NOT NULL,
  severity TEXT NOT NULL,
  report_count INT DEFAULT 1,
  first_reported_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);
```

### Step 6.2: Add Alert Check to Scheduler

The alert engine runs as part of the existing 6-hour scheduler. Add to
`services/scheduler.py`:

```python
async def check_disease_alerts():
    """Check for disease outbreak conditions (3+ reports in same district, 7 days)."""
    from config import settings
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    try:
        # Query: district + disease combos with 3+ reports in last 7 days
        result = supabase.rpc("check_disease_outbreaks").execute()

        if result.data:
            for alert in result.data:
                # Check if active alert already exists
                existing = supabase.table("disease_alerts").select("*").eq(
                    "district", alert["district"]
                ).eq("disease_name", alert["disease_name"]).eq("is_active", True).execute()

                if existing.data:
                    # Update count
                    supabase.table("disease_alerts").update({
                        "report_count": alert["report_count"],
                        "last_updated_at": "now()",
                    }).eq("id", existing.data[0]["id"]).execute()
                else:
                    # Create new alert
                    supabase.table("disease_alerts").insert({
                        "region_name": alert["district"],
                        "district": alert["district"],
                        "disease_name": alert["disease_name"],
                        "crop": alert.get("crop", "unknown"),
                        "severity": "high" if alert["report_count"] >= 5 else "medium",
                        "report_count": alert["report_count"],
                    }).execute()

            logger.info(f"Disease alerts: {len(result.data)} conditions checked")
    except Exception as e:
        logger.error(f"Alert check failed: {e}")
```

### Step 6.3: Create the RPC Function

```sql
CREATE OR REPLACE FUNCTION check_disease_outbreaks()
RETURNS TABLE (
  district TEXT,
  disease_name TEXT,
  crop TEXT,
  report_count BIGINT
)
LANGUAGE sql
AS $$
  SELECT
    fp.district,
    dr.disease_name,
    fp.current_crop AS crop,
    COUNT(*) AS report_count
  FROM disease_reports dr
  JOIN farm_plots fp ON fp.id = dr.plot_id
  WHERE dr.reported_at > NOW() - INTERVAL '7 days'
    AND fp.district IS NOT NULL
  GROUP BY fp.district, dr.disease_name, fp.current_crop
  HAVING COUNT(*) >= 3
  ORDER BY report_count DESC;
$$;
```

---

## Part 7 — Continuous Learning Pipeline (Free)

### Step 7.1: Add verified_label Column

```sql
ALTER TABLE disease_reports ADD COLUMN IF NOT EXISTS verified_label TEXT;
ALTER TABLE disease_reports ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE disease_reports ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
```

### Step 7.2: Review UI (Add to Agronomist Dashboard)

Add a new section in `AgronomistDashboard.jsx` that shows uncertain predictions
(confidence < 70%) for agronomist review. Each entry shows:
- Uploaded image
- CNN prediction + confidence
- Two buttons: "Correct" (opens label picker) / "Confirm" (accepts prediction)

### Step 7.3: Weekly Retraining Script

Create `ml/retrain_disease.py` (runs as a cron job or manually):

```python
"""
Weekly retraining: pull verified labels, fine-tune model, evaluate.
Run manually or via GitHub Actions cron.
"""
import torch
import json
from supabase import create_client
from config import settings

def pull_verified_data():
    """Fetch verified disease reports from the last 30 days."""
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    result = supabase.table("disease_reports").select(
        "disease_name, verified_label, image_url"
    ).gte(
        "reported_at", "now() - interval '30 days'"
    ).not_.is_("verified_label", "null").execute()

    return result.data

# Fine-tune logic: load current model, replace classifier, train 5 epochs
# on verified data, evaluate on holdout, save if accuracy improves
# (Full training code similar to Step 3.3 but with 5 epochs and smaller LR)
```

---

## Part 8 — Deploy Everything

### Step 8.1: Push Code

```bash
git add .
git commit -m "feat(phase2): 50+ disease classes, alert engine, continuous learning"
git push origin main
```

Render will auto-rebuild. No new environment variables needed — the model
weights download from Supabase Storage automatically.

### Step 8.2: Verify

1. Check Render logs for: `Model weights downloaded from Supabase Storage`
2. Upload a disease photo → verify 50+ class results
3. Submit 3 disease reports for the same district → check `disease_alerts` table

---

## Cost Summary (Phase 2 — All Free)

| Service | Tier | Monthly Cost |
|---|---|---|
| Google Colab | Free (T4 GPU) | $0 |
| Kaggle | Free (30 GPU hrs/week) | $0 |
| Supabase | Free (500MB storage, 50k MAU) | $0 |
| Render | Free (512MB RAM) | $0 |
| Vercel | Free (unlimited static) | $0 |
| Hugging Face | Free (10GB model hosting) | $0 |
| **Total** | | **$0** |

---

## What You Need to Provide Before Starting

| Item | Where to Get It | Priority |
|---|---|---|
| Kaggle API key (`kaggle.json`) | kaggle.com → Account → API | Required |
| Google account for Colab | colab.research.google.com | Required |
| ~2 hours of Colab GPU time | Free tier (resets daily) | Required |
| Optional: Hugging Face token | huggingface.co → Settings → Access Tokens | Nice to have (for model hosting backup) |
