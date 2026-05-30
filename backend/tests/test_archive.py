"""UC011 — Archive lifecycle tests.

Covers: explicit archive action, eligibility guard, bulk archive, unarchive,
and non-admin rejection.
"""
import io

from tests.conftest import auth_headers


def _submit_and_resolve(client, admin_token, crew_token, sample_image_bytes, title="Archive test"):
    """Helper: submit → verify → assign → after-photo → resolved. Returns report_id."""
    data = {
        "image": (io.BytesIO(sample_image_bytes), "test.jpg"),
        "latitude": "3.139",
        "longitude": "101.687",
        "title": title,
    }
    res = client.post("/api/v1/reports", data=data, content_type="multipart/form-data")
    assert res.status_code == 201
    report_id = res.get_json()["data"]["report_id"]

    client.put(
        f"/api/v1/reports/{report_id}/validate",
        json={"hazard_type_id": 1},
        headers=auth_headers(admin_token),
    )
    teams = client.get("/api/v1/admin/teams", headers=auth_headers(admin_token)).get_json()["data"]
    kl_team = next(t for t in teams if t["team_name"] == "KL Maintenance Crew")
    client.put(
        f"/api/v1/admin/reports/{report_id}/assign",
        json={"team_id": kl_team["team_id"]},
        headers=auth_headers(admin_token),
    )
    after_data = {"image": (io.BytesIO(sample_image_bytes), "after.jpg")}
    client.post(
        f"/api/v1/reports/{report_id}/after-photo",
        data=after_data,
        content_type="multipart/form-data",
        headers=auth_headers(crew_token),
    )
    return report_id


def test_archive_resolved_appears_in_archive_not_queue(
    client, admin_token, crew_token, sample_image_bytes
):
    report_id = _submit_and_resolve(
        client, admin_token, crew_token, sample_image_bytes,
        title="ArchiveTest-resolved"
    )

    # Not in archive yet
    archive_before = client.get(
        "/api/v1/admin/archive", headers=auth_headers(admin_token)
    ).get_json()["data"]["reports"]
    assert not any(r["report_id"] == report_id for r in archive_before)

    # Explicit archive action
    res = client.post(
        f"/api/v1/admin/reports/{report_id}/archive",
        headers=auth_headers(admin_token),
    )
    assert res.status_code == 200, res.get_json()
    body = res.get_json()["data"]
    assert body["archived_at"] is not None
    assert body["archived_by"] is not None

    # Now in archive
    archive_after = client.get(
        "/api/v1/admin/archive", headers=auth_headers(admin_token)
    ).get_json()["data"]["reports"]
    assert any(r["report_id"] == report_id for r in archive_after)

    # No longer in the default active queue
    queue = client.get(
        "/api/v1/admin/reports", headers=auth_headers(admin_token)
    ).get_json()["data"]["reports"]
    assert not any(r["report_id"] == report_id for r in queue)

    # Visible with include_archived=true
    queue_all = client.get(
        "/api/v1/admin/reports?include_archived=true",
        headers=auth_headers(admin_token),
    ).get_json()["data"]["reports"]
    assert any(r["report_id"] == report_id for r in queue_all)


def test_archive_submitted_report_returns_400(client, admin_token, sample_image_bytes):
    data = {
        "image": (io.BytesIO(sample_image_bytes), "test.jpg"),
        "latitude": "3.139",
        "longitude": "101.687",
        "title": "ArchiveTest-submitted",
    }
    res = client.post("/api/v1/reports", data=data, content_type="multipart/form-data")
    assert res.status_code == 201
    report_id = res.get_json()["data"]["report_id"]

    res = client.post(
        f"/api/v1/admin/reports/{report_id}/archive",
        headers=auth_headers(admin_token),
    )
    assert res.status_code == 400
    assert "Only resolved or rejected" in res.get_json().get("message", "")


def test_bulk_archive_skips_ineligible(
    client, admin_token, crew_token, sample_image_bytes
):
    # Two resolved reports
    r1 = _submit_and_resolve(
        client, admin_token, crew_token, sample_image_bytes, title="Bulk-A"
    )
    r2 = _submit_and_resolve(
        client, admin_token, crew_token, sample_image_bytes, title="Bulk-B"
    )
    # One submitted report (ineligible)
    data = {
        "image": (io.BytesIO(sample_image_bytes), "test.jpg"),
        "latitude": "3.139",
        "longitude": "101.687",
        "title": "Bulk-C-submitted",
    }
    res = client.post("/api/v1/reports", data=data, content_type="multipart/form-data")
    r3 = res.get_json()["data"]["report_id"]

    res = client.post(
        "/api/v1/admin/reports/bulk-action",
        json={"action": "archive", "report_ids": [r1, r2, r3]},
        headers=auth_headers(admin_token),
    )
    assert res.status_code == 200, res.get_json()
    body = res.get_json()["data"]
    assert body["archived"] == 2
    assert len(body["skipped"]) == 1
    assert body["skipped"][0]["report_id"] == r3


def test_unarchive_restores_report_to_queue(
    client, admin_token, crew_token, sample_image_bytes
):
    report_id = _submit_and_resolve(
        client, admin_token, crew_token, sample_image_bytes, title="UnarchiveTest"
    )
    client.post(
        f"/api/v1/admin/reports/{report_id}/archive",
        headers=auth_headers(admin_token),
    )

    res = client.post(
        f"/api/v1/admin/reports/{report_id}/unarchive",
        headers=auth_headers(admin_token),
    )
    assert res.status_code == 200, res.get_json()
    body = res.get_json()["data"]
    assert body["archived_at"] is None
    assert body["archived_by"] is None

    # No longer in archive
    archive = client.get(
        "/api/v1/admin/archive", headers=auth_headers(admin_token)
    ).get_json()["data"]["reports"]
    assert not any(r["report_id"] == report_id for r in archive)

    # Back in active queue
    queue = client.get(
        "/api/v1/admin/reports", headers=auth_headers(admin_token)
    ).get_json()["data"]["reports"]
    assert any(r["report_id"] == report_id for r in queue)


def test_non_admin_cannot_archive(client, user_token, sample_image_bytes):
    data = {
        "image": (io.BytesIO(sample_image_bytes), "test.jpg"),
        "latitude": "3.139",
        "longitude": "101.687",
        "title": "AuthzTest-archive",
    }
    res = client.post("/api/v1/reports", data=data, content_type="multipart/form-data")
    report_id = res.get_json()["data"]["report_id"]

    res = client.post(
        f"/api/v1/admin/reports/{report_id}/archive",
        headers=auth_headers(user_token),
    )
    assert res.status_code == 403
