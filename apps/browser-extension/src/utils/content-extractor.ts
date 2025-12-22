/**
 * Content Extractor
 *
 * Extracts main content from web pages using multiple strategies.
 */

/**
 * Extracted page content
 */
export interface PageContent {
  url: string
  title: string
  content: string
}

/**
 * Extract content from the current page
 */
export function extractPageContent(): PageContent {
  const url = window.location.href
  const title = document.title || url

  // Try multiple extraction strategies
  const content = extractMainContent()

  return { url, title, content }
}

/**
 * Extract main content using multiple strategies
 */
function extractMainContent(): string {
  // Strategy 1: Look for article element
  const article = document.querySelector('article')
  if (article) {
    return cleanText(article.innerText)
  }

  // Strategy 2: Look for main element
  const main = document.querySelector('main')
  if (main) {
    return cleanText(main.innerText)
  }

  // Strategy 3: Look for common content containers
  const contentSelectors = [
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content',
    '.markdown-body', // GitHub
    '.Post-RichText', // Zhihu
    '.RichText', // Zhihu
  ]

  for (const selector of contentSelectors) {
    const element = document.querySelector(selector)
    if (element && element instanceof HTMLElement) {
      const text = cleanText(element.innerText)
      if (text.length > 100) {
        return text
      }
    }
  }

  // Strategy 4: Fallback to body, excluding common non-content elements
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
    body.querySelectorAll(selector).forEach((el) => el.remove())
  }

  return cleanText(body.innerText)
}

/**
 * Clean and normalize text content
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
    .trim()
    .slice(0, 50000) // Limit content length
}

/**
 * Check if current page can be collected
 */
export function canCollectPage(): boolean {
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
