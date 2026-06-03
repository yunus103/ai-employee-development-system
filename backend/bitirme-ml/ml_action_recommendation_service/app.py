import os
import joblib
import numpy as np
import pandas as pd

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional


APP_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(APP_DIR, "models")

MODEL_PATH = os.path.join(MODEL_DIR, "final_lightgbm_v1_model.pkl")
ENCODER_PATH = os.path.join(MODEL_DIR, "final_lightgbm_v1_encoder.pkl")
FEATURE_COLUMNS_PATH = os.path.join(MODEL_DIR, "feature_columns.pkl")
LABEL_NAMES_PATH = os.path.join(MODEL_DIR, "label_names.pkl")


app = FastAPI(
    title="AI Action Recommendation API",
    description="LightGBM multi-label action recommendation service for 360° performance assessment project.",
    version="1.0.0"
)


class PredictionRequest(BaseModel):
    employeeId: int = Field(..., example=101)
    features: Dict[str, Any]


class RecommendedAction(BaseModel):
    code: str
    probability: float
    selected: bool = True


class PredictionResponse(BaseModel):
    employeeId: int
    recommendedActions: List[RecommendedAction]
    totalRecommendedActions: int


model = None
encoder = None
feature_columns = None
label_names = None


@app.on_event("startup")
def load_artifacts():
    global model, encoder, feature_columns, label_names

    missing_files = [
        path for path in [MODEL_PATH, ENCODER_PATH, FEATURE_COLUMNS_PATH, LABEL_NAMES_PATH]
        if not os.path.exists(path)
    ]

    if missing_files:
        print("WARNING: Missing model artifact files:")
        for path in missing_files:
            print(" -", path)
        return

    model = joblib.load(MODEL_PATH)
    encoder = joblib.load(ENCODER_PATH)
    feature_columns = joblib.load(FEATURE_COLUMNS_PATH)
    label_names = joblib.load(LABEL_NAMES_PATH)

    print("Model artifacts loaded successfully.")
    print(f"Feature count: {len(feature_columns)}")
    print(f"Label count: {len(label_names)}")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "encoder_loaded": encoder is not None,
        "feature_columns_loaded": feature_columns is not None,
        "label_names_loaded": label_names is not None
    }


@app.post("/predict-actions", response_model=PredictionResponse)
def predict_actions(request: PredictionRequest):
    if model is None or encoder is None or feature_columns is None or label_names is None:
        raise HTTPException(
            status_code=503,
            detail="Model artifacts are not loaded. Check models/ folder and restart service."
        )

    input_df = pd.DataFrame([request.features])

    missing_features = [col for col in feature_columns if col not in input_df.columns]
    if missing_features:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing required feature columns.",
                "missing_features": missing_features
            }
        )

    input_df = input_df.reindex(columns=feature_columns)

    cat_cols = input_df.select_dtypes(include=["object"]).columns

    if len(cat_cols) > 0:
        input_df[cat_cols] = encoder.transform(input_df[cat_cols])

    predictions = model.predict(input_df)[0]
    proba_list = model.predict_proba(input_df)

    probabilities = np.array([
        proba[:, 1][0] for proba in proba_list
    ])

    actions = []

    for label, pred, prob in zip(label_names, predictions, probabilities):
        if int(pred) == 1:
            actions.append(
                RecommendedAction(
                    code=str(label),
                    probability=round(float(prob), 6),
                    selected=True
                )
            )

    actions = sorted(actions, key=lambda x: x.probability, reverse=True)

    return PredictionResponse(
        employeeId=request.employeeId,
        recommendedActions=actions,
        totalRecommendedActions=len(actions)
    )


@app.post("/predict-actions/top-k", response_model=PredictionResponse)
def predict_actions_top_k(request: PredictionRequest, k: int = 13):
    if model is None or encoder is None or feature_columns is None or label_names is None:
        raise HTTPException(
            status_code=503,
            detail="Model artifacts are not loaded. Check models/ folder and restart service."
        )

    input_df = pd.DataFrame([request.features])

    missing_features = [col for col in feature_columns if col not in input_df.columns]
    if missing_features:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing required feature columns.",
                "missing_features": missing_features
            }
        )

    input_df = input_df.reindex(columns=feature_columns)

    cat_cols = input_df.select_dtypes(include=["object"]).columns

    if len(cat_cols) > 0:
        input_df[cat_cols] = encoder.transform(input_df[cat_cols])

    proba_list = model.predict_proba(input_df)

    probabilities = np.array([
        proba[:, 1][0] for proba in proba_list
    ])

    sorted_indices = np.argsort(probabilities)[::-1][:k]

    actions = [
        RecommendedAction(
            code=str(label_names[i]),
            probability=round(float(probabilities[i]), 6),
            selected=True
        )
        for i in sorted_indices
    ]

    return PredictionResponse(
        employeeId=request.employeeId,
        recommendedActions=actions,
        totalRecommendedActions=len(actions)
    )
