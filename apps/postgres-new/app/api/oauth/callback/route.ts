import { createClient } from '~/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.getUser()
  console.log({ data, error })
  // We have middleware, so this should never happen (used for type narrowing)
  if (error) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { user } = data

  console.log(req.nextUrl.searchParams)

  const code = req.nextUrl.searchParams.get('code') as string | null

  if (!code) {
    return new Response('No code provided', { status: 400 })
  }

  const tokensResponse = await fetch('https://api.supabase.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${btoa(`${process.env.NEXT_PUBLIC_SUPABASE_OAUTH_CLIENT_ID}:${process.env.SUPABASE_OAUTH_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: req.nextUrl.origin + '/api/oauth/callback',
    }),
  })

  const tokens = (await tokensResponse.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: 'Bearer'
  }

  return NextResponse.json({ user, tokens })
}
