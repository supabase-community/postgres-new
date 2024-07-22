import { z } from 'zod'

export const tableSchema = z.object({
  id: z.number(),
  schema: z.string(),
  name: z.string(),
  rls_enabled: z.boolean(),
  rls_forced: z.boolean(),
  replica_identity: z.union([
    z.literal('DEFAULT'),
    z.literal('INDEX'),
    z.literal('FULL'),
    z.literal('NOTHING'),
  ]),
  bytes: z.number(),
  size: z.string(),
  live_rows_estimate: z.number(),
  dead_rows_estimate: z.number(),
  comment: z.union([z.string(), z.null()]),
  columns: z
    .array(
      z.object({
        table_id: z.number(),
        schema: z.string(),
        table: z.string(),
        id: z.string(),
        ordinal_position: z.number(),
        name: z.string(),
        default_value: z.unknown(),
        data_type: z.string(),
        format: z.string(),
        is_identity: z.boolean(),
        identity_generation: z.union([z.literal('ALWAYS'), z.literal('BY DEFAULT'), z.null()]),
        is_generated: z.boolean(),
        is_nullable: z.boolean(),
        is_updatable: z.boolean(),
        is_unique: z.boolean(),
        enums: z.array(z.string()),
        check: z.union([z.string(), z.null()]),
        comment: z.union([z.string(), z.null()]),
      })
    )
    .optional(),
  primary_keys: z.array(
    z.object({
      schema: z.string(),
      table_name: z.string(),
      name: z.string(),
      table_id: z.number(),
    })
  ),
  relationships: z.array(
    z.object({
      id: z.number(),
      constraint_name: z.string(),
      source_schema: z.string(),
      source_table_name: z.string(),
      source_column_name: z.string(),
      target_table_schema: z.string(),
      target_table_name: z.string(),
      target_column_name: z.string(),
    })
  ),
})
export type Table = z.infer<typeof tableSchema>

export const resultsSchema = z.object({
  rows: z.array(z.record(z.any())),
  affectedRows: z.number().optional(),
  fields: z.array(
    z.object({
      name: z.string(),
      dataTypeID: z.number(),
    })
  ),
})
export type Results = z.infer<typeof resultsSchema>

export const reportSchema = z.object({ name: z.string(), description: z.string() })
export type Report = z.infer<typeof reportSchema>

export const tabsSchema = z.enum(['chat', 'diagram', 'migrations'])
export type TabValue = z.infer<typeof tabsSchema>
