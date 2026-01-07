'use client'

import type { ComponentProps, FC, ReactNode, RefObject } from 'react'
import { isString } from 'es-toolkit'
import { Streamdown } from 'streamdown'

import { cn } from '@memory-prosthetic/ui/utils/tw'
import { useTheme } from '../../hooks/use-theme'
import { Button } from '../ui/button'

export type MarkdownUIProps = {
  markdown: string
  scrollAreaRef?: RefObject<HTMLDivElement | null>
} & ComponentProps<typeof Streamdown>

/**
 * Extract text content from React children
 */
const getTextContent = (children: ReactNode): string => {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(getTextContent).join('')
  if (children && typeof children === 'object' && 'props' in children) {
    return getTextContent((children as { props: { children?: ReactNode } }).props.children)
  }
  return ''
}

/**
 * Check if link text indicates it's a video (marked by content extractor with 🎬)
 */
const isVideoLink = (children: ReactNode): boolean => {
  const text = getTextContent(children)
  return text.includes('🎬')
}

/**
 * Get YouTube/Bilibili/Vimeo embed URL for iframe playback
 */
const getIframeEmbed = (url: string): { embedUrl: string } | null => {
  try {
    const urlObj = new URL(url)

    // YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      const videoId =
        urlObj.searchParams.get('v') ||
        urlObj.pathname.match(/\/embed\/([^/?]+)/)?.[1] ||
        (urlObj.hostname === 'youtu.be' ? urlObj.pathname.slice(1) : null)
      if (videoId) {
        return { embedUrl: `https://www.youtube.com/embed/${videoId}` }
      }
    }

    // Bilibili
    if (urlObj.hostname.includes('bilibili.com')) {
      const bvid = urlObj.pathname.match(/\/(BV[a-zA-Z0-9]+)/)?.[1]
      const aid = urlObj.pathname.match(/\/av(\d+)/)?.[1]
      if (bvid) {
        return { embedUrl: `//player.bilibili.com/player.html?bvid=${bvid}&autoplay=0` }
      }
      if (aid) {
        return { embedUrl: `//player.bilibili.com/player.html?aid=${aid}&autoplay=0` }
      }
    }

    // Vimeo
    if (urlObj.hostname.includes('vimeo.com')) {
      const videoId = urlObj.pathname.match(/\/(\d+)/)?.[1]
      if (videoId) {
        return { embedUrl: `https://player.vimeo.com/video/${videoId}` }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Custom link component that embeds videos inline
 */
const CustomLink = ({
  href,
  children,
  scrollAreaRef,
  ...props
}: {
  href?: string
  children?: ReactNode
  scrollAreaRef?: RefObject<HTMLDivElement | null>
}) => {
  if (!href) {
    return <span {...props}>{children}</span>
  }

  console.log(children)
  if (isVideoLink(children)) {
    // If link text contains 🎬, it's a video
    // Check if it's YouTube/Bilibili/Vimeo for iframe embed
    const iframeEmbed = getIframeEmbed(href)

    if (iframeEmbed) {
      // Iframe embed for YouTube, Bilibili, Vimeo
      return (
        <div className="my-4">
          <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingTop: '56.25%' }}>
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 aspect-video h-full w-full border-0"
              src={iframeEmbed.embedUrl}
              title="Video"
            />
          </div>
        </div>
      )
    }

    // Native video element for direct video URLs
    return (
      <div className="my-4">
        {/* biome-ignore lint/a11y/useMediaCaption: external video content */}
        <video className="w-full max-w-2xl rounded-lg" controls preload="metadata">
          <source src={href} />
          <a href={href} rel="noopener noreferrer" target="_blank">
            {children}
          </a>
        </video>
      </div>
    )
  }

  if (href.startsWith('#')) {
    // Handle anchor links (hash fragments) - use button instead of <a> tag
    const handleAnchorClick = () => {
      const targetId = href.slice(1) // Remove the # to get the id

      // Try multiple ways to find the target element
      let targetElement: Element | null = null

      // Method 1: Standard ID lookup
      targetElement = scrollAreaRef?.current?.querySelector(`[id="${targetId}"]`) || null
      console.log('🚀 : handleAnchorClick : targetElement:', targetElement)

      // Method 2: Query by name attribute
      if (!targetElement) {
        targetElement = scrollAreaRef?.current?.querySelector(`[name="${targetId}"]`) || null
      }

      // Method 3: Query by id attribute (fallback)
      if (!targetElement) {
        targetElement = scrollAreaRef?.current?.querySelector(`[id="${targetId}"]`) || null
      }

      // Method 4: Try to find in markdown content (for headings with auto-generated IDs)
      if (!targetElement) {
        // Some markdown renderers create IDs like "user-content-getting-started"
        // Try to find headings that might match
        const allHeadings = scrollAreaRef?.current?.querySelectorAll('h1, h2, h3, h4, h5, h6') || []
        for (const heading of allHeadings) {
          if (heading.textContent?.toLocaleLowerCase() === targetId.toLocaleLowerCase()) {
            targetElement = heading
            break
          }
          if (heading.id === targetId || heading.getAttribute('name') === targetId) {
            targetElement = heading
            break
          }
        }
      }

      if (targetElement) {
        // Calculate offset for fixed headers if needed
        const rect = targetElement.getBoundingClientRect()
        const scrollTop = scrollAreaRef?.current?.scrollTop || 0
        const targetPosition = rect.top + scrollTop - 80

        // Smooth scroll using window.scrollTo
        scrollAreaRef?.current?.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        })

        // Update URL hash for bookmarking/sharing
        window.history.pushState(null, '', href)
      } else {
        console.warn(`🚀 : CustomLink : Anchor target not found: ${targetId}`)
      }
    }

    if (!isString(children)) {
      return (
        <a href={href} onClick={handleAnchorClick}>
          {children}
        </a>
      )
    }
    return (
      <Button
        className="cursor-pointer items-center border-0 bg-transparent p-0 font-inherit text-primary underline hover:text-primary/80"
        onClick={handleAnchorClick}
        variant="link"
        {...props}
      >
        {children}
      </Button>
    )
  }

  // Regular external link
  return (
    <Button variant="link" {...props} asChild className="h-auto p-0 text-inherit">
      <a href={href} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    </Button>
  )
}

