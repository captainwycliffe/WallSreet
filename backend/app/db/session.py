from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from app.core.config import settings


def clean_database_url(raw_url: str) -> str:
    if not raw_url:
        return raw_url

    url = raw_url.strip()
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]

    parsed = urlparse(url)
    if parsed.query:
        query_params = parse_qs(parsed.query)
        ssl_val = query_params.pop("sslmode", None) or query_params.pop("ssl", None)
        query_params.pop("channel_binding", None)

        new_query = {}
        for k, v in query_params.items():
            new_query[k] = v[-1] if isinstance(v, list) else v

        if ssl_val:
            new_query["ssl"] = ssl_val[-1] if isinstance(ssl_val, list) else ssl_val

        url = urlunparse(parsed._replace(query=urlencode(new_query)))

    return url


db_url = clean_database_url(settings.DATABASE_URL)
engine_kwargs = {"echo": False}
if "sqlite" not in db_url:
    engine_kwargs["pool_pre_ping"] = True

engine = create_async_engine(db_url, **engine_kwargs)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
