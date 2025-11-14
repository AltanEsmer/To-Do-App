import { useState, useEffect } from 'react'
import { Task } from '../store/useTasks'
import { Button } from './ui/button'
import { TaskCard } from './TaskCard'
import { Link2, Plus } from 'lucide-react'
import { useTasks } from '../store/useTasks'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import * as tauriAdapter from '../api/tauriAdapter'

interface RelatedTasksPanelProps {
  taskId: string
}

const RELATIONSHIP_TYPES = [
  { value: 'related', label: 'Related to' },
  { value: 'similar', label: 'Similar to' },
  { value: 'follows', label: 'Follows' },
  { value: 'blocks', label: 'Blocks' },
]

export function RelatedTasksPanel({ taskId }: RelatedTasksPanelProps) {
  const [relatedTasks, setRelatedTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [relationshipType, setRelationshipType] = useState<string>('related')
  
  const { tasks, getRelatedTasks } = useTasks()
  const availableTasks = tasks.filter((t) => t.id !== taskId)

  const loadRelatedTasks = async () => {
    setLoading(true)
    try {
      const related = await getRelatedTasks(taskId)
      setRelatedTasks(related)
    } catch (error) {
      console.error('Failed to load related tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRelatedTasks()
  }, [taskId])

  const handleAddRelationship = async () => {
    if (!selectedTaskId) return

    try {
      // Check for circular dependencies if creating a 'blocks' relationship
      if (relationshipType === 'blocks') {
        const wouldCreateCycle = await tauriAdapter.checkCircularDependency(taskId, selectedTaskId)
        if (wouldCreateCycle) {
          alert('Cannot create this blocking relationship: it would create a circular dependency.')
          return
        }
      }

      await tauriAdapter.createTaskRelationship({
        task_id_1: taskId,
        task_id_2: selectedTaskId,
        relationship_type: relationshipType,
      })
      await loadRelatedTasks()
      setDialogOpen(false)
      setSelectedTaskId('')
      setRelationshipType('related')
    } catch (error) {
      console.error('Failed to create relationship:', error)
      alert('Failed to create relationship: ' + (error as Error).message)
    }
  }


  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Related Tasks</h3>
          <span className="text-sm text-muted-foreground">
            ({relatedTasks.length})
          </span>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Relationship
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Related Task</DialogTitle>
              <DialogDescription>
                Link this task to another task to show their relationship
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Task</label>
                <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a task..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Relationship Type</label>
                <Select value={relationshipType} onValueChange={setRelationshipType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRelationship} disabled={!selectedTaskId}>
                Add Relationship
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="min-h-[2rem]">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : relatedTasks.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No related tasks yet. Add relationships to connect related tasks.
          </div>
        ) : (
          <div className="space-y-2">
            {relatedTasks.map((task) => (
              <div key={task.id} className="relative group">
                <TaskCard task={task} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
