"""baseline

Revision ID: 3ca5003c4b05
Revises: 
Create Date: 2025-08-10 07:47:23.636786

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3ca5003c4b05'
down_revision = None            # DŮLEŽITÉ
branch_labels = None
depends_on = None

def upgrade():
    # baseline – nic nemění, jen zapíše verzi
    pass

def downgrade():
    pass