export const MarkdownUI: FC<MarkdownUIProps> = ({ markdown, className, scrollAreaRef }) => {
  const { resolvedTheme } = useTheme()

  // Guard against empty or whitespace-only content
  if (!markdown?.trim()) {
    return null
  }

  return (
    <Streamdown
      className={cn('markdown-content', className)}
      components={{
        p: (props) => <div {...props} />,
        a: (props) => <CustomLink {...props} scrollAreaRef={scrollAreaRef} />,
        img: (props) => (
          <div className="group relative my-4 inline-block">
            <img alt={props.alt} {...props} className="max-w-full rounded-lg" />
          </div>
        ),
        iframe: (props) => (
          <div className="my-4">
            <iframe {...props} className="aspect-video h-auto w-full rounded-lg" />
          </div>
        ),
      }}
      controls={false}
      mermaid={{
        config: {
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
          themeVariables: {
            primaryColor: '#ff6b6b',
            primaryTextColor: '#fff',
            primaryBorderColor: '#ff6b6b',
            lineColor: '#f5f5f5',
            secondaryColor: '#4ecdc4',
            tertiaryColor: '#45b7d1',
          },
        },
      }}
      // isAnimating
      mode="static"
      shikiTheme={resolvedTheme === 'dark' ? ['vitesse-dark', 'vitesse-light'] : ['github-light', 'vitesse-dark']}
    >
      {markdown}
    </Streamdown>
  )
}
