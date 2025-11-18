import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

interface ImageViewerProps {
  imageUrl: string
  filename: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDownload?: () => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
}

export function ImageViewer({ 
  imageUrl, 
  filename, 
  open, 
  onOpenChange,
  onDownload,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false
}: ImageViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5))
  }, [])

  useEffect(() => {
    if (!open) {
      setZoom(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      
      if (e.key === 'Escape') {
        onOpenChange(false)
      } else if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
        onPrevious()
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext()
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn()
      } else if (e.key === '-') {
        handleZoomOut()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, hasPrevious, hasNext, onPrevious, onNext, onOpenChange, handleZoomIn, handleZoomOut])

  // Handle wheel events with passive: false
  useEffect(() => {
    if (!open || !containerRef.current) return

    const container = containerRef.current
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        if (e.deltaY < 0) {
          handleZoomIn()
        } else {
          handleZoomOut()
        }
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [open, handleZoomIn, handleZoomOut])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <AnimatePresence>
          {open && (
            <>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/95"
                />
              </Dialog.Overlay>
              <Dialog.Content 
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                aria-describedby={undefined}
              >
                <Dialog.Title className="sr-only">Image Viewer: {filename}</Dialog.Title>
                
                {/* Controls */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-white text-sm font-medium min-w-[4rem] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  {onDownload && (
                    <button
                      onClick={onDownload}
                      className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors ml-2"
                      aria-label="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={() => onOpenChange(false)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Navigation buttons */}
                {hasPrevious && onPrevious && (
                  <button
                    onClick={onPrevious}
                    className="absolute left-4 z-10 p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                )}
                {hasNext && onNext && (
                  <button
                    onClick={onNext}
                    className="absolute right-4 z-10 p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-white/20 transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                )}

                {/* Filename */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p className="text-white text-sm font-medium">{filename}</p>
                </div>

                {/* Image */}
                <div
                  ref={containerRef}
                  className="relative w-full h-full flex items-center justify-center cursor-move"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                >
                  <motion.img
                    src={imageUrl}
                    alt={filename}
                    className="max-w-full max-h-full object-contain select-none"
                    style={{
                      transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                      transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                    }}
                    draggable={false}
                  />
                </div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
