/**
 * Message types for communication between popup and content script
 */

import type { PageContent } from '@/utils/content-extractor'

/** Message to request page content extraction */
export interface ExtractContentMessage {
  type: 'EXTRACT_CONTENT'
}

/** Response with extracted content */
export interface ExtractContentResponse {
  success: true
  data: PageContent
}

/** Error response */
export interface ExtractErrorResponse {
  success: false
  error: string
}

/** Combined response type */
export type ContentResponse = ExtractContentResponse | ExtractErrorResponse

/** All message types */
export type ExtensionMessage = ExtractContentMessage
