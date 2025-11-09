## Cursor Task — Add Task Relationships & Tags System

### Context
Existing app: React + TypeScript frontend using shadcn/ui + Tailwind; Tauri (Rust) backend using SQLite. Currently tasks support projects, priorities, due dates, and attachments. Implement a comprehensive **tags and task relationships system** that allows users to:
1. Create and assign tags to tasks with auto-suggestions
2. Link related tasks (associations, not dependencies)
3. View related tasks in task details
4. Filter and group tasks by tags

### Goals (strict)

#### 1. Database Schema
- Create migration `0010_add_tags_and_relationships.sql` with:
  - `tags` table: id, name (unique, lowercase), color, created_at, usage_count
  - `task_tags` junction table: id, task_id, tag_id, created_at (unique on task_id+tag_id)
  - `task_relationships` table: id, task_id_1, task_id_2, relationship_type, created_at (unique on task_id_1+task_id_2)
  - Proper indexes and foreign keys with CASCADE deletes

#### 2. Backend Rust Commands (src-tauri/src/commands.rs)
Implement the following Tauri commands:
- `get_all_tags() -> Result<Vec<Tag>, String>` - Get all tags sorted by usage_count DESC
- `get_task_tags(task_id: String) -> Result<Vec<Tag>, String>` - Get tags for a task
- `create_tag(input: CreateTagInput) -> Result<Tag, String>` - Create tag (normalize name, handle duplicates)
- `delete_tag(tag_id: String) -> Result<(), String>` - Delete tag and associations
- `add_tag_to_task(task_id: String, tag_id: String) -> Result<(), String>` - Associate tag with task, increment usage
- `remove_tag_from_task(task_id: String, tag_id: String) -> Result<(), String>` - Remove association, decrement usage
- `get_suggested_tags(search: String) -> Result<Vec<Tag>, String>` - Search tags (LIKE query, limit 10)
- `create_task_relationship(input: CreateRelationshipInput) -> Result<TaskRelationship, String>` - Create bidirectional relationship
- `delete_task_relationship(relationship_id: String) -> Result<(), String>` - Delete relationship
- `get_related_tasks(task_id: String) -> Result<Vec<Task>, String>` - Get all related tasks
- `get_tasks_by_tag(tag_id: String) -> Result<Vec<Task>, String>` - Get tasks with tag
- `get_tasks_by_tags(tag_ids: Vec<String>) -> Result<Vec<Task>, String>` - Get tasks with ANY of the tags (OR logic)

Update existing commands:
- `get_task()` - Include `tags: Vec<Tag>` in Task response
- `get_tasks()` - Support filtering by `tag_id` in TaskFilter

#### 3. Frontend Types & API (src/api/tauriAdapter.ts)
- Add `Tag`, `TaskRelationship`, `CreateTagInput`, `CreateRelationshipInput` interfaces
- Update `Task` interface to include optional `tags?: Tag[]` field
- Add API adapter functions for all backend commands above
- Use `safeInvoke` pattern with browser mode fallbacks

#### 4. State Management
- Create `src/store/useTags.ts` Zustand store:
  - State: tags array, loading, error
  - Methods: syncTags, createTag, deleteTag, getSuggestedTags
- Update `src/store/useTasks.ts`:
  - Add methods: addTagToTask, removeTagFromTask, getRelatedTasks
  - Update Task type to include tags

#### 5. UI Components

**Create `src/components/TagInput.tsx`:**
- Multi-select tag input with autocomplete
- Shows existing tags as suggestions while typing (debounced 300ms)
- Allows creating new tags on the fly
- Displays selected tags as removable chips/badges
- Uses shadcn/ui: Badge, Input, Popover, Button
- Optional color picker for new tags

**Create `src/components/TagBadge.tsx`:**
- Reusable tag display component
- Shows tag name with optional color background
- Clickable to filter tasks by tag
- Shows usage count on hover (optional)

**Create `src/components/RelatedTasksPanel.tsx`:**
- Side panel/section showing related tasks
- Displays related tasks using TaskCard components
- "Add Relationship" button with relationship type selector
- Relationship types: 'related', 'similar', 'follows', 'blocks'

