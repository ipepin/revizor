"""add snippets and preferences tables

Revision ID: f3a927c8d9b1
Revises: 84ccf243fbe6
Create Date: 2026-01-05 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a927c8d9b1'
down_revision: Union[str, Sequence[str], None] = '84ccf243fbe6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    snippet_scope = sa.Enum('EI', 'LPS', name='snippetscope')
    snippet_scope.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'snippets',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('scope', snippet_scope, nullable=False),
        sa.Column('label', sa.String(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('user_id', 'scope', 'label', name='uq_snippet_label_per_user_scope'),
    )
    op.create_table(
        'snippet_preferences',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('snippet_id', sa.Integer(), sa.ForeignKey('snippets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('visible', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('order_index', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('user_id', 'snippet_id', name='uq_snippet_pref_unique'),
    )

def downgrade() -> None:
    op.drop_table('snippet_preferences')

    op.drop_table('snippets')

    snippet_scope = sa.Enum('EI', 'LPS', name='snippetscope')
    snippet_scope.drop(op.get_bind(), checkfirst=True)
