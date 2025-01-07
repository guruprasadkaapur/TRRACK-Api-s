import express from 'express';
import User from '../models/userModel.js';
import License from '../models/licenseModel.js';
import RentalItem from '../models/rentalItemModel.js';
import adminAuth from '../middleware/adminAuthMiddleware.js';
import deviceAuth from '../middleware/deviceAuthMiddleware.js';

const router = express.Router();

// Middleware to check both device and admin authentication
const checkAdminAuth = [deviceAuth, adminAuth];

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

export default router;
