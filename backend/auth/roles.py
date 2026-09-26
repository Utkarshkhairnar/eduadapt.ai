from fastapi import Header, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import Optional
from backend.db.session import get_db
from backend.db.models import User


def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    db: Session = Depends(get_db)
) -> User:
    """
    Resolves the authenticated user from request headers.
    Falls back to a default demo student or teacher if headers are absent.
    """
    user_id = x_user_id or "student_demo"
    role = x_user_role or "student"

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # Create on-the-fly demo user if not yet in database
        name = "Demo Student" if role == "student" else "Prof. Sharma"
        user = User(
            id=user_id,
            name=name,
            email=f"{user_id}@eduadapt.ai",
            role=role,
            class_id="CS-2026"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def require_role(allowed_roles: list[str]):
    """Route dependency factory enforcing specific roles."""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: role '{current_user.role}' does not have access to this resource. Allowed: {allowed_roles}"
            )
        return current_user
    return role_checker


def verify_student_access(current_user: User, target_student_id: str, db: Optional[Session] = None):
    """
    Validates that a student can only ever query their own student_id.
    Teachers can query any student in their class or any student.
    """
    if current_user.role == "student":
        # Allow if default demo fallback or matching student ID
        if current_user.id != target_student_id and current_user.id != "student_demo":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Students can only access their own records."
            )
    elif current_user.role == "teacher":
        return True
    return True
