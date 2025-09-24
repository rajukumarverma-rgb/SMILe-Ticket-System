import type { Ticket, TicketStatus, TicketComment, DashboardStats } from "./types"
import { AuthService } from "./auth"

// Mock ticket data
const mockTickets: Ticket[] = [
  {
    id: "1",
    title: "Login Issues with New System",
    description:
      "Users are experiencing login failures after the recent update. Multiple reports from different locations.",
    category: "technical",
    priority: "high",
    status: "in_progress",
    createdBy: "1",
    assignedTo: "2",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-16"),
    dueDate: new Date("2024-01-20"),
    comments: [
      {
        id: "1",
        ticketId: "1",
        userId: "1",
        content: "This is affecting multiple clients in our region.",
        createdAt: new Date("2024-01-15"),
        isInternal: false,
      },
      {
        id: "2",
        ticketId: "1",
        userId: "2",
        content: "Investigating the authentication service logs.",
        createdAt: new Date("2024-01-16"),
        isInternal: true,
      },
    ],
    tags: ["authentication", "urgent"],
  },
  {
    id: "2",
    title: "Feature Request: Dark Mode",
    description: "Multiple users have requested a dark mode option for better usability during night hours.",
    category: "feature_request",
    priority: "medium",
    status: "open",
    createdBy: "1",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10"),
    comments: [],
    tags: ["ui", "enhancement"],
  },
  {
    id: "3",
    title: "Billing Discrepancy Report",
    description: "There appears to be a calculation error in the monthly billing for enterprise clients.",
    category: "billing",
    priority: "urgent",
    status: "pending_approval",
    createdBy: "3",
    assignedTo: "4",
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-14"),
    dueDate: new Date("2024-01-18"),
    comments: [
      {
        id: "3",
        ticketId: "3",
        userId: "4",
        content: "Found the issue in the pricing calculation module. Fix ready for review.",
        createdAt: new Date("2024-01-14"),
        isInternal: true,
      },
    ],
    tags: ["billing", "calculation", "enterprise"],
  },
]

export class TicketService {
  static async getTickets(): Promise<Ticket[]> {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) return []

      const response = await fetch('/api/my-tickets', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.tickets || []
      }
      return []
    } catch (error) {
      console.error('Error fetching tickets:', error)
      return []
    }
  }

  static async getTicketById(id: string): Promise<Ticket | null> {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) return null

      const response = await fetch(`/api/tickets/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.ticket || null
      }
      return null
    } catch (error) {
      console.error('Error fetching ticket:', error)
      return null
    }
  }

  static async createTicket(ticketData: Omit<Ticket, "id" | "createdAt" | "updatedAt" | "comments">): Promise<Ticket> {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) throw new Error('No authentication token')

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      })

      if (response.ok) {
        const data = await response.json()
        return data.ticket
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create ticket')
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      throw error
    }
  }

  static async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<boolean> {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) return false

      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      return response.ok
    } catch (error) {
      console.error('Error updating ticket status:', error)
      return false
    }
  }

  static async assignTicket(ticketId: string, assigneeId: string): Promise<boolean> {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) return false

      const response = await fetch('/api/tickets/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId, assigneeId }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.success
      }
      return false
    } catch (error) {
      console.error('Error assigning ticket:', error)
      return false
    }
  }

  static async transferTicket(ticketId: string, assigneeId: string): Promise<{ success: boolean; message?: string; ticket?: Ticket }> {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) return { success: false, message: 'No authentication token' }

      const response = await fetch('/api/tickets/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId, assigneeId }),
      })

      const data = await response.json()

      if (response.ok) {
        return {
          success: true,
          message: data.message,
          ticket: data.ticket
        }
      } else {
        return {
          success: false,
          message: data.error || 'Failed to transfer ticket'
        }
      }
    } catch (error) {
      console.error('Error transferring ticket:', error)
      return { success: false, message: 'Network error occurred' }
    }
  }

  static async getTransferHistory(ticketId: string): Promise<{ success: boolean; transferHistory?: any[]; error?: string }> {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) return { success: false, error: 'No authentication token' }

      const response = await fetch(`/api/tickets/transfer?ticketId=${ticketId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        return {
          success: true,
          transferHistory: data.transferHistory
        }
      } else {
        return {
          success: false,
          error: data.error || 'Failed to get transfer history'
        }
      }
    } catch (error) {
      console.error('Error getting transfer history:', error)
      return { success: false, error: 'Network error occurred' }
    }
  }

  static async addComment(ticketId: string, content: string, isInternal = false): Promise<boolean> {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) return false

      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, isInternal }),
      })

      return response.ok
    } catch (error) {
      console.error('Error adding comment:', error)
      return false
    }
  }

  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      const token = localStorage.getItem("authToken")
      if (!token) {
        return {
          totalTickets: 0,
          openTickets: 0,
          inProgressTickets: 0,
          resolvedTickets: 0,
          avgResolutionTime: 0,
        }
      }

      const response = await fetch('/api/dashboard/stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.stats || {
          totalTickets: 0,
          openTickets: 0,
          inProgressTickets: 0,
          resolvedTickets: 0,
          avgResolutionTime: 0,
        }
      }
      
      // Fallback to local calculation
      const tickets = await this.getTickets()
      return {
        totalTickets: tickets.length,
        openTickets: tickets.filter((t) => t.status === "open").length,
        inProgressTickets: tickets.filter((t) => t.status === "in_progress").length,
        resolvedTickets: tickets.filter((t) => t.status === "resolved").length,
        avgResolutionTime: 2.5, // Mock average in days
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return {
        totalTickets: 0,
        openTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        avgResolutionTime: 0,
      }
    }
  }
}
