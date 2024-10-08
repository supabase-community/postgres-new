'use client'

import { Editor } from '@monaco-editor/react'
import { ParseResult } from 'libpg-query/wasm'
import { FileCode, MessageSquareMore, Sprout, Workflow } from 'lucide-react'
import { PropsWithChildren, useEffect, useState } from 'react'
import { format } from 'sql-formatter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { useMessagesQuery } from '~/data/messages/messages-query'
import { useAsyncMemo } from '~/lib/hooks'
import { tabsSchema, TabValue } from '~/lib/schema'
import { assertDefined, isMigrationStatement } from '~/lib/sql-util'
import { ToolInvocation } from '~/lib/tools'
import { useBreakpoint } from '~/lib/use-breakpoint'
import { cn } from '~/lib/utils'
import { useApp } from './app-provider'
import SchemaGraph from './schema/graph'
import { useWorkspace } from './workspace'
import { buttonVariants } from './ui/button'

const initialMigrationSql = '-- Migrations will appear here as you chat with AI\n'
const initialSeedSql = '-- Seeds will appear here as you chat with AI\n'

export type IDEProps = PropsWithChildren<{
  className?: string
}>

export default function IDE({ children, className }: IDEProps) {
  const { databaseId } = useWorkspace()
  const [tab, setTab] = useState<TabValue>('diagram')

  const isSmallBreakpoint = useBreakpoint('lg')
  const { data: messages } = useMessagesQuery(databaseId)

  useEffect(() => {
    if (isSmallBreakpoint) {
      setTab('chat')
    } else {
      setTab('diagram')
    }
  }, [isSmallBreakpoint])

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
              tool.toolName === 'executeSql' && 'result' in tool && tool.result.success === true
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

        const formattedSql = format(migrationSql, {
          language: 'postgresql',
          keywordCase: 'lower',
          identifierCase: 'lower',
          dataTypeCase: 'lower',
          functionCase: 'lower',
        })

        const withSemicolon = formattedSql.endsWith(';') ? formattedSql : `${formattedSql};`

        migrations.push(withSemicolon)
      }
    }

    return migrations
  }, [messages])

  const migrationsSql = (initialMigrationSql + '\n' + migrationStatements?.join('\n\n')).trim()

  return (
    <div className={cn('flex flex-col items-stretch gap-3', className)}>
      <Tabs
        className="h-full flex-1 flex flex-col items-stretch"
        value={tab}
        onValueChange={(tab) => setTab(tabsSchema.parse(tab))}
      >
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-2 !h-min bg-muted">
          {isSmallBreakpoint && (
            <TabsTrigger
              value="chat"
              className={cn(
                buttonVariants({ variant: tab === 'chat' ? 'default' : 'ghost' }),
                tab === 'chat' && '!shadow-sm',
                'gap-2'
              )}
            >
              <MessageSquareMore size={14} />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
          )}
          <TabsTrigger
            value="diagram"
            className={cn(
              buttonVariants({ variant: tab === 'diagram' ? 'default' : 'ghost' }),
              tab === 'diagram' && '!shadow-sm',
              'gap-2'
            )}
          >
            <Workflow size={14} />
            <span className="hidden sm:inline">Diagram</span>
          </TabsTrigger>
          <TabsTrigger
            value="migrations"
            className={cn(
              buttonVariants({ variant: tab === 'migrations' ? 'default' : 'ghost' }),
              tab === 'migrations' && '!shadow-sm',
              'gap-2'
            )}
          >
            <FileCode size={14} />
            <span className="hidden sm:inline">Migrations</span>
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
        </TabsList>

        {isSmallBreakpoint && (
          <TabsContent value="chat" className="flex-1 h-full min-h-0 overflow-y-auto">
            {children}
          </TabsContent>
        )}
        <TabsContent value="diagram" className="h-full">
          <div className="h-full flex flex-col gap-3">
            <SchemaGraph databaseId={databaseId} schemas={['public', 'meta']} />
            <Footer />
          </div>
        </TabsContent>
        <TabsContent value="migrations" className="h-full">
          <div className="h-full flex flex-col gap-3">
            <Editor
              className=" py-4 rounded-md bg-[#1e1e1e]"
              language="pgsql"
              value={migrationsSql}
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
                    const formattedCode = format(currentCode, {
                      language: 'postgresql',
                      keywordCase: 'lower',
                    })
                    return [
                      {
                        range: model.getFullModelRange(),
                        text: formattedCode,
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
            <Footer />
          </div>
        </TabsContent>
        {/* Temporarily hide seeds until we get pg_dump working */}
        {false && (
          <TabsContent value="seeds" className="h-full py-4 rounded-md bg-[#1e1e1e]">
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
                    const formattedCode = format(currentCode, {
                      language: 'postgresql',
                      keywordCase: 'lower',
                    })
                    return [
                      {
                        range: model.getFullModelRange(),
                        text: formattedCode,
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

function Footer() {
  return (
    <div className="flex flex-row gap-1 pb-1 text-xs text-neutral-500 text-center justify-center">
      <a
        className="underline cursor-pointer"
        href="https://github.com/supabase-community/postgres-new"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn about database.build
      </a>{' '}
      |{' '}
      <a
        className="underline cursor-pointer"
        href="https://github.com/supabase-community/postgres-new/issues/new/choose"
        target="_blank"
        rel="noopener noreferrer"
      >
        Report an issue
      </a>
    </div>
  )
}
