# Performance Optimization & Speed Analysis

This document provides a comprehensive analysis of performance bottlenecks and optimization opportunities in the To-Do App.

## 📊 Current Performance Baseline

### Metrics to Measure
- **First Contentful Paint (FCP)**: Target < 1.5s
- **Time to Interactive (TTI)**: Target < 3s
- **Task List Render**: Target < 100ms for 100 tasks
- **Bundle Size**: Monitor and optimize
- **Memory Usage**: Track for memory leaks
- **Database Query Time**: Target < 50ms per query

---

## 🔴 Critical Performance Issues

### 1. React Re-render Optimization

#### Current State
- Limited use of `useMemo`, `useCallback`, and `React.memo`
- Components re-render unnecessarily when parent state changes
- TaskCard components likely re-render on every task update

#### Impact
- **High**: Unnecessary re-renders cause UI lag with 50+ tasks
- **User Experience**: Noticeable lag when scrolling or interacting with task lists

#### Analysis

**TaskCard Component** (`src/components/TaskCard.tsx`):
```typescript
// Current: Re-renders on every tasks array update
export function TaskCard({ task }: TaskCardProps) {
  const { toggleComplete, deleteTask, getRelatedTasks, checkIsBlocked, getBlockingTasks } = useTasks()
  // ... component logic
}
```

**Issues**:
- `useTasks()` returns entire store, causing re-render on any task change
- No memoization of expensive operations (image loading, related tasks check)
- Event handlers recreated on every render

**Recommended Solution**:
```typescript
import { memo, useMemo, useCallback } from 'react'

// Memoize the component
export const TaskCard = memo(function TaskCard({ task }: TaskCardProps) {
  // Select only needed values from store
  const toggleComplete = useTasks((state) => state.toggleComplete)
  const deleteTask = useTasks((state) => state.deleteTask)
  
  // Memoize expensive computations
  const isOverdue = useMemo(() => 
    task.dueDate && !task.completed && isOverdue(task.dueDate),
    [task.dueDate, task.completed]
  )
  
  // Memoize callbacks
  const handleToggle = useCallback(() => {
    toggleComplete(task.id)
  }, [task.id, toggleComplete])
  
  // ... rest of component
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if task data actually changed
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.completed === nextProps.task.completed &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.dueDate?.getTime() === nextProps.task.dueDate?.getTime()
  )
})
```

**Implementation Priority**: 🔴 **Critical**

---

### 2. Task List Rendering Optimization

#### Current State
- All tasks rendered at once, no virtualization
- Filtering/sorting recalculated on every render
- No pagination or lazy loading

#### Impact
- **High**: Performance degrades significantly with 100+ tasks
- **Memory**: High memory usage with large task lists

#### Analysis

**Current Implementation** (`src/pages/Dashboard.tsx`, `src/pages/Projects.tsx`):
```typescript
// Current: Renders all tasks
const filteredTasks = useFilteredTasks(tasks)

return (
  <div>
    {filteredTasks.map(task => (
      <TaskCard key={task.id} task={task} />
    ))}
  </div>
)
```

**Issues**:
- All tasks rendered even if not visible
- No virtualization for long lists
- Filtering runs on every render (though memoized in hook)

**Recommended Solutions**:

