import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query } from '@/lib/sqlite-database'
import type { UserRole } from '@/lib/types'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

async function verifyToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyToken(request)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = decoded.role as UserRole

    // Only head_office and technical can search users
    if (!['head_office', 'technical'].includes(userRole)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get search parameters from URL
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('q') || ''
    const role = searchParams.get('role') || ''
    const department = searchParams.get('department') || ''
    const location = searchParams.get('location') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Build base query
    let baseQuery = `
      SELECT u.*, 
             COUNT(t.id) as ticket_count,
             COUNT(CASE WHEN t.status IN ('open', 'in_progress', 'pending_approval') THEN 1 END) as active_tickets
      FROM users u
      LEFT JOIN tickets t ON u.id = t.assigned_to
      WHERE 1=1
    `
    const params: any[] = []

    // Add search filters
    if (searchTerm) {
      baseQuery += ` AND (
        u.name LIKE ? OR 
        u.email LIKE ? OR 
        u.department LIKE ? OR
        u.location LIKE ?
      )`
      const searchPattern = `%${searchTerm}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }

    if (role) {
      baseQuery += ` AND u.role = ?`
      params.push(role)
    }

    if (department) {
      baseQuery += ` AND u.department = ?`
      params.push(department)
    }

    if (location) {
      baseQuery += ` AND u.location = ?`
      params.push(location)
    }

    // Group by user to handle ticket counts
    baseQuery += ` GROUP BY u.id`

    // Add sorting
    const validSortFields = ['name', 'email', 'role', 'department', 'location', 'created_at', 'ticket_count']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name'
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'
    
    if (sortField === 'ticket_count') {
      baseQuery += ` ORDER BY ticket_count ${order}`
    } else {
      baseQuery += ` ORDER BY u.${sortField} ${order}`
    }

    // Add pagination
    baseQuery += ` LIMIT ? OFFSET ?`
    params.push(limit, offset)

    // Execute search query
    const users = await query(baseQuery, params)

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      WHERE 1=1
    `
    const countParams: any[] = []

    // Apply same search filters for count
    if (searchTerm) {
      countQuery += ` AND (
        u.name LIKE ? OR 
        u.email LIKE ? OR 
        u.department LIKE ? OR
        u.location LIKE ?
      )`
      const searchPattern = `%${searchTerm}%`
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }

    if (role) {
      countQuery += ` AND u.role = ?`
      countParams.push(role)
    }

    if (department) {
      countQuery += ` AND u.department = ?`
      countParams.push(department)
    }

    if (location) {
      countQuery += ` AND u.location = ?`
      countParams.push(location)
    }

    const countResult = await query(countQuery, countParams)
    const total = countResult[0]?.total || 0

    // Format response
    const formattedUsers = users.map((user: any) => ({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      location: user.location,
      createdAt: new Date(user.created_at),
      ticketCount: user.ticket_count || 0,
      activeTickets: user.active_tickets || 0,
    }))

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      filters: {
        searchTerm,
        role,
        department,
        location
      }
    })

  } catch (error) {
    console.error('Search users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
