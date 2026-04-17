import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ===================== GET =====================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const serviceId = searchParams.get('serviceId')

    const supabase = await createClient()

    let query = supabase.from('tokens').select('*')

    // Admin view → only waiting tokens
    if (!userId) {
      query = query.eq('status', 'waiting')
    }

    // User view
    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (serviceId) {
      query = query.eq('service_id', serviceId)
    }

    const { data: tokens, error } = await query.order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching tokens:', error)
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
    }

    // Get waiting tokens for queue calculation
    const { data: allWaitingTokens } = await supabase
      .from('tokens')
      .select('id, service_id, created_at')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })

    const getQueuePosition = (tokenId: string, tokenServiceId: string) => {
      const serviceWaitingTokens = (allWaitingTokens || []).filter(
        t => t.service_id === tokenServiceId
      )

      const position =
        serviceWaitingTokens.findIndex(t => t.id === tokenId) + 1

      return {
        position: position > 0 ? position : null,
        totalInQueue: serviceWaitingTokens.length,
      }
    }

    const formattedTokens = (tokens || []).map(token => {
      const queueInfo =
        token.status === 'waiting'
          ? getQueuePosition(token.id, token.service_id)
          : { position: null, totalInQueue: 0 }

      return {
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
        queuePosition: queueInfo.position,
        totalInQueue: queueInfo.totalInQueue,
      }
    })

    return NextResponse.json({ tokens: formattedTokens })
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ===================== POST (Book Token) =====================
export async function POST(request: NextRequest) {
  try {
    const { serviceId } = await request.json()

    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Session expired. Please login again.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, roll_number')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const { data: existingToken } = await supabase
      .from('tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('service_id', serviceId)
      .eq('status', 'waiting')
      .single()

    if (existingToken) {
      return NextResponse.json({ error: 'You already have a token for this service.' }, { status: 400 })
    }

    const { data: service } = await supabase
      .from('services')
      .select('name, prefix')
      .eq('id', serviceId)
      .single()

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const today = new Date().toISOString().split('T')[0]

    let { data: counter } = await supabase
      .from('token_counters')
      .select('counter')
      .eq('service_id', serviceId)
      .eq('counter_date', today)
      .single()

    let nextNumber = 1

    if (counter) {
      nextNumber = counter.counter + 1
      await supabase
        .from('token_counters')
        .update({ counter: nextNumber })
        .eq('service_id', serviceId)
        .eq('counter_date', today)
    } else {
      await supabase
        .from('token_counters')
        .insert({
          service_id: serviceId,
          counter_date: today,
          counter: 1,
        })
    }

    const tokenNumber = `${service.prefix}${String(nextNumber).padStart(3, '0')}`

    const { data: newToken, error } = await supabase
      .from('tokens')
      .insert({
        token_number: tokenNumber,
        user_id: user.id,
        user_name: profile.name,
        user_roll_number: profile.roll_number,
        service_id: serviceId,
        service_name: service.name,
        status: 'waiting',
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
    }

    return NextResponse.json({ success: true, token: newToken })
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ===================== DELETE (Cancel Token) =====================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get('id')

    if (!tokenId) {
      return NextResponse.json({ error: 'Token ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('tokens')
      .update({ status: 'cancelled' })
      .eq('id', tokenId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error(error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Token not found or not yours' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.log(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}