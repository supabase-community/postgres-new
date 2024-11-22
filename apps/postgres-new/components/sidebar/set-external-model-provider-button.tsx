import { m } from 'framer-motion'
import { Button } from '../ui/button'
import { Brain } from 'lucide-react'
import { useApp } from '../app-provider'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { SetModelProviderDialog } from '../model-provider/set-model-provider-dialog'
import { useState } from 'react'

type SetExternalModelProviderButtonProps = {
  collapsed?: boolean
}

export function SetExternalModelProviderButton(props: SetExternalModelProviderButtonProps) {
  const { modelProvider } = useApp()
  const [isSetModelProviderDialogOpen, setIsSetModelProviderDialogOpen] = useState(false)

  const modelName = modelProvider.state?.model.split('/').at(-1)
  const text = modelName ?? 'Set external model'
  const button = props.collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <m.div layout="position" layoutId="set-external-model-button">
          <Button
            size={'icon'}
            variant="outline"
            onClick={() => setIsSetModelProviderDialogOpen(true)}
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
        onClick={() => setIsSetModelProviderDialogOpen(true)}
      >
        <Brain size={18} strokeWidth={2} />
        <div className="inline-block whitespace-nowrap overflow-hidden text-ellipsis">{text}</div>
      </Button>
    </m.div>
  )

  return (
    <>
      <SetModelProviderDialog
        open={isSetModelProviderDialogOpen}
        onOpenChange={setIsSetModelProviderDialogOpen}
      />
      {button}
    </>
  )
}
