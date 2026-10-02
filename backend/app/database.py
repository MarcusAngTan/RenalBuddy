import ssl
from urllib.parse import urlparse

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings


class Base(DeclarativeBase):
    pass


_engine = None


def _mysql_connect_args(database_url: str) -> dict:
    """TiDB Cloud Serverless requires TLS; enable when host looks like TiDB."""
    normalized = database_url.replace("mysql+pymysql://", "mysql://", 1)
    host = (urlparse(normalized).hostname or "").lower()
    if "tidbcloud.com" in host or host.endswith(".tidb.amazonaws.com"):
        return {"ssl": ssl.create_default_context()}
    return {}


def get_engine():
    global _engine
    if _engine is None:
        url = get_settings().database_url
        if url.startswith("sqlite"):
            _engine = create_engine(
                url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
        else:
            connect_args = _mysql_connect_args(url)
            _engine = create_engine(url, pool_pre_ping=True, connect_args=connect_args or None)
    return _engine


def get_db():
    db = sessionmaker(bind=get_engine(), autoflush=False, autocommit=False)()
    try:
        yield db
    finally:
        db.close()
