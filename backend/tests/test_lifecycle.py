"""End-to-end lifecycle test:
submit (guest) → admin validates → admin assigns team → crew uploads after-photo → resolved.

This exercises the entire Progress 2 happy path through the API surface.
"""
import io

from tests.conftest import auth_headers


def _submit(client, image_bytes, **fields):
    data = {
        "image": (io.BytesIO(image_bytes), "test.jpg"),
        **{k: str(v) for k, v in fields.items()},
    }
    return client.post("/api/v1/reports", data=data,
                       content_type="multipart/form-data")


def test_full_progress2_lifecycle(
    client, admin_token, crew_token, sample_image_bytes,
):
    # 1. Guest submits
    res = _submit(client, sample_image_bytes, latitude=3.139, longitude=101.687,
                  title="Lifecycle pothole")
    assert res.status_code == 201
    report_id = res.get_json()["data"]["report_id"]

    # 2. Admin validates → status 'verified'
    res = client.put(
        f"/api/v1/reports/{report_id}/validate",
        json={"hazard_type_id": 1},
        headers=auth_headers(admin_token),
    )
    assert res.status_code == 200, res.get_json()
    assert res.get_json()["data"]["status"]["status_name"] == "verified"

    # 3. Admin assigns the KL team → status 'in_progress'
    teams = client.get("/api/v1/admin/teams", headers=auth_headers(admin_token)).get_json()["data"]
    kl_team = next(t for t in teams if t["team_name"] == "KL Maintenance Crew")

    res = client.put(
        f"/api/v1/admin/reports/{report_id}/assign",
        json={"team_id": kl_team["team_id"]},
        headers=auth_headers(admin_token),
    )
    assert res.status_code == 200, res.get_json()
    body = res.get_json()["data"]
    assert body["status"]["status_name"] == "in_progress"
    assert body["assigned_team_id"] == kl_team["team_id"]
    assert body["assigned_at"] is not None

    # 4. Crew sees it in their inbox
    res = client.get("/api/v1/crew/assignments", headers=auth_headers(crew_token))
    assert res.status_code == 200
    inbox = res.get_json()["data"]["assignments"]
    assert any(r["report_id"] == report_id for r in inbox)

    # 5. Crew uploads after-photo → status 'resolved'
    after_data = {
        "image": (io.BytesIO(sample_image_bytes), "after.jpg"),
    }
    res = client.post(
        f"/api/v1/reports/{report_id}/after-photo",
        data=after_data,
        content_type="multipart/form-data",
        headers=auth_headers(crew_token),
    )
    assert res.status_code == 200, res.get_json()
    body = res.get_json()["data"]
    assert body["report"]["status"]["status_name"] == "resolved"
    assert body["report"]["resolution_date"] is not None
    assert body["after_image"]["is_resolution_photo"] is True

    # 6. Report is NOT yet in archive (archived_at is explicit action, not auto)
    res = client.get("/api/v1/admin/archive", headers=auth_headers(admin_token))
    assert res.status_code == 200
    archive = res.get_json()["data"]["reports"]
    assert not any(r["report_id"] == report_id for r in archive)

    # 7. Admin explicitly archives the resolved report
    res = client.post(
        f"/api/v1/admin/reports/{report_id}/archive",
        headers=auth_headers(admin_token),
    )
    assert res.status_code == 200, res.get_json()
    body = res.get_json()["data"]
    assert body["archived_at"] is not None
    assert body["archived_by"] is not None

    # 8. Now it appears in the archive
    res = client.get("/api/v1/admin/archive", headers=auth_headers(admin_token))
    assert res.status_code == 200
    archive = res.get_json()["data"]["reports"]
    assert any(r["report_id"] == report_id for r in archive)
