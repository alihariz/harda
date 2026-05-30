"""Authorization guardrails — Progress 2 added crew-only endpoints and
team-scoped after-photo upload. These tests catch privilege escalation."""
import io

from tests.conftest import auth_headers


def _submit(client, image_bytes, **fields):
    data = {
        "image": (io.BytesIO(image_bytes), "t.jpg"),
        **{k: str(v) for k, v in fields.items()},
    }
    return client.post("/api/v1/reports", data=data, content_type="multipart/form-data")


def test_user_cannot_access_admin_endpoints(client, user_token):
    res = client.get("/api/v1/admin/teams", headers=auth_headers(user_token))
    assert res.status_code == 403


def test_user_cannot_access_crew_endpoints(client, user_token):
    res = client.get("/api/v1/crew/assignments", headers=auth_headers(user_token))
    assert res.status_code == 403


def test_anonymous_cannot_access_admin_endpoints(client):
    res = client.get("/api/v1/admin/teams")
    # JWT extension returns 401 for missing token
    assert res.status_code in (401, 422)


def test_crew_cannot_resolve_report_assigned_to_other_team(
    client, admin_token, crew_token, other_crew_token, sample_image_bytes,
):
    # Setup: submit, validate, assign to KL team (the 'crew_token' team)
    res = _submit(client, sample_image_bytes, latitude=3.139, longitude=101.687)
    report_id = res.get_json()["data"]["report_id"]

    client.put(f"/api/v1/reports/{report_id}/validate",
               json={"hazard_type_id": 1}, headers=auth_headers(admin_token))

    teams = client.get("/api/v1/admin/teams", headers=auth_headers(admin_token)).get_json()["data"]
    kl_team_id = next(t["team_id"] for t in teams if t["team_name"] == "KL Maintenance Crew")
    client.put(f"/api/v1/admin/reports/{report_id}/assign",
               json={"team_id": kl_team_id}, headers=auth_headers(admin_token))

    # other_crew (on a different team) tries to upload an after-photo — must fail
    after = {"image": (io.BytesIO(sample_image_bytes), "after.jpg")}
    res = client.post(
        f"/api/v1/reports/{report_id}/after-photo",
        data=after,
        content_type="multipart/form-data",
        headers=auth_headers(other_crew_token),
    )
    assert res.status_code == 400
    assert "not assigned to your team" in (res.get_json().get("message") or "").lower()
