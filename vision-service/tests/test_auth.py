"""The vision service must only serve authenticated staff accounts."""

from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import make_token
from tests.synthetic import synthetic_lot

client = TestClient(app)


def test_protected_endpoint_requires_token():
    response = client.get("/survey/profiles")
    assert response.status_code == 401


def test_protected_endpoint_rejects_invalid_token():
    response = client.get(
        "/survey/profiles",
        headers={"Authorization": "Bearer not-a-jwt"},
    )
    assert response.status_code == 401


def test_protected_endpoint_rejects_token_signed_with_another_secret():
    forged = make_token("MANAGER", secret="some-other-secret-some-other-secret-0123456789")
    response = client.get("/survey/profiles", headers={"Authorization": f"Bearer {forged}"})
    assert response.status_code == 401


def test_protected_endpoint_rejects_expired_token(staff_headers):
    expired = make_token("MANAGER", expires_in=-60)
    response = client.get("/survey/profiles", headers={"Authorization": f"Bearer {expired}"})
    assert response.status_code == 401


def test_driver_role_is_forbidden(driver_headers):
    response = client.get("/survey/profiles", headers=driver_headers)
    assert response.status_code == 403


def test_manager_role_is_allowed(staff_headers):
    response = client.get("/survey/profiles", headers=staff_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_backend_style_long_secret_tokens_are_accepted():
    # JJWT upgrades the HMAC algorithm to HS384/HS512 when the secret is long
    # enough; the vision service must accept the whole family.
    for algorithm in ("HS384", "HS512"):
        token = make_token("MANAGER", algorithm=algorithm)
        response = client.get("/survey/profiles", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200, algorithm


def test_health_stays_public():
    response = client.get("/health")
    assert response.status_code == 200
