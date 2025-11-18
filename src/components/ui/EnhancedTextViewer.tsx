import { useState, useEffect, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Download, Maximize2, Minimize2, Search } from 'lucide-react'
import hljs from 'highlight.js'
import { marked } from 'marked'
import 'highlight.js/styles/github-dark.css'

interface EnhancedTextViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: string
  filename: string
  fileSize?: number
  onDownload?: () => void
  onLoadFull?: () => Promise<void>
  isPartial?: boolean
}

export function EnhancedTextViewer({
  open,
  onOpenChange,
  content,
  filename,
  fileSize,
  onDownload,
  onLoadFull,
  isPartial = false,
}: EnhancedTextViewerProps) {
  const [viewMode, setViewMode] = useState<'text' | 'rendered'>('text')
  const [wordWrap, setWordWrap] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchVisible, setSearchVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const fileExtension = filename.split('.').pop()?.toLowerCase() || ''
  const isMarkdown = ['md', 'markdown'].includes(fileExtension)
  const isCode = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs',
    'php', 'rb', 'swift', 'kt', 'scala', 'sh', 'bash', 'json', 'xml', 'html',
    'css', 'scss', 'sql', 'yaml', 'yml', 'toml', 'ini', 'cfg'
  ].includes(fileExtension)

  const highlightedContent = useMemo(() => {
    if (!isCode || viewMode === 'rendered') return content

    try {
      const language = fileExtension === 'jsx' ? 'javascript' :
                      fileExtension === 'tsx' ? 'typescript' :
                      fileExtension

      if (hljs.getLanguage(language)) {
        return hljs.highlight(content, { language }).value
      }
      return hljs.highlightAuto(content).value
    } catch (error) {
      console.error('Error highlighting code:', error)
      return content
    }
  }, [content, isCode, fileExtension, viewMode])

  const renderedMarkdown = useMemo(() => {
    if (!isMarkdown || viewMode !== 'rendered') return ''

    try {
      return marked(content)
    } catch (error) {
      console.error('Error rendering markdown:', error)
      return '<p>Error rendering markdown</p>'
    }
  }, [content, isMarkdown, viewMode])

  const highlightedLines = useMemo(() => {
    if (!searchTerm || viewMode === 'rendered') return content

    const regex = new RegExp(`(${searchTerm})`, 'gi')
    return content.replace(regex, '<mark class="bg-yellow-300 dark:bg-yellow-700">$1</mark>')
  }, [content, searchTerm, viewMode])

  const lineCount = content.split('\n').length

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleLoadFull = async () => {
    if (!onLoadFull || loading) return
    setLoading(true)
    try {
      await onLoadFull()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setSearchTerm('')
      setSearchVisible(false)
      setViewMode('text')
    }
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content
          className="fixed z-50 w-[95vw] max-w-6xl h-[90vh] rounded-lg border border-border bg-card shadow-lg left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-lg font-semibold truncate">{filename}</Dialog.Title>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{formatFileSize(fileSize)}</span>
                <span>{lineCount.toLocaleString()} lines</span>
                {isCode && <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">{fileExtension.toUpperCase()}</span>}
                {isMarkdown && <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">Markdown</span>}
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-lg p-2 hover:bg-muted transition-colors ml-2"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              {isMarkdown && (
                <div className="flex items-center gap-1 border border-border rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('text')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      viewMode === 'text' ? 'bg-background shadow-sm' : 'hover:bg-muted/50'
                    }`}
                  >
                    Source
                  </button>
                  <button
                    onClick={() => setViewMode('rendered')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      viewMode === 'rendered' ? 'bg-background shadow-sm' : 'hover:bg-muted/50'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              )}

              {viewMode === 'text' && (
                <button
                  onClick={() => setWordWrap(!wordWrap)}
                  className={`focus-ring px-3 py-1.5 rounded-lg border border-border text-sm transition-colors ${
                    wordWrap ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  {wordWrap ? <Minimize2 className="h-3 w-3 inline mr-1" /> : <Maximize2 className="h-3 w-3 inline mr-1" />}
                  Word Wrap
                </button>
              )}

              {viewMode === 'text' && (
                <button
                  onClick={() => setSearchVisible(!searchVisible)}
                  className="focus-ring px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                >
                  <Search className="h-3 w-3 inline mr-1" />
                  Search
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isPartial && onLoadFull && (
                <button
                  onClick={handleLoadFull}
                  disabled={loading}
                  className="focus-ring px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-sm disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load Full File'}
                </button>
              )}

              {onDownload && (
                <button
                  onClick={onDownload}
                  className="focus-ring p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  aria-label="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          {searchVisible && viewMode === 'text' && (
            <div className="p-3 border-b border-border">
              <input
                type="text"
                placeholder="Search in file..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                autoFocus
              />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 bg-muted/20">
            {viewMode === 'rendered' && isMarkdown ? (
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
              />
            ) : isCode ? (
              <div className="relative">
                <pre className={`text-sm ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'} font-mono`}>
                  <code
                    className="hljs"
                    dangerouslySetInnerHTML={{
                      __html: searchTerm ? highlightedLines : highlightedContent
                    }}
                  />
                </pre>
              </div>
            ) : (
              <pre
                className={`text-sm ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'} font-mono`}
                dangerouslySetInnerHTML={{
                  __html: searchTerm ? highlightedLines : content
                }}
              />
            )}
          </div>

          {/* Footer */}
          {isPartial && (
            <div className="p-3 border-t border-border">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 text-center">
                ⚠️ File truncated. Showing first {formatFileSize(50 * 1024)}. Click "Load Full File" to see complete content.
              </p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
