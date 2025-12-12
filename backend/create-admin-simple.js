/**
 * Create Admin User
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Creating admin user...');
    
    const hashedPassword = await bcrypt.hash('password', 12);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        name: 'Admin User',
        role: 'ADMIN',
        subscriptionTier: 'PRO',
        emailVerified: true,
      },
      create: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
        subscriptionTier: 'PRO',
        emailVerified: true,
      },
    });
    
    console.log('✅ Admin user created!');
    console.log('   Email: admin@example.com');
    console.log('   Password: password');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();