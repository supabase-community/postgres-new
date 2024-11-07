import { NextRequest } from 'next/server'
import { createClient } from '~/utils/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
}
