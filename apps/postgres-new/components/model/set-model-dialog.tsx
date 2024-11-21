'use client'

import * as kv from 'idb-keyval'
import { useState } from 'react'
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

const formSchema = z.object({
  apiKey: z.string().min(1).optional(),
  baseUrl: z.string().min(1),
  model: z.string().min(1),
})

type FormSchema = z.infer<typeof formSchema>

function SetModelForm(props: { id: string; onSubmit: (values: FormSchema) => void }) {
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: async () => {
      const model = await kv.get('model')
      return model
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await kv.set('model', values)
    props.onSubmit(values)
  }

  return (
    <Form {...form}>
      <form id={props.id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="baseUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base URL</FormLabel>
              <FormControl>
                <Input placeholder="http://localhost:11434/v1" {...field} />
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
      </form>
    </Form>
  )
}

export type SetModelDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm?: () => void
}

export function SetModelDialog(props: SetModelDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center mb-4">
            <Brain /> Set an external model
          </DialogTitle>
          <DialogDescription className="flex flex-col gap-4">
            You can set your own external model compatible with the OpenAI API. Your model
            informations will be saved in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="my-1 border-b" />
        <SetModelForm
          id="set-model-form"
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
          <Button form="set-model-form">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