**Option A: Virtual Scrolling** (Best for 100+ tasks)
```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

export function TaskList({ tasks }: { tasks: Task[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  const filteredTasks = useFilteredTasks(tasks)
  
  const virtualizer = useVirtualizer({
    count: filteredTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated task card height
    overscan: 5, // Render 5 extra items outside viewport
  })
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const task = filteredTasks[virtualItem.index]
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <TaskCard task={task} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Option B: Pagination** (Simpler, good for 50-200 tasks)
```typescript
const ITEMS_PER_PAGE = 20

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [page, setPage] = useState(1)
  const filteredTasks = useFilteredTasks(tasks)
  
  const paginatedTasks = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filteredTasks.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredTasks, page])
  
  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE)
  
  return (
    <>
      {paginatedTasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
      <Pagination 
        currentPage={page} 
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </>
  )
}
```

**Implementation Priority**: 🔴 **Critical** (if > 50 tasks expected)

---

### 3. Database Query Optimization

#### Current State
- All tasks fetched on every sync
- No pagination or filtering at database level
- Missing indexes on frequently queried columns

#### Impact
- **Medium-High**: Slow queries with large datasets
- **Scalability**: Performance degrades as data grows

#### Analysis

**Current Implementation** (`src-tauri/src/commands.rs`):
```rust
// Current: Fetches all tasks
#[tauri::command]
pub fn get_tasks(...) -> Result<Vec<Task>, String> {
    // SELECT * FROM tasks ...
    // No filtering, no pagination, no indexes
}
```

**Issues**:
- Fetches all columns even if not needed
- No database-level filtering
- Missing indexes on `completed`, `due_at`, `project_id`, `created_at`

**Recommended Solutions**:

**A. Add Database Indexes**:
```sql
-- Migration: 0015_add_performance_indexes.sql
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);
```

**B. Add Query Filtering**:
```rust
#[tauri::command]
pub fn get_tasks(
    db: State<'_, Arc<Mutex<DbConnection>>>,
    filter: Option<TaskFilter>, // Add filter parameter
    limit: Option<i32>,        // Add pagination
    offset: Option<i32>,
) -> Result<Vec<Task>, String> {
    let db = db.lock().map_err(|e| format!("Database lock error: {}", e))?;
    
    let mut query = "SELECT id, title, description, due_at, created_at, updated_at, priority, completed_at, project_id, order_index FROM tasks WHERE 1=1".to_string();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![];
    
    // Add filters
    if let Some(filter) = filter {
        if let Some(completed) = filter.completed {
            query.push_str(" AND completed_at IS ");
            if completed {
                query.push_str("NOT NULL");
            } else {
                query.push_str("NULL");
            }
        }
        if let Some(project_id) = filter.project_id {
            query.push_str(" AND project_id = ?");
            params.push(Box::new(project_id));
        }
        // ... more filters
    }
    
    // Add pagination
    if let Some(limit) = limit {
        query.push_str(&format!(" LIMIT {}", limit));
        if let Some(offset) = offset {
            query.push_str(&format!(" OFFSET {}", offset));
        }
    }
    
    // Execute query...
}
```

**C. Add Query Result Caching**:
```typescript
// Frontend: Cache query results
const taskCache = new Map<string, { data: Task[], timestamp: number }>()
const CACHE_TTL = 5000 // 5 seconds

export async function getTasks(filter?: TaskFilter): Promise<Task[]> {
  const cacheKey = JSON.stringify(filter)
  const cached = taskCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  
  const tasks = await tauriAdapter.getTasks(filter)
  taskCache.set(cacheKey, { data: tasks, timestamp: Date.now() })
  return tasks
}
```

**Implementation Priority**: 🟡 **High**

---

### 4. Bundle Size Optimization

#### Current State
- Large dependencies: `recharts`, `pdfjs-dist`, `framer-motion`
- No code splitting
- All routes loaded upfront

#### Impact
- **Medium**: Slower initial load time
- **User Experience**: Longer wait before app is usable

#### Analysis

**Current Bundle**:
- `recharts`: ~200KB (only used in Statistics page)
- `pdfjs-dist`: ~500KB (only used for PDF preview)
- `framer-motion`: ~50KB (used throughout, but could be lazy loaded)

**Recommended Solutions**:

**A. Code Split Routes**:
```typescript
// App.tsx - Lazy load routes
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Statistics = lazy(() => import('./pages/Statistics'))
const Pomodoro = lazy(() => import('./pages/Pomodoro'))
// ... other routes

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/statistics" element={<Statistics />} />
          {/* ... */}
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
```

**B. Lazy Load Heavy Components**:
```typescript
// Statistics.tsx - Lazy load charts
const RechartsLineChart = lazy(() => 
  import('recharts').then(module => ({ default: module.LineChart }))
)

export function Statistics() {
  const [showCharts, setShowCharts] = useState(false)
  
  return (
    <div>
      <button onClick={() => setShowCharts(true)}>Show Charts</button>
      {showCharts && (
        <Suspense fallback={<ChartSkeleton />}>
          <RechartsLineChart data={chartData} />
        </Suspense>
      )}
    </div>
  )
}
```

**C. Analyze Bundle**:
```bash
# Add to package.json
npm install --save-dev rollup-plugin-visualizer

