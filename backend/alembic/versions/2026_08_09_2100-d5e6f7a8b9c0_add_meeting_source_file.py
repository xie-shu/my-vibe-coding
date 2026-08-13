"""add meeting source file metadata

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-08-09 21:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("meetings", sa.Column("source_file_path", sa.String(length=500), nullable=True))
    op.add_column("meetings", sa.Column("source_file_name", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("meetings", "source_file_name")
    op.drop_column("meetings", "source_file_path")
