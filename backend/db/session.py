import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def _get_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    # In Vercel or AWS Lambda serverless environments, root is read-only; use /tmp
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return "sqlite:////tmp/eduadapt.db"
    return "sqlite:///./eduadapt.db"


DATABASE_URL = _get_database_url()

# For SQLite, connect_args needs check_same_thread=False
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from backend.db import models  # noqa
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: init_db encountered error: {e}")