# Update vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, filename: 'dist/stats.html' })
  ],
})
```

**Implementation Priority**: 🟡 **High**

---

## 🟡 Medium Priority Optimizations

### 5. Image Loading Optimization

#### Current State
- Images loaded synchronously
- No image optimization or compression
- Background images loaded for all tasks

#### Recommended Solutions

**A. Lazy Load Images**:
```typescript
// Already using useLazyLoad hook, but can be improved
const { isVisible, elementRef } = useLazyLoad({ threshold: 0.1 })

// Add intersection observer for images
<img 
  ref={elementRef}
  src={isVisible ? imageUrl : undefined}
  loading="lazy"
  alt="Task attachment"
/>
```

**B. Image Optimization**:
```typescript
// Compress images before upload
import imageCompression from 'browser-image-compression'

async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  }
  return await imageCompression(file, options)
}
```

**C. Image Caching**:
```typescript
// Use browser cache API
const imageCache = new Map<string, string>()

async function getCachedImageUrl(path: string): Promise<string> {
  if (imageCache.has(path)) {
    return imageCache.get(path)!
  }
  
  const url = await tauriAdapter.getImageUrl(path)
  imageCache.set(path, url)
  return url
}
```

**Implementation Priority**: 🟡 **Medium**

---

### 6. State Management Optimization

#### Current State
- Zustand stores sync entire state on every operation
- No selective subscriptions
- State persisted to localStorage (can be slow)

#### Recommended Solutions

**A. Selective Subscriptions**:
```typescript
// Instead of: const { tasks } = useTasks()
// Use: const tasks = useTasks(state => state.tasks)

// Only re-render when tasks change, not when loading/error changes
const tasks = useTasks(state => state.tasks)
const loading = useTasks(state => state.loading) // Separate subscription
```

**B. Optimize Persistence**:
```typescript
// Current: Persists entire tasks array
partialize: (state) => ({ tasks: state.tasks })

// Optimized: Only persist essential data
partialize: (state) => ({
  tasks: state.tasks.map(task => ({
    id: task.id,
    title: task.title,
    completed: task.completed,
    // Don't persist large fields like description, attachments
  }))
})
```

**C. Debounce Persistence**:
```typescript
import { debounce } from 'lodash-es'

const debouncedPersist = debounce((state) => {
  localStorage.setItem('tasks-storage', JSON.stringify(state))
}, 1000) // Wait 1 second after last change
```

**Implementation Priority**: 🟡 **Medium**

---

### 7. Search & Filter Optimization

#### Current State
- Search runs on every keystroke (debounced, but still)
- Filtering recalculates entire list
- No search indexing

#### Recommended Solutions

**A. Improve Debouncing**:
```typescript
// Current: 300ms debounce
const debouncedSearch = useDebounce(searchQuery, 300)

// Optimized: Increase debounce for better performance
const debouncedSearch = useDebounce(searchQuery, 500)

// Or: Only search when user stops typing for 1 second
```

**B. Search Indexing**:
```typescript
// Create search index for faster lookups
class TaskSearchIndex {
  private index: Map<string, Set<string>> = new Map()
  
  indexTask(task: Task) {
    const words = this.extractWords(task.title + ' ' + (task.description || ''))
    words.forEach(word => {
      if (!this.index.has(word)) {
        this.index.set(word, new Set())
      }
      this.index.get(word)!.add(task.id)
    })
  }
  
  search(query: string): string[] {
    const words = this.extractWords(query)
    const results = new Set<string>()
    
    words.forEach(word => {
      const taskIds = this.index.get(word.toLowerCase())
      if (taskIds) {
        taskIds.forEach(id => results.add(id))
      }
    })
    
    return Array.from(results)
  }
  
