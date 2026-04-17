'use client'

import { useEffect, useState, useCallback } from 'react'
import { Volume2 } from 'lucide-react'

interface Stats {
  serviceId: string
  serviceName: string
  prefix: string
  waiting: number
  currentServing: string | null
  currentServingRollNumber: string | null
  completed: number
}

export default function DisplayScreen() {
  const [stats, setStats] = useState<Stats[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lastCalled, setLastCalled] = useState<string | null>(null)
  const [prevServing, setPrevServing] = useState<Record<string, string | null>>({})

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      speechSynthesis.speak(utterance)
    }
  }

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      const newStats = data.stats || []
      
      // Check for new tokens being served
      newStats.forEach((stat: Stats) => {
        if (stat.currentServing && stat.currentServing !== prevServing[stat.serviceId]) {
          setLastCalled(stat.currentServing)
          speak(`Now serving token number ${stat.currentServing.split('').join(' ')} at ${stat.serviceName} counter`)
        }
      })
      
      // Update previous serving state
      const newPrevServing: Record<string, string | null> = {}
      newStats.forEach((stat: Stats) => {
        newPrevServing[stat.serviceId] = stat.currentServing
      })
      setPrevServing(newPrevServing)
      
      setStats(newStats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [prevServing])

  useEffect(() => {
    fetchStats()
    const statsInterval = setInterval(fetchStats, 3000)
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000)

    return () => {
      clearInterval(statsInterval)
      clearInterval(timeInterval)
    }
  }, [fetchStats])

  const servingServices = stats.filter(s => s.currentServing)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-2xl font-bold">
              Q
            </div>
            <div>
              <h1 className="text-2xl font-bold">College Office</h1>
              <p className="text-slate-400">Queue Management System</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold font-mono">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-slate-400">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        {/* Now Serving Section */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Volume2 className="h-6 w-6 text-green-400" />
            <h2 className="text-2xl font-semibold text-green-400">Now Serving</h2>
          </div>
          
          {servingServices.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-700 p-12 text-center">
              <p className="text-2xl text-slate-500">No tokens being served at the moment</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {servingServices.map(stat => (
                <div
                  key={stat.serviceId}
                  className={`relative overflow-hidden rounded-2xl p-6 transition-all ${
                    lastCalled === stat.currentServing
                      ? 'animate-pulse bg-green-600 shadow-lg shadow-green-600/50'
                      : 'bg-gradient-to-br from-blue-600 to-blue-700'
                  }`}
                >
                  <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-white/10" />
                  <div className="relative">
                    <div className="mb-2 text-sm font-medium uppercase tracking-wider text-white/80">
                      {stat.serviceName}
                    </div>
                    <div className="text-6xl font-bold tracking-wider">
                      {stat.currentServing}
                    </div>
                    {stat.currentServingRollNumber && (
                      <div className="mt-2 text-lg font-medium text-white/90">
                        Roll No: {stat.currentServingRollNumber}
                      </div>
                    )}
                    <div className="mt-1 text-sm text-white/70">
                      Counter {stat.prefix}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Queue Status Grid */}
        <div>
          <h2 className="mb-4 text-2xl font-semibold">Queue Status</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {stats.map(stat => (
              <div
                key={stat.serviceId}
                className="rounded-xl bg-slate-800/50 p-4 backdrop-blur transition-all hover:bg-slate-800"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-lg font-bold">
                    {stat.prefix}
                  </span>
                  <span className="text-sm font-medium text-slate-300">{stat.serviceName}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-amber-400">{stat.waiting}</div>
                    <div className="text-xs text-slate-500 uppercase">Waiting</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-400">{stat.completed}</div>
                    <div className="text-xs text-slate-500 uppercase">Served</div>
                  </div>
                </div>
                {stat.currentServing && (
                  <div className="mt-3 rounded-lg bg-green-600/20 p-2 text-center">
                    <div>
                      <span className="text-sm text-slate-400">Serving: </span>
                      <span className="font-bold text-green-400">{stat.currentServing}</span>
                    </div>
                    {stat.currentServingRollNumber && (
                      <div className="text-xs text-slate-400 mt-1">
                        Roll No: {stat.currentServingRollNumber}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 rounded-xl bg-slate-800/30 p-6 text-center">
          <p className="text-lg text-slate-400">
            Please wait for your token number to be displayed. Proceed to the respective counter when called.
          </p>
        </div>
      </main>
    </div>
  )
}
