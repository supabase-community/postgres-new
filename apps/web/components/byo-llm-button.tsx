import { Brain } from 'lucide-react'
import { useApp } from '~/components/app-provider'
import { Button } from '~/components/ui/button'

export type ByoLlmButtonProps = {
  onClick?: () => void
}

export default function ByoLlmButton({ onClick }: ByoLlmButtonProps) {
  const { setIsModelProviderDialogOpen } = useApp()

  return (
    <Button
      className="gap-2 text-base"
      onClick={() => {
        onClick?.()
        setIsModelProviderDialogOpen(true)
      }}
    >
      <Brain size={18} strokeWidth={2} />
      Bring your own LLM
    </Button>
  )
}
