import { Brain } from 'lucide-react'
import { useApp } from '~/components/app-provider'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

export type ByoLlmButtonProps = {
  onClick?: () => void
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  iconOnly?: boolean
}

export default function ByoLlmButton({
  onClick,
  className,
  size = 'default',
  iconOnly = false,
}: ByoLlmButtonProps) {
  const { setIsModelProviderDialogOpen, modelProvider } = useApp()

  const button = (
    <Button
      className={cn('gap-2 text-sm flex justify-center items-center relative', className)}
      variant="outline"
      size={iconOnly ? 'sm' : size}
      onClick={() => {
        onClick?.()
        setIsModelProviderDialogOpen(true)
      }}
    >
      {modelProvider?.state?.enabled && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" />
      )}
      <Brain size={16} strokeWidth={1.5} />
      {!iconOnly && 'Bring your own LLM'}
    </Button>
  )

  if (iconOnly) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>Bring your own LLM</TooltipContent>
      </Tooltip>
    )
  }

  return button
}
