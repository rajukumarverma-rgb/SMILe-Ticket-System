import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query, run } from '@/lib/sqlite-database'
import type { Ticket, TicketCategory, TicketPriority } from '@/lib/types'

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

// Create new ticket
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const decoded = await verifyToken(request)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      )
    }

    const { title, description, category, priority, assignedTo, dueDate, tags } = await request.json()

    // Validate required fields
    if (!title || !description || !category || !priority) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, category, priority' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories: TicketCategory[] = ['technical', 'billing', 'general', 'feature_request', 'bug_report']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate priority
    const validPriorities: TicketPriority[] = ['low', 'medium', 'high', 'urgent']
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate assignedTo if provided
    if (assignedTo) {
      const userRole = decoded.role
      
      // For channel partners: assignedTo can be a role name (technical, assignee)
      if (userRole === 'channel_partner') {
        if (!['technical', 'assignee'].includes(assignedTo)) {
          return NextResponse.json(
            { error: 'Invalid assignee role. Channel partners can only assign to technical or assignee roles' },
            { status: 400 }
          )
        }
        // For role-based assignment, we'll assign to null and let the system handle it
        // The actual assignment will be handled by the ticket assignment logic
      } else {
        // For other roles: assignedTo must be a valid user ID
        const assigneeExists = await query(
          'SELECT id FROM users WHERE id = ? AND role IN (?, ?, ?)',
          [assignedTo, 'assignee', 'technical', 'developer_support']
        )
        if (assigneeExists.length === 0) {
          return NextResponse.json(
            { error: 'Invalid assignee. User must exist and have assignee, technical, or developer_support role' },
            { status: 400 }
          )
        }
      }
    }

    // Parse due date if provided
    let parsedDueDate = null
    if (dueDate) {
      parsedDueDate = new Date(dueDate)
      if (isNaN(parsedDueDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid due date format' },
          { status: 400 }
        )
      }
    }

    // Parse tags if provided
    let tagsString = null
    if (tags && Array.isArray(tags)) {
      tagsString = tags.join(',')
    }

    // Handle role-based assignment for channel partners
    let finalAssignedTo = assignedTo
    if (decoded.role === 'channel_partner' && assignedTo && ['technical', 'assignee'].includes(assignedTo)) {
      // For channel partners, we store the role name in a special field and set assigned_to to null
      // The actual assignment will be handled by the system based on the role
      finalAssignedTo = null
    }

    // Create ticket
    const result = await run(
      `INSERT INTO tickets (title, description, category, priority, status, created_by, assigned_to, assigned_role, due_date, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        category,
        priority,
        'open', // Default status
        decoded.id || decoded.userId,
        finalAssignedTo,
        decoded.role === 'channel_partner' && assignedTo && ['technical', 'assignee'].includes(assignedTo) ? assignedTo : null,
        parsedDueDate ? parsedDueDate.toISOString() : null,
        tagsString
      ]
    )

    const ticketId = result.lastID

    // Get the created ticket with user details
    const ticketResult = await query(
      `SELECT 
        t.id, t.title, t.description, t.category, t.priority, t.status,
        t.created_by, t.assigned_to, t.created_at, t.updated_at, t.due_date, t.tags,
        u1.name as created_by_name, u1.email as created_by_email,
        u2.name as assigned_to_name, u2.email as assigned_to_email
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE t.id = ?`,
      [ticketId]
    )

    if (ticketResult.length === 0) {
      return NextResponse.json(
        { error: 'Failed to retrieve created ticket' },
        { status: 500 }
      )
    }

    const ticket = ticketResult[0]

    // Format response
    const ticketResponse: Ticket = {
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
    }

    return NextResponse.json({
      ticket: ticketResponse,
      message: 'Ticket created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Create ticket error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get all tickets (with optional filtering)
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
    const assignedTo = searchParams.get('assignedTo')
    const createdBy = searchParams.get('createdBy')

    // Build query based on user role and filters
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

    // Role-based filtering
    const userRole = decoded.role
    if (userRole === 'channel_partner') {
      queryStr += ' AND t.created_by = ?'
      params.push(decoded.id || decoded.userId)
    } else if (userRole === 'assignee') {
      queryStr += ' AND (t.assigned_to = ? OR t.status = ?)'
      params.push(decoded.userId, 'open')
    }
    // head_office and technical can see all tickets

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
    if (assignedTo) {
      queryStr += ' AND t.assigned_to = ?'
      params.push(assignedTo)
    }
    if (createdBy) {
      queryStr += ' AND t.created_by = ?'
      params.push(createdBy)
    }

    queryStr += ' ORDER BY t.created_at DESC'

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

    return NextResponse.json({
      tickets: formattedTickets,
      count: formattedTickets.length
    })

  } catch (error) {
    console.error('Get tickets error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
