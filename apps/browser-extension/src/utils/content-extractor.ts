/**
 * Content Extractor
 *
 * Extracts main content from web pages using @mozilla/readability
 * and converts to Markdown using turndown.
 */

import { Readability } from '@mozilla/readability'
import TurndownService from 'turndown'

/**
 * Extracted page content
 */
export type PageContent = {
  url: string
  title: string
  content: string
  thumbnailUrl?: string
}

// Configure turndown service
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
})

// Add rules for better markdown output
// IMPORTANT: Rules are processed in order, so image rules should come before container rules
turndownService.addRule('removeEmptyLinks', {
  filter: (node: HTMLElement) => node.nodeName === 'A' && !node.textContent?.trim(),
  replacement: () => '',
})

// Handle links containing images - extract image, ignore link wrapper
// This must come before the default link rule to prevent link from processing the image
turndownService.addRule('linksWithImages', {
  filter: (node: HTMLElement) => {
    return node.nodeName === 'A' && node.querySelector('img') !== null
  },
  replacement: (_content: string, node: HTMLElement) => {
    const img = node.querySelector('img') as HTMLImageElement
    if (!img) return ''

    const alt = img.alt || ''
    let src =
      img.getAttribute('data-src') ||
      img.getAttribute('data-lazy-src') ||
      img.getAttribute('data-original') ||
      extractSrcFromSrcset(img.getAttribute('srcset')) ||
      img.src ||
      ''

    console.log('🚀 : linksWithImages : Found image in link, src:', src, 'alt:', alt)

    if (!src) {
      console.warn('🚀 : linksWithImages : No src found for image in link:', img)
      return ''
    }

    // Convert relative URLs to absolute URLs
    if (!isAbsoluteUrl(src)) {
      const absoluteUrl = convertToAbsoluteUrl(src, window.location.href)
      if (absoluteUrl) {
        src = absoluteUrl
        console.log('🚀 : linksWithImages : Converted relative URL to absolute:', src)
      } else {
        console.error('🚀 : linksWithImages : Failed to convert URL:', src)
        return '' // Don't return invalid relative URL
      }
    }

    // Return just the image, ignore the link wrapper
    return `![${alt}](${src})`
  },
})

// Handle all links - convert relative URLs to absolute URLs, preserve anchor links
// This must come after linksWithImages to handle remaining links
turndownService.addRule('allLinks', {
  filter: (node: HTMLElement) => {
    if (node.nodeName !== 'A') return false
    const href = (node as HTMLAnchorElement).getAttribute('href') || ''
    // Match all links except those with images (handled by linksWithImages)
    // and empty links (handled by removeEmptyLinks)
    return href.length > 0
  },
  replacement: (content: string, node: HTMLElement) => {
    const link = node as HTMLAnchorElement
    let href = link.getAttribute('href') || ''
    const text = content.trim() || link.textContent?.trim() || href

    // Handle anchor links (#) - preserve as-is
    if (isAnchorLink(href)) {
      console.log('🚀 : allLinks : Found anchor link, href:', href, 'text:', text)
      return `[${text}](${href})`
    }

    // Handle absolute URLs or protocol URLs - preserve as-is
    if (isAbsoluteUrl(href) || isProtocolUrl(href)) {
      console.log('🚀 : allLinks : Found absolute/protocol URL, href:', href, 'text:', text)
      return `[${text}](${href})`
    }

    // Handle relative URLs - convert to absolute
    console.log('🚀 : allLinks : Found relative link, href:', href, 'text:', text)

    // Convert relative URLs to absolute URLs
    const absoluteUrl = convertToAbsoluteUrl(href, window.location.href)
    if (absoluteUrl) {
      href = absoluteUrl
      console.log('🚀 : allLinks : Converted relative URL to absolute:', href)
    } else {
      console.error('🚀 : allLinks : Failed to convert URL:', href)
      // Return empty string to avoid invalid relative URLs in markdown
      return ''
    }

    return `[${text}](${href})`
  },
})

