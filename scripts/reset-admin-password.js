const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const readline = require('readline');

const ALLOWED_ADMIN_EMAIL = 'akiliaggroup@gmail.com';

async function resetAdminPassword() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  const args = process.argv.slice(2);
  
  if (args.length === 1 && args[0].length >= 8) {
    try {
      const newPassword = args[0];
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      const userResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [ALLOWED_ADMIN_EMAIL.toLowerCase()]
      );
      
      if (userResult.rows.length > 0) {
        await pool.query(
          'UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2',
          [hashedPassword, ALLOWED_ADMIN_EMAIL.toLowerCase()]
        );
        console.log('✅ Admin password updated successfully!');
      } else {
        await pool.query(
          `INSERT INTO users (email, password, role, account_status, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [ALLOWED_ADMIN_EMAIL.toLowerCase(), hashedPassword, 'super_admin', 'active']
        );
        console.log('✅ Admin account created successfully!');
      }
      
      console.log(`\nLogin at /admin/whitelist with:`);
      console.log(`  Email: ${ALLOWED_ADMIN_EMAIL}`);
      console.log('  Password: [the password you just set]');
      
      await pool.end();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error.message);
      await pool.end();
      process.exit(1);
    }
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  try {
    console.log('\n========================================');
    console.log('   AXIOM Admin Password Reset Tool');
    console.log('========================================\n');

    const userResult = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [ALLOWED_ADMIN_EMAIL.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      console.log('Admin account not found. Creating new admin account...');
    } else {
      console.log(`Found admin account: ${userResult.rows[0].email} (${userResult.rows[0].role})`);
    }

    const newPassword = await question('\nEnter new password (min 8 characters): ');
    
    if (newPassword.length < 8) {
      console.error('\nError: Password must be at least 8 characters long.');
      rl.close();
      await pool.end();
      process.exit(1);
    }

    const confirmPassword = await question('Confirm new password: ');
    
    if (newPassword !== confirmPassword) {
      console.error('\nError: Passwords do not match.');
      rl.close();
      await pool.end();
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    if (userResult.rows.length > 0) {
      await pool.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2',
        [hashedPassword, ALLOWED_ADMIN_EMAIL.toLowerCase()]
      );
      console.log('\n✅ Admin password updated successfully!');
    } else {
      await pool.query(
        `INSERT INTO users (email, password, role, account_status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [ALLOWED_ADMIN_EMAIL.toLowerCase(), hashedPassword, 'super_admin', 'active']
      );
      console.log('\n✅ Admin account created successfully!');
    }

    console.log('\nYou can now login at /admin/whitelist with:');
    console.log(`  Email: ${ALLOWED_ADMIN_EMAIL}`);
    console.log('  Password: [your new password]\n');

    rl.close();
    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\nError resetting password:', error.message);
    rl.close();
    await pool.end();
    process.exit(1);
  }
}

resetAdminPassword();
