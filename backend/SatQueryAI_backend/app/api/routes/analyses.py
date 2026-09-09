from fastapi import APIRouter, status
from app.schemas.analysis import (
    AnalysisCreateRequest,
    AnalysisCreateResponse,
    AnalysisDetailResponse,
    AnalysisRunResponse,
)
from app.services.analysis_service import analysis_service

router = APIRouter(tags=["Analysis Management"])


@router.post(
    "",
    response_model=AnalysisCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Analysis Request",
    description=(
        "Validates image presence, initializes workflow_type as 'pending', "
        "and creates an analysis record and bridge mapping records."
    ),
)
async def create_analysis(payload: AnalysisCreateRequest) -> AnalysisCreateResponse:
    """Endpoint to create a new satellite imagery analysis request."""
    return analysis_service.create_analysis(payload)


@router.get(
    "/{analysis_id}",
    response_model=AnalysisDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Analysis Request by ID",
    description=(
        "Retrieve details and mapped image IDs for an existing satellite imagery analysis request by analysis_id."
    ),
)
async def get_analysis(analysis_id: str) -> AnalysisDetailResponse:
    """Endpoint to fetch details for an existing satellite imagery analysis request."""
    return analysis_service.get_analysis(analysis_id)


@router.post(
    "/{analysis_id}/run",
    response_model=AnalysisRunResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Satellite Imagery Analysis",
    description=(
        "Executes model pipeline for an existing satellite imagery analysis request by analysis_id. "
        "Retrieves linked images, routes request to GeminiModelSelector, and processes through the selected specialist adapter."
    ),
)
async def run_analysis(analysis_id: str) -> AnalysisRunResponse:
    """Endpoint to trigger execution of an existing satellite imagery analysis."""
    return analysis_service.run_analysis(analysis_id)


