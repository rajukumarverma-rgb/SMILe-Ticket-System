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

    // Get search parameters from URL
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('q') || ''
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''
    const category = searchParams.get('category') || ''
    const assignedTo = searchParams.get('assignedTo') || ''
    const createdBy = searchParams.get('createdBy') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const tags = searchParams.get('tags') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

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
    // head_office and technical can see all tickets

    // Add search filters
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

    if (status) {
      baseQuery += ` AND t.status = ?`
      params.push(status)
    }

    if (priority) {
      baseQuery += ` AND t.priority = ?`
      params.push(priority)
    }

    if (category) {
      baseQuery += ` AND t.category = ?`
      params.push(category)
    }

    if (assignedTo) {
      baseQuery += ` AND t.assigned_to = ?`
      params.push(assignedTo)
    }

    if (createdBy) {
      baseQuery += ` AND t.created_by = ?`
      params.push(createdBy)
    }

    if (dateFrom) {
      baseQuery += ` AND DATE(t.created_at) >= ?`
      params.push(dateFrom)
    }

    if (dateTo) {
      baseQuery += ` AND DATE(t.created_at) <= ?`
      params.push(dateTo)
    }

    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      if (tagList.length > 0) {
        const tagConditions = tagList.map(() => 't.tags LIKE ?').join(' OR ')
        baseQuery += ` AND (${tagConditions})`
        tagList.forEach(tag => params.push(`%${tag}%`))
      }
    }

    // Add sorting
    const validSortFields = ['created_at', 'updated_at', 'title', 'priority', 'status']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'
    baseQuery += ` ORDER BY t.${sortField} ${order}`

    // Add pagination
    baseQuery += ` LIMIT ? OFFSET ?`
    params.push(limit, offset)

    // Execute search query
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

    // Apply same search filters for count
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

    if (status) {
      countQuery += ` AND t.status = ?`
      countParams.push(status)
    }

    if (priority) {
      countQuery += ` AND t.priority = ?`
      countParams.push(priority)
    }

    if (category) {
      countQuery += ` AND t.category = ?`
      countParams.push(category)
    }

    if (assignedTo) {
      countQuery += ` AND t.assigned_to = ?`
      countParams.push(assignedTo)
    }

    if (createdBy) {
      countQuery += ` AND t.created_by = ?`
      countParams.push(createdBy)
    }

    if (dateFrom) {
      countQuery += ` AND DATE(t.created_at) >= ?`
      countParams.push(dateFrom)
    }

    if (dateTo) {
      countQuery += ` AND DATE(t.created_at) <= ?`
      countParams.push(dateTo)
    }

    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      if (tagList.length > 0) {
        const tagConditions = tagList.map(() => 't.tags LIKE ?').join(' OR ')
        countQuery += ` AND (${tagConditions})`
        tagList.forEach(tag => countParams.push(`%${tag}%`))
      }
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
      filters: {
        searchTerm,
        status,
        priority,
        category,
        assignedTo,
        createdBy,
        dateFrom,
        dateTo,
        tags
      }
    })

  } catch (error) {
    console.error('Search tickets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
