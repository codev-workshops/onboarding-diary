import os
from dataclasses import dataclass
from pathlib import Path


TRUTHY_VALUES = {"1", "true", "on", "yes"}

DEFAULT_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


def load_env_file(path: Path | None = None) -> dict[str, str]:
    """Load KEY=VALUE pairs from a .env file into the process environment.

    Values already present in the environment are never overridden, so
    real environment variables always take precedence over the file.
    """
    env_file = path
    if env_file is None:
        override = os.getenv("ENV_FILE", "").strip()
        env_file = Path(override) if override else DEFAULT_ENV_FILE
    loaded: dict[str, str] = {}
    if not env_file.is_file():
        return loaded
    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        loaded[key] = value
        os.environ.setdefault(key, value)
    return loaded


@dataclass(frozen=True)
class DataStoreSettings:
    persistent_store_enabled: bool
    database_url: str

    @classmethod
    def from_environment(cls) -> "DataStoreSettings":
        load_env_file()
        flag = os.getenv("PERSISTENT_STORE", "").strip().lower()
        return cls(
            persistent_store_enabled=flag in TRUTHY_VALUES,
            database_url=os.getenv("DATABASE_URL", "").strip(),
        )
