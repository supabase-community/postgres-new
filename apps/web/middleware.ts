import { NextRequest } from 'next/server'
import { updateSession } from '~/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Middleware only runs on API routes.
     */
    '/api/:path*',
  ],
}
