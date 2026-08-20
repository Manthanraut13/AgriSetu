"""Disease CNN Model Service — loads model and runs inference."""
import io
import json
import logging
from typing import Optional

import torch
import torch.nn as nn
from PIL import Image
import timm

from config import settings
from constants import DISEASE_MODEL_PATH, DISEASE_CLASS_NAMES_PATH, DISEASE_MODEL_INPUT_SIZE

logger = logging.getLogger("agrisetu.disease_model")

# Global model state
_model: Optional[nn.Module] = None
_class_names: dict = {}
_device: Optional[torch.device] = None
_loaded = False


def load_disease_model():
    """Load the disease CNN model into memory at startup."""
    global _model, _class_names, _device, _loaded

    if _loaded:
        return

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Loading disease model on {_device}")

    # Load class names
    try:
        with open(DISEASE_CLASS_NAMES_PATH, "r") as f:
            _class_names = json.load(f)
        logger.info(f"Loaded {len(_class_names)} disease classes")
    except FileNotFoundError:
        logger.warning(f"Class names not found at {DISEASE_CLASS_NAMES_PATH}. Creating empty mapping.")
        _class_names = {}

    # Load model
    num_classes = max(int(k) for k in _class_names.keys()) + 1 if _class_names else 38

    _model = timm.create_model("efficientnet_lite0", pretrained=False, num_classes=num_classes)

    try:
        checkpoint = torch.load(DISEASE_MODEL_PATH, map_location=_device, weights_only=False)
        _model.load_state_dict(checkpoint["model_state_dict"])
        logger.info(f"Disease model loaded from {DISEASE_MODEL_PATH}")
        logger.info(f"  Val accuracy: {checkpoint.get('val_acc', 'N/A')}")
    except FileNotFoundError:
        logger.warning(f"Model weights not found at {DISEASE_MODEL_PATH}")
        logger.warning("Using randomly initialized model — predictions will be UNRELIABLE")
    except Exception as e:
        logger.error(f"Failed to load disease model: {e}")
        raise

    _model = _model.to(_device)
    _model.eval()
    _loaded = True
    logger.info("Disease model ready for inference")


def _preprocess_image(image_bytes: bytes) -> torch.Tensor:
    """Preprocess image for EfficientNet-Lite inference."""
    from torchvision import transforms

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    transform = transforms.Compose([
        transforms.Resize((DISEASE_MODEL_INPUT_SIZE, DISEASE_MODEL_INPUT_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    return transform(image).unsqueeze(0)


def predict_disease(image_bytes: bytes) -> Optional[dict]:
    """
    Run disease inference on an image.

    Args:
        image_bytes: Raw image bytes (JPEG/PNG/WebP)

    Returns:
        dict with disease_name, confidence_pct, or None if inference fails
    """
    global _model, _class_names, _device, _loaded

    if not _loaded or _model is None:
        logger.error("Disease model not loaded")
        return None

    try:
        input_tensor = _preprocess_image(image_bytes).to(_device)

        with torch.no_grad():
            output = _model(input_tensor)
            probabilities = torch.nn.functional.softmax(output, dim=1)
            confidence, predicted = torch.max(probabilities, 1)

        pred_idx = str(predicted.item())
        confidence_pct = round(confidence.item() * 100, 2)

        disease_name = _class_names.get(pred_idx, f"class_{pred_idx}")
        # Clean up class name (replace underscores with spaces, handle "___")
        disease_name = disease_name.replace("___", " — ").replace("_", " ")

        return {
            "disease_name": disease_name,
            "confidence_pct": confidence_pct,
            "severity": _determine_severity(confidence_pct),
        }

    except Exception as e:
        logger.error(f"Disease prediction failed: {e}")
        return None


def _determine_severity(confidence_pct: float) -> str:
    """Determine severity based on confidence."""
    if confidence_pct >= 80:
        return "high"
    elif confidence_pct >= 60:
        return "moderate"
    else:
        return "low"