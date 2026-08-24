"""Crop Recommendation Model Service — XGBoost inference."""
import json
import logging
import os
from typing import Optional, List

import xgboost as xgb
import numpy as np

from config import settings
from constants import CROP_MODEL_PATH, CROP_FEATURES

logger = logging.getLogger("agrisetu.crop_model")

# Global model state
_model: Optional[xgb.XGBClassifier] = None
_crop_classes: List[str] = []
_loaded = False


def load_crop_model():
    """Load the XGBoost crop recommendation model at startup."""
    global _model, _crop_classes, _loaded

    if _loaded:
        return

    try:
        _model = xgb.XGBClassifier()
        _model.load_model(CROP_MODEL_PATH)

        # Load class names
        classes_path = CROP_MODEL_PATH.replace(".json", "_classes.json")
        if os.path.exists(classes_path):
            with open(classes_path, "r") as f:
                _crop_classes = json.load(f)
        else:
            # Try to get from model
            _crop_classes = [str(c) for c in range(len(_model.classes_))]

        _loaded = True
        logger.info(f"Crop model loaded from {CROP_MODEL_PATH} with {len(_crop_classes)} classes")
    except FileNotFoundError:
        logger.warning(f"Crop model not found at {CROP_MODEL_PATH}")
        logger.warning("Run ml/train_crop_xgboost.py first to train the model")
    except Exception as e:
        logger.error(f"Failed to load crop model: {e}")
        raise


def predict_crop(
    N: float,
    P: float,
    K: float,
    temperature: float,
    humidity: float,
    ph: float,
    rainfall: float,
    top_k: int = 3,
) -> Optional[List[dict]]:
    """
    Predict best crops for given conditions.

    Args:
        N, P, K: Soil nutrient values
        temperature: Temperature in °C
        humidity: Humidity in %
        ph: Soil pH
        rainfall: Rainfall in mm
        top_k: Number of top recommendations

    Returns:
        List of dicts with crop, confidence, or None if model not loaded
    """
    global _model, _crop_classes, _loaded

    if not _loaded or _model is None:
        logger.error("Crop model not loaded")
        return None

    try:
        features = np.array([[N, P, K, temperature, humidity, ph, rainfall]])

        # Get probabilities
        proba = _model.predict_proba(features)[0]

        # Get top-k indices
        top_indices = np.argsort(proba)[::-1][:top_k]

        results = []
        for idx in top_indices:
            crop_name = _crop_classes[idx] if idx < len(_crop_classes) else str(idx)
            confidence = round(float(proba[idx]), 4)
            results.append({
                "crop": crop_name,
                "confidence": confidence,
            })

        logger.info(f"Crop prediction: {results}")
        return results

    except Exception as e:
        logger.error(f"Crop prediction failed: {e}")
        return None


def calculate_personalized_fertilizer_dosage(
    crop_name: str,
    N: float,
    P: float,
    K: float,
    last_crop: Optional[str] = None,
) -> dict:
    """
    Calculate personalized fertilizer dosage & bags based on crop NPK targets vs soil tests.
    """
    targets = {
        "wheat": {"N": 120, "P": 60, "K": 40},
        "rice": {"N": 100, "P": 50, "K": 50},
        "maize": {"N": 120, "P": 60, "K": 50},
        "cotton": {"N": 120, "P": 60, "K": 60},
        "soybean": {"N": 30, "P": 80, "K": 40},
        "sugarcane": {"N": 250, "P": 115, "K": 115},
        "chickpea": {"N": 20, "P": 60, "K": 20},
        "groundnut": {"N": 25, "P": 50, "K": 75},
        "default": {"N": 90, "P": 50, "K": 40},
    }

    crop_key = crop_name.lower().strip() if crop_name else "default"
    req = targets.get(crop_key, targets["default"])

    # Legume nitrogen credit
    legumes = ["chickpea", "lentil", "pea", "bean", "groundnut", "soybean"]
    n_credit = 20.0 if last_crop and any(l in last_crop.lower() for l in legumes) else 0.0

    n_deficit = max(0.0, req["N"] - (N + n_credit))
    p_deficit = max(0.0, req["P"] - P)
    k_deficit = max(0.0, req["K"] - K)

    # Convert to standard fertilizer bags (45kg per bag)
    # DAP gives 18% N + 46% P
    dap_bags = round((p_deficit / 0.46) / 45.0, 1)
    # Urea gives 46% N (subtract N provided by DAP)
    n_from_dap = dap_bags * 45.0 * 0.18
    n_rem = max(0.0, n_deficit - n_from_dap)
    urea_bags = round((n_rem / 0.46) / 45.0, 1)
    # MOP (Muriate of Potash) gives 60% K
    mop_bags = round((k_deficit / 0.60) / 45.0, 1)

    return {
        "crop": crop_name,
        "target_npk": req,
        "legume_credit_n": n_credit,
        "deficit": {"N": round(n_deficit, 1), "P": round(p_deficit, 1), "K": round(k_deficit, 1)},
        "recommended_bags_per_hectare": {
            "Urea_45kg": max(0.5, urea_bags),
            "DAP_45kg": max(0.5, dap_bags),
            "MOP_45kg": max(0.5, mop_bags),
        },
    }


