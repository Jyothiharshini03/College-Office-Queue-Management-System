import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { action, serviceId, tokenId } = await request.json()
    
    // Use admin client to bypass RLS for queue actions
   const supabase = await createClient()
    
    switch (action) {
      case 'call_next': {
        if (!serviceId) {
          return NextResponse.json({ error: 'Service ID is required' }, { status: 400 })
        }
        
        // Get next waiting token for this service
        const { data: nextToken, error: fetchError } = await supabase
          .from('tokens')
          .select('*')
          .eq('service_id', serviceId)
          .eq('status', 'waiting')
          .order('created_at', { ascending: true })
          .limit(1)
          .single()
        
        if (fetchError || !nextToken) {
          return NextResponse.json({ error: 'No tokens in queue' }, { status: 404 })
        }
        
        // Update token status to serving
        const { data: updatedToken, error: updateError } = await supabase
          .from('tokens')
          .update({ 
            status: 'serving', 
            called_at: new Date().toISOString() 
          })
          .eq('id', nextToken.id)
          .select()
          .single()
        
        if (updateError) {
          console.error('Error calling token:', updateError)
          return NextResponse.json({ error: 'Failed to call token' }, { status: 500 })
        }
        
        const formattedToken = {
          id: updatedToken.id,
          tokenNumber: updatedToken.token_number,
          userId: updatedToken.user_id,
          userName: updatedToken.user_name,
          userRollNumber: updatedToken.user_roll_number,
          serviceId: updatedToken.service_id,
          serviceName: updatedToken.service_name,
          status: updatedToken.status,
          createdAt: updatedToken.created_at,
          calledAt: updatedToken.called_at,
          completedAt: updatedToken.completed_at,
        }
        
        return NextResponse.json({ success: true, token: formattedToken })
      }
      
      case 'complete': {
        if (!tokenId) {
          return NextResponse.json({ error: 'Token ID is required' }, { status: 400 })
        }
        
        const { data: updatedToken, error: updateError } = await supabase
          .from('tokens')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString() 
          })
          .eq('id', tokenId)
          .eq('status', 'serving')
          .select()
          .single()
        
        if (updateError || !updatedToken) {
          return NextResponse.json({ error: 'Token not found or not serving' }, { status: 404 })
        }
        
        const formattedToken = {
          id: updatedToken.id,
          tokenNumber: updatedToken.token_number,
          userId: updatedToken.user_id,
          userName: updatedToken.user_name,
          userRollNumber: updatedToken.user_roll_number,
          serviceId: updatedToken.service_id,
          serviceName: updatedToken.service_name,
          status: updatedToken.status,
          createdAt: updatedToken.created_at,
          calledAt: updatedToken.called_at,
          completedAt: updatedToken.completed_at,
        }
        
        return NextResponse.json({ success: true, token: formattedToken })
      }
      
      case 'skip': {
        if (!tokenId) {
          return NextResponse.json({ error: 'Token ID is required' }, { status: 400 })
        }
        
        const { data: updatedToken, error: updateError } = await supabase
          .from('tokens')
          .update({ status: 'skipped' })
          .eq('id', tokenId)
          .select()
          .single()
        
        if (updateError || !updatedToken) {
          return NextResponse.json({ error: 'Token not found' }, { status: 404 })
        }
        
        const formattedToken = {
          id: updatedToken.id,
          tokenNumber: updatedToken.token_number,
          userId: updatedToken.user_id,
          userName: updatedToken.user_name,
          userRollNumber: updatedToken.user_roll_number,
          serviceId: updatedToken.service_id,
          serviceName: updatedToken.service_name,
          status: updatedToken.status,
          createdAt: updatedToken.created_at,
          calledAt: updatedToken.called_at,
          completedAt: updatedToken.completed_at,
        }
        
        return NextResponse.json({ success: true, token: formattedToken })
      }
      
      case 'cancel': {
        const { searchParams } = new URL(request.url)
const token = searchParams.get('token')

  if (!tokenId) {
    return NextResponse.json({ error: 'Token ID is required' }, { status: 400 })
  }

  const { data: updatedToken, error: updateError } = await supabase
    .from('tokens')
    .update({ status: 'cancelled' })
    .eq('id', tokenId)
    .select()
    .single()

  if (updateError) {
    console.error(updateError)
    return NextResponse.json({ error: 'Failed to cancel token' }, { status: 500 })
  }

  if (!updatedToken) {
    return NextResponse.json({ error: 'Token not found or cannot be cancelled' }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    message: 'Token cancelled successfully'
  })
}
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
