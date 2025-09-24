import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

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

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyToken(request)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For JWT-based authentication, logout is typically handled on the client side
    // by removing the token from localStorage. However, we can provide a server-side
    // logout endpoint for additional security measures if needed.

    // In a production environment, you might want to:
    // 1. Add the token to a blacklist (Redis/database)
    // 2. Log the logout event for audit purposes
    // 3. Send a confirmation response

    // For now, we'll just return a success response
    // The client should remove the token from localStorage

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Optional: Handle GET requests for logout (redirect-based logout)
export async function GET(request: NextRequest) {
  try {
    // For web-based logout (redirect after logout)
    return NextResponse.json({
      success: true,
      message: 'Logout endpoint available',
      method: 'Use POST method for logout'
    })
  } catch (error) {
    console.error('Logout GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
