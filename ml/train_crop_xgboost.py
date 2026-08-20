"""
Train XGBoost Crop Recommendation Model
Run this script: python ml/train_crop_xgboost.py
"""
import os
import json
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder

# ── Load Data ────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_PATH = os.path.join(PROJECT_DIR, "Crop_recommendation.csv")

print(f"Loading data from {DATA_PATH}")
df = pd.read_csv(DATA_PATH)

print(f"Dataset shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
print(f"Crops: {sorted(df['label'].unique())}")
print(f"\nClass distribution:")
print(df['label'].value_counts().sort_index())

# ── Features and Labels ─────────────────────────────────────
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
X = df[FEATURES].values
y = df["label"].values

# Encode labels
le = LabelEncoder()
y_encoded = le.fit_transform(y)
class_names = list(le.classes_)

print(f"\nNumber of classes: {len(class_names)}")
print(f"Class names: {class_names}")

# ── Train/Test Split ────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

print(f"\nTrain size: {X_train.shape[0]}, Test size: {X_test.shape[0]}")

# ── Train XGBoost ────────────────────────────────────────────
print("\nTraining XGBoost model...")

model = xgb.XGBClassifier(
    n_estimators=200,
    max_depth=8,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    objective="multi:softprob",
    eval_metric="mlogloss",
    use_label_encoder=False,
)

model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

# ── Evaluate ─────────────────────────────────────────────────
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"\nTest Accuracy: {accuracy:.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=class_names))

# Cross-validation
print("Running 5-fold cross-validation...")
cv_scores = cross_val_score(model, X, y_encoded, cv=5, scoring="accuracy")
print(f"CV Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

# ── Save Model ───────────────────────────────────────────────
MODEL_DIR = os.path.join(PROJECT_DIR, "agrisetu-backend", "models", "crop_model")
os.makedirs(MODEL_DIR, exist_ok=True)

model_path = os.path.join(MODEL_DIR, "xgboost_crop.json")
model.save_model(model_path)

# Save class names
classes_path = os.path.join(MODEL_DIR, "xgboost_crop_classes.json")
with open(classes_path, "w") as f:
    json.dump(class_names, f, indent=2)

print(f"\n✓ Model saved to {model_path}")
print(f"✓ Classes saved to {classes_path}")

# ── Feature Importance ──────────────────────────────────────
print("\nFeature Importance:")
for feat, imp in zip(FEATURES, model.feature_importances_):
    print(f"  {feat}: {imp:.4f}")