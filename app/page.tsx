'use client'

import Link from 'next/link'
import { Users, Shield, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              Q
            </div>
            <span className="text-xl font-semibold">Queue Manager</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/display">
              <Button variant="outline" size="sm">
                <Monitor className="mr-2 h-4 w-4" />
                Display Screen
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            College Office
          </h1>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Queue Management System
          </h2>
          <p className="mt-6 text-lg text-muted-foreground text-pretty">
            Streamline your college office visits with our digital queue system. 
            Get your token, track your position, and receive notifications when it&apos;s your turn.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-2">
          <Card className="relative overflow-hidden transition-shadow hover:shadow-lg">
            <CardHeader className="pb-4">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Student Portal</CardTitle>
              <CardDescription>
                Sign up or log in to get your queue token and track your position in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Link href="/login" className="w-full">
                <Button className="w-full" size="lg">
                  Student Login
                </Button>
              </Link>
              <Link href="/signup" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  Create Account
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden transition-shadow hover:shadow-lg">
            <CardHeader className="pb-4">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Admin Portal</CardTitle>
              <CardDescription>
                Manage queues, call tokens, and monitor service counters from the admin dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/login" className="w-full">
                <Button variant="secondary" className="w-full" size="lg">
                  Admin Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-semibold">Available Services</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'Fee Payment', prefix: 'F', description: 'Pay tuition and other fees' },
              { name: 'Bonafide Certificate', prefix: 'B', description: 'Request bonafide certificate' },
              { name: 'Transfer Certificate', prefix: 'T', description: 'Request transfer certificate' },
              { name: 'Scholarship Verification', prefix: 'S', description: 'Verify scholarship documents' },
              { name: 'ID Card Issue', prefix: 'I', description: 'Get new or replacement ID' },
              { name: 'Bus Pass', prefix: 'P', description: 'Apply for bus pass' },
            ].map((service) => (
              <div
                key={service.prefix}
                className="flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
                  {service.prefix}
                </div>
                <div>
                  <h3 className="font-medium">{service.name}</h3>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t bg-muted/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>College Office Queue Management System</p>
        </div>
      </footer>
    </div>
  )
}
