'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Button } from '../ui/button'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Brain } from 'lucide-react'
import { useApp } from '../app-provider'
import { Switch } from '../ui/switch'
import { getSystemPrompt } from '~/lib/system-prompt'
import { Textarea } from '../ui/textarea'

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
      enabled: true,
      system: getSystemPrompt(),
      ...modelProvider.state,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await modelProvider.set(values)
    props.onSubmit(values)
  }

  return (
    <Form {...form}>
      <form id={props.id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        <FormField
          control={form.control}
          name="baseUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base URL</FormLabel>
              <FormControl>
                <Input placeholder="http://localhost:11434/api" {...field} />
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
              <FormLabel>API Key (optional)</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Input placeholder="llama3.1:70b" {...field} />
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
              <FormLabel>System Prompt</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
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
            <Brain /> Set an external model provider
          </DialogTitle>
          <DialogDescription className="flex flex-col gap-4">
            You can use your own external model provider through Ollama or any provider compatible
            with the OpenAI API. Your model provider settings will be saved in your browser.
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
