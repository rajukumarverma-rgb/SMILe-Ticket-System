import { Pool } from 'pg'

// Database configuration for creating the database
const adminPool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: 'postgres', // Connect to default postgres database
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function createDatabase() {
  const client = await adminPool.connect()
  
  try {
    // Check if database exists
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [process.env.DB_NAME || 'ticket_system']
    )
    
    if (result.rows.length === 0) {
      // Create database
      await client.query(`CREATE DATABASE ${process.env.DB_NAME || 'ticket_system'}`)
      console.log('✅ Database created successfully')
    } else {
      console.log('✅ Database already exists')
    }
  } catch (error) {
    console.error('❌ Failed to create database:', error)
    throw error
  } finally {
    client.release()
  }
}

async function setupPostgreSQL() {
  console.log('🐘 Setting up PostgreSQL database...')
  
  try {
    await createDatabase()
    console.log('✅ PostgreSQL setup completed successfully!')
  } catch (error) {
    console.error('❌ PostgreSQL setup failed:', error)
    console.log('\n📋 Manual Setup Instructions:')
    console.log('1. Install PostgreSQL: https://www.postgresql.org/download/')
    console.log('2. Start PostgreSQL service')
    console.log('3. Create database manually:')
    console.log('   psql -U postgres')
    console.log('   CREATE DATABASE ticket_system;')
    console.log('   \\q')
    console.log('4. Set environment variables:')
    console.log('   DB_USER=postgres')
    console.log('   DB_PASSWORD=your_password')
    console.log('   DB_HOST=localhost')
    console.log('   DB_PORT=5432')
    console.log('   DB_NAME=ticket_system')
    process.exit(1)
  } finally {
    await adminPool.end()
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupPostgreSQL()
}

export { setupPostgreSQL }
