'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { createClient } from '@/lib/supabase/client'

export default function StudentLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResendEmail, setShowResendEmail] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleResendConfirmation = async () => {
    setResendLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        setError(`Failed to resend: ${error.message}`)
      } else {
        setError('Confirmation email resent! Check your inbox.')
        setShowResendEmail(false)
      }
    } catch {
      setError('Failed to resend confirmation email.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      // Sign in with Supabase Auth (client-side sets cookies automatically)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          setError('Please confirm your email before logging in.')
          setShowResendEmail(true)
        } else {
          setError('Invalid email or password.')
        }
        return
      }

      if (!data.user) {
        setError('Login failed. Please try again.')
        return
      }

      // Get user profile from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      const userRole = profile?.role || data.user.user_metadata?.role || 'student'

      // Check role for student login
      if (userRole !== 'student') {
        await supabase.auth.signOut()
        setError('Unauthorized access. Please use admin login.')
        return
      }

      // Store user data in localStorage for UI display
      localStorage.setItem('user', JSON.stringify({
        id: data.user.id,
        name: profile?.name || data.user.user_metadata?.name || 'User',
        email: data.user.email,
        rollNumber: profile?.roll_number || data.user.user_metadata?.roll_number || '',
        role: userRole,
      }))

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <CardTitle className="text-2xl">Student Login</CardTitle>
          </div>
          <CardDescription>
            Enter your credentials to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel>Password</FieldLabel>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>

            {showResendEmail && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
              >
                {resendLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Resend Confirmation Email
              </Button>
            )}

            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
