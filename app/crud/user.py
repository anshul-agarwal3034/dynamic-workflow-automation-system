from sqlalchemy.orm import Session
from app.models.user import User


def get_user_by_email(db: Session, email: str) -> User | None:
    """
    Look up a user row by unique email address (case-insensitive search).
    """
    return db.query(User).filter(User.email == email.strip().lower()).first()


def get_user_by_id(db: Session, user_id: str) -> User | None:
    """
    Look up a user row by primary key UUID.
    """
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, full_name: str, email: str, password_hash: str) -> User:
    """
    Creates and persists a new User entity in PostgreSQL.
    """
    db_user = User(
        full_name=full_name.strip(),
        email=email.strip().lower(),
        password_hash=password_hash
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
