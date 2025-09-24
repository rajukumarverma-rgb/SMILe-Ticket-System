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

// Get all users (admin/head office only)
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

    // Check permissions
    if (decoded.role !== 'head_office' && decoded.role !== 'technical') {
      return NextResponse.json(
        { error: 'Access denied - Only head office and technical users can view all users' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const department = searchParams.get('department')
    const location = searchParams.get('location')

    // Build query
    let queryStr = `
      SELECT 
        u.id, u.email, u.name, u.role, u.department, u.location, 
        CASE WHEN u.is_active IS NULL THEN 1 ELSE u.is_active END as is_active,
        u.created_at,
        COUNT(t1.id) as ticketsCreated,
        COUNT(t2.id) as ticketsAssigned,
        SUM(CASE WHEN t2.status = 'resolved' THEN 1 ELSE 0 END) as ticketsResolved,
        SUM(CASE WHEN t2.status = 'closed' THEN 1 ELSE 0 END) as ticketsClosed
      FROM users u
      LEFT JOIN tickets t1 ON u.id = t1.created_by
      LEFT JOIN tickets t2 ON u.id = t2.assigned_to
      WHERE 1=1
    `
    const params: any[] = []

    // Apply filters
    if (role) {
      queryStr += ' AND u.role = ?'
      params.push(role)
    }
    if (department) {
      queryStr += ' AND u.department = ?'
      params.push(department)
    }
    if (location) {
      queryStr += ' AND u.location = ?'
      params.push(location)
    }

    queryStr += `
      GROUP BY u.id, u.email, u.name, u.role, u.department, u.location, u.is_active, u.created_at
      ORDER BY u.created_at DESC
    `

    const users = await query(queryStr, params)

    // Format users
    const formattedUsers: (User & {
      ticketsCreated: number
      ticketsAssigned: number
      ticketsResolved: number
      ticketsClosed: number
    })[] = users.map(user => ({
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      location: user.location,
      isActive: Boolean(user.is_active),
      createdAt: new Date(user.created_at),
      ticketsCreated: user.ticketsCreated,
      ticketsAssigned: user.ticketsAssigned,
      ticketsResolved: user.ticketsResolved,
      ticketsClosed: user.ticketsClosed
    }))

    // Get role statistics
    const roleStatsQuery = `
      SELECT 
        role,
        COUNT(*) as count,
        SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) as newThisMonth
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `
    const roleStats = await query(roleStatsQuery, [])

    // Get department statistics
    const departmentStatsQuery = `
      SELECT 
        department,
        COUNT(*) as count,
        COUNT(DISTINCT role) as roles
      FROM users
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY count DESC
    `
    const departmentStats = await query(departmentStatsQuery, [])

    // Get location statistics
    const locationStatsQuery = `
      SELECT 
        location,
        COUNT(*) as count,
        COUNT(DISTINCT role) as roles
      FROM users
      WHERE location IS NOT NULL
      GROUP BY location
      ORDER BY count DESC
    `
    const locationStats = await query(locationStatsQuery, [])

    return NextResponse.json({
      users: formattedUsers,
      count: formattedUsers.length,
      roleStats: roleStats.map(stat => ({
        role: stat.role,
        count: stat.count,
        newThisMonth: stat.newThisMonth
      })),
      departmentStats: departmentStats.map(stat => ({
        department: stat.department,
        count: stat.count,
        roles: stat.roles
      })),
      locationStats: locationStats.map(stat => ({
        location: stat.location,
        count: stat.count,
        roles: stat.roles
      })),
      filters: {
        role,
        department,
        location
      }
    })

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create new user (admin/head office only)
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

    // Check permissions
    if (decoded.role !== 'head_office' && decoded.role !== 'technical') {
      return NextResponse.json(
        { error: 'Access denied - Only head office and technical users can create users' },
        { status: 403 }
      )
    }

    const { email, password, name, role, department, location } = await request.json()

    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, name, role' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['channel_partner', 'assignee', 'head_office', 'technical', 'developer_support']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const bcrypt = require('bcryptjs')
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Create user
    const { run } = require('@/lib/sqlite-database')
    const result = await run(
      'INSERT INTO users (email, password_hash, name, role, department, location) VALUES (?, ?, ?, ?, ?, ?)',
      [email, passwordHash, name, role, department || null, location || null]
    )

    const userId = result.lastID

    // Get the created user
    const userResult = await query(
      'SELECT id, email, name, role, department, location, created_at FROM users WHERE id = ?',
      [userId]
    )

    const user = userResult[0]
    const userResponse: User = {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      location: user.location,
      createdAt: new Date(user.created_at)
    }

    return NextResponse.json({
      user: userResponse,
      message: 'User created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update user (admin/head office only)
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const decoded = await verifyToken(request)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin privileges
    if (decoded.role !== 'head_office') {
      return NextResponse.json(
        { error: 'Access denied. Head office role required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, name, email, role, department, location, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['channel_partner', 'assignee', 'head_office', 'technical', 'developer_support']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUsers = await query('SELECT id FROM users WHERE id = ?', [id])
    if (existingUsers.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if email is already taken by another user
    if (email) {
      const emailCheck = await query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id])
      if (emailCheck.length > 0) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        )
      }
    }

    // Build update query dynamically
    const updateFields = []
    const updateValues = []

    if (name !== undefined) {
      updateFields.push('name = ?')
      updateValues.push(name)
    }
    if (email !== undefined) {
      updateFields.push('email = ?')
      updateValues.push(email)
    }
    if (role !== undefined) {
      updateFields.push('role = ?')
      updateValues.push(role)
    }
    if (department !== undefined) {
      updateFields.push('department = ?')
      updateValues.push(department)
    }
    if (location !== undefined) {
      updateFields.push('location = ?')
      updateValues.push(location)
    }
    if (isActive !== undefined) {
      updateFields.push('is_active = ?')
      updateValues.push(isActive ? 1 : 0)
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP')
    updateValues.push(id)

    if (updateFields.length === 1) { // Only updated_at
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`
    await query(updateQuery, updateValues)

    // Get updated user
    const updatedUsers = await query(
      `SELECT id, email, name, role, department, location, 
              CASE WHEN is_active IS NULL THEN 1 ELSE is_active END as is_active,
              created_at, updated_at FROM users WHERE id = ?`,
      [id]
    )

    const updatedUser = updatedUsers[0]

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        department: updatedUser.department,
        location: updatedUser.location,
        isActive: Boolean(updatedUser.is_active),
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at
      }
    })

  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete user (admin/head office only)
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const decoded = await verifyToken(request)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin privileges
    if (decoded.role !== 'head_office') {
      return NextResponse.json(
        { error: 'Access denied. Head office role required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUsers = await query('SELECT id, name FROM users WHERE id = ?', [userId])
    if (existingUsers.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userToDelete = existingUsers[0]

    // Check if user has any tickets assigned to them
    const assignedTickets = await query('SELECT COUNT(*) as count FROM tickets WHERE assigned_to = ?', [userId])
    if (assignedTickets[0].count > 0) {
      return NextResponse.json(
        { error: `Cannot delete user. User has ${assignedTickets[0].count} tickets assigned to them. Please reassign or close these tickets first.` },
        { status: 400 }
      )
    }

    // Check if user has created any tickets
    const createdTickets = await query('SELECT COUNT(*) as count FROM tickets WHERE created_by = ?', [userId])
    if (createdTickets[0].count > 0) {
      return NextResponse.json(
        { error: `Cannot delete user. User has created ${createdTickets[0].count} tickets. Please reassign or close these tickets first.` },
        { status: 400 }
      )
    }

    // Delete user
    await query('DELETE FROM users WHERE id = ?', [userId])

    return NextResponse.json({
      message: `User ${userToDelete.name} deleted successfully`
    })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
