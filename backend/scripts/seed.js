const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/user-management');
    console.log('Connected to MongoDB');

    // Clear existing users (optional - comment out if you want to keep existing data)
    // await User.deleteMany({});
    // console.log('Cleared existing users');

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      console.log('Super admin already exists:', existingSuperAdmin.email);
    } else {
      // Create super admin user
      const superAdmin = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: 'Admin123!',
        role: 'super_admin',
        balance: 1000,
        isActive: true
      });

      await superAdmin.save();
      console.log('Super admin created:', superAdmin.email);
    }

    // Create sample users if they don't exist
    const sampleUsers = [
      {
        username: 'john_admin',
        email: 'john@example.com',
        password: 'Admin123!',
        role: 'admin',
        balance: 500
      },
      {
        username: 'jane_moderator',
        email: 'jane@example.com',
        password: 'Moderator123!',
        role: 'moderator',
        balance: 250
      },
      {
        username: 'bob_user',
        email: 'bob@example.com',
        password: 'User123!',
        role: 'user',
        balance: 100
      }
    ];

    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`Created user: ${user.email} (${user.role})`);
      } else {
        console.log(`User already exists: ${userData.email}`);
      }
    }

    console.log('Database seeding completed successfully!');
    
    // Display login credentials
    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Super Admin:');
    console.log('  Email: admin@example.com');
    console.log('  Password: Admin123!');
    console.log('\nAdmin:');
    console.log('  Email: john@example.com');
    console.log('  Password: Admin123!');
    console.log('\nModerator:');
    console.log('  Email: jane@example.com');
    console.log('  Password: Moderator123!');
    console.log('\nUser:');
    console.log('  Email: bob@example.com');
    console.log('  Password: User123!');
    console.log('========================\n');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the seed function
seedDatabase();