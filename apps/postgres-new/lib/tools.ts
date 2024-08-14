import { CoreTool } from 'ai'
import { codeBlock } from 'common-tags'
import { z } from 'zod'
import { reportSchema, resultsSchema, tableSchema, tabsSchema } from './schema'

const successResultSchema = z.object({
  success: z.literal(true),
})

const errorResultSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

function result<T extends z.ZodTypeAny>(schema: T) {
  return z.union([z.intersection(successResultSchema, schema), errorResultSchema])
}

/**
 * The maximum SQL result row limit to prevent overloading LLM.
 */
export const maxRowLimit = 100

/**
 * The maximum number of messages from the chat history to send to the LLM.
 */
export const maxMessageContext = 30

/**
 * Central location for all LLM tools including their
 * description, arg schema, and result schema.
 *
 * Type safe utility types have been created around this object.
 */
export const tools = {
  getDatabaseSchema: {
    description:
      'Gets all table and column data within the public schema in the Postgres database.',
    args: z.object({}),
    result: result(
      z.object({
        tables: tableSchema,
      })
    ),
  },
  executeSql: {
    description:
      "Executes Postgres SQL against the user's database. Perform joins automatically. Always add limits for safety.",
    args: z.object({ sql: z.string() }),
    result: result(
      z.object({
        queryResults: z.array(resultsSchema),
      })
    ),
  },
  renameConversation: {
    description: 'Gives the conversation a short and concise name.',
    args: z.object({ name: z.string() }),
    result: result(
      z.object({
        message: z.string(),
      })
    ),
  },
  brainstormReports: {
    description: 'Brainstorms some interesting reports to show to the user.',
    args: z.object({
      reports: z.array(reportSchema),
    }),
    result: result(
      z.object({
        message: z.string(),
      })
    ),
  },
  generateChart: {
    description: codeBlock`
      Generates a chart using Chart.js for a given SQL query.
      - Label both axises
      - Plugins are not available
      - Use a variety of neon colors by default (rather than the same color for all)
      
      Call \`executeSql\` first.
    `,
    args: z.object({
      config: z
        .object({
          type: z.any(),
          data: z.any(),
          options: z.any(),
        })
        .describe(
          'The `config` passed to `new Chart(ctx, config). Includes `type`, `data`, `options`, etc.'
        ),
    }),
    result: result(
      z.object({
        message: z.string(),
      })
    ),
  },
  requestCsv: {
    description: codeBlock`
      Requests a CSV upload from the user.
    `,
    args: z.object({}),
    result: result(
      z.object({
        fileId: z.string(),
        file: z.object({
          name: z.string(),
          size: z.number(),
          type: z.string(),
          lastModified: z.number(),
        }),
        preview: z.string(),
      })
    ),
  },
  importCsv: {
    description: codeBlock`
      Imports a CSV file with the specified ID into a table. Call \`requestCsv\` first.
      
      Check if any existing tables can import this or
      otherwise create new table using \`executeSql\` first.
    `,
    args: z.object({
      fileId: z.string().describe('The ID of the CSV file to import'),
      sql: z.string().describe(codeBlock`
        The Postgres COPY command to import the CSV into the table.
    
        The CSV file will be temporarily available on the server at this exact path: '/dev/blob' (use exactly as quoted)
      `),
    }),
    result: result(
      z.object({
        message: z.string(),
      })
    ),
  },
  exportCsv: {
    description: codeBlock`
      Exports a query to a CSV file.
    `,
    args: z.object({
      fileName: z.string().describe('The file name for the exported CSV file. Must end in `.csv`.'),
      sql: z.string().describe(codeBlock`
        The Postgres COPY command to export a query to a CSV.
    
        The file must always be saved on the server to this exact path: '/dev/blob' (use exactly as quoted)
      `),
    }),
    result: result(
      z.object({
        message: z.string(),
        fileId: z.string(),
        file: z.object({
          name: z.string(),
          size: z.number(),
          type: z.string(),
        }),
      })
    ),
  },
  embed: {
    description: codeBlock`
      Generates vector embeddings for texts. Use with pgvector extension.
      Semantic search and RAG are good use cases for these embeddings.

      Uses Alibaba's gte-small embedding model (because it's small).
      It generates 384 dimensions. They are normalized.

      Embeddings are stored in the meta.embeddings table and a list of IDs
      are returned for each text input. Treat this table as a staging area.
      
      Use these IDs to copy the embeddings into other tables.
    `,
    args: z.object({
      texts: z
        .array(z.string())
        .describe(
          'The array of texts to generate embeddings for. A separate embedding will be generated for each text.'
        ),
    }),
    result: result(
      z.object({
        ids: z.array(z.number()),
      })
    ),
  },
} satisfies Record<string, Tool>

export type Tools = typeof tools

export type Tool<
  Args extends z.ZodTypeAny = z.ZodTypeAny,
  Result extends z.ZodTypeAny = z.ZodTypeAny,
> = {
  description: string
  args: Args
  result: Result
}

/**
 * Tool call from `ai` SDK.
 *
 * Duplicated since this is not exported by their lib.
 */
export type ToolCall<Name extends string, Args> = {
  toolCallId: string
  toolName: Name
  args: Args
}

/**
 * Tool result from `ai` SDK.
 *
 * Duplicated since this is not exported by their lib.
 */
export type ToolResult<Name extends string, Args, Result> = ToolCall<Name, Args> & {
  result: Result
}

/**
 * Utility function to extract the `args` Zod type from a `Tool`.
 */
export type ExtractArgs<T extends Tool> = z.infer<T['args']>

/**
 * Utility function to extract the `result` Zod type from a `Tool`.
 */
export type ExtractResult<T extends Tool> = z.infer<T['result']>

/**
 * Type safe `ToolInvocation` type based on our defined tools.
 * Can optionally pass the name of a tool to narrow the tool
 * invocation to a specific tool.
 */
export type ToolInvocation<Name extends keyof Tools = keyof Tools> = {
  [K in keyof Tools]:
    | ToolCall<K, ExtractArgs<Tools[K]>>
    | ToolResult<K, ExtractArgs<Tools[K]>, ExtractResult<Tools[K]>>
}[Name]

/**
 * Creates a union of all possible tool calls based
 * on our defined tools.
 */
export type ToolCallUnion = {
  [K in keyof Tools]: ToolCall<K & string, ExtractArgs<Tools[K]>>
}[keyof Tools]

/**
 * Type safe `onToolCall` type based on our defined tools.
 * Will correctly limit `toolCall.toolName` to the tools
 * we've defined and narrow the type when accessed in an
 * `if`/`switch` statement.
 *
 * Sadly we can not infer return type due to limitations
 * with TypeScript, so is left as `unknown`.
 */
export type OnToolCall = ({ toolCall }: { toolCall: ToolCallUnion }) => unknown

/**
 * Converts our defined tools to a object of `CoreTools` that the `ai`
 * SDK expects.
 */
export function convertToCoreTools(tools: Tools) {
  return Object.entries(tools).reduce<Record<string, CoreTool>>(
    (merged, [name, tool]) => ({
      ...merged,
      [name]: {
        description: tool.description,
        parameters: tool.args,
      },
    }),
    {}
  )
}
