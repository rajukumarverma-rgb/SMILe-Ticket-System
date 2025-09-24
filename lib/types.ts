export type UserRole = "channel_partner" | "assignee" | "head_office" | "technical" | "developer_support"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  department?: string
  location?: string
  isActive?: boolean
  createdAt: Date
}

export type TicketStatus = "open" | "in_progress" | "pending_approval" | "resolved" | "closed"
export type TicketPriority = "low" | "medium" | "high" | "urgent"
export type TicketCategory = "technical" | "billing" | "general" | "feature_request" | "bug_report"

export interface Ticket {
  id: string
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  createdBy: string
  assignedTo?: string
  createdAt: Date
  updatedAt: Date
  dueDate?: Date
  attachments?: string[]
  comments: TicketComment[]
  tags?: string[]
}

export interface TicketComment {
  id: string
  ticketId: string
  userId: string
  content: string
  createdAt: Date
  isInternal: boolean
}

export interface DashboardStats {
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  resolvedTickets: number
  avgResolutionTime: number
}
