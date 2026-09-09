import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

from app.main import app
from app.repositories.image_repository import image_repository
from app.repositories.analysis_repository import analysis_repository
from app.schemas.analysis import AnalysisResponseData
from app.schemas.image import ImageResponseData

client = TestClient(app)


@pytest.fixture(autouse=True)
def fallback_supabase_client():
    """Autouse fixture to mock get_supabase_client in API route tests to ensure deterministic execution."""
    with patch("app.repositories.analysis_repository.get_supabase_client", return_value=None):
        yield


def _create_and_store_mock_image() -> str:
    """Helper to store a mock image record in image_repository."""
    img_id = str(uuid.uuid4())
    img_record = ImageResponseData(
        image_id=img_id,
        file_name="test_scene.png",
        storage_path=f"satellite-images/uploads/{img_id}.png",
        file_type="image/png",
        file_size=1024,
        source="Sentinel-2",
        capture_date=None,
        latitude=37.7749,
        longitude=-122.4194,
        resolution_m=10.0,
        metadata={},
        created_at=datetime.now(timezone.utc),
    )
    image_repository.save(img_record)
    return img_id


def test_create_analysis_single_image_pending():
    """Test 1 image request initializes workflow_type='pending' and status='pending'."""
    img_id = _create_and_store_mock_image()
    payload = {
        "image_ids": [img_id],
        "query": "What is visible in this satellite image?",
    }
    response = client.post("/api/v1/analyses", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["status"] == "success"
    assert "data" in data
    res_data = data["data"]
    assert res_data["workflow_type"] == "pending"
    assert res_data["status"] == "pending"
    assert res_data["query"] == payload["query"]
    assert res_data["image_ids"] == [img_id]
    assert res_data["started_at"] is None
    assert res_data["completed_at"] is None
    assert "analysis_id" in res_data
    assert "created_at" in res_data


def test_create_analysis_two_images_pending():
    """Test 2 images request initializes workflow_type='pending'."""
    img1 = _create_and_store_mock_image()
    img2 = _create_and_store_mock_image()
    payload = {
        "image_ids": [img1, img2],
        "query": "Compare these two satellite images for urban development changes.",
    }
    response = client.post("/api/v1/analyses", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["status"] == "success"
    res_data = data["data"]
    assert res_data["workflow_type"] == "pending"
    assert res_data["status"] == "pending"
    assert res_data["query"] == payload["query"]
    assert set(res_data["image_ids"]) == {img1, img2}


def test_create_analysis_duplicate_image_ids():
    """Test sending duplicate image_ids in request is rejected with HTTP 422."""
    img_id = _create_and_store_mock_image()
    payload = {
        "image_ids": [img_id, img_id],
        "query": "Compare duplicate images",
    }
    response = client.post("/api/v1/analyses", json=payload)
    assert response.status_code == 422


def test_create_analysis_empty_image_ids():
    """Test empty image_ids list is rejected with HTTP 422."""
    payload = {
        "image_ids": [],
        "query": "What is visible?",
    }
    response = client.post("/api/v1/analyses", json=payload)
    assert response.status_code == 422


def test_create_analysis_empty_query():
    """Test empty query or whitespace query is rejected with HTTP 422."""
    img_id = _create_and_store_mock_image()
    payload = {
        "image_ids": [img_id],
        "query": "    ",
    }
    response = client.post("/api/v1/analyses", json=payload)
    assert response.status_code == 422


def test_create_analysis_invalid_uuid():
    """Test non-UUID string in image_ids is rejected with HTTP 422."""
    payload = {
        "image_ids": ["invalid-uuid-12345"],
        "query": "What is visible?",
    }
    response = client.post("/api/v1/analyses", json=payload)
    assert response.status_code == 422


def test_create_analysis_non_existent_image_id():
    """Test valid UUID not present in satellite_images table returns HTTP 404."""
    missing_id = str(uuid.uuid4())
    payload = {
        "image_ids": [missing_id],
        "query": "Analyze this missing image.",
    }
    response = client.post("/api/v1/analyses", json=payload)
    assert response.status_code == 404
    data = response.json()
    assert data["status"] == "error"
    assert data["error_type"] == "NotFoundException"
    assert missing_id in data["message"]


def test_create_analysis_multiple_images_accepted_as_pending():
    """Test requesting 3 images is successfully accepted with workflow_type='pending'."""
    img1 = _create_and_store_mock_image()
    img2 = _create_and_store_mock_image()
    img3 = _create_and_store_mock_image()
    payload = {
        "image_ids": [img1, img2, img3],
        "query": "Analyze three images.",
    }
    response = client.post("/api/v1/analyses", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["workflow_type"] == "pending"
    assert len(data["data"]["image_ids"]) == 3


def test_compensating_cleanup_on_bridge_failure():
    """Test compensating cleanup deletes the analyses record if inserting bridge records fails."""
    mock_supabase = MagicMock()
    # Mock analyses table insert success
    mock_analyses_table = MagicMock()
    mock_analyses_table.insert.return_value.execute.return_value = MagicMock(data=[{}])

    # Mock analysis_images table insert raising an Exception
    mock_bridge_table = MagicMock()
    mock_bridge_table.insert.side_effect = Exception("DB ForeignKey Violation")

    def table_side_effect(table_name):
        if table_name == "analyses":
            return mock_analyses_table
        elif table_name == "analysis_images":
            return mock_bridge_table
        return MagicMock()

    mock_supabase.table.side_effect = table_side_effect

    analysis_data = AnalysisResponseData(
        analysis_id=str(uuid.uuid4()),
        image_ids=[str(uuid.uuid4())],
        query="Test query",
        workflow_type="vqa",
        status="pending",
        created_at=datetime.now(timezone.utc),
    )

    with patch("app.repositories.analysis_repository.get_supabase_client", return_value=mock_supabase):
        with pytest.raises(Exception, match="DB ForeignKey Violation"):
            analysis_repository.save_analysis(analysis_data)

    # Verify delete was called on 'analyses' table for compensating cleanup
    mock_analyses_table.delete.assert_called_once()
    assert analysis_data.analysis_id not in analysis_repository._analyses_store


def test_analysis_insert_failure_does_not_return_success():
    """Test that failure while inserting the analyses record is propagated."""
    mock_supabase = MagicMock()

    mock_analyses_table = MagicMock()
    mock_analyses_table.insert.side_effect = Exception(
        "Analysis DB insert failed"
    )

    def table_side_effect(table_name):
        if table_name == "analyses":
            return mock_analyses_table
        return MagicMock()

    mock_supabase.table.side_effect = table_side_effect

    analysis_data = AnalysisResponseData(
        analysis_id=str(uuid.uuid4()),
        image_ids=[str(uuid.uuid4())],
        query="Test query",
        workflow_type="vqa",
        status="pending",
        created_at=datetime.now(timezone.utc),
    )

    with patch(
        "app.repositories.analysis_repository.get_supabase_client",
        return_value=mock_supabase,
    ):
        with pytest.raises(Exception, match="Analysis DB insert failed"):
            analysis_repository.save_analysis(analysis_data)

    assert analysis_data.analysis_id not in analysis_repository._analyses_store


def test_get_analysis_by_id_success():
    """Test retrieving an existing analysis by analysis_id returns HTTP 200 and complete payload."""
    img_id = _create_and_store_mock_image()
    create_payload = {
        "image_ids": [img_id],
        "query": "What is visible in this satellite image?",
    }
    create_res = client.post("/api/v1/analyses", json=create_payload)
    assert create_res.status_code == 201
    analysis_id = create_res.json()["data"]["analysis_id"]

    get_res = client.get(f"/api/v1/analyses/{analysis_id}")
    assert get_res.status_code == 200

    data = get_res.json()
    assert data["status"] == "success"
    res_data = data["data"]
    assert res_data["analysis_id"] == analysis_id
    assert res_data["image_ids"] == [img_id]
    assert res_data["query"] == create_payload["query"]
    assert res_data["workflow_type"] == "pending"
    assert res_data["status"] == "pending"
    assert res_data["started_at"] is None
    assert res_data["completed_at"] is None
    assert "created_at" in res_data


def test_get_analysis_by_id_non_existent():
    """Test retrieving a non-existent but valid UUID analysis_id returns HTTP 404."""
    random_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/analyses/{random_id}")
    assert response.status_code == 404

    data = response.json()
    assert data["status"] == "error"
    assert data["error_type"] == "NotFoundException"
    assert random_id in data["message"]


def test_get_analysis_by_id_malformed_uuid():
    """Test retrieving an analysis with malformed UUID string returns HTTP 422."""
    malformed_id = "not-a-valid-uuid-string"
    response = client.get(f"/api/v1/analyses/{malformed_id}")
    assert response.status_code == 422

    data = response.json()
    assert data["status"] == "error"
    assert data["error_type"] == "ValidationException"


def test_get_analysis_by_id_from_supabase_db():
    """Test querying Supabase table directly via repository get_by_id."""
    test_id = str(uuid.uuid4())
    test_img = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    mock_supabase = MagicMock()
    mock_analyses_table = MagicMock()
    mock_analyses_table.select.return_value.eq.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[
            {
                "analysis_id": test_id,
                "workflow_type": "change_detection",
                "query": "Detect changes",
                "status": "pending",
                "created_at": now_iso,
                "started_at": None,
                "completed_at": None,
            }
        ]
    )

    mock_bridge_table = MagicMock()
    mock_bridge_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"image_id": test_img}]
    )

    def table_side_effect(table_name):
        if table_name == "analyses":
            return mock_analyses_table
        elif table_name == "analysis_images":
            return mock_bridge_table
        return MagicMock()

    mock_supabase.table.side_effect = table_side_effect

    with patch("app.repositories.analysis_repository.get_supabase_client", return_value=mock_supabase):
        # Ensure memory store is clear for test_id to force DB fetch
        analysis_repository._analyses_store.pop(test_id, None)
        record = analysis_repository.get_by_id(test_id)

    assert record is not None
    assert record.analysis_id == test_id
    assert record.image_ids == [test_img]
    assert record.workflow_type == "change_detection"


