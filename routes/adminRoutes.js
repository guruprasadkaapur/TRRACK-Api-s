import express from 'express';
import User from '../models/userModel.js';
import License from '../models/licenseModel.js';
import RentalItem from '../models/rentalItemModel.js';
import Coordinator from '../models/coordinatorModel.js'; // Added import statement for Coordinator model
import adminAuth from '../middleware/adminAuthMiddleware.js';
import deviceAuth from '../middleware/deviceAuthMiddleware.js';
import bcrypt from 'bcryptjs';
import deviceTokenService from '../services/deviceTokenService.js';

const router = express.Router();

// Middleware to check both device and admin authentication
const checkAdminAuth = [deviceAuth, adminAuth];

// Register new admin
router.post('/register', async (req, res) => {
  try {
    const { fullName, phoneNumber, password } = req.body;

    // Validate required fields
    if (!fullName || !phoneNumber || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, phone number and password are required' 
      });
    }

    // Validate phone number
    if (!/^[0-9]{10}$/.test(phoneNumber)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid phone number format' 
      });
    }

    // Check if admin already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'Phone number already registered' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin user
    const admin = new User({
      fullName,
      phoneNumber,
      password: hashedPassword,
      role: 'admin',
      isPhoneVerified: true // Admins don't need phone verification
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      admin: {
        _id: admin._id,
        fullName: admin.fullName,
        phoneNumber: admin.phoneNumber,
        role: admin.role
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error registering admin', 
      error: error.message 
    });
  }
});

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, password, deviceInfo = {} } = req.body;

    // Validate input
    if (!phoneNumber || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number and password are required' 
      });
    }

    // Find admin user
    const admin = await User.findOne({ phoneNumber, role: 'admin' });
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate device token
    const deviceTokenResponse = await deviceTokenService.createDeviceToken(admin._id, deviceInfo);

    res.json({
      success: true,
      message: 'Login successful',
      admin: {
        _id: admin._id,
        fullName: admin.fullName,
        phoneNumber: admin.phoneNumber,
        role: admin.role
      },
      deviceToken: deviceTokenResponse.token
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error logging in', 
      error: error.message 
    });
  }
});

// Get all users
router.get('/users', checkAdminAuth, async (req, res) => {
  try {
    const users = await User.find({}, '-__v');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Get all licenses
router.get('/licenses', checkAdminAuth, async (req, res) => {
  try {
    const licenses = await License.find({})
      .populate('userId', 'fullName phoneNumber')
      .select('-__v');
    res.json(licenses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching licenses', error: error.message });
  }
});

// Manage user's license status
router.patch('/licenses/:licenseId/status', checkAdminAuth, async (req, res) => {
  try {
    const { licenseId } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'expired'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const license = await License.findById(licenseId);
    if (!license) {
      return res.status(404).json({ message: 'License not found' });
    }

    license.status = status;
    await license.save();

    res.json({
      message: 'License status updated successfully',
      license: {
        _id: license._id,
        status: license.status,
        userId: license.userId,
        type: license.type
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating license status', error: error.message });
  }
});

// Get all rental items
router.get('/rental-items', checkAdminAuth, async (req, res) => {
  try {
    const items = await RentalItem.find({})
      .populate('userId', 'fullName phoneNumber')
      .select('-__v');
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rental items', error: error.message });
  }
});

// Manage user's device mode
router.post('/users/:userId/device-mode', checkAdminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { singleDeviceMode } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.singleDeviceMode = singleDeviceMode;
    user.singleDeviceModeSetBy = req.admin._id;
    await user.save();

    res.json({
      message: 'User device mode updated successfully',
      user: {
        _id: user._id,
        singleDeviceMode: user.singleDeviceMode,
        updatedBy: req.admin._id
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user device mode', error: error.message });
  }
});

// Make a user admin
router.post('/users/:userId/make-admin', checkAdminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'User is already an admin' });
    }

    user.role = 'admin';
    await user.save();

    res.json({
      message: 'User promoted to admin successfully',
      user: {
        _id: user._id,
        role: user.role,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error making user admin', error: error.message });
  }
});

// Update all coordinators
router.post('/update-coordinators', checkAdminAuth, async (req, res) => {
  try {
    const { updateQuery } = req.body;
    
    const result = await Coordinator.updateMany(
      { status: 'active' },
      { $set: updateQuery }
    );

    res.json({
      message: 'Coordinators updated successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating coordinators', 
      error: error.message 
    });
  }
});

// Update coordinator permissions
router.patch('/update-coordinator-permissions', checkAdminAuth, async (req, res) => {
  try {
    const result = await Coordinator.updateMany(
      { status: 'active' },
      { 
        $set: { 
          permissions: ['approve_licenses', 'view_rental_items']
        }
      }
    );

    res.json({
      message: 'Coordinator permissions updated successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating coordinator permissions', 
      error: error.message 
    });
  }
});

export default router;
