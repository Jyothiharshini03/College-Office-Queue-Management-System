import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, role } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
    }
    
    if (!data.user) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
    }
    
    // Get user profile from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()
    
    const userRole = profile?.role || data.user.user_metadata?.role || 'student'
    
    // Check role if specified
    if (role && userRole !== role) {
      // Sign out if role doesn't match
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 })
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        name: profile?.name || data.user.user_metadata?.name || 'User',
        email: data.user.email,
        rollNumber: profile?.roll_number || data.user.user_metadata?.roll_number || '',
        role: userRole,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
