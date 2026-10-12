import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class IssueStatus(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    DONE = "DONE"


class IssuePriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Issue(Base):
    __tablename__ = "issues"

    # Primary key: unique auto-incrementing integer ID
    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)

    # Core issue fields
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Status & Priority using Enums
    status: Mapped[IssueStatus] = mapped_column(
        Enum(IssueStatus, native_enum=False),
        default=IssueStatus.TODO,
        nullable=False,
    )
    priority: Mapped[IssuePriority] = mapped_column(
        Enum(IssuePriority, native_enum=False),
        default=IssuePriority.MEDIUM,
        nullable=False,
    )

    # Project and Assignee tracking
    project: Mapped[str] = mapped_column(String(100), default="DevTrack", nullable=False)
    assignee: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Automatic audit timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Issue(id={self.id}, title='{self.title}', status='{self.status}')>"
