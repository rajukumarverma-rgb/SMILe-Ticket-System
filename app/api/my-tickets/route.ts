import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/sqlite-database'
import type { Ticket } from '@/lib/types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Helper function to verify JWT token
async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded
  } catch (error) {
    return null
  }
}

// Get "My Tickets" based on user role and relationship
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const decoded = await verifyToken(request)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const type = searchParams.get('type') // 'created', 'assigned', 'all'

    const userId = decoded.id || decoded.userId
    const userRole = decoded.role

    let queryStr = `
      SELECT 
        t.id, t.title, t.description, t.category, t.priority, t.status,
        t.created_by, t.assigned_to, t.created_at, t.updated_at, t.due_date, t.tags,
        u1.name as created_by_name, u1.email as created_by_email,
        u2.name as assigned_to_name, u2.email as assigned_to_email
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE 1=1
    `
    const params: any[] = []

    // Role-based filtering for "My Tickets"
    if (userRole === 'channel_partner') {
      // Channel partners see only tickets they created
      queryStr += ' AND t.created_by = ?'
      params.push(userId)
    } else if (userRole === 'assignee') {
      // Assignees see tickets assigned to them + open tickets they can pick up
      if (type === 'assigned') {
        queryStr += ' AND t.assigned_to = ?'
        params.push(userId)
      } else if (type === 'available') {
        queryStr += ' AND t.status = ? AND t.assigned_to IS NULL'
        params.push('open')
      } else {
        // Default: show assigned tickets + open tickets
        queryStr += ' AND (t.assigned_to = ? OR (t.status = ? AND t.assigned_to IS NULL))'
        params.push(userId, 'open')
      }
    } else if (userRole === 'head_office' || userRole === 'technical') {
      // Head office and technical can see all tickets
      if (type === 'created') {
        queryStr += ' AND t.created_by = ?'
        params.push(userId)
      } else if (type === 'assigned') {
        queryStr += ' AND t.assigned_to = ?'
        params.push(userId)
      }
      // If no type specified, show all tickets
    }

    // Apply additional filters
    if (status) {
      queryStr += ' AND t.status = ?'
      params.push(status)
    }
    if (category) {
      queryStr += ' AND t.category = ?'
      params.push(category)
    }
    if (priority) {
      queryStr += ' AND t.priority = ?'
      params.push(priority)
    }

    // Order by priority and creation date
    queryStr += ` ORDER BY 
      CASE t.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      t.created_at DESC`

    const tickets = await query(queryStr, params)

    // Format tickets
    const formattedTickets: Ticket[] = tickets.map(ticket => ({
      id: ticket.id.toString(),
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      createdBy: ticket.created_by.toString(),
      assignedTo: ticket.assigned_to ? ticket.assigned_to.toString() : undefined,
      createdAt: new Date(ticket.created_at),
      updatedAt: new Date(ticket.updated_at),
      dueDate: ticket.due_date ? new Date(ticket.due_date) : undefined,
      tags: ticket.tags ? ticket.tags.split(',') : undefined,
      comments: [] // Will be populated separately if needed
    }))

    // Get ticket statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_count,
        SUM(CASE WHEN assigned_to = ? THEN 1 ELSE 0 END) as assigned_to_me_count,
        SUM(CASE WHEN created_by = ? THEN 1 ELSE 0 END) as created_by_me_count
      FROM tickets t
      WHERE 1=1
    `
    
    const statsParams = [...params.slice(0, -1)] // Remove the last ORDER BY params
    statsParams.push(userId, userId) // Add user ID for assigned/created counts
    
    // Apply same WHERE conditions for stats
    let statsWhereClause = ''
    if (userRole === 'channel_partner') {
      statsWhereClause += ' AND t.created_by = ?'
    } else if (userRole === 'assignee') {
      if (type === 'assigned') {
        statsWhereClause += ' AND t.assigned_to = ?'
      } else if (type === 'available') {
        statsWhereClause += ' AND t.status = ? AND t.assigned_to IS NULL'
      } else {
        statsWhereClause += ' AND (t.assigned_to = ? OR (t.status = ? AND t.assigned_to IS NULL))'
      }
    } else if (userRole === 'head_office' || userRole === 'technical') {
      if (type === 'created') {
        statsWhereClause += ' AND t.created_by = ?'
      } else if (type === 'assigned') {
        statsWhereClause += ' AND t.assigned_to = ?'
      }
    }

    if (status) {
      statsWhereClause += ' AND t.status = ?'
    }
    if (category) {
      statsWhereClause += ' AND t.category = ?'
    }
    if (priority) {
      statsWhereClause += ' AND t.priority = ?'
    }

    const statsResult = await query(statsQuery + statsWhereClause, statsParams)
    const stats = statsResult[0]

    return NextResponse.json({
      tickets: formattedTickets,
      count: formattedTickets.length,
      stats: {
        total: stats.total,
        open: stats.open_count,
        inProgress: stats.in_progress_count,
        pendingApproval: stats.pending_count,
        resolved: stats.resolved_count,
        closed: stats.closed_count,
        urgent: stats.urgent_count,
        high: stats.high_count,
        assignedToMe: stats.assigned_to_me_count,
        createdByMe: stats.created_by_me_count
      },
      userRole: userRole,
      filters: {
        status,
        category,
        priority,
        type
      }
    })

  } catch (error) {
    console.error('Get my tickets error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
