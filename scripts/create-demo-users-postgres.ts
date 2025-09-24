import bcrypt from 'bcryptjs'
import { initializeDatabase, pool } from '../lib/database'

async function createDemoUsersPostgres() {
  console.log('🚀 Creating demo users in PostgreSQL...')
  
  try {
    // Initialize database
    await initializeDatabase()
    
    const client = await pool.connect()
    
    try {
      // Check if users already exist
      const existingUsers = await client.query('SELECT COUNT(*) as count FROM users')
      if (parseInt(existingUsers.rows[0].count) > 0) {
        console.log('✅ Users already exist, skipping creation')
        return
      }
      
      // Demo users data
      const demoUsers = [
        {
          email: 'partner@company.com',
          password: 'password',
          name: 'Channel Partner',
          role: 'channel_partner',
          department: 'Sales',
          location: 'New York'
        },
        {
          email: 'audit@company.com',
          password: 'password',
          name: 'Audit Support',
          role: 'audit_support',
          department: 'Audit',
          location: 'Chicago'
        },
        {
          email: 'admin@company.com',
          password: 'password',
          name: 'Head Office Admin',
          role: 'head_office',
          department: 'Management',
          location: 'San Francisco'
        },
        {
          email: 'tech@company.com',
          password: 'password',
          name: 'Technical Support',
          role: 'technical',
          department: 'IT',
          location: 'Seattle'
        }
      ]
      
      // Create users
      for (const userData of demoUsers) {
        const hashedPassword = await bcrypt.hash(userData.password, 12)
        
        await client.query(
          'INSERT INTO users (email, password_hash, name, role, department, location) VALUES ($1, $2, $3, $4, $5, $6)',
          [userData.email, hashedPassword, userData.name, userData.role, userData.department, userData.location]
        )
        
        console.log(`✅ Created user: ${userData.email} (${userData.role})`)
      }
      
      console.log('\n🎉 Demo users created successfully!')
      console.log('\n📋 Login Credentials:')
      console.log('Email: partner@company.com | Password: password (Channel Partner)')
      console.log('Email: audit@company.com | Password: password (Audit Support)')
      console.log('Email: admin@company.com | Password: password (Head Office)')
      console.log('Email: tech@company.com | Password: password (Technical)')
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Error creating demo users:', error)
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createDemoUsersPostgres()
}

export { createDemoUsersPostgres }
