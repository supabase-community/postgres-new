import { ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'

import TablesGraph from './table-graph'

export type SchemaGraphProps = {
  databaseId: string
  schemas: string[]
}

export default function SchemaGraph({ databaseId, schemas }: SchemaGraphProps) {
  return (
    <ReactFlowProvider>
      <TablesGraph databaseId={databaseId} schemas={schemas} />
    </ReactFlowProvider>
  )
}
