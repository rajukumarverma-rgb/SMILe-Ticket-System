import { pool } from '../lib/database'

async function updateRoleConstraint() {
  console.log('🔄 Updating role constraint to include audit_support...')
  
  try {
    const client = await pool.connect()
    
    try {
      // Drop the existing constraint
      await client.query(`
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check
      `)
      
      // Add the new constraint with audit_support
      await client.query(`
        ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('channel_partner', 'assignee', 'audit_support', 'head_office', 'technical'))
      `)
      
      console.log('✅ Role constraint updated successfully')
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Error updating role constraint:', error)
  }
}

// Run if this file is executed directly
if (require.main === module) {
  updateRoleConstraint()
}

export { updateRoleConstraint }
