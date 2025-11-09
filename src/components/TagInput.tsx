import React, { useState, useEffect, useRef } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { TagBadge } from './TagBadge'
import { Plus, Tag as TagIcon } from 'lucide-react'
import { useTags, Tag } from '../store/useTags'
import { useTasks } from '../store/useTasks'
import { useDebounce } from '../hooks/useDebounce'

interface TagInputProps {
  taskId: string
  selectedTags: Tag[]
  onTagsChange?: () => void
}

export function TagInput({ taskId, selectedTags, onTagsChange }: TagInputProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const debouncedSearch = useDebounce(searchQuery, 300)
  
  const { getSuggestedTags, createTag, syncTags } = useTags()
  const { addTagToTask, removeTagFromTask } = useTasks()

  useEffect(() => {
    if (debouncedSearch) {
      getSuggestedTags(debouncedSearch).then(setSuggestions)
    } else {
      setSuggestions([])
    }
  }, [debouncedSearch, getSuggestedTags])

  const handleAddTag = async (tag: Tag) => {
    try {
      await addTagToTask(taskId, tag.id)
      setSearchQuery('')
      setSuggestions([])
      setOpen(false)
      await syncTags()
      onTagsChange?.()
    } catch (error) {
      console.error('Failed to add tag:', error)
    }
  }

  const handleCreateAndAddTag = async () => {
    if (!searchQuery.trim()) return
    
    try {
      const newTag = await createTag({ name: searchQuery.trim() })
      await addTagToTask(taskId, newTag.id)
      setSearchQuery('')
      setSuggestions([])
      setOpen(false)
      await syncTags()
      onTagsChange?.()
    } catch (error) {
      console.error('Failed to create and add tag:', error)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagFromTask(taskId, tagId)
      await syncTags()
      onTagsChange?.()
    } catch (error) {
      console.error('Failed to remove tag:', error)
    }
  }

  const filteredSuggestions = suggestions.filter(
    (suggestion) => !selectedTags.some((tag) => tag.id === suggestion.id)
  )

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <TagBadge
            key={tag.id}
            tag={tag}
            removable
            clickable={false}
            onRemove={() => handleRemoveTag(tag.id)}
          />
        ))}
      </div>

      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <TagIcon className="h-4 w-4 mr-2" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start" side="bottom" sideOffset={4}>
            <div className="space-y-2">
              <Input
                placeholder="Search or create tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    e.preventDefault()
                    if (filteredSuggestions.length > 0) {
                      handleAddTag(filteredSuggestions[0])
                    } else {
                      handleCreateAndAddTag()
                    }
                  }
                }}
                autoFocus
              />

              {filteredSuggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground px-2">Suggestions</p>
                  {filteredSuggestions.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleAddTag(tag)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-accent flex items-center justify-between"
                    >
                      <TagBadge tag={tag} clickable={false} />
                      <span className="text-xs text-muted-foreground">
                        {tag.usage_count} tasks
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleCreateAndAddTag}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create "{searchQuery}"
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
