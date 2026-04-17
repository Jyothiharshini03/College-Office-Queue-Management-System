import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
    
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .order('name')
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }
    
    return NextResponse.json({ services: services || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
