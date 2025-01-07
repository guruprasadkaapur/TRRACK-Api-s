import User from '../models/userModel.js';

const adminAuth = async (req, res, next) => {
  try {
    // Check if user exists and is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get user details
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Add admin info to request
    req.admin = user;
    next();
  } catch (error) {
    res.status(500).json({ 
      message: 'Error checking admin permissions', 
      error: error.message 
    });
  }
};

export default adminAuth;
