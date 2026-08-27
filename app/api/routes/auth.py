from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.crud.user import get_user_by_email, create_user
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.auth import SignupRequest, SigninRequest, TokenResponse, UserResponse
from app.models.user import User

router = APIRouter()


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    """
    Registers a new user account.
    Checks for email uniqueness (returns 409 Conflict if taken).
    Hashes the password with bcrypt before persisting to PostgreSQL.
    """
    existing_user = get_user_by_email(db, email=payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists."
        )

    hashed_pw = hash_password(payload.password)
    new_user = create_user(
        db=db,
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hashed_pw
    )

    return new_user


@router.post("/signin", response_model=TokenResponse)
def signin(payload: SigninRequest, db: Session = Depends(get_db)):
    """
    Authenticates user credentials and issues a JWT access token.
    Returns 401 Unauthorized for invalid email or incorrect password.
    """
    user = get_user_by_email(db, email=payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    access_token = create_access_token(user_id=str(user.id))
    return TokenResponse(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Retrieves the currently authenticated user's profile information.
    Requires a valid JWT Bearer token in the Authorization header.
    """
    return current_user
