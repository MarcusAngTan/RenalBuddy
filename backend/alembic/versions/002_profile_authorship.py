"""Add caregiver flag, visit-opened timestamp, and taper authorship."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_profile_authorship"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("patient_profiles", sa.Column("logs_for", sa.String(16), nullable=False, server_default="self"))
    op.add_column("patient_profiles", sa.Column("visit_opened_at", sa.DateTime(), nullable=True))
    op.add_column("taper_plans", sa.Column("authored_by_user_id", sa.Integer(), nullable=True))
    op.add_column("taper_steps", sa.Column("authored_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("taper_steps", "authored_at")
    op.drop_column("taper_plans", "authored_by_user_id")
    op.drop_column("patient_profiles", "visit_opened_at")
    op.drop_column("patient_profiles", "logs_for")
