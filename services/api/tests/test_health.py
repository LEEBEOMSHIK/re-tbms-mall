import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch, tmp_path):
    from app.main import create_app
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    with TestClient(create_app(env_file=tmp_path / "missing.env")) as client:
        yield client


def test_health_contract(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "re-tbms-mall-api"}


def test_docs_and_openapi_available(client):
    assert client.get("/docs").status_code == 200
    assert "/api/v1/health" in client.get("/openapi.json").json()["paths"]


@pytest.mark.parametrize("origin", ["http://localhost:3100", "http://127.0.0.1:3100"])
def test_local_origins_allowed(client, origin):
    response = client.get("/api/v1/health", headers={"Origin": origin})
    assert response.headers["access-control-allow-origin"] == origin
    preflight = client.options("/api/v1/health", headers={
        "Origin": origin, "Access-Control-Request-Method": "GET"
    })
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == origin


def test_unknown_origin_not_allowed(client):
    response = client.get("/api/v1/health", headers={"Origin": "https://untrusted.example"})
    assert "access-control-allow-origin" not in response.headers
    preflight = client.options("/api/v1/health", headers={
        "Origin": "https://untrusted.example", "Access-Control-Request-Method": "GET"
    })
    assert preflight.status_code == 400
    assert "access-control-allow-origin" not in preflight.headers


def test_environment_origins_override_dotenv(monkeypatch, tmp_path):
    from app.main import create_app
    env_file = tmp_path / ".env"
    env_file.write_text("CORS_ORIGINS=https://file.example\n", encoding="utf-8")
    monkeypatch.setenv("CORS_ORIGINS", " https://first.example, https://second.example, ")
    with TestClient(create_app(env_file=env_file)) as client:
        for origin in ["https://first.example", "https://second.example"]:
            response = client.get("/api/v1/health", headers={"Origin": origin})
            assert response.headers["access-control-allow-origin"] == origin
        for origin in ["https://file.example", "http://localhost:3100"]:
            assert "access-control-allow-origin" not in client.get(
                "/api/v1/health", headers={"Origin": origin}
            ).headers


def test_dotenv_works_outside_service_directory(monkeypatch, tmp_path):
    from app.main import create_app
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    env_file = tmp_path / ".env"
    env_file.write_text("CORS_ORIGINS=https://file.example\n", encoding="utf-8")
    other = tmp_path / "elsewhere"
    other.mkdir()
    monkeypatch.chdir(other)
    with TestClient(create_app(env_file=env_file)) as client:
        response = client.get("/api/v1/health", headers={"Origin": "https://file.example"})
        assert response.headers["access-control-allow-origin"] == "https://file.example"


def test_empty_origins_allow_none(monkeypatch, tmp_path):
    from app.main import create_app
    monkeypatch.setenv("CORS_ORIGINS", "")
    with TestClient(create_app(env_file=tmp_path / "missing.env")) as client:
        response = client.get("/api/v1/health", headers={"Origin": "http://localhost:3100"})
        assert "access-control-allow-origin" not in response.headers


def test_default_service_dotenv_supports_windows_utf8_bom(monkeypatch, tmp_path):
    import app.config as config
    from app.main import create_app
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    monkeypatch.setattr(config, "SERVICE_DIR", tmp_path)
    (tmp_path / ".env").write_text("CORS_ORIGINS=https://windows.example\n", encoding="utf-8-sig")
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    monkeypatch.chdir(elsewhere)
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/health", headers={"Origin": "https://windows.example"})
        assert response.headers.get("access-control-allow-origin") == "https://windows.example"


def test_empty_dotenv_origins_allow_none(monkeypatch, tmp_path):
    from app.main import create_app
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    env_file = tmp_path / ".env"
    env_file.write_text("CORS_ORIGINS=\n", encoding="utf-8")
    with TestClient(create_app(env_file=env_file)) as client:
        response = client.get("/api/v1/health", headers={"Origin": "http://localhost:3100"})
        assert "access-control-allow-origin" not in response.headers
