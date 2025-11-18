import { useState, useCallback, useRef, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Crop, RotateCw, Maximize2, Palette, Save, X } from 'lucide-react'
import Cropper, { Area } from 'react-easy-crop'
import { useToast } from './use-toast'

interface ImageEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string
  filename: string
  onSave: (editedImageBlob: Blob, filename: string) => Promise<void>
}

export function ImageEditorModal({
  open,
  onOpenChange,
  imageUrl,
  filename,
  onSave,
}: ImageEditorModalProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'crop' | 'rotate' | 'adjust'>('crop')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [isSaving, setIsSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', error => reject(error))
      image.setAttribute('crossOrigin', 'anonymous')
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation: number
  ): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('No 2D context')
    }

    const maxSize = Math.max(image.width, image.height)
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

    canvas.width = safeArea
    canvas.height = safeArea

    ctx.translate(safeArea / 2, safeArea / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.translate(-safeArea / 2, -safeArea / 2)

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    )

    const data = ctx.getImageData(0, 0, safeArea, safeArea)

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    )

    // Apply adjustments
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data32 = new Uint32Array(imageData.data.buffer)

    const brightnessAdj = (brightness - 100) * 2.55
    const contrastAdj = (contrast - 100) / 100
    const saturationAdj = (saturation - 100) / 100

    for (let i = 0; i < data32.length; i++) {
      let r = imageData.data[i * 4]
      let g = imageData.data[i * 4 + 1]
      let b = imageData.data[i * 4 + 2]

      // Brightness
      r += brightnessAdj
      g += brightnessAdj
      b += brightnessAdj

      // Contrast
      r = ((r / 255 - 0.5) * (1 + contrastAdj) + 0.5) * 255
      g = ((g / 255 - 0.5) * (1 + contrastAdj) + 0.5) * 255
      b = ((b / 255 - 0.5) * (1 + contrastAdj) + 0.5) * 255

      // Saturation
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b
      r = gray + (r - gray) * (1 + saturationAdj)
      g = gray + (g - gray) * (1 + saturationAdj)
      b = gray + (b - gray) * (1 + saturationAdj)

      imageData.data[i * 4] = Math.max(0, Math.min(255, r))
      imageData.data[i * 4 + 1] = Math.max(0, Math.min(255, g))
      imageData.data[i * 4 + 2] = Math.max(0, Math.min(255, b))
    }

    ctx.putImageData(imageData, 0, 0)

    return new Promise(resolve => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
      }, 'image/jpeg', 0.95)
    })
  }

  const handleSave = async () => {
    if (!croppedAreaPixels) return

    setIsSaving(true)
    try {
      const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels, rotation)
      const newFilename = filename.replace(/(\.[^.]+)$/, '-edited$1')
      await onSave(croppedImage, newFilename)
      toast({
        title: 'Success',
        description: 'Image saved successfully',
        variant: 'default',
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving image:', error)
      toast({
        title: 'Error',
        description: 'Failed to save image',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRotate = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content
          className="fixed z-50 w-[95vw] max-w-7xl h-[90vh] rounded-lg border border-border bg-card shadow-lg left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Dialog.Title className="text-lg font-semibold">Edit Image: {filename}</Dialog.Title>
            <button
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-lg p-2 hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <button
              onClick={() => setActiveTab('crop')}
              className={`focus-ring flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'crop' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <Crop className="h-4 w-4" />
              Crop
            </button>
            <button
              onClick={() => setActiveTab('rotate')}
              className={`focus-ring flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'rotate' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <RotateCw className="h-4 w-4" />
              Rotate
            </button>
            <button
              onClick={() => setActiveTab('adjust')}
              className={`focus-ring flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                activeTab === 'adjust' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <Palette className="h-4 w-4" />
              Adjust
            </button>
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Main Canvas */}
            <div className="flex-1 relative bg-black">
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={activeTab === 'crop' ? 16 / 9 : undefined}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Controls Sidebar */}
            <div className="w-80 border-l border-border p-4 bg-muted/30 overflow-y-auto">
              {activeTab === 'crop' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Zoom</label>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground mt-1">{zoom.toFixed(1)}x</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">Drag to position the crop area</p>
                    <p>Scroll to zoom in/out</p>
                  </div>
                </div>
              )}

              {activeTab === 'rotate' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Rotation</label>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground mt-1">{rotation}°</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRotate(90)}
                      className="focus-ring flex-1 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                    >
                      Rotate 90°
                    </button>
                    <button
                      onClick={() => handleRotate(180)}
                      className="focus-ring flex-1 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                    >
                      Rotate 180°
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'adjust' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Brightness</label>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground mt-1">{brightness}%</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Contrast</label>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground mt-1">{contrast}%</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Saturation</label>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={saturation}
                      onChange={(e) => setSaturation(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground mt-1">{saturation}%</div>
                  </div>
                  <button
                    onClick={() => {
                      setBrightness(100)
                      setContrast(100)
                      setSaturation(100)
                    }}
                    className="focus-ring w-full px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                  >
                    Reset Adjustments
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
            <button
              onClick={() => onOpenChange(false)}
              className="focus-ring px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="focus-ring flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save as New'}
            </button>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
