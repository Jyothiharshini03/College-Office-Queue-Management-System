// In-memory data store for Queue Management System
// In production, this would be replaced with a real database

export interface User {
  id: string
  name: string
  email: string
  phone: string
  rollNumber: string
  password: string
  role: 'student' | 'admin'
  createdAt: Date
}

export interface Service {
  id: string
  name: string
  prefix: string
  description: string
  isActive: boolean
}

export interface Token {
  id: string
  tokenNumber: string
  userId: string
  userName: string
  userRollNumber: string
  serviceId: string
  serviceName: string
  status: 'waiting' | 'serving' | 'completed' | 'skipped'
  createdAt: Date
  calledAt?: Date
  completedAt?: Date
}

// Initialize services
const services: Service[] = [
  { id: '1', name: 'Fee Payment', prefix: 'F', description: 'Pay tuition and other fees', isActive: true },
  { id: '2', name: 'Bonafide Certificate', prefix: 'B', description: 'Request bonafide certificate', isActive: true },
  { id: '3', name: 'Transfer Certificate', prefix: 'T', description: 'Request transfer certificate', isActive: true },
  { id: '4', name: 'Scholarship Verification', prefix: 'S', description: 'Verify scholarship documents', isActive: true },
  { id: '5', name: 'ID Card Issue', prefix: 'I', description: 'Get new or replacement ID card', isActive: true },
  { id: '6', name: 'Bus Pass', prefix: 'P', description: 'Apply for bus pass', isActive: true },
]

// Initialize admin user
const users: User[] = [
  {
    id: 'admin-1',
    name: 'Office Admin',
    email: 'officeadmin@college.edu',
    phone: '0000000000',
    rollNumber: 'ADMIN',
    password: 'pragati',
    role: 'admin',
    createdAt: new Date(),
  },
]

const tokens: Token[] = []
const tokenCounters: Record<string, number> = {}

// Initialize counters for each service
services.forEach(service => {
  tokenCounters[service.id] = 0
})

export const store = {
  // User methods
  getUsers: () => users,
  
  getUserById: (id: string) => users.find(u => u.id === id),
  
  getUserByEmail: (email: string) => users.find(u => u.email === email),
  
  createUser: (userData: Omit<User, 'id' | 'createdAt' | 'role'>) => {
    // Check if roll number already exists
    const existingRoll = users.find(u => u.rollNumber === userData.rollNumber)
    if (existingRoll) return null
    
    const user: User = {
      ...userData,
      id: `user-${Date.now()}`,
      role: 'student',
      createdAt: new Date(),
    }
    users.push(user)
    return user
  },
  
  updateUserPassword: (email: string, newPassword: string) => {
    const user = users.find(u => u.email === email)
    if (user) {
      user.password = newPassword
      return true
    }
    return false
  },

  // Service methods
  getServices: () => services.filter(s => s.isActive),
  
  getServiceById: (id: string) => services.find(s => s.id === id),

  // Token methods
  getTokens: () => tokens,
  
  getTokenById: (id: string) => tokens.find(t => t.id === id),
  
  getTokensByUser: (userId: string) => tokens.filter(t => t.userId === userId),
  
  getTokensByService: (serviceId: string) => tokens.filter(t => t.serviceId === serviceId),
  
  getWaitingTokens: (serviceId?: string) => {
    let filtered = tokens.filter(t => t.status === 'waiting')
    if (serviceId) {
      filtered = filtered.filter(t => t.serviceId === serviceId)
    }
    return filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  },
  
  getCurrentServingToken: (serviceId?: string) => {
    let filtered = tokens.filter(t => t.status === 'serving')
    if (serviceId) {
      filtered = filtered.filter(t => t.serviceId === serviceId)
    }
    return filtered[0] || null
  },
  
  getAllServingTokens: () => {
    return tokens.filter(t => t.status === 'serving')
  },
  
  createToken: (userId: string, userName: string, userRollNumber: string, serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    if (!service) return null
    
    // Check if user already has a waiting token for this service
    const existingToken = tokens.find(
      t => t.userId === userId && t.serviceId === serviceId && t.status === 'waiting'
    )
    if (existingToken) return null
    
    tokenCounters[serviceId] = (tokenCounters[serviceId] || 0) + 1
    const tokenNumber = `${service.prefix}${String(tokenCounters[serviceId]).padStart(2, '0')}`
    
    const token: Token = {
      id: `token-${Date.now()}`,
      tokenNumber,
      userId,
      userName,
      userRollNumber,
      serviceId,
      serviceName: service.name,
      status: 'waiting',
      createdAt: new Date(),
    }
    tokens.push(token)
    return token
  },
  
  callNextToken: (serviceId: string) => {
    // First, complete any currently serving token for this service
    const currentServing = tokens.find(t => t.serviceId === serviceId && t.status === 'serving')
    if (currentServing) {
      currentServing.status = 'completed'
      currentServing.completedAt = new Date()
    }
    
    // Get next waiting token
    const waitingTokens = tokens
      .filter(t => t.serviceId === serviceId && t.status === 'waiting')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    
    if (waitingTokens.length === 0) return null
    
    const nextToken = waitingTokens[0]
    nextToken.status = 'serving'
    nextToken.calledAt = new Date()
    return nextToken
  },
  
  completeToken: (tokenId: string) => {
    const token = tokens.find(t => t.id === tokenId)
    if (token && token.status === 'serving') {
      token.status = 'completed'
      token.completedAt = new Date()
      return token
    }
    return null
  },
  
  skipToken: (tokenId: string) => {
    const token = tokens.find(t => t.id === tokenId)
    if (token && (token.status === 'waiting' || token.status === 'serving')) {
      token.status = 'skipped'
      token.completedAt = new Date()
      return token
    }
    return null
  },
  
  getQueueStats: () => {
    const stats = services.map(service => {
      const serviceTokens = tokens.filter(t => t.serviceId === service.id)
      const waiting = serviceTokens.filter(t => t.status === 'waiting').length
      const serving = serviceTokens.find(t => t.status === 'serving')
      const completed = serviceTokens.filter(t => t.status === 'completed').length
      
      return {
        serviceId: service.id,
        serviceName: service.name,
        prefix: service.prefix,
        waiting,
        currentServing: serving?.tokenNumber || null,
        currentServingRollNumber: serving?.userRollNumber || null,
        completed,
      }
    })
    return stats
  },
  
  resetDailyCounters: () => {
    services.forEach(service => {
      tokenCounters[service.id] = 0
    })
    // Clear all tokens
    tokens.length = 0
  },
}
