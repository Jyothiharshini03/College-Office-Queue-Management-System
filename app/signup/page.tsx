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

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    rollNumber: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [successEmail, setSuccessEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate phone (10 digits)
    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(formData.phone)) {
      setError('Phone must be 10 digits')
      return
    }

    // Validate roll number (alphanumeric)
    const rollRegex = /^[A-Za-z0-9]+$/
    if (!rollRegex.test(formData.rollNumber)) {
      setError('Roll number must be alphanumeric')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Check if roll number already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('roll_number')
        .eq('roll_number', formData.rollNumber)
        .single()

      if (existingProfile) {
        setError('Roll number already registered')
        return
      }

      // Sign up with Supabase Auth (client-side sets cookies automatically)
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            name: formData.name,
            phone: formData.phone,
            roll_number: formData.rollNumber,
            role: 'student',
          },
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('Email already registered')
        } else {
          setError(authError.message)
        }
        return
      }

      if (!data.user) {
        setError('Failed to create account')
        return
      }
      // Insert profile into profiles table
      await supabase.from('profiles').insert({
        id: data.user.id,
        name: formData.name,
        email: data.user.email,
        phone: formData.phone,
        roll_number: formData.rollNumber,
        role: 'student',
      })
      // Store user data in localStorage for UI display
      localStorage.setItem('user', JSON.stringify({
        id: data.user.id,
        name: formData.name,
        email: data.user.email,
        rollNumber: formData.rollNumber,
        role: 'student',
      }))

      setSuccessEmail(formData.email)
      setSignupSuccess(true)

      // Redirect to dashboard after 5 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 5000)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show success message
  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Account Created!</CardTitle>
            <CardDescription>
              Please confirm your email to login
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                📧 Confirmation email sent to <strong>{successEmail}</strong>
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Check your inbox (and spam folder) for an email with a confirmation link. Click the link to confirm your account.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Steps to complete signup:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Check your email inbox</li>
                <li>Look for the confirmation email</li>
                <li>Click the confirmation link</li>
                <li>Return here and login with your email and password</li>
              </ol>
            </div>

            <div className="rounded-md bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                ⚠️ <strong>Not found?</strong> Check your spam/junk folder. If you still don't see it after a few minutes, you can request another confirmation email on the login page.
              </p>
            </div>

            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Redirecting to dashboard in a few seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <CardTitle className="text-2xl">Create Account</CardTitle>
          </div>
          <CardDescription>
            Sign up to get your queue tokens
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
              <FieldLabel>Full Name</FieldLabel>
              <Input
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Field>

            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                name="email"
                placeholder="student@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Field>

            <Field>
              <FieldLabel>Phone Number</FieldLabel>
              <Input
                type="tel"
                name="phone"
                placeholder="1234567890"
                value={formData.phone}
                onChange={handleChange}
                pattern="[0-9]{10}"
                required
              />
            </Field>

            <Field>
              <FieldLabel>Roll Number</FieldLabel>
              <Input
                name="rollNumber"
                placeholder="e.g., 21CS101"
                value={formData.rollNumber}
                onChange={handleChange}
                required
              />
            </Field>

            <Field>
              <FieldLabel>Password</FieldLabel>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  className="pr-10"
                  minLength={6}
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

            <Field>
              <FieldLabel>Confirm Password</FieldLabel>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
