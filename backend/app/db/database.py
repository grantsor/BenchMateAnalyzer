from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Non-destructive migrations for existing SQLite databases
        for col_name, col_type in [("source_folder", "VARCHAR(512)"), ("aliases", "TEXT")]:
            try:
                await conn.execute(text(f"ALTER TABLE ssd_models ADD COLUMN {col_name} {col_type}"))
            except Exception:
                pass
