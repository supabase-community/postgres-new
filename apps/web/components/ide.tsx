'use client'

import { Editor } from '@monaco-editor/react'
import { ParseResult } from 'libpg-query/wasm'
import { FileCode, Info, MessageSquareMore, Workflow } from 'lucide-react'
import { PropsWithChildren, useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { useMessagesQuery } from '~/data/messages/messages-query'
import { useAsyncMemo } from '~/lib/hooks'
import { tabsSchema, TabValue } from '~/lib/schema'
import { assertDefined, formatSql, isMigrationStatement } from '~/lib/sql-util'
import { ToolInvocation } from '~/lib/tools'
import { useBreakpoint } from '~/lib/use-breakpoint'
import { cn } from '~/lib/utils'
import SchemaGraph from './schema/graph'
import { buttonVariants } from './ui/button'
import { useWorkspace } from './workspace'
import { useApp } from './app-provider'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { useTheme } from 'next-themes'

const initialMigrationSql = '-- Migrations will appear here as you chat with AI\n'
const initialSeedSql = '-- Seeds will appear here as you chat with AI\n'

export type IDEProps = PropsWithChildren<{
  className?: string
}>

export default function IDE({ children, className }: IDEProps) {
  const { databaseId, tab, visibility, setTab } = useWorkspace()
  const { pgVersion } = useApp()
  const { resolvedTheme } = useTheme()
  const isDarkTheme = resolvedTheme?.includes('dark')!
  const isSmallBreakpoint = useBreakpoint('lg')
  const { data: messages } = useMessagesQuery(databaseId)

  useEffect(() => {
    if (isSmallBreakpoint) {
      setTab('chat')
    } else {
      setTab('diagram')
    }
  }, [isSmallBreakpoint, setTab])

  const { value: migrationStatements } = useAsyncMemo(async () => {
    const sqlExecutions =
      messages
        ?.flatMap((message) => {
          if (!message.toolInvocations) {
            return
          }

          const toolInvocations = message.toolInvocations as ToolInvocation[]

          return toolInvocations
            .map((tool) =>
              // Only include SQL that successfully executed against the DB
              (tool.toolName === 'executeSql' || tool.toolName === 'importSql') &&
              'result' in tool &&
              tool.result.success === true
                ? tool.args.sql
                : undefined
            )
            .filter((sql) => sql !== undefined)
        })
        .filter((sql) => sql !== undefined) ?? []

    // Dynamically import (browser-only) to prevent SSR errors
    const { deparse, parseQuery } = await import('libpg-query/wasm')

    const migrations: string[] = []

    for (const sql of sqlExecutions) {
      const parseResult = await parseQuery(sql)
      assertDefined(parseResult.stmts, 'Expected stmts to exist in parse result')

      const migrationStmts = parseResult.stmts.filter(isMigrationStatement)

      if (migrationStmts.length > 0) {
        const filteredAst: ParseResult = {
          version: parseResult.version,
          stmts: migrationStmts,
        }

        const migrationSql = await deparse(filteredAst)

        const formattedSql = formatSql(migrationSql) ?? sql

        const withSemicolon = formattedSql.endsWith(';') ? formattedSql : `${formattedSql};`

        migrations.push(withSemicolon)
      }
    }

    return migrations
  }, [messages])

  const migrationsSql = (initialMigrationSql + '\n' + migrationStatements?.join('\n\n')).trim()

  return (
    <div className={cn('flex flex-col items-stretch bg-muted', className)}>
      <Tabs
        className="h-full flex-1 flex flex-col items-stretch shrink-0"
        value={tab}
        onValueChange={(tab) => setTab(tabsSchema.parse(tab))}
      >
        <TabsList className="flex w-full justify-between p-2 h-auto border-b bg-background md:bg-transparent">
          <div className="flex items-center flex-1 gap-2">
            {isSmallBreakpoint && (
              <TabsTrigger
                value="chat"
                className={cn(
                  buttonVariants({ variant: tab === 'chat' ? 'default' : 'ghost' }),
                  'gap-2 w-full md:w-auto'
                )}
              >
                <MessageSquareMore className="hidden sm:block" size={18} />
                <span>Chat</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="diagram"
              className={cn(
                buttonVariants({ variant: tab === 'diagram' ? 'default' : 'ghost' }),
                'gap-2 w-full md:w-auto'
              )}
            >
              <Workflow className="hidden sm:block" size={18} />
              <span>Diagram</span>
            </TabsTrigger>
            <TabsTrigger
              value="migrations"
              className={cn(
                buttonVariants({ variant: tab === 'migrations' ? 'default' : 'ghost' }),
                'gap-2 w-full md:w-auto'
              )}
            >
              <FileCode className="hidden sm:block" size={18} />
              <span>Migrations</span>
            </TabsTrigger>
            {/* Temporarily hide seeds until we get pg_dump working */}
            {/* {false && (
                <TabsTrigger
                  value="seeds"
                  className={cn(
                    buttonVariants({ variant: tab === 'seeds' ? 'default' : 'ghost' }),
                    tab === 'seeds' && '!shadow-sm',
                    'gap-2'
                  )}
                >
                  <Sprout size={14} />
                  <span className="hidden sm:inline">Seeds</span>
                </TabsTrigger>
              )} */}
          </div>
          <div className="items-center gap-2 text-sm text-muted-foreground mr-4 md:flex hidden">
            {pgVersion && (
              <>
                <span>PG {pgVersion}</span>
              </>
            )}
            {visibility === 'local' && (
              <Tooltip>
                <TooltipTrigger className="group flex gap-1 items-center cursor-default">
                  <span className="group-data-[state=delayed-open]:text-foreground transition">
                    Local-only database
                  </span>
                  <Info
                    size={12}
                    className="group-data-[state=delayed-open]:text-foreground transition"
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end">
                  <p className="max-w-[28rem] text-center">
                    This Postgres database lives directly in your browser&apos;s IndexedDB storage
                    and not in the cloud, so it is only accessible to you.
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TabsList>

        {isSmallBreakpoint && (
          <TabsContent
            value="chat"
            className="flex-1 h-full min-h-0 overflow-y-auto mt-0 bg-background"
          >
            {children}
          </TabsContent>
        )}
        <TabsContent value="diagram" className="h-full mt-0">
          <div className="h-full flex flex-col gap-3">
            <SchemaGraph databaseId={databaseId} schemas={['public', 'meta']} />
          </div>
        </TabsContent>
        <TabsContent value="migrations" className="h-full mt-0">
          <div className="h-full flex flex-col">
            <Editor
              className="py-4 mix-blend-darken dark:mix-blend-lighten"
              language="pgsql"
              value={migrationsSql}
              theme={isDarkTheme ? 'vs-dark' : 'light'}
              options={{
                tabSize: 2,
                minimap: {
                  enabled: false,
                },
                fontSize: 13,
                wordWrap: 'on',
                readOnly: true,
              }}
              onMount={async (editor, monaco) => {
                // Register pgsql formatter
                monaco.languages.registerDocumentFormattingEditProvider('pgsql', {
                  async provideDocumentFormattingEdits(model) {
                    const currentCode = editor.getValue()
                    const formattedCode = formatSql(currentCode)
                    return [
                      {
                        range: model.getFullModelRange(),
                        text: formattedCode ?? currentCode,
                      },
                    ]
                  },
                })

                // Format on cmd+s
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
                  await editor.getAction('editor.action.formatDocument')?.run()
                })

                // Run format on the initial value
                await editor.getAction('editor.action.formatDocument')?.run()
              }}
            />
          </div>
        </TabsContent>
        {/* Temporarily hide seeds until we get pg_dump working */}
        {false && (
          <TabsContent value="seeds" className="h-full py-4 bg-[#1e1e1e]">
            <Editor
              language="pgsql"
              theme="vs-dark"
              options={{
                tabSize: 2,
                minimap: {
                  enabled: false,
                },
                fontSize: 13,
                readOnly: true,
              }}
              onMount={async (editor, monaco) => {
                // Register pgsql formatter
                monaco.languages.registerDocumentFormattingEditProvider('pgsql', {
                  async provideDocumentFormattingEdits(model) {
                    const currentCode = editor.getValue()
                    const formattedCode = formatSql(currentCode)
                    return [
                      {
                        range: model.getFullModelRange(),
                        text: formattedCode ?? currentCode,
                      },
                    ]
                  },
                })

                // Format on cmd+s
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
                  await editor.getAction('editor.action.formatDocument')?.run()
                })

                // Run format on the initial value
                await editor.getAction('editor.action.formatDocument')?.run()
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