def apply_regenerative_rules(
    crop_recommendations: List[dict],
    soil_data: dict,
    weather_data: dict,
    ndvi_value: Optional[float],
    last_crop: Optional[str],
) -> List[dict]:
    """
    Apply rule-based regenerative agriculture layer on top of XGBoost recommendations.

    Returns list of regenerative practice suggestions.
    """
    practices = []

    # Rule 1: If previous crop was legume, add nitrogen credit
    if last_crop and "legume" in last_crop.lower() or last_crop in ["chickpea", "lentil", "pea", "bean", "groundnut"]:
        practices.append({
            "practice": "Intercropping",
            "description": f"Previous crop ({last_crop}) was a legume. Your soil has natural nitrogen credit. "
                          "Consider intercropping with a cereal like wheat or maize to maximize this benefit.",
            "priority": "medium",
        })

    # Rule 2: Low NDVI suggests cover crop needed
    if ndvi_value is not None and ndvi_value < 0.3:
        practices.append({
            "practice": "Cover Cropping",
            "description": "Your plot shows low vegetation health (NDVI < 0.3). "
                          "After harvest, plant cover crops like clover or vetch to prevent erosion and build soil organic matter.",
            "priority": "high",
        })

    # Rule 3: Low organic carbon → reduced tillage
    soc = soil_data.get("organic_carbon_pct")
    if soc is not None and soc < 0.5:
        practices.append({
            "practice": "Reduced Tillage",
            "description": "Your soil organic carbon is low (< 0.5%). "
                          "Consider minimum tillage or no-till farming to preserve soil structure and build carbon.",
            "priority": "high",
        })

    # Rule 4: High rainfall forecast → delay sowing, use raised beds
    rainfall = weather_data.get("rainfall_mm") or 0
    if rainfall > 100:
        practices.append({
            "practice": "Raised Bed Farming",
            "description": f"Heavy rainfall expected ({rainfall}mm). "
                          "Use raised beds or ridge-furrow system to prevent waterlogging.",
            "priority": "high",
        })

    # Rule 5: Soil pH out of range → liming or acidification
    ph = soil_data.get("pH")
    if ph is not None:
        if ph < 5.5:
            practices.append({
                "practice": "Soil Liming",
                "description": f"Your soil pH ({ph}) is acidic. "
                              "Apply agricultural lime (CaCO3) at 2-4 tons/ha to raise pH.",
                "priority": "high",
            })
        elif ph > 8.0:
            practices.append({
                "practice": "Organic Matter Addition",
                "description": f"Your soil pH ({ph}) is alkaline. "
                              "Add compost and organic matter to improve soil buffering capacity.",
                "priority": "medium",
            })

    # Rule 6: General regenerative suggestions
    if not practices:
        practices.append({
            "practice": "Mulching",
            "description": "Apply organic mulch (crop residue, straw) to conserve moisture, "
                          "suppress weeds, and build soil health over time.",
            "priority": "medium",
        })

    practices.append({
        "practice": "Crop Rotation",
        "description": "Rotate between cereals, legumes, and oilseeds each season "
                      "to break pest cycles and improve soil fertility.",
        "priority": "medium",
    })

    return practices