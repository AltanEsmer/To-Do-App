import { useState } from 'react'
import { Camera } from 'lucide-react'
import { useToast } from './use-toast'
import { isTauri } from '../../utils/tauri'

interface ScreenshotCaptureProps {
  onCapture: (imageFile: File) => Promise<void>
}

export function ScreenshotCapture({ onCapture }: ScreenshotCaptureProps) {
  const { toast } = useToast()
  const [capturing, setCapturing] = useState(false)

  const captureScreenshot = async () => {
    if (!isTauri()) {
      toast({
        title: 'Not available',
        description: 'Screenshot capture is only available in Tauri desktop app.',
        variant: 'default',
      })
      return
    }

    setCapturing(true)
    try {
      const { invoke } = await import('@tauri-apps/api/tauri')
      
      // Capture screenshot using our Rust command
      const screenshotBytes = await invoke<number[]>('capture_screenshot', { 
        mode: 'fullscreen' 
      })
      
      // Convert number array to Uint8Array
      const uint8Array = new Uint8Array(screenshotBytes)
      
      // Create blob from bytes
      const blob = new Blob([uint8Array], { type: 'image/png' })
      
      // Create File object from blob
      const timestamp = new Date().getTime()
      const filename = `screenshot-${timestamp}.png`
      const file = new File([blob], filename, { type: 'image/png' })
      
      // Call onCapture with the file
      await onCapture(file)
      
      toast({
        title: 'Screenshot captured',
        description: 'Screenshot has been attached to the task.',
        variant: 'default',
      })
      
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to capture screenshot.',
        variant: 'destructive',
      })
    } finally {
      setCapturing(false)
    }
  }

  return (
    <button
      onClick={captureScreenshot}
      disabled={capturing || !isTauri()}
      className="focus-ring flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      aria-label="Take screenshot"
    >
      <Camera className="h-4 w-4" />
      {capturing ? 'Capturing...' : 'Take Screenshot'}
    </button>
  )
}
