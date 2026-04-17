import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('serviceId')

    // Use admin client to bypass RLS for queue data
    const supabase = await createClient()

    // Get waiting tokens
    let waitingQuery = supabase
      .from('tokens')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })

    if (serviceId && serviceId !== 'all') {
      waitingQuery = waitingQuery.eq('service_id', serviceId)
    }

    const { data: waitingTokens, error: waitingError } = await waitingQuery

    if (waitingError) {
      console.error('Error fetching waiting tokens:', waitingError)
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
    }

    // Get serving tokens
    let servingQuery = supabase
      .from('tokens')
      .select('*')
      .eq('status', 'serving')

    if (serviceId && serviceId !== 'all') {
      servingQuery = servingQuery.eq('service_id', serviceId)
    }

    const { data: servingTokens, error: servingError } = await servingQuery

    if (servingError) {
      console.error('Error fetching serving tokens:', servingError)
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
    }

    // Format tokens
    const formatToken = (token: {
      id: string;
      token_number: string;
      user_id: string;
      user_name: string;
      user_roll_number: string;
      service_id: string;
      service_name: string;
      status: string;
      created_at: string;
      called_at: string | null;
      completed_at: string | null;
    }) => ({
      id: token.id,
      tokenNumber: token.token_number,
      userId: token.user_id,
      userName: token.user_name,
      userRollNumber: token.user_roll_number,
      serviceId: token.service_id,
      serviceName: token.service_name,
      status: token.status,
      createdAt: token.created_at,
      calledAt: token.called_at,
      completedAt: token.completed_at,
    })

    const formattedWaiting = (waitingTokens || []).map(formatToken)
    const allServingTokens = servingTokens || []
    
    // For 'all' or no serviceId, return all serving tokens; otherwise return first one
    const formattedServing = !serviceId || serviceId === 'all'
      ? allServingTokens.map(formatToken)
      : allServingTokens[0] ? formatToken(allServingTokens[0]) : null

    return NextResponse.json({
      waiting: formattedWaiting,
      serving: formattedServing,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
