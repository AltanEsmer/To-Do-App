import { create } from 'zustand'
import * as tauriAdapter from '../api/tauriAdapter'

export interface Tag {
  id: string
  name: string
  color?: string
  created_at: number
  usage_count: number
}

interface TagsState {
  tags: Tag[]
  loading: boolean
  error: string | null
  syncTags: () => Promise<void>
  createTag: (input: tauriAdapter.CreateTagInput) => Promise<Tag>
  deleteTag: (tagId: string) => Promise<void>
  getSuggestedTags: (search: string) => Promise<Tag[]>
}

export const useTags = create<TagsState>()((set, get) => ({
  tags: [],
  loading: false,
  error: null,

  syncTags: async () => {
    try {
      set({ loading: true, error: null })
      const tags = await tauriAdapter.getAllTags()
      set({ tags, loading: false })
    } catch (error) {
      console.error('Failed to sync tags:', error)
      set({ error: (error as Error).message, loading: false })
    }
  },

  createTag: async (input: tauriAdapter.CreateTagInput) => {
    try {
      set({ loading: true, error: null })
      const tag = await tauriAdapter.createTag(input)
      set((state) => ({ 
        tags: [...state.tags, tag].sort((a, b) => b.usage_count - a.usage_count || a.name.localeCompare(b.name)),
        loading: false 
      }))
      return tag
    } catch (error) {
      console.error('Failed to create tag:', error)
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  deleteTag: async (tagId: string) => {
    try {
      set({ loading: true, error: null })
      await tauriAdapter.deleteTag(tagId)
      set((state) => ({ 
        tags: state.tags.filter(t => t.id !== tagId),
        loading: false 
      }))
    } catch (error) {
      console.error('Failed to delete tag:', error)
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  getSuggestedTags: async (search: string) => {
    try {
      return await tauriAdapter.getSuggestedTags(search)
    } catch (error) {
      console.error('Failed to get suggested tags:', error)
      return []
    }
  },
}))
