import { useApp } from '../app-provider'
import SignInButton from '../sign-in-button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'

export function SignInDialog() {
  const { isSignInDialogOpen, setIsSignInDialogOpen } = useApp()

  return (
    <Dialog
      open={isSignInDialogOpen}
      onOpenChange={(open) => {
        setIsSignInDialogOpen(open)
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sign in to create a database</DialogTitle>
          <div className="py-2 border-b" />
        </DialogHeader>
        <h2 className="font-bold">Why do I need to sign in?</h2>
        <p>
          Even though your Postgres databases run{' '}
          <a
            className="underline"
            href="https://pglite.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            directly in the browser
          </a>
          , we still need to connect to an API that runs the large language model (required for all
          database interactions).
        </p>
        <p>We ask you to sign in to prevent API abuse.</p>
        <div className="flex justify-center items-center my-3">
          <SignInButton />
        </div>
      </DialogContent>
    </Dialog>
  )
}
