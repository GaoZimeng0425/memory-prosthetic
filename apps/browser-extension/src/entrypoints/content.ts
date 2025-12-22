import { defineContentScript } from 'wxt/utils/define-content-script'

import type { ContentResponse, ExtensionMessage } from '@/types/messages'
import { canCollectPage, extractPageContent } from '@/utils/content-extractor'

export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_idle',
  main() {
    // Listen for messages from popup
    browser.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender, sendResponse: (response: ContentResponse) => void) => {
        if (message.type === 'EXTRACT_CONTENT') {
          // Check if page can be collected
          if (!canCollectPage()) {
            sendResponse({
              success: false,
              error: '无法收集此页面',
            })
            return true
          }

          // Extract content
          try {
            const content = extractPageContent()
            sendResponse({
              success: true,
              data: content,
            })
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : '提取内容失败',
            })
          }

          return true // Keep channel open for async response
        }
        return false
      }
    )
  },
})
