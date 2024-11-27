import { m } from 'framer-motion'
import { Brain } from 'lucide-react'
import { useApp } from '~/components/app-provider'
import { SetModelProviderDialog } from '~/components/model-provider/set-model-provider-dialog'
import { Button } from '~/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

type SetExternalModelProviderButtonProps = {
  collapsed?: boolean
}

export function SetExternalModelProviderButton(props: SetExternalModelProviderButtonProps) {
  const { modelProvider, isModelProviderDialogOpen, setIsModelProviderDialogOpen } = useApp()

  const modelName = modelProvider.state?.model.split('/').at(-1)
  const text = modelProvider.state?.enabled ? modelName : 'Use your own LLM'
  const button = props.collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <m.div layout="position" layoutId="set-external-model-button">
          <Button
            size={'icon'}
            variant="outline"
            onClick={() => setIsModelProviderDialogOpen(true)}
          >
            <Brain size={16} strokeWidth={2} />
          </Button>
        </m.div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  ) : (
    <m.div layout="position" layoutId="set-external-model-button">
      <Button
        className="w-full gap-2"
        variant="outline"
        onClick={() => setIsModelProviderDialogOpen(true)}
      >
        <Brain size={18} strokeWidth={2} />
        <div className="inline-block whitespace-nowrap overflow-hidden text-ellipsis">{text}</div>
      </Button>
    </m.div>
  )

  return (
    <>
      <SetModelProviderDialog
        open={isModelProviderDialogOpen}
        onOpenChange={setIsModelProviderDialogOpen}
      />
      {button}
    </>
  )
}
