import * as React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { generateReactHelpers } from '@uploadthing/react'
import { toast } from 'sonner'
import type { ClientUploadedFileData, UploadFilesOptions } from 'uploadthing/types'
import { z } from 'zod'

import type { OurFileRouter } from '@memory-prosthetic/editor/utils/uploadthing'

export type UploadedFile<T = unknown> = ClientUploadedFileData<T>

interface UseUploadFileProps
  extends Pick<
    UploadFilesOptions<OurFileRouter['editorUploader']>,
    'headers' | 'onUploadBegin' | 'onUploadProgress' | 'skipPolling'
  > {
  onUploadComplete?: (file: UploadedFile) => void
  onUploadError?: (error: unknown) => void
}

export function useUploadFile({ onUploadComplete, onUploadError, ...props }: UseUploadFileProps = {}) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>()
  const [uploadingFile, setUploadingFile] = React.useState<File>()
  const [progress, setProgress] = React.useState<number>(0)
  const [isUploading, setIsUploading] = React.useState(false)

  async function uploadThing(file: File) {
    setIsUploading(true)
    setUploadingFile(file)

    try {
      let mock: UploadedFile

      // Check if running in Tauri
      // @ts-expect-error
      const isTauri = !!window.__TAURI_INTERNALS__

      if (isTauri) {
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        // Invoke Tauri command
        const response = await invoke<{
          data: {
            name: string
            type: string
            size: number
            url: string
          }
        }>('upload_file', {
          name: file.name,
          type: file.type,
          content: Array.from(uint8Array), // Serialize to array of numbers for Vec<u8>
        })

        const data = response.data

        mock = {
          name: data.name,
          size: data.size,
          type: data.type,
          serverData: undefined,
          customId: null,
          key: data.name,
          url: data.url,
          appUrl: '',
          ufsUrl: '',
          fileHash: '',
        }
      } else {
        // Fallback for browser / non-Tauri env
        mock = {
          name: file.name,
          size: file.size,
          type: file.type,
          serverData: undefined,
          customId: null,
          key: '',
          url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8bGFuZHNjYXBlfGVufDB8fDB8fHww',
          appUrl: '',
          ufsUrl: '',
          fileHash: '',
        }
      }

      setUploadedFile(mock)

      onUploadComplete?.(mock)

      return mock
    } catch (error) {
      const errorMessage = getErrorMessage(error)

      const message = errorMessage.length > 0 ? errorMessage : 'Something went wrong, please try again later.'

      toast.error(message)

      onUploadError?.(error)

      // Mock upload for unauthenticated users
      // toast.info('User not logged in. Mocking upload process.');
      const mockUploadedFile = {
        key: 'mock-key-0',
        appUrl: `https://mock-app-url.com/${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      } as UploadedFile

      // Simulate upload progress
      let progress = 0

      const simulateProgress = async () => {
        while (progress < 100) {
          await new Promise((resolve) => setTimeout(resolve, 50))
          progress += 2
          setProgress(Math.min(progress, 100))
        }
      }

      await simulateProgress()

      setUploadedFile(mockUploadedFile)

      return mockUploadedFile
    } finally {
      setProgress(0)
      setIsUploading(false)
      setUploadingFile(undefined)
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile: uploadThing,
    uploadingFile,
  }
}

export const { uploadFiles, useUploadThing } = generateReactHelpers<OurFileRouter>()

export function getErrorMessage(err: unknown) {
  const unknownError = 'Something went wrong, please try again later.'

  if (err instanceof z.ZodError) {
    const errors = err.issues.map((issue) => issue.message)

    return errors.join('\n')
  }
  if (err instanceof Error) {
    return err.message
  }
  return unknownError
}

export function showErrorToast(err: unknown) {
  const errorMessage = getErrorMessage(err)

  return toast.error(errorMessage)
}
