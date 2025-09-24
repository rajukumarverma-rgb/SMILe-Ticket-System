import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/sqlite-database'
import type { User } from '@/lib/types'

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

// Get assignee users (users who can be assigned tickets)
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

    // Check permissions - channel partners, head office, technical, and assignees can view assignees
    const userRole = decoded.role
    if (!['channel_partner', 'head_office', 'technical', 'assignee'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Access denied - Only channel partners, head office, technical, and assignee users can view assignees' },
        { status: 403 }
      )
    }

    // For channel partners: return role-based options instead of individual users
    if (userRole === 'channel_partner') {
      const roleOptions = [
        {
          id: 'technical',
          name: 'Technical Support',
          role: 'technical',
          department: 'Technical Support',
          isRoleBased: true
        },
        {
          id: 'assignee',
          name: 'Assignee',
          role: 'assignee',
          department: 'Support',
          isRoleBased: true
        }
      ]

      return NextResponse.json({
        assignees: roleOptions,
        count: roleOptions.length,
        isRoleBased: true
      })
    }

    // For other roles: return individual users
    const roleFilter = "('assignee', 'technical', 'developer_support')"

    const users = await query(
      `SELECT 
        u.id, u.email, u.name, u.role, u.department, u.location, u.created_at,
        COUNT(t.id) as assignedTickets,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as activeTickets
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assigned_to
      WHERE u.role IN ${roleFilter}
      GROUP BY u.id, u.email, u.name, u.role, u.department, u.location, u.created_at
      ORDER BY u.name ASC`
    )

    // Format users
    const assigneeUsers: (User & {
      assignedTickets: number
      activeTickets: number
    })[] = users.map(user => ({
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      location: user.location,
      createdAt: new Date(user.created_at),
      assignedTickets: user.assignedTickets,
      activeTickets: user.activeTickets
    }))

    return NextResponse.json({
      assignees: assigneeUsers,
      count: assigneeUsers.length,
      isRoleBased: false
    })

  } catch (error) {
    console.error('Get assignees error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
