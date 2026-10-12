"""Clear per-process throttling between independent test scenarios.

This fixture imports the app when tests run, after test modules configure the
isolated test data directory. It does not disable rate limits in production.
"""
import pytest


@pytest.fixture(autouse=True)
def reset_all_test_throttle_windows():
    from app.main import RATE_LOCK, RATE_WINDOWS
    with RATE_LOCK:
        RATE_WINDOWS.clear()
