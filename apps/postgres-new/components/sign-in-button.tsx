import GitHubIcon from '~/assets/github-icon'
import { useApp } from './app-provider'

export default function SignInButton() {
  const { signIn } = useApp()
  return (
    <button
      className="bg-foreground text-background text-md px-4 py-2 rounded-sm flex gap-3 items-center"
      onClick={async () => {
        await signIn()
      }}
    >
      <GitHubIcon className="text-xl" />
      Sign in with GitHub
    </button>
  )
}
