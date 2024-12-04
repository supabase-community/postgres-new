import GitHubIcon from '~/assets/github-icon'
import { useApp } from './app-provider'
import { Button } from './ui/button'

export default function SignInButton() {
  const { signIn } = useApp()
  return (
    <Button
      className="w-full text-sm rounded-sm flex gap-2 items-center justify-center"
      onClick={async () => {
        await signIn()
      }}
    >
      <GitHubIcon className="w-4 h-4 text-xl" />
      Sign in with GitHub
    </Button>
  )
}
