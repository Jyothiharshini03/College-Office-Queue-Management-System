'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Ticket, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'


interface User {
  id: string
  name: string
  email: string
  rollNumber: string
  role: string
}

interface Service {
  id: string
  name: string
  prefix: string
  description: string
}

interface Token {
  id: string
  tokenNumber: string
  serviceName: string
  serviceId: string
  status: 'waiting' | 'serving' | 'completed' | 'skipped'
  createdAt: string
  queuePosition: number | null
  totalInQueue: number
}

export default function StudentDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [myTokens, setMyTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const fetchData = useCallback(async (userId: string) => {
    try {
      const [servicesRes, tokensRes] = await Promise.all([
        fetch('/api/services'),
        fetch(`/api/tokens?userId=${userId}`),
      ])

      const servicesData = await servicesRes.json()
      const tokensData = await tokensRes.json()

      setServices(servicesData.services || [])
      setMyTokens(tokensData.tokens || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }, [])

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const storedUser = localStorage.getItem('user')
      if (!storedUser) {
        router.push('/login')
        return
      }

      const userData = JSON.parse(storedUser) as User
      if (userData.role !== 'student') {
        router.push('/login')
        return
      }

      // Verify Supabase session is still valid
      const supabase = createClient()
      const { data: { user: authUser }, error } = await supabase.auth.getUser()
      
      if (error || !authUser) {
        // Session expired or invalid - clear localStorage and redirect to login
        localStorage.removeItem('user')
        router.push('/login')
        return
      }

      setUser(userData)
      fetchData(userData.id)
      setLoading(false)
    }

    checkAuthAndFetchData()

    // Set up polling for real-time updates
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const userData = JSON.parse(storedUser) as User
      const interval = setInterval(() => {
        fetchData(userData.id)
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [router, fetchData])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    localStorage.removeItem('user')
    router.push('/')
  }

  const cancelToken = async (tokenId: string) => {
    if (!user) return

    setCancelling(tokenId)
    
    try {
      const res = await fetch('/api/queue/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          tokenId,
        }),
      })

      if (res.ok) {
        fetchData(user.id)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to cancel token')
      }
    } catch (error) {
      console.error('Error cancelling token:', error)
    } finally {
      setCancelling(null)
    }
  }

  const generateToken = async (serviceId: string) => {
    if (!user) return

    setGenerating(serviceId)
    
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
        }),
      })

      if (res.ok) {
        fetchData(user.id)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to generate token')
      }
    } catch (error) {
      console.error('Error generating token:', error)
    } finally {
      setGenerating(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Waiting</Badge>
      case 'serving':
        return <Badge className="bg-green-600 text-white"><RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Now Serving</Badge>
      case 'completed':
        return <Badge variant="outline"><CheckCircle className="mr-1 h-3 w-3" /> Completed</Badge>
      case 'skipped':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Skipped</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const hasActiveToken = (serviceId: string) => {
    return myTokens.some(
      t => t.serviceId === serviceId && (t.status === 'waiting' || t.status === 'serving')
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                Q
              </div>
              <span className="text-xl font-semibold">Queue Manager</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <p className="text-muted-foreground">Select a service to get your queue token</p>
        </div>

        {/* My Active Tokens */}
        {myTokens.filter(t => t.status === 'waiting' || t.status === 'serving').length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">My Active Tokens</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myTokens
                .filter(t => t.status === 'waiting' || t.status === 'serving')
                .map(token => (
                  <Card key={token.id} className={token.status === 'serving' ? 'border-green-500 border-2' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-3xl font-bold text-primary">{token.tokenNumber}</div>
                          <div className="text-sm text-muted-foreground">{token.serviceName}</div>
                          {token.status === 'waiting' && token.queuePosition && (
                            <div className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                              Position #{token.queuePosition} of {token.totalInQueue} in queue
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(token.status)}
                          {token.status === 'waiting' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => cancelToken(token.id)}
                              disabled={cancelling === token.id}
                            >
                              {cancelling === token.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              <span className="ml-1">Cancel</span>
                            </Button>
                          )}
                        </div>
                      </div>
                      {token.status === 'serving' && (
                        <div className="mt-4 rounded-md bg-green-100 p-3 text-center text-green-800 dark:bg-green-900 dark:text-green-100">
                          Please proceed to the counter!
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Available Services */}
        <h2 className="mb-4 text-xl font-semibold">Available Services</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(service => (
            <Card key={service.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xl font-bold">
                    {service.prefix}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => generateToken(service.id)}
                  disabled={generating === service.id || hasActiveToken(service.id)}
                >
                  {generating === service.id ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : hasActiveToken(service.id) ? (
                    'Token Already Generated'
                  ) : (
                    <>
                      <Ticket className="mr-2 h-4 w-4" />
                      Book Token
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Token History */}
        {myTokens.filter(t => t.status === 'completed' || t.status === 'skipped').length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold">Token History</h2>
            <div className="rounded-lg border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">Token</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Service</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTokens
                      .filter(t => t.status === 'completed' || t.status === 'skipped')
                      .map(token => (
                        <tr key={token.id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium">{token.tokenNumber}</td>
                          <td className="px-4 py-3 text-muted-foreground">{token.serviceName}</td>
                          <td className="px-4 py-3">{getStatusBadge(token.status)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
