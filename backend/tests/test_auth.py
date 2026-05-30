"""Auth flow tests — login claims must carry role/team for the mobile app."""
import jwt


def _decode(token):
    return jwt.decode(token, options={"verify_signature": False})


def test_admin_login_returns_admin_role(client):
    res = client.post("/api/v1/auth/admin/login",
                      json={"email": "admin@harda.my", "password": "Admin123!"})
    assert res.status_code == 200
    body = res.get_json()
    claims = _decode(body["data"]["access_token"])
    assert claims["role"] == "admin"


def test_user_login_returns_user_role(client):
    res = client.post("/api/v1/auth/login",
                      json={"email": "user@harda.my", "password": "User123!"})
    assert res.status_code == 200
    body = res.get_json()
    claims = _decode(body["data"]["access_token"])
    assert claims["role"] == "user"
    assert "team_id" not in claims  # public users have no team


def test_crew_login_includes_team_id_claim(client):
    res = client.post("/api/v1/auth/login",
                      json={"email": "crew_kl@harda.my", "password": "Crew123!"})
    assert res.status_code == 200
    body = res.get_json()
    claims = _decode(body["data"]["access_token"])
    assert claims["role"] == "crew"
    assert claims["team_id"] is not None


def test_wrong_password_returns_401(client):
    res = client.post("/api/v1/auth/login",
                      json={"email": "user@harda.my", "password": "nope"})
    assert res.status_code == 401
