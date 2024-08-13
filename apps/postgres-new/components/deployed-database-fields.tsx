import { CopyIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { DeployedDatabaseCreateResult } from '~/data/deployed-databases/deployed-database-create-mutation'

export type DeployedDatabaseFieldsProps = DeployedDatabaseCreateResult

export function DeployedDatabaseFields(props: DeployedDatabaseFieldsProps) {
  const port = '5432'
  const password = props.password ?? '[The password for your database]'
  const connectionStringPassword = props.password
    ? encodeURIComponent(props.password)
    : '[YOUR-PASSWORD]'
  const connectionString = `postgresql://${props.username}:${connectionStringPassword}@${props.host}:${port}/${props.databaseName}`

  return (
    <div className="space-y-4">
      <CopyableField label="Connection string" value={connectionString} />
      <CopyableField label="Host" value={props.host} />
      <CopyableField label="Database name" value={props.databaseName} />
      <CopyableField label="Port" value={port} />
      <CopyableField label="User" value={props.username} />
      <CopyableField label="Password" value={password} disableCopy={props.password === undefined} />
    </div>
  )
}

function CopyableField(props: { label: string; value: string; disableCopy?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
      <Label className="sm:w-44 whitespace-nowrap">{props.label}</Label>
      <CopyableInput value={props.value} disableCopy={props.disableCopy} />
    </div>
  )
}

function CopyableInput(props: { value: string; disableCopy?: boolean }) {
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
