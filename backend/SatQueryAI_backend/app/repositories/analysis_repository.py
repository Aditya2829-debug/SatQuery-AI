import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.core.logging import get_logger
from app.integrations.supabase import get_supabase_client
from app.schemas.analysis import AnalysisResponseData

logger = get_logger(__name__)


class AnalysisRepository:
    """
    Repository for persisting and retrieving analysis requests and their image associations.
    Strictly aligns with the Supabase `analyses` and `analysis_images` table schemas.
    """

    def __init__(self):
        self._analyses_store: Dict[str, AnalysisResponseData] = {}
        self._analysis_images_store: List[Dict[str, Any]] = []
        self.analyses_table = "analyses"
        self.analysis_images_table = "analysis_images"

    def _to_analysis_db_payload(self, data: AnalysisResponseData) -> Dict[str, Any]:
        return {
            "analysis_id": data.analysis_id,
            "workflow_type": data.workflow_type,
            "query": data.query,
            "status": data.status,
            "created_at": data.created_at.isoformat(),
            "started_at": data.started_at.isoformat() if data.started_at else None,
            "completed_at": data.completed_at.isoformat() if data.completed_at else None,
        }

    def save_analysis(self, analysis_data: AnalysisResponseData) -> AnalysisResponseData:
        """
        Persists analysis record and associated bridge records.
        Uses compensating cleanup if bridge insertion fails (since Supabase REST does not support interactive transactions).
        Does not silently swallow DB errors and populates memory cache only after DB success.
        """
        client = get_supabase_client()
        if client:
            # 1. Insert analysis record into 'analyses' table
            try:
                db_payload = self._to_analysis_db_payload(analysis_data)
                client.table(self.analyses_table).insert(db_payload).execute()
                logger.info(f"Saved analysis record {analysis_data.analysis_id} to Supabase '{self.analyses_table}'.")
            except Exception as e:
                logger.error(
                    f"Could not persist analysis "
                    f"{analysis_data.analysis_id} to Supabase "
                    f"table '{self.analyses_table}': {e}"
                )
                self._analyses_store.pop(analysis_data.analysis_id, None)
                raise

            # 2. Insert bridge records into 'analysis_images' table with compensating cleanup
            now_iso = datetime.now(timezone.utc).isoformat()
            bridge_payloads = [
                {
                    "analysis_image_id": str(uuid.uuid4()),
                    "analysis_id": analysis_data.analysis_id,
                    "image_id": img_id,
                    "created_at": now_iso,
                }
                for img_id in analysis_data.image_ids
            ]

            try:
                client.table(self.analysis_images_table).insert(bridge_payloads).execute()
                logger.info(
                    f"Associated {len(bridge_payloads)} image(s) to analysis {analysis_data.analysis_id} in '{self.analysis_images_table}'."
                )
            except Exception as bridge_err:
                logger.warning(
                    f"Failed inserting bridge records for analysis {analysis_data.analysis_id}: {bridge_err}. "
                    "Executing compensating cleanup to delete orphan 'analyses' record."
                )
                try:
                    client.table(self.analyses_table).delete().eq("analysis_id", analysis_data.analysis_id).execute()
                except Exception as cleanup_err:
                    logger.error(f"Compensating cleanup failed for analysis {analysis_data.analysis_id}: {cleanup_err}")

                self._analyses_store.pop(analysis_data.analysis_id, None)
                raise bridge_err

            # 3. Populate memory cache only after DB success
            self._analyses_store[analysis_data.analysis_id] = analysis_data
            self._analysis_images_store.extend(bridge_payloads)
        else:
            # Fallback when Supabase client is not available (e.g. placeholder mode / offline tests)
            self._analyses_store[analysis_data.analysis_id] = analysis_data
            for img_id in analysis_data.image_ids:
                self._analysis_images_store.append(
                    {
                        "analysis_image_id": str(uuid.uuid4()),
                        "analysis_id": analysis_data.analysis_id,
                        "image_id": img_id,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                )

        return analysis_data

    def get_by_id(self, analysis_id: str) -> Optional[AnalysisResponseData]:
        """Retrieves analysis data by analysis_id from memory or Supabase."""
        if analysis_id in self._analyses_store:
            return self._analyses_store[analysis_id]

        client = get_supabase_client()
        if client:
            try:
                # Fetch analysis record
                response = (
                    client.table(self.analyses_table)
                    .select("*")
                    .eq("analysis_id", analysis_id)
                    .limit(1)
                    .execute()
                )
                if response.data and len(response.data) > 0:
                    row = response.data[0]
                    # Fetch associated image_ids from bridge table
                    bridge_resp = (
                        client.table(self.analysis_images_table)
                        .select("image_id")
                        .eq("analysis_id", analysis_id)
                        .execute()
                    )
                    img_ids = [item["image_id"] for item in (bridge_resp.data or [])]
                    row["image_ids"] = img_ids
                    record = AnalysisResponseData.model_validate(row)
                    self._analyses_store[analysis_id] = record
                    return record
            except Exception as e:
                logger.warning(f"Error querying Supabase for analysis {analysis_id}: {e}")

        return None

    def update_workflow_type(self, analysis_id: str, workflow_type: str) -> Optional[AnalysisResponseData]:
        """
        Updates the workflow_type for an existing analysis record in memory store and Supabase.
        """
        if analysis_id in self._analyses_store:
            self._analyses_store[analysis_id].workflow_type = workflow_type

        client = get_supabase_client()
        if client:
            try:
                client.table(self.analyses_table).update({"workflow_type": workflow_type}).eq("analysis_id", analysis_id).execute()
                logger.info(f"Updated workflow_type to '{workflow_type}' for analysis {analysis_id} in Supabase.")
            except Exception as e:
                logger.error(f"Failed to update workflow_type for analysis {analysis_id} in Supabase: {e}")
                raise

        return self._analyses_store.get(analysis_id)


# Global singleton instance
analysis_repository = AnalysisRepository()

