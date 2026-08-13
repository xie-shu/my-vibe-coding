"""add meeting transcription mode

Revision ID: c4d5e6f7a8b9
Revises: 293138585702
Create Date: 2026-08-09 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "293138585702"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "meetings",
        sa.Column("transcription_mode", sa.String(length=20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("meetings", "transcription_mode")
