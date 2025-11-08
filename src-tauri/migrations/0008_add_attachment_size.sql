-- Migration 0008: Add size column to attachments table

ALTER TABLE attachments ADD COLUMN size INTEGER;

