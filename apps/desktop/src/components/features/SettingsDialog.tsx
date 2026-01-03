import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@memory-prosthetic/ui/components/ui/dialog'
import { SettingsPanel } from '@/components/SettingsPanel'

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="h-[85vh] max-w-lg overflow-y-auto md:max-w-xl lg:max-w-2xl xl:max-w-5xl">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>管理应用程序设置和偏好</DialogDescription>
        </DialogHeader>
        <SettingsPanel />
      </DialogContent>
    </Dialog>
  )
}
