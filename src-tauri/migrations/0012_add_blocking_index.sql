-- Add index for blocking relationships
CREATE INDEX IF NOT EXISTS idx_task_relationships_blocks ON task_relationships(relationship_type, task_id_2) WHERE relationship_type = 'blocks';
CREATE INDEX IF NOT EXISTS idx_task_relationships_blocks_reverse ON task_relationships(relationship_type, task_id_1) WHERE relationship_type = 'blocks';
