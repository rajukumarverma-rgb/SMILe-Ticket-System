import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/sqlite-database'
import type { DashboardStats } from '@/lib/types'

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

// Get dashboard statistics
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

    const userId = decoded.userId
    const userRole = decoded.role

    let baseQuery = 'FROM tickets t WHERE 1=1'
    let params: any[] = []

    // Role-based filtering
    if (userRole === 'channel_partner') {
      baseQuery += ' AND t.created_by = ?'
      params.push(userId)
    } else if (userRole === 'assignee') {
      baseQuery += ' AND (t.assigned_to = ? OR t.status = ?)'
      params.push(userId, 'open')
    }
    // head_office and technical can see all tickets

    // Get basic ticket statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as totalTickets,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as openTickets,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgressTickets,
        SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pendingApprovalTickets,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolvedTickets,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closedTickets,
        SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgentTickets,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as highPriorityTickets,
        SUM(CASE WHEN assigned_to = ? THEN 1 ELSE 0 END) as assignedToMe,
        SUM(CASE WHEN created_by = ? THEN 1 ELSE 0 END) as createdByMe
      ${baseQuery}
    `
    
    const statsParams = [...params, userId, userId]
    const statsResult = await query(statsQuery, statsParams)
    const stats = statsResult[0]

    // Get category breakdown
    let categoryQuery = `
      SELECT 
        category,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count
      FROM tickets t
      WHERE 1=1
    `
    
    if (userRole === 'channel_partner') {
      categoryQuery += ' AND t.created_by = ?'
    } else if (userRole === 'assignee') {
      categoryQuery += ' AND (t.assigned_to = ? OR t.status = ?)'
    }
    
    categoryQuery += `
      GROUP BY category
      ORDER BY count DESC
    `
    const categoryStats = await query(categoryQuery, params)

    // Get priority breakdown
    let priorityQuery = `
      SELECT 
        priority,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count
      FROM tickets t
      WHERE 1=1
    `
    
    if (userRole === 'channel_partner') {
      priorityQuery += ' AND t.created_by = ?'
    } else if (userRole === 'assignee') {
      priorityQuery += ' AND (t.assigned_to = ? OR t.status = ?)'
    }
    
    priorityQuery += `
      GROUP BY priority
      ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END
    `
    const priorityStats = await query(priorityQuery, params)

    // Get recent tickets (last 7 days)
    let recentQuery = `
      SELECT 
        t.id, t.title, t.status, t.priority, t.category, t.created_at,
        u1.name as created_by_name,
        u2.name as assigned_to_name
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE 1=1
    `
    
    if (userRole === 'channel_partner') {
      recentQuery += ' AND t.created_by = ?'
    } else if (userRole === 'assignee') {
      recentQuery += ' AND (t.assigned_to = ? OR t.status = ?)'
    }
    
    recentQuery += `
      AND t.created_at >= datetime('now', '-7 days')
      ORDER BY t.created_at DESC
      LIMIT 10
    `
    const recentTickets = await query(recentQuery, params)

    // Get overdue tickets
    let overdueQuery = `
      SELECT 
        t.id, t.title, t.status, t.priority, t.due_date, t.created_at,
        u1.name as created_by_name,
        u2.name as assigned_to_name
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE 1=1
    `
    
    if (userRole === 'channel_partner') {
      overdueQuery += ' AND t.created_by = ?'
    } else if (userRole === 'assignee') {
      overdueQuery += ' AND (t.assigned_to = ? OR t.status = ?)'
    }
    
    overdueQuery += `
      AND t.due_date IS NOT NULL 
      AND t.due_date < datetime('now')
      AND t.status NOT IN ('resolved', 'closed')
      ORDER BY t.due_date ASC
      LIMIT 10
    `
    const overdueTickets = await query(overdueQuery, params)

    // Calculate average resolution time (mock calculation for now)
    const avgResolutionTime = 2.5 // This would be calculated from actual data

    // Format response
    const dashboardStats: DashboardStats = {
      totalTickets: stats.totalTickets,
      openTickets: stats.openTickets,
      inProgressTickets: stats.inProgressTickets,
      resolvedTickets: stats.resolvedTickets,
      avgResolutionTime: avgResolutionTime
    }

    return NextResponse.json({
      stats: dashboardStats,
      detailedStats: {
        total: stats.totalTickets,
        open: stats.openTickets,
        inProgress: stats.inProgressTickets,
        pendingApproval: stats.pendingApprovalTickets,
        resolved: stats.resolvedTickets,
        closed: stats.closedTickets,
        urgent: stats.urgentTickets,
        highPriority: stats.highPriorityTickets,
        assignedToMe: stats.assignedToMe,
        createdByMe: stats.createdByMe
      },
      categoryBreakdown: categoryStats.map(cat => ({
        category: cat.category,
        total: cat.count,
        open: cat.open_count,
        inProgress: cat.in_progress_count,
        resolved: cat.resolved_count
      })),
      priorityBreakdown: priorityStats.map(pri => ({
        priority: pri.priority,
        total: pri.count,
        open: pri.open_count,
        inProgress: pri.in_progress_count,
        resolved: pri.resolved_count
      })),
      recentTickets: recentTickets.map(ticket => ({
        id: ticket.id.toString(),
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        createdAt: new Date(ticket.created_at),
        createdByName: ticket.created_by_name,
        assignedToName: ticket.assigned_to_name
      })),
      overdueTickets: overdueTickets.map(ticket => ({
        id: ticket.id.toString(),
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        dueDate: new Date(ticket.due_date),
        createdAt: new Date(ticket.created_at),
        createdByName: ticket.created_by_name,
        assignedToName: ticket.assigned_to_name
      })),
      userRole: userRole
    })

  } catch (error) {
    console.error('Get dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