// Handle figure/picture containers - extract image from inside
turndownService.addRule('figureContainers', {
  filter: (node: HTMLElement) => {
    return (node.nodeName === 'FIGURE' || node.nodeName === 'PICTURE') && node.querySelector('img') !== null
  },
  replacement: (_content: string, node: HTMLElement) => {
    const img = node.querySelector('img') as HTMLImageElement
    if (!img) return ''
    // Let the preserveImages rule handle the actual image conversion
    // We just extract the img from the container
    const alt = img.alt || ''
    let src =
      img.getAttribute('data-src') ||
      img.getAttribute('data-lazy-src') ||
      img.getAttribute('data-original') ||
      extractSrcFromSrcset(img.getAttribute('srcset')) ||
      img.src ||
      ''

    if (!src) return ''

    // Convert relative URLs to absolute URLs
    if (!isAbsoluteUrl(src)) {
      const absoluteUrl = convertToAbsoluteUrl(src, window.location.href)
      if (absoluteUrl) {
        src = absoluteUrl
      } else {
        console.error('🚀 : figureContainers : Failed to convert URL:', src)
        return '' // Don't return invalid relative URL
      }
    }

    // Get caption if exists (figcaption)
    const caption = node.querySelector('figcaption')?.textContent?.trim() || ''
    return caption ? `![${alt || caption}](${src})\n\n*${caption}*` : `![${alt}](${src})`
  },
})

turndownService.addRule('preserveImages', {
  filter: 'img',
  replacement: (_content: string, node: HTMLElement) => {
    const img = node as HTMLImageElement
    const alt = img.alt || ''
    // Handle lazy-loaded images: check data-src, data-lazy-src, srcset, then src
    let src =
      img.getAttribute('data-src') ||
      img.getAttribute('data-lazy-src') ||
      img.getAttribute('data-original') ||
      extractSrcFromSrcset(img.getAttribute('srcset')) ||
      img.src ||
      ''

    console.log('🚀 : preserveImages : node:', node, 'src:', src, 'alt:', alt)

    if (!src) {
      console.warn('🚀 : preserveImages : No src found for image:', img)
      return ''
    }

    if (!isAbsoluteUrl(src)) {
      // Convert relative URLs to absolute URLs
      const absoluteUrl = convertToAbsoluteUrl(src, window.location.href)
      if (absoluteUrl) {
        src = absoluteUrl
        console.log('🚀 : preserveImages : Converted relative URL to absolute:', src)
      } else {
        console.error('🚀 : preserveImages : Failed to convert URL:', src)
        return '' // Don't return invalid relative URL
      }
    }

    return `![${alt}](${src})`
  },
})

// Handle tables - convert to Markdown tables
turndownService.addRule('tables', {
  filter: 'table',
  replacement: (_content: string, node: HTMLElement) => {
    const table = node as HTMLTableElement
    const rows = Array.from(table.querySelectorAll('tr'))
    if (rows.length === 0) return ''

    const result: string[] = []

    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th, td'))
      const cellContents = cells.map((cell) => {
        // Clean cell content: remove newlines and extra spaces
        return (cell.textContent || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
      })

      // Create row
      result.push(`| ${cellContents.join(' | ')} |`)

      // Add separator after header row (only once, after first row with th elements)
      if (rowIndex === 0 && row.querySelector('th')) {
        const separator = cells.map(() => '---').join(' | ')
        result.push(`| ${separator} |`)
      }
    })

    return `\n\n${result.join('\n')}\n\n`
  },
})