def test_run_analysis_single_image_vqa():
    """Test POST /api/v1/analyses/{analysis_id}/run with 1 image executes VQA adapter."""
    import json
    img_id = _create_and_store_mock_image()
    create_res = client.post(
        "/api/v1/analyses",
        json={"image_ids": [img_id], "query": "What buildings are in this scene?"},
    )
    assert create_res.status_code == 201
    analysis_id = create_res.json()["data"]["analysis_id"]

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value.text = json.dumps({
        "selected_specialist": "vqa",
        "confidence": 0.95,
        "reason": "Single image visual question",
        "signals": {"domain": "visual_vqa"},
    })

    with patch("app.router.gemini_selector.genai.Client", return_value=mock_client):
        response = client.post(f"/api/v1/analyses/{analysis_id}/run")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    res_data = data["data"]
    assert res_data["analysis_id"] == analysis_id
    assert res_data["query"] == "What buildings are in this scene?"
    assert res_data["selected_specialist"] == "vqa"
    assert res_data["confidence"] == 0.95
    assert res_data["reason"] == "Single image visual question"
    assert res_data["model_result"]["model_name"] in (
        "Placeholder-VQA-v1",
        "Qwen3-VL-2B-Instruct-QLoRA",
    )


def test_run_analysis_two_images_change_detection():
    """Test POST /api/v1/analyses/{analysis_id}/run with 2 images selects change_detection adapter."""
    import json
    img1 = _create_and_store_mock_image()
    img2 = _create_and_store_mock_image()
    create_res = client.post(
        "/api/v1/analyses",
        json={"image_ids": [img1, img2], "query": "Compare temporal changes between these images."},
    )
    assert create_res.status_code == 201
    analysis_id = create_res.json()["data"]["analysis_id"]

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value.text = json.dumps({
        "selected_specialist": "change_detection",
        "confidence": 0.92,
        "reason": "Two temporal images submitted for comparison",
        "signals": {"image_count": 2},
    })

    with patch("app.router.gemini_selector.genai.Client", return_value=mock_client):
        response = client.post(f"/api/v1/analyses/{analysis_id}/run")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    res_data = data["data"]
    assert res_data["analysis_id"] == analysis_id
    assert res_data["selected_specialist"] == "change_detection"
    assert res_data["confidence"] == 0.92
    assert res_data["model_result"]["status"] == "NOT_IMPLEMENTED"
    assert res_data["model_result"]["model_name"] == "Placeholder-ChangeDetection-v1"


