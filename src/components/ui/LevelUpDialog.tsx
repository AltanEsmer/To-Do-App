import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Badge } from './badge'

interface LevelUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  newLevel: number
}

/**
 * LevelUpDialog component shown when user levels up
 */
export function LevelUpDialog({ open, onOpenChange, newLevel }: LevelUpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
            }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500"
          >
            <Trophy className="h-8 w-8 text-white" />
          </motion.div>
          <DialogTitle className="text-center text-2xl">
            Level Up!
          </DialogTitle>
          <DialogDescription className="text-center">
            Congratulations! You've reached a new level.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <Badge variant="default" className="text-lg px-6 py-2">
              Level {newLevel}
            </Badge>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            onClick={() => onOpenChange(false)}
            className="focus-ring w-full rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            Continue
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

