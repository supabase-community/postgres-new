import { CopyIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

export function CopyableField(props: { label?: string; value: string; disableCopy?: boolean }) {
  return (
    <div className="flex flex-col space-y-2 w-full">
      {props.label && <Label className="whitespace-nowrap">{props.label}</Label>}
      <CopyableInput value={props.value} disableCopy={props.disableCopy} />
    </div>
  )
}

export function CopyableInput(props: { value: string; disableCopy?: boolean }) {
  const [isCopying, setIsCopying] = useState(false)

  function handleCopy(value: string) {
    setIsCopying(true)
    navigator.clipboard.writeText(value)
    setTimeout(() => {
      setIsCopying(false)
    }, 2000)
  }

  return (
    <div className="flex flex-1 relative group">
      <Input readOnly value={props.value} className="flex-grow text-muted-foreground" />
      {!props.disableCopy && (
        <Button
          variant="outline"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-6"
          onClick={() => handleCopy(props.value)}
        >
          <CopyIcon className="h-3 w-3 mr-1 text-muted-foreground" />
          {isCopying ? 'Copied' : 'Copy'}
        </Button>
      )}
    </div>
  )
}
