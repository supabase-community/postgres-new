import { BrainIcon } from 'lucide-react'
import { useApp } from '~/components/app-provider'
import { Button } from '~/components/ui/button'

export function BringYourOwnLLMButton() {
  const { modelProvider } = useApp()

  const modelName = modelProvider.state?.model.split('/').at(-1)
  const text = modelProvider.state?.enabled ? modelName : 'Bring your own LLM'

  return (
    <Button variant="outline" size="sm" className="gap-2">
      <BrainIcon size={14} /> {text}
    </Button>
  )
}