// Handle Mermaid diagrams - convert to Mermaid code blocks
turndownService.addRule('mermaidDiagrams', {
  filter: (node: HTMLElement) => {
    return (
      node.classList?.contains('mermaid-diagram') ||
      node.classList?.contains('mermaid') ||
      node.getAttribute('data-mermaid') !== null
    )
  },
  replacement: (_content: string, node: HTMLElement) => {
    // Try to get the original Mermaid source code
    const mermaidCode =
      node.getAttribute('data-mermaid-source') ||
      node.getAttribute('data-source') ||
      node.querySelector('code')?.textContent ||
      node.textContent ||
      ''

    const cleanedCode = mermaidCode.trim()
    if (!cleanedCode) return ''

    return `\n\n\`\`\`mermaid\n${cleanedCode}\n\`\`\`\n\n`
  },
})

// Handle code blocks - improved language detection for GitHub, npm, etc.
turndownService.addRule('improvedCodeBlocks', {
  filter: (node: HTMLElement) => {
    return node.nodeName === 'PRE'
  },
  replacement: (_content: string, node: HTMLElement) => {
    const pre = node as HTMLPreElement

    // Extract raw text from pre tag to ignore syntax highlighting spans
    const text = pre.textContent
    if (!text) return ''

    // Try to detect language from classes
    let language = ''
    const classList = Array.from(pre.classList)

    // Check parent for highlight classes (common in GitHub/npm: .highlight > pre)
    const parent = pre.parentElement
    if (parent?.classList.contains('highlight')) {
      classList.push(...Array.from(parent.classList))
    }
    // Look for language patterns
    for (const className of classList) {
      // GitHub/npm pattern: highlight-source-js, highlight-text-html-basic, etc.
      const ghMatch = className.match(/highlight-source-([a-z0-9#-]+)/i)
      if (ghMatch) {
        language = ghMatch[1]
        break
      }

      // Standard patterns: language-js, lang-js
      const langMatch = className.match(/(?:language|lang)-([a-z0-9#-]+)/i)
      if (langMatch) {
        language = langMatch[1]
        break
      }
    }

    // Map common verbose names to short names
    const langMap: Record<string, string> = {
      'text-html-basic': 'html',
      'text-html-php': 'php',
      'source-python': 'python',
      'source-ruby': 'ruby',
      'highlight-text-shell-session': 'shell',
    }

    if (langMap[language]) {
      language = langMap[language]
    }

    // Ensure we don't return an empty code block if detection failed but content exists
    return `\n\n\`\`\`${language}\n${text.trim()}\n\`\`\`\n\n`
  },
})

// Handle native video elements
turndownService.addRule('videos', {
  filter: 'video',
  replacement: (_content: string, node: HTMLElement) => {
    const video = node as HTMLVideoElement
    // Try to get video source from src attribute or source element
    const src = video.src || video.querySelector('source')?.src || video.getAttribute('data-src') || ''

    if (!src) return ''

    const poster = video.poster ? ` (poster: ${video.poster})` : ''
    // 🎬 must be inside the link text for MarkdownUI to detect it
    return `\n\n[🎬 视频${poster}](${src})\n\n`
  },
})

// Handle iframe embeds (YouTube, Bilibili, Vimeo, etc.)
turndownService.addRule('videoEmbeds', {
  filter: (node: HTMLElement) => {
    if (node.nodeName !== 'IFRAME') return false
    const src = node.getAttribute('src') || ''
    return (
      src.includes('youtube.com') ||
      src.includes('youtu.be') ||
      src.includes('bilibili.com') ||
      src.includes('player.bilibili.com') ||
      src.includes('vimeo.com') ||
      src.includes('player.vimeo.com') ||
      src.includes('dailymotion.com') ||
      src.includes('v.qq.com') ||
      src.includes('player.youku.com')
    )
  },
  replacement: (_content: string, node: HTMLElement) => {
    const iframe = node as HTMLIFrameElement
    const src = iframe.src || ''
    const title = iframe.title || '视频'

    // Extract video URL from embed URL
    const videoUrl = extractVideoUrl(src)
    if (!videoUrl) return ''

    // 🎬 must be inside the link text for MarkdownUI to detect it
    return `\n\n[🎬 ${title}](${videoUrl})\n\n`
  },
})

/**
 * Extract actual video URL from embed URL
 */
const extractVideoUrl = (embedUrl: string): string | null => {
  try {
    const url = new URL(embedUrl)

    // YouTube
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      // Extract video ID from various YouTube URL formats
      const videoId =
        url.searchParams.get('v') ||
        url.pathname.match(/\/embed\/([^/?]+)/)?.[1] ||
        url.pathname.match(/\/v\/([^/?]+)/)?.[1] ||
        (url.hostname === 'youtu.be' ? url.pathname.slice(1) : null)
      if (videoId) return `https://www.youtube.com/watch?v=${videoId}`
    }

    // Bilibili
    if (url.hostname.includes('bilibili.com')) {
      const bvid = url.pathname.match(/\/(BV[a-zA-Z0-9]+)/)?.[1]
      const aid = url.searchParams.get('aid') || url.pathname.match(/\/av(\d+)/)?.[1]

      if (bvid) return `https://www.bilibili.com/video/${bvid}`
      if (aid) return `https://www.bilibili.com/video/av${aid}`
    }

    // Vimeo
    if (url.hostname.includes('vimeo.com')) {
      const videoId = url.pathname.match(/\/video\/(\d+)/)?.[1] || url.pathname.match(/\/(\d+)/)?.[1]
      if (videoId) return `https://vimeo.com/${videoId}`
    }

    // QQ Video
    if (url.hostname.includes('v.qq.com')) {
      const vid = url.searchParams.get('vid')
      if (vid) return `https://v.qq.com/x/page/${vid}.html`
    }

    // Youku
    if (url.hostname.includes('youku.com')) {
      const videoId = url.searchParams.get('vid') || url.pathname.match(/\/v_show\/id_([^.]+)/)?.[1]
      if (videoId) return `https://v.youku.com/v_show/id_${videoId}.html`
    }

    // Fallback: return the embed URL itself
    return embedUrl
  } catch {
    return embedUrl
  }
}

/**
 * Extract the first URL from srcset attribute
 */
const extractSrcFromSrcset = (srcset: string | null): string | null => {
  if (!srcset) return null
  // srcset format: "url1 1x, url2 2x" or "url1 100w, url2 200w"
  const firstEntry = srcset.split(',')[0]?.trim()
  if (!firstEntry) return null
  // Get the URL part (before the descriptor)
  const url = firstEntry.split(/\s+/)[0]
  return url || null
}

/**
 * Check if URL starts with any of the given prefixes
 */
const startsWithAny = (url: string, prefixes: string[]): boolean => {
  return prefixes.some((prefix) => url.startsWith(prefix))
}

/**
 * Check if URL is an absolute URL (http://, https://, or data:)
 */
const isAbsoluteUrl = (url: string): boolean => {
  return startsWithAny(url, ['http://', 'https://', 'data:'])
}

/**
 * Check if URL is an anchor link (#)
 */
const isAnchorLink = (url: string): boolean => {
  return url.startsWith('#')
}

/**
 * Check if URL is a protocol URL (mailto:, tel:, javascript:, etc.)
 */
const isProtocolUrl = (url: string): boolean => {
  return startsWithAny(url, ['mailto:', 'tel:', 'javascript:', 'data:'])
}

/**
 * Check if URL is an HTTP/HTTPS URL
 */
const isHttpUrl = (url: string): boolean => {
  return startsWithAny(url, ['http://', 'https://'])
}

/**
 * Extract thumbnail URL from page metadata and content
 * Priority:
 * 1. Open Graph image (og:image)
 * 2. Twitter Card image (twitter:image)
 * 3. First image from content
 * 4. Favicon (as last resort)
 */
const extractThumbnailUrl = (document: Document, content: string): string | undefined => {
  // Use window.location.href as base URL (document.location may not work for cloned documents)
  const baseUrl = window.location.href

  // 1. Try Open Graph image
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
  if (ogImage) {
    const absoluteUrl = convertToAbsoluteUrl(ogImage, baseUrl)
    if (absoluteUrl) {
      console.log('🚀 : extractThumbnailUrl : Found og:image:', absoluteUrl)
      return absoluteUrl
    }
  }

  // 2. Try Twitter Card image
  const twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
  if (twitterImage) {
    const absoluteUrl = convertToAbsoluteUrl(twitterImage, baseUrl)
    if (absoluteUrl) {
      console.log('🚀 : extractThumbnailUrl : Found twitter:image:', absoluteUrl)
      return absoluteUrl
    }
  }

  // 3. Try to extract first image from markdown content
  if (content) {
    // Use non-global regex or match() to avoid state issues
    const imageRegex = /!\[.*?\]\((.*?)\)/
    const match = content.match(imageRegex)
    if (match?.[1]) {
      const url = match[1].trim()
      // Filter out data URIs and only accept HTTP/HTTPS URLs
      if (url && !url.startsWith('data:') && isHttpUrl(url)) {
        console.log('🚀 : extractThumbnailUrl : Found first image from content:', url)
        return url
      }
    }
  }

  // 4. Try favicon as last resort
  const favicon =
    document.querySelector('link[rel="icon"]')?.getAttribute('href') ||
    document.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ||
    '/favicon.ico'
  if (favicon) {
    const absoluteUrl = convertToAbsoluteUrl(favicon, baseUrl)
    if (absoluteUrl) {
      console.log('🚀 : extractThumbnailUrl : Using favicon:', absoluteUrl)
      return absoluteUrl
    }
  }

  return undefined
}

/**
 * Convert relative URL to absolute URL
 */
const convertToAbsoluteUrl = (url: string, baseUrl: string): string | undefined => {
  if (!url) return undefined

  try {
    // Use URL constructor to handle all relative URL cases reliably
    const absoluteUrl = new URL(url, baseUrl)
    return absoluteUrl.href
  } catch (error) {
    console.error('🚀 : convertToAbsoluteUrl : Error converting URL:', error, 'url:', url, 'baseUrl:', baseUrl)
    return undefined
  }
}

/**
 * Check if current page is a GitHub repository homepage
 * Examples:
 * - https://github.com/heroui-inc/heroui ✅ (repository homepage)
 * - https://github.com/facebook/react/blob/main/package.json ❌ (file page)
 * - https://github.com/facebook/react/tree/main/src ❌ (tree page)
 */
const isGitHubRepoHomepage = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    // Check if it's GitHub
    if (urlObj.hostname !== 'github.com') return false

    // GitHub repo homepage pattern: /owner/repo (no additional path segments like /blob, /tree, etc.)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)

    // Should have exactly 2 parts: owner and repo
    if (pathParts.length !== 2) return false

    // Should not have query params that indicate it's not a homepage
    // (though homepage usually doesn't have these, but just to be safe)
    return true
  } catch {
    return false
  }
}

/**
 * Extract content from GitHub repository homepage
 * Only extracts content from .markdown-body.entry-content
 */
const extractGitHubRepoContent = (url: string): PageContent | null => {
  // Look for the markdown body element
  const markdownBody = document.querySelector('.markdown-body.entry-content')

  if (!markdownBody) {
    console.log('🚀 : extractGitHubRepoContent : .markdown-body.entry-content not found, falling back to default')
    return null
  }

  console.log('🚀 : extractGitHubRepoContent : Found .markdown-body.entry-content, extracting content')

  // Clone the element to avoid modifying the original
  const clonedBody = markdownBody.cloneNode(true) as HTMLElement

  // Get title from page
  const title = document.querySelector('h1.public')?.textContent?.trim() || document.title || url

  // Convert HTML to Markdown
  const markdown = turndownService.turndown(clonedBody)
  const cleanedMarkdown = cleanMarkdown(markdown)

  // Extract thumbnail URL
  const thumbnailUrl = extractThumbnailUrl(document, cleanedMarkdown)

  return {
    url,
    title,
    content: cleanedMarkdown,
    thumbnailUrl,
  }
}

/**
 * Extract content from the current page using Readability + Turndown
 */
export const extractPageContent = (): PageContent => {
  const url = window.location.href

  if (url?.includes('bilibili.com')) {
    return {
      url,
      title: document.title || url,
      content: `\n\n[🎬 视频](${url})\n\n`,
      thumbnailUrl: '',
    }
  }
  if (url?.includes('youtube.com')) {
    return {
      url,
      title: document.title || url,
      content: `\n\n[🎬 视频](${url})\n\n`,
      thumbnailUrl: '',
    }
  }

  // Special handling for GitHub repository homepages
  if (isGitHubRepoHomepage(url)) {
    const githubContent = extractGitHubRepoContent(url)
    if (githubContent) {
      return githubContent
    }
  }

  // Clone the document to avoid modifying the original
  const documentClone = document.cloneNode(true) as Document

  // Use Readability to extract main content
  const reader = new Readability(documentClone, {
    charThreshold: 50,
    keepClasses: true,
  })
  const article = reader.parse()

  if (article?.content) {
    // Check if article content contains images before conversion
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = article.content
    const images = tempDiv.querySelectorAll('img')
    images.forEach((img, index) => {
      const imgEl = img as HTMLImageElement
      console.log(`🚀 : extractPageContent : Image ${index}:`, {
        src: imgEl.src,
        dataSrc: imgEl.getAttribute('data-src'),
        alt: imgEl.alt,
        srcset: imgEl.getAttribute('srcset'),
      })
    })

    // Convert HTML to Markdown
    const markdown = turndownService.turndown(article.content)
    const cleanedMarkdown = cleanMarkdown(markdown)

    // Extract thumbnail URL
    const thumbnailUrl = extractThumbnailUrl(documentClone, cleanedMarkdown)

    return {
      url,
      title: article.title || document.title || url,
      content: cleanedMarkdown,
      thumbnailUrl,
    }
  }

  // Fallback: use manual extraction if Readability fails
  const fallbackContent = extractFallbackContent()
  const thumbnailUrl = extractThumbnailUrl(documentClone, fallbackContent)

  return {
    url,
    title: document.title || url,
    content: fallbackContent,
    thumbnailUrl,
  }
}

/**
 * Fallback content extraction when Readability fails
 */
const extractFallbackContent = (): string => {
  const body = document.body.cloneNode(true) as HTMLElement

  // Remove non-content elements
  const removeSelectors = [
    'script',
    'style',
    'noscript',
    'header',
    'footer',
    'nav',
    'aside',
    '.sidebar',
    '.comments',
    '.advertisement',
    '.ad',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="complementary"]',
  ]

  for (const selector of removeSelectors) {
    body.querySelectorAll(selector).forEach((el) => {
      el.remove()
    })
  }

  // Convert fallback HTML to markdown
  const markdown = turndownService.turndown(body)
  return cleanMarkdown(markdown)
}

/**
 * Clean and normalize markdown content
 *
 * Note: No length limit applied - SQLite TEXT can handle large content.
 * Only formatting cleanup is performed to ensure clean markdown output.
 */
const cleanMarkdown = (markdown: string): string => {
  return markdown
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines (3+ → 2)
    .replace(/^\s+|\s+$/g, '') // Trim leading/trailing whitespace
  // Removed length limit - SQLite TEXT supports large content
}

/**
 * Check if current page can be collected
 */
export const canCollectPage = (): boolean => {
  const url = window.location.href

  // Cannot collect special pages
  const blockedPrefixes = [
    'chrome://',
    'chrome-extension://',
    'moz-extension://',
    'edge://',
    'about:',
    'file://',
    'data:',
  ]

  return !blockedPrefixes.some((prefix) => url.startsWith(prefix))
}