**Update `src/components/TaskDetailsModal.tsx`:**
- Add "Tags" section with TagInput component
- Add "Related Tasks" section with RelatedTasksPanel
- Show tags as badges below task title
- Allow adding/removing tags inline

**Update `src/components/TaskCard.tsx`:**
- Display tags as small badges below task title
- Click tag to filter tasks by that tag
- Show relationship indicator icon if task has relationships

**Update `src/components/AddTaskModal.tsx` and `src/components/EditTaskModal.tsx`:**
- Add TagInput component for tag selection
- Pre-populate with existing tags if editing

#### 6. Filtering & Grouping

**Update `src/store/useTaskFilters.ts`:**
- Add `selectedTags: string[]` to filter state
- Add `groupByTag: boolean` option
- Add `showRelatedOnly: boolean` option

**Update `src/utils/useFilteredTasks.ts`:**
- Filter tasks by selected tags (AND logic: task must have ALL selected tags)
- Group tasks by tag when `groupByTag` is enabled
- Show related tasks when `showRelatedOnly` is enabled
- Tasks with multiple tags appear in multiple groups

**Create `src/pages/Tags.tsx`:**
- New page showing all tags
- Tag cloud visualization (size based on usage_count)
- Click tag to see all tasks with that tag
- Tag management (create, edit, delete, change color)
- Statistics per tag (task count, completion rate)

#### 7. Smart Grouping UI
- Add "Group by Tag" toggle in filter bar
- When enabled, group tasks under tag headers
- Collapsible tag sections
- Tag filter chips showing selected tags with "Clear all" button
- Tag count badges showing how many tasks match

#### 8. Auto-Suggestions
- Tag suggestions: Show matching tags from `get_suggested_tags` while typing
- Sort by usage_count (most used first)
- Show "Create new tag: [name]" option if no match
- Relationship suggestions: Suggest based on similar tags, same project, similar titles

### Data Structures

