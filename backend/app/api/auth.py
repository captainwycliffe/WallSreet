from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse, RefreshRequest
from app.services.auth_service import AuthService
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_session)):
    service = AuthService(db)
    return await service.register_user(req)

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_session)):
    service = AuthService(db)
    return await service.login_user(req)

@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest, db: AsyncSession = Depends(get_session)):
    # Simple mock refresh for now
    from app.core.security import verify_token, create_access_token, create_refresh_token
    from app.core.exceptions import AuthenticationError
    payload = verify_token(req.refresh_token)
    if not payload or not payload.get("refresh"):
        raise AuthenticationError("Invalid refresh token")
    
    sub = payload.get("sub")
    return TokenResponse(
        access_token=create_access_token({"sub": sub}),
        refresh_token=create_refresh_token({"sub": sub})
    )

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return {"status": "logged out"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
