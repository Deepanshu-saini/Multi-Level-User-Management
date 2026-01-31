/**
 * Script to check user hierarchy relationships
 * Run: node scripts/check-hierarchy.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkHierarchy() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/usermanagement');
    console.log('Connected to MongoDB\n');

    const users = await User.find({}).select('username email role createdBy').lean();
    
    console.log('User Hierarchy Relationships:');
    console.log('='.repeat(60));
    
    for (const user of users) {
      const createdBy = user.createdBy ? user.createdBy.toString() : 'null';
      let parentName = 'N/A';
      
      if (user.createdBy) {
        const parent = await User.findById(user.createdBy).select('username').lean();
        parentName = parent ? parent.username : 'Not Found';
      }
      
      console.log(`${user.username.padEnd(20)} (${user.role.padEnd(12)}) | Parent: ${parentName.padEnd(20)} | createdBy: ${createdBy}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\nHierarchy Tree:');
    
    // Find root users (no parent)
    const rootUsers = users.filter(u => !u.createdBy);
    
    for (const root of rootUsers) {
      await printTree(root._id.toString(), users, 0);
    }
    
    await mongoose.disconnect();
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

async function printTree(userId, allUsers, level) {
  const user = allUsers.find(u => u._id.toString() === userId);
  if (!user) return;
  
  const indent = '  '.repeat(level);
  console.log(`${indent}${user.username} (${user.role})`);
  
  const children = allUsers.filter(u => u.createdBy && u.createdBy.toString() === userId);
  for (const child of children) {
    await printTree(child._id.toString(), allUsers, level + 1);
  }
}

checkHierarchy();