**Rust (commands.rs):**
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub created_at: i64,
    pub usage_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRelationship {
    pub id: String,
    pub task_id_1: String,
    pub task_id_2: String,
    pub relationship_type: String, // 'related', 'similar', 'follows', 'blocks'
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTagInput {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateRelationshipInput {
    pub task_id_1: String,
    pub task_id_2: String,
    pub relationship_type: Option<String>,
}
```

**TypeScript (tauriAdapter.ts):**
```typescript
export interface Tag {
  id: string;
  name: string;
  color?: string;
  created_at: number;
  usage_count: number;
}

export interface TaskRelationship {
  id: string;
  task_id_1: string;
  task_id_2: string;
  relationship_type: string;
  created_at: number;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface CreateRelationshipInput {
  task_id_1: string;
  task_id_2: string;
  relationship_type?: string;
}
```

### Files to modify / add

**Backend:**
- `src-tauri/migrations/0010_add_tags_and_relationships.sql` - New migration file
- `src-tauri/src/commands.rs` - Add all tag/relationship commands
- `src-tauri/src/db.rs` - Update migration list, add helper functions if needed

**Frontend:**
- `src/api/tauriAdapter.ts` - Add types and API functions
- `src/store/useTags.ts` - New Zustand store for tags
- `src/store/useTasks.ts` - Update with tag methods
- `src/store/useTaskFilters.ts` - Add tag filtering options
- `src/utils/useFilteredTasks.ts` - Add tag filtering logic
- `src/components/TagInput.tsx` - New component
- `src/components/TagBadge.tsx` - New component
- `src/components/RelatedTasksPanel.tsx` - New component
- `src/components/TaskDetailsModal.tsx` - Add tags and relationships sections
- `src/components/TaskCard.tsx` - Display tags
- `src/components/AddTaskModal.tsx` - Add tag input
- `src/components/EditTaskModal.tsx` - Add tag input
- `src/pages/Tags.tsx` - New tags management page
- Update routing in `src/App.tsx` to include Tags page

### UX details & accessibility

- Tag input: Support comma-separated input for quick tag addition
- Keyboard shortcuts:
  - `#` to focus tag input
  - `Tab` to accept tag suggestion
  - `Backspace` to remove last tag
- Visual feedback: Animate tag additions/removals with Framer Motion
- Empty states: Show helpful messages when no tags/relationships exist
- Accessibility: Proper ARIA labels, keyboard navigation, focus management
- Tag colors: Use predefined palette or allow custom hex colors
- Tag suggestions: Limit to 10-20 most relevant results
- Relationship creation: Prevent self-relationships and duplicates
- Performance: Cache tag list, lazy load related tasks

### Backend spec (Tauri / Rust)

**Key Implementation Details:**
- Tag names: Normalize to lowercase, trim whitespace
- Tag creation: If tag exists, return existing tag and increment usage_count
- Tag deletion: CASCADE delete removes all task_tag associations
- Relationship creation: Prevent task_id_1 == task_id_2 (self-relationships)
- Relationship uniqueness: Enforce unique constraint on (task_id_1, task_id_2)
- Tag search: Case-insensitive LIKE query, sorted by usage_count DESC
- Task filtering: Support filtering by single tag_id in TaskFilter
- Tag usage tracking: Increment on add, decrement on remove (but don't delete tag)

### Database Migration Details

**Migration 0010_add_tags_and_relationships.sql should include:**

```sql
-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    created_at INTEGER NOT NULL,
    usage_count INTEGER DEFAULT 0
);

-- Task-Tag junction table
CREATE TABLE IF NOT EXISTS task_tags (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(task_id, tag_id)
);

-- Task relationships table
CREATE TABLE IF NOT EXISTS task_relationships (
    id TEXT PRIMARY KEY,
    task_id_1 TEXT NOT NULL,
    task_id_2 TEXT NOT NULL,
    relationship_type TEXT DEFAULT 'related',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (task_id_1) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id_2) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE(task_id_1, task_id_2),
    CHECK(task_id_1 != task_id_2)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count);
CREATE INDEX IF NOT EXISTS idx_task_relationships_task_1 ON task_relationships(task_id_1);
CREATE INDEX IF NOT EXISTS idx_task_relationships_task_2 ON task_relationships(task_id_2);
```

### Implementation Order

1. Database migration (0010_add_tags_and_relationships.sql)
2. Backend Rust commands (commands.rs)
3. Frontend TypeScript types and API adapter (tauriAdapter.ts)
4. Frontend state management (useTags.ts, update useTasks.ts)
5. Basic UI components (TagBadge, TagInput)
6. Integration into TaskDetailsModal and TaskCard
7. Filtering and grouping logic
8. Tags page and advanced features
9. Polish, animations, and accessibility

### Success Criteria

- ✅ Users can create and assign tags to tasks
- ✅ Tags auto-suggest based on existing tags and usage frequency
- ✅ Users can create relationships between tasks
- ✅ Related tasks are visible in task details modal
- ✅ Tasks can be filtered by tags (AND logic for multiple tags)
- ✅ Tasks can be grouped by tags in list views
- ✅ All operations are persisted to database
- ✅ UI is intuitive, accessible, and performant
- ✅ Tag management page shows all tags with statistics
- ✅ Relationships prevent duplicates and self-references

### Testing Considerations

- Test tag creation with duplicate names (should return existing)
- Test tag deletion (should cascade to task_tags)
- Test relationship creation (prevent duplicates, prevent self-relationships)
- Test tag filtering (AND logic for multiple tags)
- Test auto-suggestions (case-insensitive, partial matches)
- Test tag usage count increments/decrements correctly
- Test related tasks query returns correct results

### Performance Optimizations

- Cache tag list in frontend state (don't refetch on every keystroke)
- Use indexes on tag name and usage_count for fast searches
- Limit tag suggestions to 10-20 most relevant
- Lazy load related tasks (only fetch when panel is opened)
- Debounce tag search input (300ms)
- Batch tag operations when possible

- Note: Always use PowerShell Commands.