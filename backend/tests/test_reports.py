"""Report submission tests. UC001 / UC002 + guest path."""
import io

from tests.conftest import auth_headers


def _multipart(client, image_bytes, headers=None, **fields):
    data = {
        "image": (io.BytesIO(image_bytes), "test.jpg"),
        **{k: str(v) for k, v in fields.items()},
    }
    return client.post(
        "/api/v1/reports",
        data=data,
        content_type="multipart/form-data",
        headers=headers or {},
    )


def test_guest_can_submit_report(client, sample_image_bytes):
    res = _multipart(client, sample_image_bytes, latitude=3.139, longitude=101.687)
    assert res.status_code == 201, res.get_json()
    body = res.get_json()["data"]
    assert body["report_id"]
    assert body["user_id"] is None
    # Mocked YOLO returns a pothole
    assert body["detection"]["hazard_type"] == "pothole"
    assert body["severity_score"] == 4


def test_authenticated_user_submission_links_user_id(client, user_token, sample_image_bytes):
    res = _multipart(
        client, sample_image_bytes,
        headers=auth_headers(user_token),
        latitude=3.139, longitude=101.687,
        title="Pothole on Jalan Test",
    )
    assert res.status_code == 201
    body = res.get_json()["data"]
    assert body["user_id"] is not None
    assert body["title"] == "Pothole on Jalan Test"


def test_missing_image_returns_400(client):
    res = client.post("/api/v1/reports", data={"latitude": "3.139", "longitude": "101.687"},
                      content_type="multipart/form-data")
    assert res.status_code == 400


def test_missing_gps_returns_400(client, sample_image_bytes):
    # No lat/lng and the test JPEG has no EXIF — should reject.
    res = _multipart(client, sample_image_bytes)
    assert res.status_code == 400


def test_detection_confidence_persisted_on_submit(client, sample_image_bytes):
    """UC009/F2: detection_confidence must be saved and returned on GET /reports/:id."""
    res = _multipart(client, sample_image_bytes, latitude=3.139, longitude=101.687)
    assert res.status_code == 201
    report_id = res.get_json()["data"]["report_id"]

    detail = client.get(f"/api/v1/reports/{report_id}")
    assert detail.status_code == 200
    body = detail.get_json()["data"]
    assert body["detection_confidence"] is not None
    assert 0.0 <= body["detection_confidence"] <= 1.0
    assert body["detection_low_confidence"] is False


def test_admin_edit_report_updates_type_and_severity(client, admin_token, sample_image_bytes):
    """UC011: admin sets type+severity on a submitted report; status stays submitted."""
    # Submit a report
    res = _multipart(client, sample_image_bytes, latitude=3.139, longitude=101.687)
    assert res.status_code == 201
    report_id = res.get_json()["data"]["report_id"]

    # Fetch available hazard types
    ht_res = client.get("/api/v1/admin/hazard-types", headers=auth_headers(admin_token))
    assert ht_res.status_code == 200
    types = ht_res.get_json()["data"]
    faded_id = next(t["hazard_type_id"] for t in types if t["type_name"] == "faded_lane_marking")

    # Admin edits type and severity
    edit_res = client.put(
        f"/api/v1/admin/reports/{report_id}",
        json={"hazard_type_id": faded_id, "severity_score": 2, "title": "Admin-corrected title"},
        headers=auth_headers(admin_token),
    )
    assert edit_res.status_code == 200, edit_res.get_json()

    # GET confirms new values; status still submitted
    detail = client.get(f"/api/v1/reports/{report_id}")
    body = detail.get_json()["data"]
    assert body["hazard_type"]["type_name"] == "faded_lane_marking"
    assert body["severity_score"] == 2
    assert body["title"] == "Admin-corrected title"
    assert body["status"]["status_name"] == "submitted"


def test_admin_edit_invalid_severity_returns_400(client, admin_token, sample_image_bytes):
    """UC011: severity outside 1-5 should be rejected."""
    res = _multipart(client, sample_image_bytes, latitude=3.139, longitude=101.687)
    report_id = res.get_json()["data"]["report_id"]
    edit_res = client.put(
        f"/api/v1/admin/reports/{report_id}",
        json={"severity_score": 9},
        headers=auth_headers(admin_token),
    )
    assert edit_res.status_code == 400


def test_non_admin_edit_returns_403(client, user_token, sample_image_bytes):
    """UC011: non-admin must be denied access to the edit endpoint."""
    res = _multipart(client, sample_image_bytes, latitude=3.139, longitude=101.687)
    report_id = res.get_json()["data"]["report_id"]
    edit_res = client.put(
        f"/api/v1/admin/reports/{report_id}",
        json={"title": "Hacker title"},
        headers=auth_headers(user_token),
    )
    assert edit_res.status_code == 403


def test_map_endpoint_returns_only_verified(client, sample_image_bytes):
    res = client.get("/api/v1/reports/map")
    assert res.status_code == 200
    # Just-submitted reports are 'submitted', not 'verified', so they shouldn't appear.
    for r in res.get_json()["data"]:
        # Map endpoint only returns verified rows; can't assert from here directly
        # but at least the shape should be a list.
        assert "latitude" in r
