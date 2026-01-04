/**
 * Slate format storage utilities
 *
 * Provides functions for serializing and deserializing Slate JSON format
 * for storage in the database.
 */

import type { Value } from '@memory-prosthetic/editor/types'

/**
 * Serialize Slate value to JSON string for database storage
 *
 * @param value - Slate value object
 * @returns JSON string representation
 * @throws Error if serialization fails
 */
export const serializeSlateValue = (value: Value): string => {
  try {
    return JSON.stringify(value)
  } catch (error) {
    throw new Error(`Failed to serialize Slate value: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Deserialize JSON string to Slate value
 *
 * @param jsonString - JSON string from database
 * @returns Slate value object
 * @throws Error if deserialization fails or value is invalid
 */
export const deserializeSlateValue = (jsonString: string): Value => {
  try {
    const parsed = JSON.parse(jsonString)

    // Basic validation: ensure it's an array (Slate value is always an array)
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid Slate value: expected an array')
    }

    return parsed as Value
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON string: ${error.message}`)
    }
    throw new Error(`Failed to deserialize Slate value: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Validate if a value is a valid Slate value structure
 *
 * @param value - Value to validate
 * @returns true if valid, false otherwise
 */
export const isValidSlateValue = (value: unknown): value is Value => {
  if (!Array.isArray(value)) {
    return false
  }

  // Basic structure check: each element should be an object with 'children' property
  return value.every((node) => {
    return typeof node === 'object' && node !== null && 'children' in node
  })
}
