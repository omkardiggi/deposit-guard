import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# On a serverless host the bundle directory is read-only; only /tmp is writable.
# DEPOSITGUARD_DB_PATH lets the deployment point SQLite somewhere it can write.
# (Vercel sets VERCEL=1 in the function environment.)
_DEFAULT_DB = "/tmp/depositguard.db" if os.getenv("VERCEL") else os.path.join(BASE_DIR, "depositguard.db")
DB_PATH = os.getenv("DEPOSITGUARD_DB_PATH", _DEFAULT_DB)
os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

# Enable SQLite foreign key constraints & WAL mode for speed and integrity
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

