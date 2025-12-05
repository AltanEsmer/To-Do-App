import { useCallback, useEffect, useRef, useState } from 'react'

export type NoiseType = 'white' | 'pink' | 'brown' | 'none'

export function useNoise() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [noiseType, setNoiseType] = useState<NoiseType>('none')
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      audioContextRef.current = new AudioContext()
    }
  }

  const createNoiseBuffer = (type: NoiseType) => {
    if (!audioContextRef.current) return null
    
    const bufferSize = audioContextRef.current.sampleRate * 2 // 2 seconds buffer
    const buffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate)
    const data = buffer.getChannelData(0)
    
    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
    } else if (type === 'pink') {
      let b0, b1, b2, b3, b4, b5, b6
      b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.075076
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
        data[i] *= 0.11 // (roughly) compensate for gain
        b6 = white * 0.115926
      }
    } else if (type === 'brown') {
      let lastOut = 0.0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        data[i] = (lastOut + (0.02 * white)) / 1.02
        lastOut = data[i]
        data[i] *= 3.5 // (roughly) compensate for gain
      }
    }
    
    return buffer
  }

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop()
      } catch (e) {
        // Ignore if already stopped
      }
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }
    setIsPlaying(false)
  }, [])

  const play = useCallback((type: NoiseType) => {
    initAudioContext()
    if (!audioContextRef.current) return

    // Resume context if suspended (browser policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }

    stop() // Stop any current noise

    if (type === 'none') return

    const buffer = createNoiseBuffer(type)
    if (!buffer) return

    const source = audioContextRef.current.createBufferSource()
    source.buffer = buffer
    source.loop = true
    
    const gainNode = audioContextRef.current.createGain()
    gainNode.gain.value = volume
    
    source.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)
    
    source.start()
    
    sourceNodeRef.current = source
    gainNodeRef.current = gainNode
    setNoiseType(type)
    setIsPlaying(true)
  }, [volume, stop])

  const toggle = (type: NoiseType) => {
    if (isPlaying && noiseType === type) {
      stop()
      setNoiseType('none')
    } else {
      play(type)
    }
  }

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume
    }
  }, [volume])

  // Cleanup
  useEffect(() => {
    return () => {
      stop()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    isPlaying,
    noiseType,
    volume,
    setVolume,
    toggle,
    stop
  }
}
