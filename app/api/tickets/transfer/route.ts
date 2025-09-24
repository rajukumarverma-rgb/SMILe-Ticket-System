import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query, run } from '@/lib/sqlite-database'
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

// Transfer/Assign ticket to a different assignee
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

    const { ticketId, assigneeId } = await request.json()

    if (!ticketId || !assigneeId) {
      return NextResponse.json(
        { error: 'Missing required fields: ticketId and assigneeId' },
        { status: 400 }
      )
    }

    const userId = decoded.id || decoded.userId
    const userRole = decoded.role

    // Get ticket details
    const tickets = await query(
      `SELECT * FROM tickets WHERE id = ?`,
      [ticketId]
    )

    if (tickets.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const ticket = tickets[0]

    // Check permissions based on role - All roles can transfer tickets with appropriate restrictions
    let canTransfer = false
    let transferReason = ''

    if (userRole === 'head_office' || userRole === 'technical') {
      // Head office and technical can transfer any ticket
      canTransfer = true
      transferReason = 'admin/technical user'
    } else if (userRole === 'assignee') {
      // Assignees can assign any ticket to other assignees or technical users
      canTransfer = true
      transferReason = 'assignee user'
    } else if (userRole === 'channel_partner') {
      // Channel partners can transfer tickets they created OR tickets assigned to them
      canTransfer = ticket.created_by === userId || ticket.assigned_to === userId
      transferReason = ticket.created_by === userId ? 'created ticket' : 'assigned ticket'
    }

    if (!canTransfer) {
      return NextResponse.json(
        { error: 'Access denied - Channel partners can only transfer tickets they created or are assigned to' },
        { status: 403 }
      )
    }

    // Verify the assignee exists and has appropriate role
    const assignees = await query(
      `SELECT id, name, role, department FROM users WHERE id = ? AND role IN ('assignee', 'technical', 'developer_support', 'head_office')`,
      [assigneeId]
    )

    if (assignees.length === 0) {
      return NextResponse.json(
        { error: 'Invalid assignee - User not found or does not have assignee/technical/developer_support/head_office role' },
        { status: 400 }
      )
    }

    const assignee = assignees[0]

    // Update the ticket
    await run(
      `UPDATE tickets 
       SET assigned_to = ?, 
           updated_at = CURRENT_TIMESTAMP,
           status = CASE 
             WHEN status = 'open' THEN 'in_progress'
             ELSE status 
           END
       WHERE id = ?`,
      [assigneeId, ticketId]
    )

    // Add a comment about the transfer
    const transferComment = `Ticket ${ticket.assigned_to ? 'transferred' : 'assigned'} to ${assignee.name} (${assignee.department}) by ${decoded.name || 'System'} (${transferReason}).`
    
    await run(
      `INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal, created_at)
       VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)`,
      [ticketId, userId, transferComment]
    )

    // Get updated ticket details
    const updatedTickets = await query(
      `SELECT * FROM tickets WHERE id = ?`,
      [ticketId]
    )

    const updatedTicket = updatedTickets[0]

    return NextResponse.json({
      success: true,
      message: `Ticket successfully ${ticket.assigned_to ? 'transferred' : 'assigned'} to ${assignee.name}`,
      ticket: {
        id: updatedTicket.id.toString(),
        title: updatedTicket.title,
        description: updatedTicket.description,
        category: updatedTicket.category,
        priority: updatedTicket.priority,
        status: updatedTicket.status,
        createdBy: updatedTicket.created_by,
        assignedTo: updatedTicket.assigned_to,
        createdAt: new Date(updatedTicket.created_at),
        updatedAt: new Date(updatedTicket.updated_at),
        dueDate: updatedTicket.due_date ? new Date(updatedTicket.due_date) : undefined,
        tags: updatedTicket.tags ? updatedTicket.tags.split(',') : [],
        comments: [] // Simplified for now
      },
      assignee: {
        id: assignee.id.toString(),
        name: assignee.name,
        role: assignee.role,
        department: assignee.department
      }
    })

  } catch (error) {
    console.error('Transfer ticket error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get transfer history for a ticket
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
    const ticketId = searchParams.get('ticketId')

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Missing ticketId parameter' },
        { status: 400 }
      )
    }

    const userId = decoded.id || decoded.userId
    const userRole = decoded.role

    // Check if user can view this ticket
    const tickets = await query(
      `SELECT * FROM tickets WHERE id = ?`,
      [ticketId]
    )

    if (tickets.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const ticket = tickets[0]
    let canView = false

    if (userRole === 'head_office' || userRole === 'technical') {
      canView = true
    } else if (userRole === 'assignee') {
      canView = ticket.assigned_to === userId || ticket.created_by === userId
    } else if (userRole === 'channel_partner') {
      canView = ticket.created_by === userId
    }

    if (!canView) {
      return NextResponse.json(
        { error: 'Access denied - You do not have permission to view this ticket' },
        { status: 403 }
      )
    }

    // Get transfer history (internal comments about transfers)
    const transferHistory = await query(
      `SELECT 
        tc.id,
        tc.user_id,
        tc.content,
        tc.created_at,
        u.name as user_name,
        u.role as user_role
      FROM ticket_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.ticket_id = ? AND tc.is_internal = 1
      ORDER BY tc.created_at DESC`,
      [ticketId]
    )

    const history = transferHistory.map((item: any) => ({
      id: item.id.toString(),
      userId: item.user_id,
      userName: item.user_name,
      userRole: item.user_role,
      content: item.content,
      createdAt: new Date(item.created_at)
    }))

    return NextResponse.json({
      success: true,
      transferHistory: history
    })

  } catch (error) {
    console.error('Get transfer history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
