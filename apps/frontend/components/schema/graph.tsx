import { ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'

import TablesGraph from './table-graph'

export type SchemaGraphProps = {
  databaseId: string
  schema: string
}

export default function SchemaGraph({ databaseId, schema }: SchemaGraphProps) {
  return (
    <ReactFlowProvider>
      <TablesGraph databaseId={databaseId} schema={schema} />
    </ReactFlowProvider>
  )
}
