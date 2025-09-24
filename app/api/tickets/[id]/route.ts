import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query, run } from '@/lib/sqlite-database'
import type { Ticket, TicketStatus, TicketComment } from '@/lib/types'

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

// Get specific ticket by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const decoded = await verifyToken(request)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      )
    }

    const ticketId = params.id

    // Get ticket details
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
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const ticket = ticketResult[0]

    // Check permissions
    const userRole = decoded.role
    const userId = decoded.id || decoded.userId
    let canView = false

    if (userRole === 'head_office' || userRole === 'technical') {
      // Head office and technical can view any ticket
      canView = true
    } else if (userRole === 'channel_partner') {
      // Channel partners can only view tickets they created
      canView = ticket.created_by === userId
    } else if (userRole === 'assignee') {
      // Assignees can view tickets they created, assigned to them, or open tickets they can pick up
      canView = ticket.created_by === userId || 
                ticket.assigned_to === userId || 
                (ticket.status === 'open' && !ticket.assigned_to)
    } else if (userRole === 'developer_support') {
      // Developer support can view tickets they created, assigned to them, or open tickets they can pick up
      canView = ticket.created_by === userId || 
                ticket.assigned_to === userId || 
                (ticket.status === 'open' && !ticket.assigned_to)
    }

    if (!canView) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get comments for this ticket
    const commentsResult = await query(
      `SELECT 
        c.id, c.ticket_id, c.user_id, c.content, c.created_at, c.is_internal,
        u.name as user_name, u.email as user_email
      FROM ticket_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = ?
      ORDER BY c.created_at ASC`,
      [ticketId]
    )

    // Format comments
    const comments: TicketComment[] = commentsResult.map(comment => ({
      id: comment.id.toString(),
      ticketId: comment.ticket_id.toString(),
      userId: comment.user_id.toString(),
      content: comment.content,
      createdAt: new Date(comment.created_at),
      isInternal: Boolean(comment.is_internal)
    }))

    // Format ticket response
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
      comments: comments
    }

    return NextResponse.json({ ticket: ticketResponse })

  } catch (error) {
    console.error('Get ticket error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update ticket
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const decoded = await verifyToken(request)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      )
    }

    const ticketId = params.id
    const { title, description, category, priority, status, assignedTo, dueDate, tags } = await request.json()

    // Check if ticket exists
    const existingTicket = await query(
      'SELECT id, created_by, assigned_to FROM tickets WHERE id = ?',
      [ticketId]
    )

    if (existingTicket.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const ticket = existingTicket[0]

    // Check permissions
    const userRole = decoded.role
    const userId = decoded.id || decoded.userId
    const canEdit = 
      userRole === 'head_office' || 
      userRole === 'technical' ||
      ticket.created_by === userId ||
      ticket.assigned_to === userId

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Validate status if provided
    if (status) {
      const validStatuses: TicketStatus[] = ['open', 'in_progress', 'pending_approval', 'resolved', 'closed']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validate assignedTo if provided
    if (assignedTo) {
      const assigneeExists = await query(
        'SELECT id FROM users WHERE id = ? AND role IN (?, ?)',
        [assignedTo, 'assignee', 'technical']
      )
      if (assigneeExists.length === 0) {
        return NextResponse.json(
          { error: 'Invalid assignee. User must exist and have assignee or technical role' },
          { status: 400 }
        )
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

    // Build update query dynamically
    const updateFields = []
    const updateParams = []

    if (title !== undefined) {
      updateFields.push('title = ?')
      updateParams.push(title)
    }
    if (description !== undefined) {
      updateFields.push('description = ?')
      updateParams.push(description)
    }
    if (category !== undefined) {
      updateFields.push('category = ?')
      updateParams.push(category)
    }
    if (priority !== undefined) {
      updateFields.push('priority = ?')
      updateParams.push(priority)
    }
    if (status !== undefined) {
      updateFields.push('status = ?')
      updateParams.push(status)
    }
    if (assignedTo !== undefined) {
      updateFields.push('assigned_to = ?')
      updateParams.push(assignedTo)
    }
    if (dueDate !== undefined) {
      updateFields.push('due_date = ?')
      updateParams.push(parsedDueDate ? parsedDueDate.toISOString() : null)
    }
    if (tags !== undefined) {
      updateFields.push('tags = ?')
      updateParams.push(tagsString)
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP')
    updateParams.push(ticketId)

    await run(
      `UPDATE tickets SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    )

    // Get updated ticket
    const updatedTicketResult = await query(
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

    const updatedTicket = updatedTicketResult[0]

    // Format response
    const ticketResponse: Ticket = {
      id: updatedTicket.id.toString(),
      title: updatedTicket.title,
      description: updatedTicket.description,
      category: updatedTicket.category,
      priority: updatedTicket.priority,
      status: updatedTicket.status,
      createdBy: updatedTicket.created_by.toString(),
      assignedTo: updatedTicket.assigned_to ? updatedTicket.assigned_to.toString() : undefined,
      createdAt: new Date(updatedTicket.created_at),
      updatedAt: new Date(updatedTicket.updated_at),
      dueDate: updatedTicket.due_date ? new Date(updatedTicket.due_date) : undefined,
      tags: updatedTicket.tags ? updatedTicket.tags.split(',') : undefined,
      comments: [] // Will be populated separately if needed
    }

    return NextResponse.json({
      ticket: ticketResponse,
      message: 'Ticket updated successfully'
    })

  } catch (error) {
    console.error('Update ticket error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const decoded = await verifyToken(request)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing token' },
        { status: 401 }
      )
    }

    const ticketId = params.id

    // Check if ticket exists
    const existingTicket = await query(
      'SELECT id, created_by FROM tickets WHERE id = ?',
      [ticketId]
    )

    if (existingTicket.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const ticket = existingTicket[0]

    // Check permissions (only head_office and technical can delete)
    const userRole = decoded.role
    const canDelete = 
      userRole === 'head_office' || 
      userRole === 'technical'

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Access denied - Only head office and technical users can delete tickets' },
        { status: 403 }
      )
    }

    // Delete ticket (comments will be deleted automatically due to CASCADE)
    await run('DELETE FROM tickets WHERE id = ?', [ticketId])

    return NextResponse.json({
      message: 'Ticket deleted successfully'
    })

  } catch (error) {
    console.error('Delete ticket error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
