import { useToast } from './use-toast'

/**
 * Hook to show XP toast notifications
 */
export function useXpToast() {
  const { toast } = useToast()

  const showXpToast = (xp: number, description: string) => {
    toast({
      title: `+${xp} XP`,
      description,
      variant: 'success',
      duration: 3000,
    })
  }

  return { showXpToast }
}

