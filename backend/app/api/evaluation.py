from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import User, Session, Model, ModelMetric
from app.api.auth import get_current_user_and_session
from app.schemas.evaluation import EvaluationReportResponse
from app.ml.evaluator import BiometricEvaluator

router = APIRouter(prefix="/evaluation", tags=["Evaluation & Biometrics"])

@router.get("/report", response_model=EvaluationReportResponse)
async def get_evaluation_report(
    user_session: tuple[User, Session] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, session = user_session
    
    # Check if model exists
    res = await db.execute(select(Model).where(Model.user_id == user.id, Model.status == "ACTIVE"))
    model = res.scalars().first()
    if not model:
        raise HTTPException(
            status_code=400, 
            detail="No trained behavioral model found for current user. Complete enrollment first."
        )

    # Run biometric benchmark harness
    report = BiometricEvaluator.evaluate_user_model(
        user_id=user.id,
        username=user.username,
        version=model.version
    )
    
    # Persist or update metrics in DB
    metric_record = ModelMetric(
        model_id=model.id,
        metric_name="EER",
        metric_value=report.metrics.eer,
        evaluation_dataset="GENUINE_VS_IMPOSTOR"
    )
    db.add(metric_record)
    await db.commit()
    
    return report
