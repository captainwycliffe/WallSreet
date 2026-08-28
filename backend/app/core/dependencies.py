from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from redis.asyncio import Redis
import time
from typing import Optional

from app.db.session import get_session
from app.core.config import settings
from app.core.security import verify_token, hash_api_key
from app.core.exceptions import AuthenticationError, RateLimitError
from app.models.user import User
from app.models.account import EARegistration

security = HTTPBearer()

async def get_db() -> AsyncSession:
    async for session in get_session():
        yield session

async def get_redis() -> Redis:
    redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        yield redis
    finally:
        await redis.close()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise AuthenticationError("Invalid token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationError("Invalid token payload")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise AuthenticationError("User not found")
        
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise AuthenticationError("Inactive user")
    return current_user

async def get_ea_from_api_key(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> EARegistration:
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        raise AuthenticationError("Missing API Key")
        
    hashed_key = hash_api_key(api_key)
    result = await db.execute(select(EARegistration).where(EARegistration.api_key == hashed_key))
    ea = result.scalar_one_or_none()
    
    if not ea or not ea.is_active:
        raise AuthenticationError("Invalid or inactive EA API Key")
        
    return ea

class RateLimiter:
    def __init__(self, requests: int, window: int):
        self.requests = requests
        self.window = window

    async def __call__(self, request: Request, redis: Redis = Depends(get_redis)):
        client_ip = request.client.host
        key = f"rate_limit:{client_ip}"
        
        current = await redis.get(key)
        if current and int(current) >= self.requests:
            raise RateLimitError()
            
        pipe = redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, self.window)
        await pipe.execute()
