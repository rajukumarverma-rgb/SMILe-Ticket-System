import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { query, run } from '@/lib/sqlite-database'
import type { TicketComment } from '@/lib/types'

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

// Add comment to ticket
export async function POST(
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
    const { content, isInternal = false } = await request.json()

    // Validate required fields
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      )
    }

    // Check if ticket exists
    const ticketExists = await query(
      'SELECT id, created_by, assigned_to FROM tickets WHERE id = ?',
      [ticketId]
    )

    if (ticketExists.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const ticket = ticketExists[0]

    // Check permissions
    const userRole = decoded.role
    const canComment = 
      userRole === 'head_office' || 
      userRole === 'technical' ||
      ticket.created_by === decoded.userId ||
      ticket.assigned_to === decoded.userId

    if (!canComment) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Create comment
    const result = await run(
      'INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal) VALUES (?, ?, ?, ?)',
      [ticketId, decoded.userId, content.trim(), isInternal ? 1 : 0]
    )

    const commentId = result.lastID

    // Update ticket's updated_at timestamp
    await run(
      'UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [ticketId]
    )

    // Get the created comment with user details
    const commentResult = await query(
      `SELECT 
        c.id, c.ticket_id, c.user_id, c.content, c.created_at, c.is_internal,
        u.name as user_name, u.email as user_email
      FROM ticket_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?`,
      [commentId]
    )

    if (commentResult.length === 0) {
      return NextResponse.json(
        { error: 'Failed to retrieve created comment' },
        { status: 500 }
      )
    }

    const comment = commentResult[0]

    // Format response
    const commentResponse: TicketComment = {
      id: comment.id.toString(),
      ticketId: comment.ticket_id.toString(),
      userId: comment.user_id.toString(),
      content: comment.content,
      createdAt: new Date(comment.created_at),
      isInternal: Boolean(comment.is_internal)
    }

    return NextResponse.json({
      comment: commentResponse,
      message: 'Comment added successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Add comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get all comments for a ticket
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

    // Check if ticket exists
    const ticketExists = await query(
      'SELECT id, created_by, assigned_to FROM tickets WHERE id = ?',
      [ticketId]
    )

    if (ticketExists.length === 0) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const ticket = ticketExists[0]

    // Check permissions
    const userRole = decoded.role
    const canView = 
      userRole === 'head_office' || 
      userRole === 'technical' ||
      ticket.created_by === decoded.userId ||
      ticket.assigned_to === decoded.userId

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

    return NextResponse.json({
      comments: comments,
      count: comments.length
    })

  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
