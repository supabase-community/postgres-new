import { useEffect, useState } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Node,
  Edge,
  Position,
  Handle,
  useReactFlow,
  ReactFlowInstance,
} from 'reactflow'
import { useApp } from '../app-provider'
import { motion } from 'framer-motion'
const initialNodes: Node[] = [
  {
    id: 'build',
    type: 'empty',
    position: { x: 0, y: 0 },
    data: { text: 'Build' },
    draggable: true,
  },
  {
    id: 'your',
    type: 'empty',
    position: { x: 120, y: 120 },
    data: { text: 'Your' },
    draggable: true,
  },
  {
    id: 'database',
    type: 'empty',
    position: { x: 200, y: 240 },
    data: { text: 'Database' },
    draggable: true,
  },
]

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'build', target: 'your' },
  { id: 'e2-3', source: 'your', target: 'database' },
]

const EmptyNode = ({ data }: { data: { text: string } }) => {
  const nodeStyle: React.CSSProperties = {
    padding: '12px 24px',
    background: 'linear-gradient(to right, hsl(var(--foreground)/.02), hsl(var(--foreground)/.08))',
    borderRadius: '4px',
    border: '1px solid hsl(var(--foreground)/.07)',
    position: 'relative',
    fontSize: '64px',
    lineHeight: 1,
    letterSpacing: '-2px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
  }

  const textStyle: React.CSSProperties = {
    background: 'linear-gradient(to bottom, hsl(var(--foreground)/.6), hsl(var(--foreground)))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }

  return (
    <div style={nodeStyle}>
      <div style={textStyle}>{data.text}</div>
      <div
        style={{ position: 'absolute', top: '50%', left: '-10px', transform: 'translateY(-50%)' }}
      >
        <Handle type="target" position={Position.Left} isConnectable={true} />
      </div>
      <div
        style={{ position: 'absolute', top: '50%', right: '-10px', transform: 'translateY(-50%)' }}
      >
        <Handle type="source" position={Position.Right} isConnectable={true} />
      </div>
    </div>
  )
}

export default function EmptyStateGraph() {
  const nodeTypes = {
    empty: EmptyNode,
  }

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)

  const { showSidebar } = useApp()

  useEffect(() => {
    if (reactFlowInstance) {
      // it needs to happen on the next tick
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 1 })
      }, 0)
    }
  }, [reactFlowInstance, showSidebar])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="h-full w-full"
    >
      <ReactFlow
        onInit={(instance) => setReactFlowInstance(instance)}
        defaultNodes={initialNodes}
        defaultEdges={initialEdges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          style: {
            stroke: 'hsl(var(--muted-foreground)/.2)',
            strokeWidth: 2,
          },
        }}
        panOnScroll
        fitView
        fitViewOptions={{ padding: 1 }}
        draggable={false}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        panOnDrag={true}
      >
        <Background
          gap={32}
          className="text-foreground"
          variant={BackgroundVariant.Dots}
          size={1}
          color="hsl(var(--muted-foreground))"
        />
      </ReactFlow>
    </motion.div>
  )
}
