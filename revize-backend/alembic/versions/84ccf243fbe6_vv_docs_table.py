"""vv_docs table

Revision ID: 84ccf243fbe6
Revises: 65cf505afd5a
Create Date: 2025-09-26 09:23:00.540930

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '84ccf243fbe6'
down_revision: Union[str, Sequence[str], None] = '65cf505afd5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_table(
        'vv_docs',
        sa.Column('id', sa.String(length=36), primary_key=True, index=True),
        sa.Column('number', sa.String(length=32), nullable=False, unique=True),
        sa.Column('data_json', sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    )
    op.create_index('ix_vv_docs_id', 'vv_docs', ['id'])
    op.create_index('ix_vv_docs_project_id', 'vv_docs', ['project_id'])

def downgrade():
    op.drop_index('ix_vv_docs_project_id', table_name='vv_docs')
    op.drop_index('ix_vv_docs_id', table_name='vv_docs')
    op.drop_table('vv_docs')