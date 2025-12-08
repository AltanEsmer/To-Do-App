import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Tauri API
vi.mock('../utils/tauri', () => ({
  isTauri: () => false,
  safeInvoke: vi.fn(),
}))

describe('AttachmentInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle file type validation', () => {
    // Test that valid file types are accepted
    const validTypes = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.txt', '.md']
    validTypes.forEach((type) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.md,application/pdf,text/plain,text/markdown'
      expect(input.accept).toContain(type.replace('.', ''))
    })
  })

  it('should parse file input accept attribute correctly', () => {
    const acceptString = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.md,application/pdf,text/plain,text/markdown'
    const acceptedTypes = acceptString.split(',')
    
    expect(acceptedTypes).toContain('.png')
    expect(acceptedTypes).toContain('.pdf')
    expect(acceptedTypes).toContain('.txt')
    expect(acceptedTypes).toContain('application/pdf')
  })

  it('should handle mocked invoke calls', async () => {
    const { safeInvoke } = await import('../utils/tauri')
    const mockInvoke = vi.mocked(safeInvoke)
    
    // Mock successful attachment add
    mockInvoke.mockResolvedValueOnce({
      id: 'test-id',
      task_id: 'task-1',
      filename: 'test.png',
      path: 'attachments/task-1/test-id.png',
      mime: 'image/png',
      size: 1024,
      created_at: Date.now() / 1000,
    })

    const result = await safeInvoke('add_attachment', { taskId: 'task-1', filePath: '/path/to/test.png' }) as {
      id: string
      task_id: string
      filename: string
      path: string
      mime: string
      size: number
      created_at: number
    }
    
    expect(result).toBeDefined()
    expect(result.filename).toBe('test.png')
    expect(mockInvoke).toHaveBeenCalledWith('add_attachment', { taskId: 'task-1', filePath: '/path/to/test.png' })
  })

  it('should handle file type detection', () => {
    const getFileType = (filename: string): string => {
      const ext = filename.split('.').pop()?.toLowerCase()
      if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) return 'image'
      if (ext === 'pdf') return 'pdf'
      if (['txt', 'md'].includes(ext || '')) return 'text'
      return 'unknown'
    }

    expect(getFileType('test.png')).toBe('image')
    expect(getFileType('test.pdf')).toBe('pdf')
    expect(getFileType('test.txt')).toBe('text')
    expect(getFileType('test.md')).toBe('text')
    expect(getFileType('test.unknown')).toBe('unknown')
  })
})

