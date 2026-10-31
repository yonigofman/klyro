import { useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '#/components/ui/dialog'
import { RegisterClusterForm } from '#/features/clusters/components/RegisterClusterForm'

export function RegisterClusterDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add cluster</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add cluster</DialogTitle>
          <DialogDescription>
            Paste a kubeconfig to connect a cluster. Nothing in it is ever
            stored or returned as-is.
          </DialogDescription>
        </DialogHeader>
        <RegisterClusterForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
