import { CodeBlock } from '~/components/code-block'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'

export type DatabaseItemDeployedDialogProps = {
  databaseUrl: string
  children: React.ReactNode
}

export function DatabaseItemDeployedDialog(props: DatabaseItemDeployedDialogProps) {
  const psqlCommand = `psql ${props.databaseUrl}`

  return (
    <Dialog>
      <DialogTrigger>{props.children}</DialogTrigger>
      <DialogPortal>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Your database has been deployed</DialogTitle>
            <div className="py-2 border-b" />
          </DialogHeader>
          <h2 className="font-bold">What are deployments?</h2>
          <p>
            Your database has been deployed to a serverless PGlite instance so that it can be
            accessed outside the browser using any Postgres client:
          </p>
          <CodeBlock
            className="language-curl bg-neutral-800"
            language="curl"
            hideLineNumbers
            theme="dark"
            value={psqlCommand}
          >
            {psqlCommand}
          </CodeBlock>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
