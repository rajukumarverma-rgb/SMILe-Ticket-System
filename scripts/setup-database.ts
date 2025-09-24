import { testConnection, initializeDatabase } from '../lib/database'

async function setupDatabase() {
  console.log('🚀 Setting up database...')
  
  // Test connection
  const connected = await testConnection()
  if (!connected) {
    console.error('❌ Failed to connect to database. Please check your PostgreSQL connection.')
    process.exit(1)
  }

  // Initialize tables
  try {
    await initializeDatabase()
    console.log('✅ Database setup completed successfully!')
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
}

export { setupDatabase }
