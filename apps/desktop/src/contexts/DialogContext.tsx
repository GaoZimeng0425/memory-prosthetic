/**
 * Dialog Context
 *
 * Provides global dialog state management for TagDialog, FavoriteDialog, etc.
 */

import { createContext, type ReactNode, useContext, useState } from 'react'

interface DialogContextValue {
  // Tag Dialog
  tagDialogCollectionId: number | null
  openTagDialog: (collectionId: number) => void
  closeTagDialog: () => void

  // Favorite Dialog
  favoriteDialogState: {
    open: boolean
    collectionId: number | null
  }
  openFavoriteDialog: (collectionId: number) => void
  closeFavoriteDialog: () => void

  // Create Favorite Dialog
  isCreateFavoriteOpen: boolean
  openCreateFavoriteDialog: () => void
  closeCreateFavoriteDialog: () => void
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [tagDialogCollectionId, setTagDialogCollectionId] = useState<number | null>(null)
  const [favoriteDialogState, setFavoriteDialogState] = useState<{
    open: boolean
    collectionId: number | null
  }>({ open: false, collectionId: null })
  const [isCreateFavoriteOpen, setIsCreateFavoriteOpen] = useState(false)

  const openTagDialog = (collectionId: number) => {
    setTagDialogCollectionId(collectionId)
  }

  const closeTagDialog = () => {
    setTagDialogCollectionId(null)
  }

  const openFavoriteDialog = (collectionId: number) => {
    setFavoriteDialogState({ open: true, collectionId })
  }

  const closeFavoriteDialog = () => {
    setFavoriteDialogState({ open: false, collectionId: null })
  }

  const openCreateFavoriteDialog = () => {
    setIsCreateFavoriteOpen(true)
  }

  const closeCreateFavoriteDialog = () => {
    setIsCreateFavoriteOpen(false)
  }

  return (
    <DialogContext.Provider
      value={{
        tagDialogCollectionId,
        openTagDialog,
        closeTagDialog,
        favoriteDialogState,
        openFavoriteDialog,
        closeFavoriteDialog,
        isCreateFavoriteOpen,
        openCreateFavoriteDialog,
        closeCreateFavoriteDialog,
      }}
    >
      {children}
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return context
}
