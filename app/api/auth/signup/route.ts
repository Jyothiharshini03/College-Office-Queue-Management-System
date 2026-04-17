import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, rollNumber, password } = await request.json()
    
    if (!name || !email || !phone || !rollNumber || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    
    // Validate phone (10 digits)
    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ error: 'Phone must be 10 digits' }, { status: 400 })
    }
    
    // Validate roll number (alphanumeric)
    const rollRegex = /^[A-Za-z0-9]+$/
    if (!rollRegex.test(rollNumber)) {
      return NextResponse.json({ error: 'Roll number must be alphanumeric' }, { status: 400 })
    }
    
    // Validate password (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    // Check if roll number already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('roll_number')
      .eq('roll_number', rollNumber)
      .single()
    
    if (existingProfile) {
      return NextResponse.json({ error: 'Roll number already registered' }, { status: 409 })
    }
    
    // Sign up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${request.nextUrl.origin}/student/dashboard`,
        data: {
          name,
          phone,
          roll_number: rollNumber,
          role: 'student',
        },
      },
    })
    
    if (error) {
      if (error.message.includes('already registered')) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    if (!data.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        name,
        email: data.user.email,
        rollNumber,
        role: 'student',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
