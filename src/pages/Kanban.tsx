import { useState, useMemo } from 'react'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { useTasks } from '../store/useTasks'
import { useProjects } from '../store/useProjects'
import { useTags } from '../store/useTags'
import { Search, Filter } from 'lucide-react'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import * as Popover from '@radix-ui/react-popover'

export function Kanban() {
  const { tasks } = useTasks()
  const { projects } = useProjects()
  const { tags } = useTags()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = task.title.toLowerCase().includes(query)
        const matchesDescription = task.description?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDescription) return false
      }

      // Project filter
      if (selectedProjects.length > 0) {
        if (!task.projectId || !selectedProjects.includes(task.projectId)) return false
      }

      // Tag filter
      if (selectedTags.length > 0) {
        const taskTagIds = task.tags?.map((t) => t.id) || []
        if (!selectedTags.some((tagId) => taskTagIds.includes(tagId))) return false
      }

      // Priority filter
      if (selectedPriorities.length > 0) {
        if (!selectedPriorities.includes(task.priority)) return false
      }

      return true
    })
  }, [tasks, searchQuery, selectedProjects, selectedTags, selectedPriorities])

  const toggleFilter = (value: string, selected: string[], setter: (v: string[]) => void) => {
    if (selected.includes(value)) {
      setter(selected.filter((v) => v !== value))
    } else {
      setter([...selected, value])
    }
  }

  const hasActiveFilters =
    selectedProjects.length > 0 ||
    selectedTags.length > 0 ||
    selectedPriorities.length > 0

  const clearFilters = () => {
    setSelectedProjects([])
    setSelectedTags([])
    setSelectedPriorities([])
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold">Kanban Board</h1>
        <p className="mt-2 text-muted-foreground">
          Visualize your workflow with drag-and-drop task management
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-4 flex flex-shrink-0 items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Popover.Root>
          <Popover.Trigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 rounded-full bg-primary-500 px-1.5 text-xs text-white">
                  {selectedProjects.length + selectedTags.length + selectedPriorities.length}
                </span>
              )}
            </Button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-50 w-80 rounded-lg border border-border bg-card p-4 shadow-lg"
              sideOffset={5}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Filters</h3>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="mb-2 block text-sm font-medium">Priority</label>
                  <div className="flex flex-wrap gap-2">
                    {['low', 'medium', 'high'].map((priority) => (
                      <Button
                        key={priority}
                        variant={selectedPriorities.includes(priority) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() =>
                          toggleFilter(priority, selectedPriorities, setSelectedPriorities)
                        }
                      >
                        {priority}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Project Filter */}
                {projects.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">Projects</label>
                    <div className="flex flex-wrap gap-2">
                      {projects.map((project) => (
                        <Button
                          key={project.id}
                          variant={selectedProjects.includes(project.id) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            toggleFilter(project.id, selectedProjects, setSelectedProjects)
                          }
                        >
                          {project.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tag Filter */}
                {tags.length > 0 && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Button
                          key={tag.id}
                          variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleFilter(tag.id, selectedTags, setSelectedTags)}
                          style={{
                            backgroundColor: selectedTags.includes(tag.id)
                              ? tag.color
                              : undefined,
                            borderColor: tag.color,
                          }}
                        >
                          {tag.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard tasks={filteredTasks} />
      </div>
    </div>
  )
}
