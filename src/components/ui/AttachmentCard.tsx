import { useState } from 'react'
import { FileText, File, Download, Trash2, Eye } from 'lucide-react'
import * as tauriAdapter from '../../api/tauriAdapter'
import { Card, CardContent } from './card'
import { Badge } from './badge'
import { useToast } from './use-toast'
import { isTauri } from '../../utils/tauri'
import * as Dialog from '@radix-ui/react-dialog'

interface AttachmentCardProps {
  attachment: tauriAdapter.Attachment
  imageUrl?: string
  onDelete: (id: string) => void
  onImageLoad?: () => void
}

export function AttachmentCard({ attachment, imageUrl, onDelete, onImageLoad }: AttachmentCardProps) {
  const { toast } = useToast()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loadingText, setLoadingText] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isImage = (): boolean => {
    if (attachment.mime && attachment.mime.startsWith('image/')) {
      return true
    }
    const ext = attachment.filename.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'].includes(ext || '')
  }

  const isPDF = (): boolean => {
    return attachment.mime === 'application/pdf' || attachment.filename.toLowerCase().endsWith('.pdf')
  }

  const isText = (): boolean => {
    if (attachment.mime && (attachment.mime.startsWith('text/') || attachment.mime === 'text/markdown')) {
      return true
    }
    const ext = attachment.filename.split('.').pop()?.toLowerCase()
    return ['txt', 'md'].includes(ext || '')
  }

  const handleOpen = async () => {
    if (!isTauri()) {
      toast({
        title: 'Not available',
        description: 'Opening attachments is only available in Tauri desktop app.',
        variant: 'default',
      })
      return
    }

    try {
      if (isPDF()) {
        // Open PDF externally using Tauri command
        await tauriAdapter.openAttachmentFile(attachment.id)
      } else if (isText()) {
        // Open text in preview dialog
        setPreviewOpen(true)
        if (!textContent && !loadingText) {
          setLoadingText(true)
          try {
            const content = await tauriAdapter.readAttachmentFileContent(attachment.id)
            // Check if file is large (>50KB)
            if (attachment.size && attachment.size > 50 * 1024) {
              // Show first 50KB
              const firstPart = content.substring(0, 50 * 1024)
              setTextContent(firstPart + '\n\n... (file truncated, use "Load full file" to see more)')
            } else {
              setTextContent(content)
            }
          } catch (error) {
            console.error('Failed to read text file:', error)
            toast({
              title: 'Error',
              description: 'Failed to read file content.',
              variant: 'destructive',
            })
          } finally {
            setLoadingText(false)
          }
        }
      } else if (isImage()) {
        // Open image externally using Tauri command
        await tauriAdapter.openAttachmentFile(attachment.id)
      }
    } catch (error) {
      console.error('Failed to open attachment:', error)
      toast({
        title: 'Error',
        description: 'Failed to open attachment.',
        variant: 'destructive',
      })
    }
  }

  const handleDownload = async () => {
    if (!isTauri()) {
      toast({
        title: 'Not available',
        description: 'Downloading attachments is only available in Tauri desktop app.',
        variant: 'default',
      })
      return
    }

    try {
      await tauriAdapter.downloadAttachment(attachment.id)
      toast({
        title: 'Success',
        description: 'File downloaded successfully.',
        variant: 'default',
      })
    } catch (error) {
      console.error('Failed to download attachment:', error)
      toast({
        title: 'Error',
        description: 'Failed to download file.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return
    
    // Show confirmation toast
    toast({
      title: 'Delete attachment?',
      description: `Are you sure you want to delete "${attachment.filename}"?`,
      variant: 'default',
      action: (
        <div className="flex gap-2">
          <button
            className="focus-ring rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
            onClick={async () => {
              setIsDeleting(true)
              try {
                await onDelete(attachment.id)
                toast({
                  title: 'Deleted',
                  description: 'Attachment deleted successfully.',
                  variant: 'default',
                })
              } catch (error) {
                console.error('Failed to delete attachment:', error)
                toast({
                  title: 'Error',
                  description: 'Failed to delete attachment.',
                  variant: 'destructive',
                })
              } finally {
                setIsDeleting(false)
              }
            }}
          >
            Delete
          </button>
        </div>
      ),
    })
  }

  const loadFullText = async () => {
    if (loadingText) return
    setLoadingText(true)
    try {
      const content = await tauriAdapter.readAttachmentFileContent(attachment.id)
      setTextContent(content)
    } catch (error) {
      console.error('Failed to load full text:', error)
      toast({
        title: 'Error',
        description: 'Failed to load full file content.',
        variant: 'destructive',
      })
    } finally {
      setLoadingText(false)
    }
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileTypeBadge = () => {
    if (isImage()) return <Badge variant="secondary">Image</Badge>
    if (isPDF()) return <Badge variant="secondary">PDF</Badge>
    if (isText()) return <Badge variant="secondary">Text</Badge>
    return <Badge variant="outline">File</Badge>
  }

  return (
    <>
      <Card className="relative group">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            {/* Thumbnail/Icon */}
            <div className="flex-shrink-0">
              {isImage() && imageUrl ? (
                <img
                  src={imageUrl}
                  alt={attachment.filename}
                  className="w-16 h-16 object-cover rounded border border-border"
                  onLoad={onImageLoad}
                  onError={(e) => {
                    console.error('Image failed to load:', imageUrl, attachment)
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : isPDF() ? (
                <div className="w-16 h-16 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded border border-border">
                  <File className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              ) : isText() ? (
                <div className="w-16 h-16 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded border border-border">
                  <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              ) : (
                <div className="w-16 h-16 flex items-center justify-center bg-muted rounded border border-border">
                  <File className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{attachment.filename}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getFileTypeBadge()}
                    <span className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</span>
                  </div>
                  {isText() && !previewOpen && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {textContent ? textContent.substring(0, 300) : 'Click View to see content'}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 mt-2">
                <button
                  onClick={handleOpen}
                  className="focus-ring flex items-center h-7 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={`View ${attachment.filename}`}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </button>
                {isTauri() && (
                  <button
                    onClick={handleDownload}
                    className="focus-ring flex items-center h-7 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label={`Download ${attachment.filename}`}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="focus-ring flex items-center h-7 px-2 text-xs rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  aria-label={`Delete ${attachment.filename}`}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Text Preview Dialog */}
      {isText() && (
        <Dialog.Root open={previewOpen} onOpenChange={setPreviewOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
            <Dialog.Content className="fixed z-50 w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-lg left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[80vh] flex flex-col" aria-describedby={undefined}>
              <Dialog.Title className="text-lg font-semibold mb-2">{attachment.filename}</Dialog.Title>
              <div className="flex-1 overflow-y-auto border border-border rounded p-4 bg-muted/30">
                {loadingText ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : textContent ? (
                  <pre className="text-sm whitespace-pre-wrap font-mono">{textContent}</pre>
                ) : (
                  <p className="text-sm text-muted-foreground">No content available</p>
                )}
              </div>
              <div className="flex items-center justify-between mt-4">
                {attachment.size && attachment.size > 50 * 1024 && textContent && textContent.includes('... (file truncated') && (
                  <button
                    onClick={loadFullText}
                    disabled={loadingText}
                    className="focus-ring rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {loadingText ? 'Loading...' : 'Load full file'}
                  </button>
                )}
                <div className="ml-auto">
                  <button
                    onClick={() => setPreviewOpen(false)}
                    className="focus-ring rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Close
                  </button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  )
}

