import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/sqlite-database'
import type { DashboardStats, User, Ticket } from '@/lib/types'

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

// Get comprehensive dashboard data for all user roles
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

    // Get user information
    const userResult = await query(
      'SELECT id, email, name, role, department, location, created_at FROM users WHERE id = ?',
      [userId]
    )
    
    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const user = userResult[0]
    const userInfo: User = {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      location: user.location,
      createdAt: new Date(user.created_at)
    }

    // Build base query based on user role
    let baseWhereClause = ''
    let baseParams: any[] = []

    if (userRole === 'channel_partner') {
      baseWhereClause = 'AND t.created_by = ?'
      baseParams = [userId]
    } else if (userRole === 'assignee') {
      baseWhereClause = 'AND (t.assigned_to = ? OR t.status = ?)'
      baseParams = [userId, 'open']
    }
    // head_office and technical can see all tickets

    // Get comprehensive ticket statistics
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
        SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as mediumPriorityTickets,
        SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as lowPriorityTickets,
        SUM(CASE WHEN assigned_to = ? THEN 1 ELSE 0 END) as assignedToMe,
        SUM(CASE WHEN created_by = ? THEN 1 ELSE 0 END) as createdByMe,
        SUM(CASE WHEN due_date IS NOT NULL AND due_date < datetime('now') AND status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END) as overdueTickets
      FROM tickets t
      WHERE 1=1 ${baseWhereClause}
    `
    
    const statsParams = [...baseParams, userId, userId]
    const statsResult = await query(statsQuery, statsParams)
    const stats = statsResult[0]

    // Get category breakdown
    const categoryQuery = `
      SELECT 
        category,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed
      FROM tickets t
      WHERE 1=1 ${baseWhereClause}
      GROUP BY category
      ORDER BY total DESC
    `
    const categoryStats = await query(categoryQuery, baseParams)

    // Get priority breakdown
    const priorityQuery = `
      SELECT 
        priority,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed
      FROM tickets t
      WHERE 1=1 ${baseWhereClause}
      GROUP BY priority
      ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END
    `
    const priorityStats = await query(priorityQuery, baseParams)

    // Get recent tickets (last 7 days)
    const recentQuery = `
      SELECT 
        t.id, t.title, t.status, t.priority, t.category, t.created_at, t.updated_at,
        t.created_by, t.assigned_to,
        u1.name as created_by_name,
        u2.name as assigned_to_name
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE 1=1 ${baseWhereClause}
      AND t.created_at >= datetime('now', '-7 days')
      ORDER BY t.created_at DESC
      LIMIT 10
    `
    const recentTickets = await query(recentQuery, baseParams)

    // Get overdue tickets
    const overdueQuery = `
      SELECT 
        t.id, t.title, t.status, t.priority, t.due_date, t.created_at,
        t.created_by, t.assigned_to,
        u1.name as created_by_name,
        u2.name as assigned_to_name
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE 1=1 ${baseWhereClause}
      AND t.due_date IS NOT NULL 
      AND t.due_date < datetime('now')
      AND t.status NOT IN ('resolved', 'closed')
      ORDER BY t.due_date ASC
      LIMIT 10
    `
    const overdueTickets = await query(overdueQuery, baseParams)

    // Get high priority tickets
    const highPriorityQuery = `
      SELECT 
        t.id, t.title, t.status, t.priority, t.category, t.created_at,
        t.created_by, t.assigned_to,
        u1.name as created_by_name,
        u2.name as assigned_to_name
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE 1=1 ${baseWhereClause}
      AND t.priority IN ('urgent', 'high')
      AND t.status NOT IN ('resolved', 'closed')
      ORDER BY 
        CASE t.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
        END,
        t.created_at DESC
      LIMIT 10
    `
    const highPriorityTickets = await query(highPriorityQuery, baseParams)

    // Role-specific data
    let roleSpecificData: any = {}

    if (userRole === 'channel_partner') {
      // Channel partners see their ticket creation trends
      const trendQuery = `
        SELECT 
          DATE(t.created_at) as date,
          COUNT(*) as count
        FROM tickets t
        WHERE t.created_by = ?
        AND t.created_at >= datetime('now', '-30 days')
        GROUP BY DATE(t.created_at)
        ORDER BY date DESC
        LIMIT 30
      `
      const trends = await query(trendQuery, [userId])
      roleSpecificData.ticketTrends = trends
    }

    if (userRole === 'assignee') {
      // Assignees see their workload and available tickets
      const workloadQuery = `
        SELECT 
          COUNT(*) as assignedTickets,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as activeTickets,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgentTickets,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as highPriorityTickets
        FROM tickets t
        WHERE t.assigned_to = ?
        AND t.status NOT IN ('resolved', 'closed')
      `
      const workload = await query(workloadQuery, [userId])

      const availableQuery = `
        SELECT 
          COUNT(*) as availableTickets,
          SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgentAvailable,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as highAvailable
        FROM tickets t
        WHERE t.status = 'open' AND t.assigned_to IS NULL
      `
      const available = await query(availableQuery, [])

      roleSpecificData.workload = workload[0]
      roleSpecificData.availableTickets = available[0]
    }

    if (userRole === 'head_office' || userRole === 'technical') {
      // Head office and technical see system-wide analytics
      const userStatsQuery = `
        SELECT 
          role,
          COUNT(*) as totalUsers,
          SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) as newUsers
        FROM users
        GROUP BY role
        ORDER BY totalUsers DESC
      `
      const userStats = await query(userStatsQuery, [])

      const performanceQuery = `
        SELECT 
          AVG(CASE 
            WHEN status IN ('resolved', 'closed') 
            THEN julianday(updated_at) - julianday(created_at)
            ELSE NULL 
          END) as avgResolutionDays,
          COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolvedCount
        FROM tickets t
        WHERE t.created_at >= datetime('now', '-30 days')
      `
      const performance = await query(performanceQuery, [])

      const topAssigneesQuery = `
        SELECT 
          u.id, u.name, u.email,
          COUNT(t.id) as assignedTickets,
          SUM(CASE WHEN t.status = 'resolved' THEN 1 ELSE 0 END) as resolvedTickets,
          SUM(CASE WHEN t.status = 'closed' THEN 1 ELSE 0 END) as closedTickets
        FROM users u
        LEFT JOIN tickets t ON u.id = t.assigned_to
        WHERE u.role IN ('assignee', 'technical')
        GROUP BY u.id, u.name, u.email
        ORDER BY assignedTickets DESC
        LIMIT 10
      `
      const topAssignees = await query(topAssigneesQuery, [])

      roleSpecificData.userStats = userStats
      roleSpecificData.performance = performance[0]
      roleSpecificData.topAssignees = topAssignees
    }

    // Format tickets for response
    const formatTickets = (tickets: any[]) => {
      return tickets.map(ticket => ({
        id: ticket.id.toString(),
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        createdAt: new Date(ticket.created_at),
        updatedAt: ticket.updated_at ? new Date(ticket.updated_at) : null,
        dueDate: ticket.due_date ? new Date(ticket.due_date) : null,
        createdBy: ticket.created_by.toString(),
        assignedTo: ticket.assigned_to ? ticket.assigned_to.toString() : null,
        createdByName: ticket.created_by_name,
        assignedToName: ticket.assigned_to_name
      }))
    }

    // Calculate average resolution time
    const avgResolutionTime = stats.resolvedTickets > 0 ? 2.5 : 0 // Mock calculation

    // Format dashboard stats
    const dashboardStats: DashboardStats = {
      totalTickets: stats.totalTickets,
      openTickets: stats.openTickets,
      inProgressTickets: stats.inProgressTickets,
      resolvedTickets: stats.resolvedTickets,
      avgResolutionTime: avgResolutionTime
    }

    return NextResponse.json({
      user: userInfo,
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
        mediumPriority: stats.mediumPriorityTickets,
        lowPriority: stats.lowPriorityTickets,
        assignedToMe: stats.assignedToMe,
        createdByMe: stats.createdByMe,
        overdue: stats.overdueTickets
      },
      categoryBreakdown: categoryStats.map(cat => ({
        category: cat.category,
        total: cat.total,
        open: cat.open,
        inProgress: cat.inProgress,
        resolved: cat.resolved,
        closed: cat.closed
      })),
      priorityBreakdown: priorityStats.map(pri => ({
        priority: pri.priority,
        total: pri.total,
        open: pri.open,
        inProgress: pri.inProgress,
        resolved: pri.resolved,
        closed: pri.closed
      })),
      recentTickets: formatTickets(recentTickets),
      overdueTickets: formatTickets(overdueTickets),
      highPriorityTickets: formatTickets(highPriorityTickets),
      roleSpecificData: roleSpecificData,
      userRole: userRole,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Get dashboard data error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
