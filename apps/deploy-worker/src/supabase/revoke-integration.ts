import type { SupabaseClient } from './types.ts'
import { supabaseAdmin } from './client.ts'

export async function revokeIntegration(
  ctx: { supabase: SupabaseClient },
  params: { integrationId: number }
) {
  const integration = await ctx.supabase
    .from('deployment_provider_integrations')
    .select('*')
    .eq('id', params.integrationId)
    .single()

  if (integration.error) {
    throw new Error('Integration not found')
  }

  const updatedIntegration = await ctx.supabase
    .from('deployment_provider_integrations')
    .update({ revoked_at: 'now', credentials: null })
    .eq('id', params.integrationId)

  if (updatedIntegration.error) {
    throw new Error('Failed to revoke integration')
  }

  const deleteSecret = await supabaseAdmin.rpc('delete_secret', {
    secret_id: integration.data.credentials!,
  })

  if (deleteSecret.error) {
    throw new Error('Failed to delete the integration credentials')
  }
}
