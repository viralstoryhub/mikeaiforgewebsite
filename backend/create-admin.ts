import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'mike@mikesaiforge.com';
    const password = 'password';
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (existingUser) {
      // Update existing user to admin
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          role: 'ADMIN',
          subscriptionTier: 'PRO',
          emailVerified: true,
        },
      });
      console.log('✅ User updated to admin:', updatedUser.email);
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: 'Mike Admin',
          role: 'ADMIN',
          subscriptionTier: 'PRO',
          emailVerified: true,
        },
      });
      console.log('✅ Admin user created:', newUser.email);
    }
    
    console.log('\nAdmin credentials:');
    console.log('Email:', email);
    console.log('Password:', password);
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
