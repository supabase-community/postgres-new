import { Dialog, DialogContent, DialogTitle, DialogHeader } from './ui/dialog'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function DeployFailureDialog() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)

    if (searchParams.get('event') === 'deploy.failure') {
      setError(searchParams.get('error'))
      setOpen(true)
      router.replace(window.location.pathname)
    }
  }, [router])

  if (!error) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Database deployment failed</DialogTitle>
          <div className="py-2 border-b" />
        </DialogHeader>
        <p>{error}</p>
      </DialogContent>
    </Dialog>
  )
}
