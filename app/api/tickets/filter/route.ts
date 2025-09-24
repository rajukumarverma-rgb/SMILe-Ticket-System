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
    const userId = decoded.id || decoded.userId

    // Get filter parameters from URL
    const { searchParams } = new URL(request.url)
    const filters = searchParams.get('filters')
    
    let filterParams: any = {}
    if (filters) {
      try {
        filterParams = JSON.parse(filters)
      } catch (error) {
        return NextResponse.json({ error: 'Invalid filters format' }, { status: 400 })
      }
    }

    // Extract filter values
    const {
      status = [],
      priority = [],
      category = [],
      assignedTo = [],
      createdBy = [],
      dateRange = {},
      tags = [],
      searchTerm = '',
      sortBy = 'created_at',
      sortOrder = 'desc',
      limit = 50,
      offset = 0
    } = filterParams

    // Build base query with role-based filtering
    let baseQuery = `
      SELECT t.*, 
             u1.name as created_by_name, u1.email as created_by_email,
             u2.name as assigned_to_name, u2.email as assigned_to_email
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE 1=1
    `
    const params: any[] = []

    // Role-based access control
    if (userRole === 'channel_partner') {
      baseQuery += ` AND t.created_by = ?`
      params.push(userId)
    } else if (userRole === 'assignee') {
      baseQuery += ` AND (t.assigned_to = ? OR t.created_by = ?)`
      params.push(userId, userId)
    }

    // Apply filters
    if (searchTerm) {
      baseQuery += ` AND (
        t.title LIKE ? OR 
        t.description LIKE ? OR 
        t.category LIKE ? OR
        u1.name LIKE ? OR
        u2.name LIKE ?
      )`
      const searchPattern = `%${searchTerm}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
    }

    if (status.length > 0) {
      const statusPlaceholders = status.map(() => '?').join(',')
      baseQuery += ` AND t.status IN (${statusPlaceholders})`
      status.forEach(s => params.push(s))
    }

    if (priority.length > 0) {
      const priorityPlaceholders = priority.map(() => '?').join(',')
      baseQuery += ` AND t.priority IN (${priorityPlaceholders})`
      priority.forEach(p => params.push(p))
    }

    if (category.length > 0) {
      const categoryPlaceholders = category.map(() => '?').join(',')
      baseQuery += ` AND t.category IN (${categoryPlaceholders})`
      category.forEach(c => params.push(c))
    }

    if (assignedTo.length > 0) {
      const assignedPlaceholders = assignedTo.map(() => '?').join(',')
      baseQuery += ` AND t.assigned_to IN (${assignedPlaceholders})`
      assignedTo.forEach(a => params.push(a))
    }

    if (createdBy.length > 0) {
      const createdPlaceholders = createdBy.map(() => '?').join(',')
      baseQuery += ` AND t.created_by IN (${createdPlaceholders})`
      createdBy.forEach(c => params.push(c))
    }

    if (dateRange.from) {
      baseQuery += ` AND DATE(t.created_at) >= ?`
      params.push(dateRange.from)
    }

    if (dateRange.to) {
      baseQuery += ` AND DATE(t.created_at) <= ?`
      params.push(dateRange.to)
    }

    if (tags.length > 0) {
      const tagConditions = tags.map(() => 't.tags LIKE ?').join(' OR ')
      baseQuery += ` AND (${tagConditions})`
      tags.forEach(tag => params.push(`%${tag}%`))
    }

    // Add sorting
    const validSortFields = ['created_at', 'updated_at', 'title', 'priority', 'status']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'
    baseQuery += ` ORDER BY t.${sortField} ${order}`

    // Add pagination
    baseQuery += ` LIMIT ? OFFSET ?`
    params.push(limit, offset)

    // Execute filter query
    const tickets = await query(baseQuery, params)

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE 1=1
    `
    const countParams: any[] = []

    // Apply same role-based filtering for count
    if (userRole === 'channel_partner') {
      countQuery += ` AND t.created_by = ?`
      countParams.push(userId)
    } else if (userRole === 'assignee') {
      countQuery += ` AND (t.assigned_to = ? OR t.created_by = ?)`
      countParams.push(userId, userId)
    }

    // Apply same filters for count
    if (searchTerm) {
      countQuery += ` AND (
        t.title LIKE ? OR 
        t.description LIKE ? OR 
        t.category LIKE ? OR
        u1.name LIKE ? OR
        u2.name LIKE ?
      )`
      const searchPattern = `%${searchTerm}%`
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
    }

    if (status.length > 0) {
      const statusPlaceholders = status.map(() => '?').join(',')
      countQuery += ` AND t.status IN (${statusPlaceholders})`
      status.forEach(s => countParams.push(s))
    }

    if (priority.length > 0) {
      const priorityPlaceholders = priority.map(() => '?').join(',')
      countQuery += ` AND t.priority IN (${priorityPlaceholders})`
      priority.forEach(p => countParams.push(p))
    }

    if (category.length > 0) {
      const categoryPlaceholders = category.map(() => '?').join(',')
      countQuery += ` AND t.category IN (${categoryPlaceholders})`
      category.forEach(c => countParams.push(c))
    }

    if (assignedTo.length > 0) {
      const assignedPlaceholders = assignedTo.map(() => '?').join(',')
      countQuery += ` AND t.assigned_to IN (${assignedPlaceholders})`
      assignedTo.forEach(a => countParams.push(a))
    }

    if (createdBy.length > 0) {
      const createdPlaceholders = createdBy.map(() => '?').join(',')
      countQuery += ` AND t.created_by IN (${createdPlaceholders})`
      createdBy.forEach(c => countParams.push(c))
    }

    if (dateRange.from) {
      countQuery += ` AND DATE(t.created_at) >= ?`
      countParams.push(dateRange.from)
    }

    if (dateRange.to) {
      countQuery += ` AND DATE(t.created_at) <= ?`
      countParams.push(dateRange.to)
    }

    if (tags.length > 0) {
      const tagConditions = tags.map(() => 't.tags LIKE ?').join(' OR ')
      countQuery += ` AND (${tagConditions})`
      tags.forEach(tag => countParams.push(`%${tag}%`))
    }

    const countResult = await query(countQuery, countParams)
    const total = countResult[0]?.total || 0

    // Format response
    const formattedTickets = tickets.map((ticket: any) => ({
      id: ticket.id.toString(),
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      createdBy: ticket.created_by,
      assignedTo: ticket.assigned_to,
      createdAt: new Date(ticket.created_at),
      updatedAt: new Date(ticket.updated_at),
      dueDate: ticket.due_date ? new Date(ticket.due_date) : undefined,
      tags: ticket.tags ? ticket.tags.split(',') : [],
      createdByName: ticket.created_by_name,
      createdByEmail: ticket.created_by_email,
      assignedToName: ticket.assigned_to_name,
      assignedToEmail: ticket.assigned_to_email,
    }))

    return NextResponse.json({
      success: true,
      tickets: formattedTickets,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      appliedFilters: filterParams
    })

  } catch (error) {
    console.error('Filter tickets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get available filter options
export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyToken(request)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = decoded.role as UserRole
    const userId = decoded.id || decoded.userId

    // Build role-based query for filter options
    let baseQuery = `FROM tickets t WHERE 1=1`
    const params: any[] = []

    if (userRole === 'channel_partner') {
      baseQuery += ` AND t.created_by = ?`
      params.push(userId)
    } else if (userRole === 'assignee') {
      baseQuery += ` AND (t.assigned_to = ? OR t.created_by = ?)`
      params.push(userId, userId)
    }

    // Get unique values for each filter
    const statuses = await query(`SELECT DISTINCT status ${baseQuery}`, params)
    const priorities = await query(`SELECT DISTINCT priority ${baseQuery}`, params)
    const categories = await query(`SELECT DISTINCT category ${baseQuery}`, params)
    
    // Get assignees (users who have been assigned tickets)
    let assigneeQuery = `
      SELECT DISTINCT u.id, u.name, u.email, u.role, u.department
      FROM users u
      INNER JOIN tickets t ON u.id = t.assigned_to
    `
    let assigneeParams: any[] = []
    
    if (userRole === 'channel_partner') {
      assigneeQuery += ' WHERE t.created_by = ?'
      assigneeParams.push(userId)
    } else if (userRole === 'assignee') {
      assigneeQuery += ' WHERE (t.assigned_to = ? OR t.created_by = ?)'
      assigneeParams.push(userId, userId)
    }
    
    const assignees = await query(assigneeQuery, assigneeParams)

    // Get creators (users who have created tickets)
    let creatorQuery = `
      SELECT DISTINCT u.id, u.name, u.email, u.role, u.department
      FROM users u
      INNER JOIN tickets t ON u.id = t.created_by
    `
    let creatorParams: any[] = []
    
    if (userRole === 'channel_partner') {
      creatorQuery += ' WHERE t.created_by = ?'
      creatorParams.push(userId)
    } else if (userRole === 'assignee') {
      creatorQuery += ' WHERE (t.assigned_to = ? OR t.created_by = ?)'
      creatorParams.push(userId, userId)
    }
    
    const creators = await query(creatorQuery, creatorParams)

    // Get all unique tags
    const tagResults = await query(`SELECT DISTINCT tags ${baseQuery} AND tags IS NOT NULL AND tags != ''`, params)
    const allTags = new Set<string>()
    tagResults.forEach((row: any) => {
      if (row.tags) {
        row.tags.split(',').forEach((tag: string) => {
          allTags.add(tag.trim())
        })
      }
    })

    return NextResponse.json({
      success: true,
      filterOptions: {
        statuses: statuses.map((s: any) => s.status).filter(Boolean),
        priorities: priorities.map((p: any) => p.priority).filter(Boolean),
        categories: categories.map((c: any) => c.category).filter(Boolean),
        assignees: assignees.map((a: any) => ({
          id: a.id.toString(),
          name: a.name,
          email: a.email,
          role: a.role,
          department: a.department
        })),
        creators: creators.map((c: any) => ({
          id: c.id.toString(),
          name: c.name,
          email: c.email,
          role: c.role,
          department: c.department
        })),
        tags: Array.from(allTags).sort()
      }
    })

  } catch (error) {
    console.error('Get filter options error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
