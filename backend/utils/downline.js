const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Get all users in the downline of a given user (recursive)
 * @param {String|ObjectId} userId - The user ID to get downline for
 * @param {Boolean} includeSelf - Whether to include the user itself in results
 * @returns {Promise<Array>} Array of user documents
 */
async function getDownline(userId, includeSelf = false) {
  try {
    const userObjectId = userId instanceof mongoose.Types.ObjectId 
      ? userId 
      : new mongoose.Types.ObjectId(userId.toString());
    
    // Get direct children
    const directChildren = await User.find({ createdBy: userObjectId })
      .select('-password')
      .lean();
    
    let allDownline = includeSelf ? [await User.findById(userObjectId).select('-password').lean()] : [];
    allDownline = allDownline.concat(directChildren);
    
    // Recursively get all descendants
    for (const child of directChildren) {
      const grandchildren = await getDownline(child._id, false);
      allDownline = allDownline.concat(grandchildren);
    }
    
    return allDownline;
  } catch (error) {
    console.error('Error getting downline:', error);
    throw error;
  }
}

/**
 * Get downline as a hierarchical tree structure
 * @param {String|ObjectId} userId - The user ID to get tree for
 * @returns {Promise<Object>} Tree structure with user and children
 */
async function getDownlineTree(userId) {
  try {
    const userObjectId = userId instanceof mongoose.Types.ObjectId 
      ? userId 
      : new mongoose.Types.ObjectId(userId.toString());
    
    const user = await User.findById(userObjectId).select('-password');
    if (!user) {
      return null;
    }
    
    const children = await User.find({ createdBy: userObjectId })
      .select('-password')
      .sort({ username: 1 });
    
    const userObj = user.toObject ? user.toObject() : user;
    const tree = {
      user: {
        id: userObj._id ? String(userObj._id) : String(userObj.id || ''),
        username: userObj.username,
        email: userObj.email,
        role: userObj.role,
        balance: userObj.balance,
        isActive: userObj.isActive,
        createdAt: userObj.createdAt
      },
      children: []
    };
    
    // Recursively build tree for each child
    for (const child of children) {
      const childTree = await getDownlineTree(child._id);
      if (childTree) {
        tree.children.push(childTree);
      }
    }
    
    return tree;
  } catch (error) {
    console.error('Error getting downline tree:', error);
    throw error;
  }
}

/**
 * Check if a child user is in the downline of a parent user
 * @param {String|ObjectId} parentId - The parent user ID
 * @param {String|ObjectId} childId - The child user ID to check
 * @returns {Promise<Boolean>} True if child is in parent's downline
 */
async function isInDownline(parentId, childId) {
  try {
    const parentObjectId = parentId instanceof mongoose.Types.ObjectId 
      ? parentId 
      : new mongoose.Types.ObjectId(parentId.toString());
    
    const childObjectId = childId instanceof mongoose.Types.ObjectId 
      ? childId 
      : new mongoose.Types.ObjectId(childId.toString());
    
    // If same user, return false (not in downline)
    if (parentObjectId.toString() === childObjectId.toString()) {
      return false;
    }
    
    // Get the child user
    const childUser = await User.findById(childObjectId);
    if (!childUser || !childUser.createdBy) {
      return false;
    }
    
    // Check if child's creator is the parent or in parent's downline
    if (childUser.createdBy.toString() === parentObjectId.toString()) {
      return true;
    }
    
    // Recursively check if child's creator is in parent's downline
    return await isInDownline(parentObjectId, childUser.createdBy);
  } catch (error) {
    console.error('Error checking downline:', error);
    return false;
  }
}

/**
 * Get immediate children (next level only) of a user
 * @param {String|ObjectId} userId - The user ID
 * @returns {Promise<Array>} Array of direct children
 */
async function getNextLevelUsers(userId) {
  try {
    const userObjectId = userId instanceof mongoose.Types.ObjectId 
      ? userId 
      : new mongoose.Types.ObjectId(userId.toString());
    
    const children = await User.find({ createdBy: userObjectId })
      .select('-password')
      .sort({ username: 1 });
    
    return children;
  } catch (error) {
    console.error('Error getting next level users:', error);
    throw error;
  }
}

/**
 * Get the immediate parent of a user
 * @param {String|ObjectId} userId - The user ID
 * @returns {Promise<Object|null>} Parent user or null
 */
async function getParent(userId) {
  try {
    const userObjectId = userId instanceof mongoose.Types.ObjectId 
      ? userId 
      : new mongoose.Types.ObjectId(userId.toString());
    
    const user = await User.findById(userObjectId);
    if (!user || !user.createdBy) {
      return null;
    }
    
    const parent = await User.findById(user.createdBy).select('-password');
    return parent;
  } catch (error) {
    console.error('Error getting parent:', error);
    return null;
  }
}

module.exports = {
  getDownline,
  getDownlineTree,
  isInDownline,
  getNextLevelUsers,
  getParent
};
