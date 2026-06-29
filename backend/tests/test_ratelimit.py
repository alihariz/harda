"""NFR8 — API rate limiting.

Verifies that sensitive endpoints (auth) return HTTP 429 once the configured
per-window limit is exceeded. The standard testing config keeps limiting OFF so
the rest of the suite stays deterministic; this module spins up its own app with
limiting enabled and forces the global flag back off in teardown.
"""
import pytest

from app import create_app, db as _db, limiter


@pytest.fixture
def limited_client():
    app = create_app("testing")
    app.config.update(
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        RATELIMIT_ENABLED=True,
        RATELIMIT_AUTH="3 per minute",
    )
    limiter.init_app(app)  # re-reads config → enabled for this run
    with app.app_context():
        _db.create_all()
        limiter.reset()  # clear any counters from earlier in the session
        try:
            yield app.test_client()
        finally:
            _db.session.remove()
            _db.drop_all()
            limiter.reset()
    # Force limiting back off so the rest of the (testing-config) suite is unaffected.
    limiter.enabled = False


def test_auth_endpoint_returns_429_after_threshold(limited_client):
    """Limit is "3 per minute" → the 4th request inside the window must be 429."""
    statuses = []
    for _ in range(5):
        resp = limited_client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@harda.my", "password": "wrong"},
        )
        statuses.append(resp.status_code)

    assert 429 in statuses, f"expected a 429 once the limit is exceeded, got {statuses}"
    # First three are allowed (401 bad creds), the fourth trips the limiter.
    assert statuses.index(429) == 3, f"limit should trip on the 4th call, got {statuses}"


def test_rate_limiting_disabled_in_testing_config():
    """The shared testing config must keep limiting OFF for suite stability."""
    app = create_app("testing")
    assert app.config["RATELIMIT_ENABLED"] is False
