import { m } from 'framer-motion'
import { Chart } from 'react-chartjs-2'
import { ErrorBoundary } from 'react-error-boundary'
import { ToolInvocation } from '~/lib/tools'

export type GeneratedChartProps = {
  toolInvocation: ToolInvocation<'generateChart'>
}

export default function GeneratedChart({ toolInvocation }: GeneratedChartProps) {
  if (!('result' in toolInvocation)) {
    return null
  }

  if ('error' in toolInvocation.result) {
    return <div className="bg-destructive-300 px-6 py-4 rounded-md">Error loading chart</div>
  }

  const { type, data, options } = toolInvocation.args.config
  return (
    <ErrorBoundary
      fallbackRender={() => (
        <div className="bg-destructive-300 px-6 py-4 rounded-md">Error loading chart</div>
      )}
    >
      <m.div
        className="relative w-full max-w-2xl h-[50vw] max-h-96 my-8"
        variants={{
          hidden: {
            opacity: 0,
          },
          show: {
            opacity: 1,
          },
        }}
        initial="hidden"
        animate="show"
      >
        <Chart
          className="max-w-full max-h-full"
          type={type}
          data={data}
          options={{
            ...options,
            maintainAspectRatio: false,
          }}
        />
      </m.div>
    </ErrorBoundary>
  )
}
