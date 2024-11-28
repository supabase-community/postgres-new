'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { m } from 'framer-motion'
import { Brain, Expand } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { useApp } from '~/components/app-provider'
import { Button, ButtonProps } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { Switch } from '~/components/ui/switch'
import { Textarea } from '~/components/ui/textarea'
import { getProviderUrl } from '~/lib/llm-provider'
import { getSystemPrompt } from '~/lib/system-prompt'

const formSchema = z.object({
  apiKey: z
    .string()
    .transform((str) => (str === '' ? undefined : str))
    .optional(),
  baseUrl: z.string().min(1),
  model: z.string().min(1),
  system: z.string().min(1),
  enabled: z.boolean(),
})

type FormSchema = z.infer<typeof formSchema>

function SetModelProviderForm(props: { id: string; onSubmit: (values: FormSchema) => void }) {
  const { modelProvider } = useApp()

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      enabled: false,
      system: getSystemPrompt(),
      ...modelProvider.state,
    },
  })

  const isEnabled = useWatch({ control: form.control, name: 'enabled' })

  const [isPromptExpanded, setIsPromptExpanded] = useState(false)

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await modelProvider.set(values)
    props.onSubmit(values)
  }

  return (
    <Form {...form}>
      <form
        id={props.id}
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4 min-w-0"
      >
        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="cursor-pointer">Enable</FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {isEnabled && (
          <>
            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL</FormLabel>
                  <FormControl>
                    <>
                      <Input placeholder="OpenAI compatible base URL" {...field} />
                      <div className="flex gap-2">
                        <MiniButton
                          onClick={(e) => {
                            e.preventDefault()
                            form.setValue('baseUrl', getProviderUrl('openai'))
                            form.setValue('model', 'gpt-4o')
                          }}
                        >
                          OpenAI
                        </MiniButton>
                        <MiniButton
                          onClick={(e) => {
                            e.preventDefault()
                            form.setValue('baseUrl', getProviderUrl('x-ai'))
                            form.setValue('model', 'grok-beta')
                          }}
                        >
                          xAI
                        </MiniButton>
                        <MiniButton
                          onClick={(e) => {
                            e.preventDefault()
                            field.onChange({ target: { value: getProviderUrl('openrouter') } })
                            form.setValue('model', '')
                          }}
                        >
                          OpenRouter
                        </MiniButton>
                      </div>
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API key</FormLabel>
                  <FormControl>
                    <Input placeholder="API key" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input placeholder="Model" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="system"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System prompt</FormLabel>
                  <FormControl>
                    <>
                      <m.div
                        className="flex gap-2 rounded-md bg-secondary p-4 text-sm text-primary/50 cursor-pointer"
                        onClick={() => {
                          setIsPromptExpanded(true)
                        }}
                      >
                        <div className="flex-1 max-h-24 overflow-hidden relative">
                          {field.value}
                          <div className="absolute inset-x-0 -bottom-6 h-16 bg-gradient-to-t from-secondary to-transparent" />
                        </div>
                        <Expand size={16} />
                      </m.div>
                      {isPromptExpanded && (
                        <div className="absolute inset-0 p-4 pt-8 bg-background flex flex-col gap-2 items-end">
                          <m.div
                            variants={{
                              hidden: { opacity: 0, y: 20 },
                              show: { opacity: 1, y: 0 },
                            }}
                            initial="hidden"
                            animate="show"
                            className="flex-1 self-stretch flex"
                          >
                            <Textarea {...field} className="resize-none" />
                          </m.div>
                          <Button
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault()
                              setIsPromptExpanded(false)
                            }}
                          >
                            Set prompt
                          </Button>
                        </div>
                      )}
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </form>
    </Form>
  )
}

function MiniButton({ children, ...props }: ButtonProps) {
  return (
    <Button variant="outline" className="h-auto py-1 px-2 text-xs" {...props}>
      {children}
    </Button>
  )
}

export type SetModelProviderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm?: () => void
}

export function SetModelProviderDialog(props: SetModelProviderDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center mb-4">
            <Brain /> Bring your own LLM
          </DialogTitle>
          <DialogDescription>
            Bring your own OpenAI-compatible API. All settings and credentials are saved locally in
            your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="my-1 border-b" />
        <SetModelProviderForm
          id="set-model-provider-form"
          onSubmit={() => {
            props.onOpenChange(false)
          }}
        />
        <DialogFooter className="mt-1">
          <Button
            variant="secondary"
            onClick={() => {
              props.onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button form="set-model-provider-form">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
