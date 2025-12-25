import type { ComponentProps, ReactNode } from 'react'
import { openUrl } from '@tauri-apps/plugin-opener'

import { Button } from '@memory-prosthetic/ui/components/ui/button'
import { cn } from '@memory-prosthetic/ui/utils/tw'

export type LinkProps = {
  href: string
  children: ReactNode
} & ComponentProps<typeof Button>

/**
 * Link component that opens URLs in the system's default browser.
 * Use this instead of <a> tags in Tauri apps.
 */
export const Link = ({ href, children, className, ...props }: LinkProps) => {
  const handleClick = () => {
    void openUrl(href)
  }

  return (
    <Button className={cn('h-auto p-0 text-inherit', className)} onClick={handleClick} variant="link" {...props}>
      {children}
    </Button>
  )
}
