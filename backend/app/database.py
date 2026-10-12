import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Load environment variables from .env file
load_dotenv()

#Read DATABASE_URL or fail back to local default
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5433/devtrack",
)


# 1. Database Engine: manages the pool of connections to PostgreSQL
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to True if you want to see all raw SQL queries printed in the console
)

# 2 SessionLocal: factory for producingg new database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# 3. Declarative Base: base class for all SQLAlchemy ORM models
class Base(DeclarativeBase):
    pass
# 4. Dependency: yields a database session per HTTP request and closes it safely
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

