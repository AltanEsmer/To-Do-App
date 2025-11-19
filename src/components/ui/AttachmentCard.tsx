import { useState } from 'react'
import { FileText, File as FileIcon, Download, Trash2, Eye, Film, Music, Edit } from 'lucide-react'
import * as tauriAdapter from '../../api/tauriAdapter'
import { Card, CardContent } from './card'
import { Badge } from './badge'
import { useToast } from './use-toast'
import { isTauri } from '../../utils/tauri'
import * as Dialog from '@radix-ui/react-dialog'
import { ImageViewer } from './ImageViewer'
import { ImageEditorModal } from './ImageEditorModal'
import { PdfViewerModal } from './PdfViewerModal'
import { EnhancedTextViewer } from './EnhancedTextViewer'

interface AttachmentCardProps {
  attachment: tauriAdapter.Attachment
  imageUrl?: string
  onDelete: (id: string) => void
  onImageLoad?: () => void
  onAttachmentAdded?: (taskId: string, file: File) => Promise<void>
  taskId?: string
}

export function AttachmentCard({ attachment, imageUrl, onDelete, onImageLoad, onAttachmentAdded, taskId }: AttachmentCardProps) {
  const { toast } = useToast()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loadingText, setLoadingText] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

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

  const isVideo = (): boolean => {
    if (attachment.mime && attachment.mime.startsWith('video/')) {
      return true
    }
    const ext = attachment.filename.split('.').pop()?.toLowerCase()
    return ['mp4', 'webm', 'mov'].includes(ext || '')
  }

  const isAudio = (): boolean => {
    if (attachment.mime && attachment.mime.startsWith('audio/')) {
      return true
    }
    const ext = attachment.filename.split('.').pop()?.toLowerCase()
    return ['mp3', 'wav', 'ogg'].includes(ext || '')
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
      if (isImage() && imageUrl) {
        setPreviewOpen(true)
      } else if (isPDF()) {
        setPreviewOpen(true)
        if (!pdfUrl) {
          try {
            const { appDataDir } = await import('@tauri-apps/api/path')
            const { join } = await import('@tauri-apps/api/path')
            const { readBinaryFile } = await import('@tauri-apps/api/fs')
            const dataDir = await appDataDir()
            const fullPath = await join(dataDir, attachment.path)
            const fileData = await readBinaryFile(fullPath)
            
            if (fileData && fileData.length > 0) {
              const blob = new Blob([fileData], { type: 'application/pdf' })
              const url = URL.createObjectURL(blob)
              setPdfUrl(url)
            }
          } catch (error) {
            console.error('Failed to load PDF:', error)
            toast({
              title: 'Error',
              description: 'Failed to load PDF file.',
              variant: 'destructive',
            })
          }
        }
      } else if (isText()) {
        setPreviewOpen(true)
        if (!textContent && !loadingText) {
          setLoadingText(true)
          try {
            const content = await tauriAdapter.readAttachmentFileContent(attachment.id)
            if (attachment.size && attachment.size > 50 * 1024) {
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
      } else if (isVideo() || isAudio()) {
        setPreviewOpen(true)
        if (!mediaUrl) {
          try {
            const { appDataDir } = await import('@tauri-apps/api/path')
            const { join } = await import('@tauri-apps/api/path')
            const { readBinaryFile } = await import('@tauri-apps/api/fs')
            const dataDir = await appDataDir()
            const fullPath = await join(dataDir, attachment.path)
            const fileData = await readBinaryFile(fullPath)
            
            if (fileData && fileData.length > 0) {
              const mimeType = attachment.mime || (isVideo() ? 'video/mp4' : 'audio/mpeg')
              const blob = new Blob([fileData], { type: mimeType })
              const url = URL.createObjectURL(blob)
              setMediaUrl(url)
            }
          } catch (error) {
            console.error('Failed to load media:', error)
            toast({
              title: 'Error',
              description: 'Failed to load media file.',
              variant: 'destructive',
            })
          }
        }
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

  const handleSaveEditedImage = async (blob: Blob, filename: string) => {
    if (!taskId || !onAttachmentAdded) {
      toast({
        title: 'Error',
        description: 'Cannot save edited image.',
        variant: 'destructive',
      })
      return
    }

    try {
      const file = new File([blob], filename, { type: 'image/jpeg' })
      await onAttachmentAdded(taskId, file)
      toast({
        title: 'Success',
        description: 'Edited image saved as new attachment.',
        variant: 'default',
      })
    } catch (error) {
      console.error('Failed to save edited image:', error)
      throw error
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
    if (isVideo()) return <Badge variant="secondary">Video</Badge>
    if (isAudio()) return <Badge variant="secondary">Audio</Badge>
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
              ) : isVideo() ? (
                <div className="w-16 h-16 flex items-center justify-center bg-purple-50 dark:bg-purple-900/20 rounded border border-border">
                  <Film className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              ) : isAudio() ? (
                <div className="w-16 h-16 flex items-center justify-center bg-green-50 dark:bg-green-900/20 rounded border border-border">
                  <Music className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              ) : isPDF() ? (
                <div className="w-16 h-16 flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded border border-border">
                  <FileIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              ) : isText() ? (
                <div className="w-16 h-16 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded border border-border">
                  <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              ) : (
                <div className="w-16 h-16 flex items-center justify-center bg-muted rounded border border-border">
                  <FileIcon className="h-8 w-8 text-muted-foreground" />
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
                {isImage() && imageUrl && isTauri() && onAttachmentAdded && taskId && (
                  <button
                    onClick={() => setEditorOpen(true)}
                    className="focus-ring flex items-center h-7 px-2 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label={`Edit ${attachment.filename}`}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </button>
                )}
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

      {/* Image Viewer */}
      {isImage() && imageUrl && (
        <ImageViewer
          imageUrl={imageUrl}
          filename={attachment.filename}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          onDownload={handleDownload}
        />
      )}

      {/* Image Editor */}
      {isImage() && imageUrl && (
        <ImageEditorModal
          open={editorOpen}
          onOpenChange={setEditorOpen}
          imageUrl={imageUrl}
          filename={attachment.filename}
          onSave={handleSaveEditedImage}
        />
      )}

      {/* PDF Viewer */}
      {isPDF() && pdfUrl && (
        <PdfViewerModal
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open)
            if (!open && pdfUrl) {
              URL.revokeObjectURL(pdfUrl)
              setPdfUrl(null)
            }
          }}
          pdfUrl={pdfUrl}
          filename={attachment.filename}
          onDownload={handleDownload}
        />
      )}

      {/* Enhanced Text Viewer */}
      {isText() && textContent && (
        <EnhancedTextViewer
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          content={textContent}
          filename={attachment.filename}
          fileSize={attachment.size}
          onDownload={handleDownload}
          onLoadFull={attachment.size && attachment.size > 50 * 1024 ? loadFullText : undefined}
          isPartial={attachment.size ? attachment.size > 50 * 1024 && textContent.includes('... (file truncated') : false}
        />
      )}

      {/* Media (Video/Audio) Preview Dialog */}
      {(isVideo() || isAudio()) && (
        <Dialog.Root open={previewOpen} onOpenChange={(open) => {
          setPreviewOpen(open)
          if (!open && mediaUrl) {
            URL.revokeObjectURL(mediaUrl)
            setMediaUrl(null)
          }
        }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
            <Dialog.Content className="fixed z-50 w-full max-w-3xl rounded-lg border border-border bg-card p-6 shadow-lg left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[90vh] flex flex-col" aria-describedby={undefined}>
              <Dialog.Title className="text-lg font-semibold mb-4">{attachment.filename}</Dialog.Title>
              <div className="flex-1 flex items-center justify-center bg-black rounded">
                {mediaUrl ? (
                  isVideo() ? (
                    <video 
                      src={mediaUrl} 
                      controls 
                      className="max-w-full max-h-[70vh] rounded"
                      onError={(e) => {
                        console.error('Video failed to load:', mediaUrl, attachment)
                        toast({
                          title: 'Error',
                          description: 'Failed to load video file.',
                          variant: 'destructive',
                        })
                      }}
                    >
                      Your browser does not support the video element.
                    </video>
                  ) : (
                    <div className="w-full p-8">
                      <audio 
                        src={mediaUrl} 
                        controls 
                        className="w-full"
                        onError={(e) => {
                          console.error('Audio failed to load:', mediaUrl, attachment)
                          toast({
                            title: 'Error',
                            description: 'Failed to load audio file.',
                            variant: 'destructive',
                          })
                        }}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Loading media...</p>
                )}
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </div>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="focus-ring rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </>
  )
}

