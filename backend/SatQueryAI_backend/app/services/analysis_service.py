import uuid
from datetime import datetime, timezone
from typing import List, Optional

from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging import get_logger
from app.repositories.analysis_repository import AnalysisRepository, analysis_repository
from app.repositories.image_repository import image_repository
from app.router.gemini_selector import GeminiModelSelector
from app.schemas.analysis import (
    AnalysisCreateRequest,
    AnalysisCreateResponse,
    AnalysisDetailResponse,
    AnalysisResponseData,
    AnalysisRunData,
    AnalysisRunResponse,
)
from app.schemas.image import ImageContext
from app.services.image_service import ImageService, image_service as default_image_service
from app.services.pipeline_service import ModelPipelineService

logger = get_logger(__name__)


class AnalysisService:
    """
    Service layer for analysis request management.
    Validates input parameters, checks image existence in `satellite_images`,
    identifies appropriate workflow_type ('vqa' or 'change_detection'),
    persists records into the `analyses` and `analysis_images` tables,
    and orchestrates execution through the ModelPipelineService.
    """

    def __init__(
        self,
        analysis_repo: Optional[AnalysisRepository] = None,
        image_svc: Optional[ImageService] = None,
    ):
        self.analysis_repo = analysis_repo or analysis_repository
        self.image_repo = image_repository
        self.image_service = image_svc or default_image_service

    def create_analysis(self, request: AnalysisCreateRequest) -> AnalysisCreateResponse:
        """
        Validates analysis request and creates new analysis record mapped to image IDs.

        Validation rules:
        1. image_ids cannot be empty.
        2. query cannot be empty or whitespace only.
        3. duplicate image_ids are rejected (HTTP 422).
        4. Every image_id must exist in satellite_images DB table (HTTP 404 if missing).
        5. Identifies workflow_type: 1 image -> 'vqa', 2 images -> 'change_detection'.
        """
        # Convert UUID objects to string list for domain processing
        raw_image_ids = [str(img_id) for img_id in request.image_ids]

        # 1. Validate image_ids non-empty
        if not raw_image_ids:
            raise ValidationException(
                message="At least one image_id must be provided.",
                details={"image_ids": raw_image_ids},
            )

        # 2. Validate uniqueness of image_ids
        if len(raw_image_ids) != len(set(raw_image_ids)):
            raise ValidationException(
                message="Duplicate image_ids are not allowed in the request.",
                details={"image_ids": raw_image_ids},
            )

        # 3. Validate query
        query_clean = request.query.strip() if request.query else ""
        if not query_clean:
            raise ValidationException(
                message="Query cannot be empty or contain only whitespace.",
                details={"query": request.query},
            )

        # 4. Check that all image_ids exist in satellite_images table
        for img_id in raw_image_ids:
            img_record = self.image_repo.get_by_id(img_id)
            if not img_record:
                raise NotFoundException(
                    message=f"Satellite image with ID '{img_id}' not found.",
                    details={"missing_image_id": img_id},
                )

        # 5. Set initial workflow_type as 'pending' (to be updated dynamically by model selector upon execution)
        num_images = len(raw_image_ids)
        workflow_type = "pending"

        # 6. Construct analysis record
        new_analysis_id = str(uuid.uuid4())
        now_utc = datetime.now(timezone.utc)

        analysis_data = AnalysisResponseData(
            analysis_id=new_analysis_id,
            image_ids=raw_image_ids,
            query=query_clean,
            workflow_type=workflow_type,
            status="pending",
            created_at=now_utc,
            started_at=None,
            completed_at=None,
        )

        # 7. Persist analysis and bridge records atomically (with compensating cleanup)
        saved_record = self.analysis_repo.save_analysis(analysis_data)

        logger.info(
            f"Created analysis request {new_analysis_id} with workflow_type='{workflow_type}' for {num_images} image(s)."
        )

        return AnalysisCreateResponse(
            status="success",
            message="Analysis request created successfully.",
            data=saved_record,
        )

    def get_analysis(self, analysis_id: str) -> AnalysisDetailResponse:
        """
        Retrieves an analysis request and its associated image IDs by analysis_id.
        Raises ValidationException (422) for malformed UUID and NotFoundException (404) if missing.
        """
        # Validate analysis_id is a valid UUID string
        try:
            uuid.UUID(analysis_id)
        except (ValueError, TypeError, AttributeError):
            raise ValidationException(
                message=f"Invalid UUID format for analysis_id: '{analysis_id}'.",
                details={"analysis_id": analysis_id},
            )

        analysis_record = self.analysis_repo.get_by_id(analysis_id)
        if not analysis_record:
            raise NotFoundException(
                message=f"Analysis with ID '{analysis_id}' not found.",
                details={"analysis_id": analysis_id},
            )

        return AnalysisDetailResponse(status="success", data=analysis_record)

    def run_analysis(
        self,
        analysis_id: str,
        pipeline: Optional[ModelPipelineService] = None,
    ) -> AnalysisRunResponse:
        """
        Executes the AI model pipeline for an existing analysis request by analysis_id.

        Validation & Workflow:
        1. Validate analysis_id format as UUID.
        2. Fetch analysis record by analysis_id (raises NotFoundException if missing).
        3. Ensure associated image_ids list is non-empty (raises ValidationException if empty).
        4. Retrieve ImageContext domain objects for all image_ids via ImageService.
        5. Execute ModelPipelineService (defaulting to GeminiModelSelector).
        6. Synchronize analyses.workflow_type with Gemini-selected specialist upon successful selection.
        7. Package and return structured AnalysisRunResponse.
        """
        # 1. Validate analysis_id UUID format
        try:
            uuid.UUID(analysis_id)
        except (ValueError, TypeError, AttributeError):
            raise ValidationException(
                message=f"Invalid UUID format for analysis_id: '{analysis_id}'.",
                details={"analysis_id": analysis_id},
            )

        # 2. Fetch analysis record
        analysis_record = self.analysis_repo.get_by_id(analysis_id)
        if not analysis_record:
            raise NotFoundException(
                message=f"Analysis with ID '{analysis_id}' not found.",
                details={"analysis_id": analysis_id},
            )

        # 3. Check for linked image_ids
        if not analysis_record.image_ids:
            raise ValidationException(
                message=f"Analysis '{analysis_id}' has no associated satellite images.",
                details={"analysis_id": analysis_id, "image_ids": []},
            )

        # 4. Retrieve complete ImageContext domain objects
        images: List[ImageContext] = [
            self.image_service.get_image_context(img_id)
            for img_id in analysis_record.image_ids
        ]

        # 5. Resolve pipeline service (uses GeminiModelSelector in production)
        if pipeline is None:
            pipeline = ModelPipelineService(selector=GeminiModelSelector())

        # 6. Execute model pipeline (raises exception if Gemini model selection fails)
        selection, model_result = pipeline.run_pipeline(
            query=analysis_record.query,
            images=images,
        )

        # 7. Update analyses.workflow_type to Gemini-selected specialist in DB and memory
        self.analysis_repo.update_workflow_type(
            analysis_id=analysis_record.analysis_id,
            workflow_type=selection.selected_specialist,
        )
        analysis_record.workflow_type = selection.selected_specialist

        run_data = AnalysisRunData(
            analysis_id=analysis_record.analysis_id,
            query=analysis_record.query,
            selected_specialist=selection.selected_specialist,
            confidence=selection.confidence,
            reason=selection.reason,
            model_result=model_result,
        )

        return AnalysisRunResponse(
            status="success",
            message="Analysis executed successfully.",
            data=run_data,
        )


# Global singleton instance
analysis_service = AnalysisService()

