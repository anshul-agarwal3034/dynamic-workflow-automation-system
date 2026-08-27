import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from app.config import settings


def hash_password(password: str) -> str:
    """
    Hashes a plain-text password using bcrypt with a randomly generated salt.
    Returns the hashed password string starting with $2b$.
    """
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    return hashed_bytes.decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verifies a plain-text password against a stored bcrypt hash string.
    Returns True if the password matches, False otherwise.
    """
    try:
        plain_bytes = plain.encode('utf-8')
        hashed_bytes = hashed.encode('utf-8')
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    """
    Generates a signed JWT access token containing the user ID as the 'sub' claim
    and an expiration timestamp ('exp') based on JWT_EXPIRE_MINUTES setting.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "exp": expire
    }
    encoded_jwt = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict | None:
    """
    Decodes and validates a JWT token using the application's secret key and algorithm.
    Returns the decoded payload dict on success, or None on expiration / decoding failure.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception):
        return None
