"""Analytics summary — Progress 2 added weekly_trend, avg_resolution_days,
top_states. This locks the response shape down so frontend chart code can
rely on it."""
from tests.conftest import auth_headers


def test_analytics_summary_shape(client, admin_token):
    res = client.get("/api/v1/admin/analytics/summary", headers=auth_headers(admin_token))
    assert res.status_code == 200
    data = res.get_json()["data"]
    for key in [
        "total_reports", "by_status", "by_hazard_type",
        "weekly_trend", "avg_resolution_days", "top_states",
    ]:
        assert key in data, f"missing key: {key}"
    assert isinstance(data["weekly_trend"], list)
    assert isinstance(data["top_states"], list)


def test_archive_csv_export_returns_csv(client, admin_token):
    res = client.get("/api/v1/admin/archive/export.csv", headers=auth_headers(admin_token))
    assert res.status_code == 200
    assert res.mimetype == "text/csv"
    body = res.get_data(as_text=True)
    assert "report_id,title,hazard_type" in body  # header row


def test_model_info_endpoint(client, admin_token):
    # /detection/model-info is admin-gated: no token must be rejected.
    res = client.get("/api/v1/detection/model-info")
    assert res.status_code in (401, 422)

    res = client.get("/api/v1/detection/model-info", headers=auth_headers(admin_token))
    assert res.status_code == 200
    # The mocked YOLO doesn't have model_info patched, so this will either
    # return real model_info if ultralytics installed, or an error dict;
    # either way the wrapper should be 200.
    assert "data" in res.get_json()
