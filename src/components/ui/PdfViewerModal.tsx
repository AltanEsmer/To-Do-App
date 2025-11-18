import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Download } from 'lucide-react'
import { useToast } from './use-toast'

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

interface PdfViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pdfUrl: string
  filename: string
  onDownload?: () => void
}

export function PdfViewerModal({
  open,
  onOpenChange,
  pdfUrl,
  filename,
  onDownload,
}: PdfViewerModalProps) {
  const { toast } = useToast()
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) {
      setPageNumber(1)
      setScale(1.0)
    }
  }, [open])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setLoading(false)
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error)
    toast({
      title: 'Error',
      description: 'Failed to load PDF file',
      variant: 'destructive',
    })
    setLoading(false)
  }

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages || 1, prev + 1))
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(3, prev + 0.2))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.2))
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= (numPages || 1)) {
      setPageNumber(page)
    }
  }

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
            <Dialog.Title className="text-lg font-semibold truncate flex-1">
              {filename}
            </Dialog.Title>
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
              {/* Page Navigation */}
              <button
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                className="focus-ring p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="number"
                  min={1}
                  max={numPages || 1}
                  value={pageNumber}
                  onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 text-center rounded border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-muted-foreground">/ {numPages || '?'}</span>
              </div>

              <button
                onClick={goToNextPage}
                disabled={pageNumber >= (numPages || 1)}
                className="focus-ring p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                disabled={scale <= 0.5}
                className="focus-ring p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              
              <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
                {Math.round(scale * 100)}%
              </span>

              <button
                onClick={zoomIn}
                disabled={scale >= 3}
                className="focus-ring p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              {onDownload && (
                <button
                  onClick={onDownload}
                  className="focus-ring p-2 rounded-lg border border-border hover:bg-muted transition-colors ml-2"
                  aria-label="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* PDF Content */}
          <div className="flex-1 overflow-auto bg-muted/20 flex items-start justify-center p-4">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading PDF...</p>
              </div>
            )}
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              className="flex flex-col items-center"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
              />
            </Document>
          </div>

          {/* Footer */}
          {numPages && (
            <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
              Document has {numPages} page{numPages !== 1 ? 's' : ''}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
