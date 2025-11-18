import { useState } from 'react'
import { Camera, Monitor, Square } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
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
      // Import Tauri screenshot API
      const { writeFile } = await import('@tauri-apps/api/fs')
      const { join, appDataDir } = await import('@tauri-apps/api/path')
      
      // Note: Tauri doesn't have a built-in screenshot API in v1
      // We would need to implement this using a plugin or external tool
      // For now, we'll show a placeholder message
      
      toast({
        title: 'Screenshot Feature',
        description: 'Screenshot capture requires additional setup with Tauri plugins. This feature will be available in a future update.',
        variant: 'default',
      })
      
      // Placeholder implementation - would need actual screenshot plugin
      // const screenshot = await invoke('capture_screenshot')
      // const dataDir = await appDataDir()
      // const timestamp = new Date().getTime()
      // const filename = `screenshot-${timestamp}.png`
      // const filePath = await join(dataDir, 'temp', filename)
      // await writeFile(filePath, screenshot)
      // 
      // const file = new File([screenshot], filename, { type: 'image/png' })
      // await onCapture(file)
      
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      toast({
        title: 'Error',
        description: 'Failed to capture screenshot.',
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
