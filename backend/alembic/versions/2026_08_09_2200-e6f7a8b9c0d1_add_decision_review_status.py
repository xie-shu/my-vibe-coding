"""add human review status to decisions

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-08-09 22:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "e6f7a8b9c0d1"
down_revision: Union[str, None] = "d5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("decisions", sa.Column("review_status", sa.String(length=20), server_default="pending", nullable=False))
    op.add_column("decisions", sa.Column("reviewed_by", sa.String(length=100), nullable=True))
    op.add_column("decisions", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("decisions", "reviewed_at")
    op.drop_column("decisions", "reviewed_by")
    op.drop_column("decisions", "review_status")