def test_run_analysis_region_grounding():
    """Test POST /api/v1/analyses/{analysis_id}/run when Gemini selects region_grounding."""
    import json
    img_id = _create_and_store_mock_image()
    create_res = client.post(
        "/api/v1/analyses",
        json={"image_ids": [img_id], "query": "Locate the solar farm bounding box."},
    )
    assert create_res.status_code == 201
    analysis_id = create_res.json()["data"]["analysis_id"]

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value.text = json.dumps({
        "selected_specialist": "region_grounding",
        "confidence": 0.88,
        "reason": "Query asks to ground spatial objects",
        "signals": {"spatial": True},
    })

    with patch("app.router.gemini_selector.genai.Client", return_value=mock_client):
        response = client.post(f"/api/v1/analyses/{analysis_id}/run")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    res_data = data["data"]
    assert res_data["model_result"]["model_name"] in (
        "Placeholder-Grounding-v1",
        "RemoteCLIP-ViT-B-32",
    )


def test_run_analysis_not_found():
    """Test POST /api/v1/analyses/{analysis_id}/run returns HTTP 404 for non-existent analysis_id."""
    missing_id = str(uuid.uuid4())
    response = client.post(f"/api/v1/analyses/{missing_id}/run")
    assert response.status_code == 404
    data = response.json()
    assert data["status"] == "error"
    assert data["error_type"] == "NotFoundException"
    assert missing_id in data["message"]


