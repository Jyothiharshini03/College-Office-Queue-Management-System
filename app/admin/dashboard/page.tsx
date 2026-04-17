'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, PhoneCall, CheckCircle, SkipForward, Users, Monitor, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Service {
  id: string
  name: string
  prefix: string
}

interface Token {
  id: string
  tokenNumber: string
  userName: string
  userRollNumber: string
  serviceName: string
  serviceId: string
  status: 'waiting' | 'serving' | 'completed' | 'skipped'
  createdAt: string
  calledAt?: string
}

interface Stats {
  serviceId: string
  serviceName: string
  prefix: string
  waiting: number
  currentServing: string | null
  completed: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [stats, setStats] = useState<Stats[]>([])
  const [selectedService, setSelectedService] = useState<string>('all')
  const [waitingTokens, setWaitingTokens] = useState<Token[]>([])
  const [servingToken, setServingToken] = useState<Token | Token[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?t=${Date.now()}`, {
        cache: 'no-store'
      })
      const data = await res.json()
      setStats(data.stats || [])
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [])

  const fetchQueueData = useCallback(async (serviceId: string) => {
    try {
      const res = await fetch(
        serviceId === 'all'
          ? `/api/queue?t=${Date.now()}`
          : `/api/queue?serviceId=${serviceId}&t=${Date.now()}`,
        {
          cache: 'no-store'
        }
      )
      const data = await res.json()
      setWaitingTokens(data.waiting || [])
      setServingToken(data.serving || null)
    } catch (error) {
      console.error('Error fetching queue:', error)
    }
  }, [])

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/admin/login')
      return
    }

    const userData = JSON.parse(storedUser) as User
    if (userData.role !== 'admin') {
      router.push('/admin/login')
      return
    }

    setUser(userData)

    const fetchServices = async () => {
      try {
        const res = await fetch('/api/services')
        const data = await res.json()
        setServices(data.services || [])
        if (data.services && data.services.length > 0 && !selectedService) {
          setSelectedService(data.services[0].id)
        }
      } catch (error) {
        console.error('Error fetching services:', error)
      }
    }

    fetchServices()
    fetchStats()
    setLoading(false)

    const interval = setInterval(() => {
      fetchStats()
    }, 3000)

    return () => clearInterval(interval)
  }, [router, fetchStats])

  useEffect(() => {
    if (selectedService) {
      fetchQueueData(selectedService)
      const interval = setInterval(() => {
        fetchQueueData(selectedService)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [selectedService, fetchQueueData])

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/')
  }

  const callNext = async () => {
    if (!selectedService) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/queue/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'call_next', serviceId: selectedService }),
      })
      if (res.ok) {
        fetchQueueData(selectedService)
        fetchStats()
      } else {
        const data = await res.json()
        alert(data.error || 'No tokens in queue')
      }
    } catch (error) {
      console.error('Error calling next:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const completeToken = async () => {
    if (!servingToken || Array.isArray(servingToken)) return
    await completeTokenById(servingToken.id)
  }

  const completeTokenById = async (tokenId: string) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/queue/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', tokenId }),
      })
      if (res.ok) {
        fetchQueueData(selectedService)
        fetchStats()
      }
    } catch (error) {
      console.error('Error completing token:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const callNextForService = async (serviceId: string) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/queue/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'call_next', serviceId }),
      })
      if (res.ok) {
        fetchQueueData(selectedService)
        fetchStats()
      } else {
        const data = await res.json()
        alert(data.error || 'No tokens in queue')
      }
    } catch (error) {
      console.error('Error calling next:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const skipToken = async (tokenId: string) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/queue/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'skip', tokenId }),
      })
      if (res.ok) {
        fetchQueueData(selectedService)
        fetchStats()
      }
    } catch (error) {
      console.error('Error skipping token:', error)
    } finally {
      setActionLoading(false)
    }
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
            <Badge variant="secondary">Admin</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/display" target="_blank">
              <Button variant="outline" size="sm">
                <Monitor className="mr-2 h-4 w-4" />
                Display Screen
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage queues and call tokens</p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map(stat => (
            <Card key={stat.serviceId}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
                    {stat.prefix}
                  </span>
                  {stat.serviceName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{stat.waiting}</div>
                    <div className="text-xs text-muted-foreground">waiting</div>
                  </div>
                  {stat.currentServing && (
                    <Badge variant="secondary" className="text-lg">
                      {stat.currentServing}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Service Tabs */}
        <Tabs value={selectedService} onValueChange={(value) => {
          setSelectedService(value)
          fetchQueueData(value)
        }}>
          <TabsList className="mb-4 flex-wrap">

            <TabsTrigger value="all">ALL</TabsTrigger>

            {services.map(service => (
              <TabsTrigger key={service.id} value={service.id}>
                {service.prefix} - {service.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="all">
            <div className="grid gap-6 lg:grid-cols-2">

              {/* Currently Serving */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Currently Serving
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {Array.isArray(servingToken) && servingToken.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {servingToken.map((token) => (
                        <div key={token.id} className="flex items-center justify-between rounded-lg bg-green-100 p-4 dark:bg-green-900">
                          <div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-100">
                              {token.tokenNumber}
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-200">
                              {token.serviceName}
                            </div>
                            <div className="text-sm text-green-600 dark:text-green-200">
                              {token.userName} — {token.userRollNumber}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button size="sm" onClick={() => completeTokenById(token.id)} disabled={actionLoading}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => skipToken(token.id)} disabled={actionLoading}>
                              <SkipForward className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed p-6 text-center text-muted-foreground">
                      No token being served
                    </div>
                  )}

                  {/* Call next buttons per service */}
                  {services.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {services.filter(s => {
                        const stat = stats.find(st => st.serviceId === s.id)
                        return stat && stat.waiting > 0
                      }).map(service => (
                        <Button
                          key={service.id}
                          className="w-full"
                          variant="outline"
                          onClick={() => callNextForService(service.id)}
                          disabled={actionLoading}
                        >
                          <PhoneCall className="mr-2 h-4 w-4" />
                          Call Next — {service.prefix} ({service.name})
                        </Button>
                      ))}
                      {services.every(s => {
                        const stat = stats.find(st => st.serviceId === s.id)
                        return !stat || stat.waiting === 0
                      }) && (
                        <Button className="w-full" disabled>
                          <PhoneCall className="mr-2 h-4 w-4" />
                          No Tokens Waiting
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Waiting Queue */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Waiting Queue</span>
                    <Badge variant="outline">{waitingTokens.length} waiting</Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  {waitingTokens.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed p-6 text-center text-muted-foreground">
                      No tokens waiting
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium">#</th>
                            <th className="px-3 py-2 text-left text-xs font-medium">Token</th>
                            <th className="px-3 py-2 text-left text-xs font-medium">Service</th>
                            <th className="px-3 py-2 text-left text-xs font-medium">Roll No</th>
                            <th className="px-3 py-2 text-left text-xs font-medium">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {waitingTokens.map((token, index) => (
                            <tr key={token.id} className="border-b last:border-0">
                              <td className="px-3 py-2 text-sm">{index + 1}</td>
                              <td className="px-3 py-2 font-semibold">{token.tokenNumber}</td>
                              <td className="px-3 py-2 text-sm text-muted-foreground">{token.serviceName}</td>
                              <td className="px-3 py-2 text-sm text-muted-foreground">{token.userRollNumber}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                {new Date(token.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </TabsContent>
          {services.map(service => (
            <TabsContent key={service.id} value={service.id}>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Currently Serving */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Currently Serving
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!Array.isArray(servingToken) && servingToken ? (
                      <div className="space-y-4">
                        <div className="rounded-lg bg-green-100 p-6 text-center dark:bg-green-900">
                          <div className="text-4xl font-bold text-green-700 dark:text-green-100">
                            {servingToken.tokenNumber}
                          </div>
                          <div className="mt-2 text-sm text-green-600 dark:text-green-200">
                            Roll No: {servingToken.userRollNumber}
                          </div>
                          <div className="mt-1 text-lg text-green-600 dark:text-green-200">
                            {servingToken.userName}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            onClick={completeToken}
                            disabled={actionLoading}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Complete
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={() => skipToken(servingToken.id)}
                            disabled={actionLoading}
                          >
                            <SkipForward className="mr-2 h-4 w-4" />
                            Skip
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border-2 border-dashed p-6 text-center text-muted-foreground">
                        No token being served
                      </div>
                    )}

                    <Button
                      className="mt-4 w-full"
                      size="lg"
                      onClick={callNext}
                      disabled={actionLoading || waitingTokens.length === 0}
                    >
                      <PhoneCall className="mr-2 h-4 w-4" />
                      Call Next Token
                    </Button>
                  </CardContent>
                </Card>

                {/* Waiting Queue */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Waiting Queue</span>
                      <Badge variant="outline">{waitingTokens.length} waiting</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {waitingTokens.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed p-6 text-center text-muted-foreground">
                        No tokens waiting
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-96">
                        <table className="w-full">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium">#</th>
                              <th className="px-3 py-2 text-left text-xs font-medium">Token</th>
                              <th className="px-3 py-2 text-left text-xs font-medium">Roll No</th>
                              <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                              <th className="px-3 py-2 text-left text-xs font-medium">Time</th>
                              <th className="px-3 py-2 text-right text-xs font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {waitingTokens
                              .filter((token) => token.status === 'waiting')
                              .map((token, index) => (
                                <tr key={token.id} className="border-b last:border-0">
                                  <td className="px-3 py-2 text-sm">{index + 1}</td>
                                  <td className="px-3 py-2 font-semibold">{token.tokenNumber}</td>
                                  <td className="px-3 py-2 text-sm text-muted-foreground">{token.userRollNumber}</td>
                                  <td className="px-3 py-2">
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-100">
                                      Waiting
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">
                                    {new Date(token.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => skipToken(token.id)}
                                      disabled={actionLoading}
                                    >
                                      <SkipForward className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  )
}
