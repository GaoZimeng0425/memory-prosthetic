'use client'

/**
 * @description: Shimmer Text
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { motion } from 'motion/react'

import { cn } from '@memory-prosthetic/ui/utils/tw'

interface ShimmerTextProps {
  text: string
  className?: string
}

export function ShimmerText({ text = 'Text Shimmer', className }: ShimmerTextProps) {
  return (
    <div className="flex items-center justify-center">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden px-4 py-2"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          animate={{
            backgroundPosition: ['200% center', '-200% center'],
          }}
          className={cn(
            'bg-linear-to-r bg-size-[200%_100%] from-neutral-950 via-neutral-400 to-neutral-950 bg-clip-text font-bold text-3xl text-transparent dark:from-white dark:via-neutral-600 dark:to-white',
            className
          )}
          transition={{
            duration: 2.5,
            ease: 'linear',
            repeat: Number.POSITIVE_INFINITY,
          }}
        >
          {text}
        </motion.h1>
      </motion.div>
    </div>
  )
}
