from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.exceptions import AuthenticationError, DuplicateError
from app.repositories.user_repo import UserRepository

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register_user(self, req: RegisterRequest) -> User:
        if await self.user_repo.get_by_email(req.email):
            raise DuplicateError("Email already registered")
        if await self.user_repo.get_by_username(req.username):
            raise DuplicateError("Username already taken")
            
        user = User(
            email=req.email,
            username=req.username,
            password_hash=hash_password(req.password)
        )
        return await self.user_repo.create(user)

    async def login_user(self, req: LoginRequest) -> TokenResponse:
        user = await self.user_repo.get_by_email(req.email)
        if not user or not verify_password(req.password, user.password_hash):
            raise AuthenticationError("Invalid email or password")
            
        access_token = create_access_token({"sub": user.id})
        refresh_token = create_refresh_token({"sub": user.id})
        
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)
