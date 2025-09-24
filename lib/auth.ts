import type { User, UserRole } from "./types"

export class AuthService {
  private static currentUser: User | null = null

  static async login(email: string, password: string): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        this.currentUser = data.user
        localStorage.setItem("currentUser", JSON.stringify(data.user))
        localStorage.setItem("authToken", data.token)
        return data.user
      }
      return null
    } catch (error) {
      console.error('Login error:', error)
      return null
    }
  }

  static async register(userData: {
    email: string
    password: string
    name: string
    role: UserRole
    department?: string
    location?: string
  }): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        const data = await response.json()
        this.currentUser = data.user
        localStorage.setItem("currentUser", JSON.stringify(data.user))
        localStorage.setItem("authToken", data.token)
        return data.user
      }
      return null
    } catch (error) {
      console.error('Registration error:', error)
      return null
    }
  }

  static async logout(): Promise<boolean> {
    try {
      const token = localStorage.getItem("authToken")
      if (token) {
        // Call the logout API to invalidate the token on the server
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      }
    } catch (error) {
      console.error('Logout API error:', error)
      // Continue with local logout even if API call fails
    }

    // Clear local storage and state
    this.currentUser = null
    localStorage.removeItem("currentUser")
    localStorage.removeItem("authToken")
    
    return true
  }

  static getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("currentUser")
      if (stored) {
        this.currentUser = JSON.parse(stored)
        return this.currentUser
      }
    }
    return null
  }

  static hasPermission(requiredRole: UserRole | UserRole[]): boolean {
    const user = this.getCurrentUser()
    if (!user) return false

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    return roles.includes(user.role)
  }

  static canViewAllTickets(): boolean {
    return this.hasPermission(["head_office", "technical"])
  }

  static canAssignTickets(): boolean {
    return this.hasPermission(["head_office", "assignee"])
  }

  static canCreateTickets(): boolean {
    return this.hasPermission(["channel_partner", "head_office"])
  }

  static async getAssigneeUsers(): Promise<User[]> {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) return []

      const response = await fetch('/api/assignees', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.assignees || []
      }
      return []
    } catch (error) {
      console.error('Error fetching assignee users:', error)
      return []
    }
  }

  static async getAllUsers(): Promise<User[]> {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) return []

      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.users || []
      }
      return []
    } catch (error) {
      console.error('Error fetching all users:', error)
      return []
    }
  }
}