def test_run_analysis_no_linked_images():
    """Test POST /api/v1/analyses/{analysis_id}/run returns HTTP 422 if analysis has no linked images."""
    analysis_id = str(uuid.uuid4())
    analysis_record = AnalysisResponseData(
        analysis_id=analysis_id,
        image_ids=[],
        query="Test query without images",
        workflow_type="vqa",
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    analysis_repository.save_analysis(analysis_record)

    response = client.post(f"/api/v1/analyses/{analysis_id}/run")
    assert response.status_code == 422
    data = response.json()
    assert data["status"] == "error"
    assert data["error_type"] == "ValidationException"
    assert "no associated satellite images" in data["message"]


def test_run_analysis_updates_workflow_type_in_db():
    """Test that POST /analyses/{analysis_id}/run updates workflow_type from 'pending' to Gemini-selected specialist in DB."""
    import json
    img_id = _create_and_store_mock_image()
    create_res = client.post(
        "/api/v1/analyses",
        json={"image_ids": [img_id], "query": "Find building boundaries"},
    )
    assert create_res.status_code == 201
    analysis_id = create_res.json()["data"]["analysis_id"]

    # Verify initial workflow_type is 'pending'
    get_initial = client.get(f"/api/v1/analyses/{analysis_id}")
    assert get_initial.json()["data"]["workflow_type"] == "pending"

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value.text = json.dumps({
        "selected_specialist": "region_grounding",
        "confidence": 0.91,
        "reason": "Building boundary localization query",
        "signals": {},
    })

    with patch("app.router.gemini_selector.genai.Client", return_value=mock_client):
        run_res = client.post(f"/api/v1/analyses/{analysis_id}/run")
        assert run_res.status_code == 200
        assert run_res.json()["data"]["selected_specialist"] == "region_grounding"

    # Verify subsequent GET /analyses/{analysis_id} returns updated workflow_type='region_grounding'
    get_updated = client.get(f"/api/v1/analyses/{analysis_id}")
    assert get_updated.status_code == 200
    assert get_updated.json()["data"]["workflow_type"] == "region_grounding"


def test_run_analysis_gemini_failure_preserves_pending_workflow_type():
    """Test that if Gemini selection fails, workflow_type remains 'pending'."""
    img_id = _create_and_store_mock_image()
    create_res = client.post(
        "/api/v1/analyses",
        json={"image_ids": [img_id], "query": "What is in this image?"},
    )
    assert create_res.status_code == 201
    analysis_id = create_res.json()["data"]["analysis_id"]

    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = Exception("Gemini API Connection Failed")

    with patch("app.router.gemini_selector.genai.Client", return_value=mock_client):
        run_res = client.post(f"/api/v1/analyses/{analysis_id}/run")
        # GeminiModelSelector catches API errors and raises ValidationException (HTTP 422)
        assert run_res.status_code == 422

    # Verify workflow_type was NOT updated and remains 'pending'
    get_after_fail = client.get(f"/api/v1/analyses/{analysis_id}")
    assert get_after_fail.status_code == 200
    assert get_after_fail.json()["data"]["workflow_type"] == "pending"


def test_run_analysis_invalid_uuid_format():
    """Test POST /api/v1/analyses/{analysis_id}/run returns HTTP 422 for malformed UUID."""
    malformed_id = "invalid-uuid-string"
    response = client.post(f"/api/v1/analyses/{malformed_id}/run")
    assert response.status_code == 422
    data = response.json()
    assert data["status"] == "error"
    assert data["error_type"] == "ValidationException"




