import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Use admin client to bypass RLS for admin stats
    const supabase = await createClient()
    // Get all services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
    
    if (servicesError) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    // If no services exist yet, return empty stats
    if (!services || services.length === 0) {
      return NextResponse.json({ stats: [] })
    }
    
    // Get tokens grouped by service and status
    const { data: tokens, error: tokensError } = await supabase
      .from('tokens')
      .select('service_id, status')
    
    if (tokensError) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
    
    // Get current serving tokens to show the token number
    const { data: servingTokens } = await supabase
      .from('tokens')
      .select('service_id, token_number')
      .eq('status', 'serving')

    // Calculate stats for each service (use empty array if tokens is null)
    const allTokens = tokens || []
    const allServingTokens = servingTokens || []
    
    const stats = services.map(service => {
      const serviceTokens = allTokens.filter(t => t.service_id === service.id)
      const waiting = serviceTokens.filter(t => t.status === 'waiting').length
      const serving = serviceTokens.filter(t => t.status === 'serving').length
      const completed = serviceTokens.filter(t => t.status === 'completed').length
      const currentServingToken = allServingTokens.find(t => t.service_id === service.id)
      
      return {
        serviceId: service.id,
        serviceName: service.name,
        prefix: service.prefix,
        waiting,
        serving,
        completed,
        total: serviceTokens.length,
        currentServing: currentServingToken?.token_number || null,
      }
    })
    
    return NextResponse.json({ stats })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