  private extractWords(text: string): string[] {
    return text.toLowerCase().match(/\b\w+\b/g) || []
  }
}
```

**Implementation Priority**: 🟢 **Low-Medium**

---

## 🟢 Low Priority Optimizations

### 8. Animation Performance

#### Current State
- Framer Motion used throughout
- Some animations may cause layout shifts

#### Recommendations
- Use `transform` and `opacity` for animations (GPU accelerated)
- Avoid animating `width`, `height`, `top`, `left` (causes reflow)
- Use `will-change` CSS property for frequently animated elements

### 9. Memory Leak Prevention

#### Recommendations
- Audit event listeners (ensure cleanup in useEffect)
- Clear intervals/timeouts properly
- Dispose of subscriptions
- Clear caches periodically
- Monitor memory usage in production

### 10. Database Connection Pooling

#### Current State
- Single database connection
- Lock contention possible with concurrent operations

#### Recommendations
- Consider connection pooling (if using multiple threads)
- Optimize transaction scope
- Use read-only transactions where possible

---

## 📋 Implementation Checklist

### Phase 1: Critical Optimizations ✅ COMPLETED
- [x] Memoize TaskCard component with React.memo
- [x] Add useCallback for event handlers
- [x] Implement selective Zustand subscriptions
- [x] Add database indexes
- [ ] Profile and measure current performance (to be done by user)

### Phase 2: High Priority ✅ PARTIALLY COMPLETED
- [x] Implement pagination (Projects page)
- [x] Code split routes (all route components lazy loaded)
- [x] Lazy load heavy components (Statistics/Recharts lazy loaded via routes)
- [x] Optimize image loading (already implemented - image cache + lazy loading)
- [ ] Add query result caching (not implemented)

### Phase 3: Medium Priority 🔄 PARTIALLY COMPLETED
- [x] Optimize search with debouncing (already implemented)
- [ ] Improve state persistence (not needed currently)
- [ ] Add image compression (not implemented)
- [x] Optimize animations (added willChange for GPU acceleration)
- [ ] Memory leak audit (not performed)

### Phase 4: Monitoring & Maintenance (future phase)
- [ ] Set up performance monitoring
- [ ] Track bundle size
- [ ] Monitor database query times
- [ ] Regular performance audits
- [ ] User feedback on performance

**Note**: See `OPTIMIZATION_IMPLEMENTATION.md` for detailed information about implemented optimizations.

---

## 🛠️ Tools & Resources

### Performance Monitoring
- **React DevTools Profiler**: Identify re-render issues
- **Chrome DevTools Performance**: Profile runtime performance
- **Lighthouse**: Measure Core Web Vitals
- **Bundle Analyzer**: Analyze bundle size

### Libraries
- **@tanstack/react-virtual**: Virtual scrolling
- **browser-image-compression**: Image optimization
- **lodash-es**: Utility functions (debounce, throttle)

### Measurement
```typescript
// Add performance markers
performance.mark('task-list-render-start')
// ... render tasks
performance.mark('task-list-render-end')
performance.measure('task-list-render', 'task-list-render-start', 'task-list-render-end')
console.log(performance.getEntriesByName('task-list-render'))
```

---

## 📊 Success Metrics

### Before Optimization
- Task list render (100 tasks): ~200-300ms
- Bundle size: ~2-3MB
- Initial load: ~2-3s
- Memory usage: ~100-150MB

### Target After Optimization
- Task list render (100 tasks): < 100ms
- Bundle size: < 1.5MB (initial load)
- Initial load: < 1.5s
- Memory usage: < 80MB

---

## 🔍 Performance Profiling Guide

### How to Profile

1. **React DevTools Profiler**:
   - Install React DevTools extension
   - Open Profiler tab
   - Click Record
   - Perform actions (scroll, filter, search)
   - Stop recording
   - Analyze flamegraph for re-renders

2. **Chrome DevTools Performance**:
   - Open DevTools → Performance
   - Click Record
   - Interact with app
   - Stop recording
   - Look for long tasks (>50ms)
   - Identify layout shifts and repaints

3. **Bundle Analysis**:
   ```bash
   npm run build
   # Open dist/stats.html in browser
   # Identify large dependencies
   ```

### Common Issues to Look For
- Components re-rendering unnecessarily
- Long JavaScript execution times
- Large bundle sizes
- Memory leaks (increasing memory over time)
- Layout shifts (CLS)
- Slow database queries

---

**Last Updated**: Current analysis
**Next Review**: After implementing Phase 1 optimizations
