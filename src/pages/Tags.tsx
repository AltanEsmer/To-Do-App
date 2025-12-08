import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Tag as TagIcon, Plus, Trash2, Hash } from 'lucide-react'
import { useTags } from '../store/useTags'
import { TagBadge } from '../components/TagBadge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { useTaskFilters } from '../store/useTaskFilters'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ui/use-toast'
import { logger } from '../services/logger'
import { errorHandler } from '../services/errorHandler'
import { useTranslation } from 'react-i18next'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#71717a'
]

export function Tags() {
  const tags = useTags((state) => state.tags) // Selective subscription
  const loading = useTags((state) => state.loading)
  const syncTags = useTags((state) => state.syncTags)
  const createTag = useTags((state) => state.createTag)
  const deleteTag = useTags((state) => state.deleteTag)
  const { setSelectedTags } = useTaskFilters()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState(PRESET_COLORS[0])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    syncTags()
  }, [syncTags])

  const handleCreateTag = async () => {
    if (!tagName.trim()) return

    try {
      logger.info('Creating new tag', { name: tagName.trim(), color: tagColor })
      await createTag({ name: tagName.trim(), color: tagColor })
      setTagName('')
      setTagColor(PRESET_COLORS[0])
      setDialogOpen(false)
      logger.info('Tag created successfully')
    } catch (error) {
      logger.error('Failed to create tag:', error)
      errorHandler.handleError(error, { action: 'createTag', tagName })
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    try {
      logger.info('Deleting tag', { tagId })
      await deleteTag(tagId)
      logger.info('Tag deleted successfully', { tagId })
      toast({
        title: t('tags.tagDeleted'),
        description: t('tags.tagDeletedDesc'),
        variant: 'default',
      })
    } catch (error) {
      logger.error('Failed to delete tag:', error)
      errorHandler.handleError(error, { action: 'deleteTag', tagId })
    }
  }

  const handleViewTasksWithTag = async (tagId: string) => {
    // Check if tag has any tasks before applying filter
    const tag = tags.find(t => t.id === tagId)
    if (tag && tag.usage_count > 0) {
      setSelectedTags([tagId])
      navigate('/')
    } else {
      // Tag has no tasks, show a toast message and clear any existing tag filters
      toast({
        title: t('tags.noTasksFound'),
        description: t('tags.noTasksFoundDesc'),
        variant: 'default',
      })
      setSelectedTags([])
    }
  }

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate max usage count for sizing
  const maxUsage = Math.max(...tags.map((t) => t.usage_count), 1)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Hash className="h-8 w-8 text-primary-500" />
              {t('tags.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('tags.subtitle')}
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('tags.newTag')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('tags.createNew')}</DialogTitle>
                <DialogDescription>
                  {t('tags.createNewDesc')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('tags.tagName')}</label>
                  <Input
                    placeholder={t('tags.tagNamePlaceholder')}
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCreateTag()
                      }
                    }}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('tags.color')}</label>
                  <div className="grid grid-cols-10 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setTagColor(color)}
                        className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                          tagColor === color ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {tagName.trim() && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">{t('tags.preview')}</p>
                    <TagBadge
                      tag={{
                        id: 'preview',
                        name: tagName.trim().toLowerCase(),
                        color: tagColor,
                        created_at: Date.now(),
                        usage_count: 0,
                      }}
                      clickable={false}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button onClick={handleCreateTag} disabled={!tagName.trim()}>
                  {t('tags.createTag')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Input
          placeholder={t('tags.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t('tags.loading')}</div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-12">
          <TagIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchQuery ? t('tags.noTagsFound') : t('tags.noTagsYet')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? t('tags.tryDifferentSearch')
              : t('tags.createFirstTag')}
          </p>
          {!searchQuery && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('tags.createTagButton')}
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Tag Cloud */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">{t('tags.tagCloud')}</h2>
            <div className="flex flex-wrap gap-3">
              {filteredTags
                .sort((a, b) => b.usage_count - a.usage_count)
                .map((tag) => {
                  const size = 0.75 + (tag.usage_count / maxUsage) * 1.25
                  return (
                    <motion.div
                      key={tag.id}
                      whileHover={{ scale: 1.1 }}
                      style={{
                        fontSize: `${size}rem`,
                      }}
                    >
                      <TagBadge
                        tag={tag}
                        onClick={() => handleViewTasksWithTag(tag.id)}
                        showUsageCount
                      />
                    </motion.div>
                  )
                })}
            </div>
          </div>

          {/* Tag List */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">{t('tags.allTags')}</h2>
            <div className="grid gap-3">
              {filteredTags.map((tag) => (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <TagBadge tag={tag} clickable={false} />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        {t('tags.usedIn', { 
                          count: tag.usage_count, 
                          task: tag.usage_count === 1 ? t('tags.task') : t('tags.tasks')
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewTasksWithTag(tag.id)
                      }}
                    >
                      {t('tags.viewTasks')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTag(tag.id)
                      }}
                      disabled={tag.usage_count > 0}
                      title={
                        tag.usage_count > 0
                          ? t('tags.deleteTooltipDisabled')
                          : t('tags.deleteTooltip')
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
