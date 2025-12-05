import { Volume2, VolumeX, Waves, CloudRain, Wind } from 'lucide-react'
import { useNoise, NoiseType } from '../../hooks/useNoise'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
import { Slider } from '../ui/slider'

export function SoundControls() {
  const { isPlaying, noiseType, volume, setVolume, toggle } = useNoise()

  const sounds: { type: NoiseType; label: string; icon: React.ReactNode }[] = [
    { type: 'white', label: 'White Noise', icon: <Waves className="h-4 w-4" /> },
    { type: 'pink', label: 'Pink Noise', icon: <CloudRain className="h-4 w-4" /> },
    { type: 'brown', label: 'Brown Noise', icon: <Wind className="h-4 w-4" /> },
  ]

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              isPlaying
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/20 dark:text-primary-300'
                : 'border-border bg-background text-foreground hover:bg-muted'
            }`}
          >
            {isPlaying ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isPlaying 
                ? sounds.find(s => s.type === noiseType)?.label 
                : 'Ambient Sound'}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-0">
          <div className="p-2 font-medium border-b text-sm">Focus Sounds</div>
          <div className="p-1">
            {sounds.map((sound) => (
              <button
                key={sound.type}
                onClick={() => toggle(sound.type)}
                className={`w-full flex items-center justify-between px-2 py-2 text-sm rounded-md transition-colors ${
                    isPlaying && noiseType === sound.type 
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300' 
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  {sound.icon}
                  {sound.label}
                </div>
                {isPlaying && noiseType === sound.type && (
                  <div className="h-2 w-2 rounded-full bg-primary-500" />
                )}
              </button>
            ))}
          </div>
          <div className="p-3 border-t bg-muted/20">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Volume</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={(vals) => setVolume(vals[0])}
              className="text-primary-500"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}