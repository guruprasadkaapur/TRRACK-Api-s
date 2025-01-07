import express from 'express';
import License from '../models/licenseModel.js';
import User from '../models/userModel.js';
import RentalItem from '../models/rentalItemModel.js';
import deviceAuth from '../middleware/deviceAuthMiddleware.js';
import Coordinator from '../models/coordinatorModel.js';

const router = express.Router();

// License plan configurations
const LICENSE_PLANS = {
  Basic: {
    price: 999,
    duration: 30, // days
    features: ['Basic Rental Management', 'Email Support'],
    limits: {
      maxItems: 10,
      maxImagesPerItem: 3,
      maxActiveRentals: 5
    }
  },
  Premium: {
    price: 2999,
    duration: 30,
    features: ['Advanced Rental Management', 'Priority Email Support', 'Analytics Dashboard'],
    limits: {
      maxItems: 50,
      maxImagesPerItem: 5,
      maxActiveRentals: 25
    }
  },
  Enterprise: {
    price: 9999,
    duration: 30,
    features: ['Enterprise Rental Management', '24/7 Priority Support', 'Advanced Analytics', 'Custom Features'],
    limits: {
      maxItems: -1, // unlimited
      maxImagesPerItem: 10,
      maxActiveRentals: -1 // unlimited
    }
  }
};

// Get available license plans
router.get('/plans', (req, res) => {
  res.json(LICENSE_PLANS);
});

// Get user's license status and limits
router.get('/status/:userId', async (req, res) => {
  try {
    const license = await License.findOne({
      userId: req.params.userId,
      status: 'active'
    });

    if (!license) {
      return res.json({
        hasActiveLicense: false,
        message: 'No active license found'
      });
    }

    res.json({
      hasActiveLicense: true,
      license: {
        type: license.type,
        expiryDate: license.expiryDate,
        features: license.features,
        limits: license.limits
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error checking license status', 
      error: error.message 
    });
  }
});

// Purchase a license
router.post('/purchase', deviceAuth, async (req, res) => {
  try {
    const { userId, planType } = req.body;

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate plan type
    if (!LICENSE_PLANS[planType]) {
      return res.status(400).json({ message: 'Invalid license plan type' });
    }

    // Check for existing active license
    const existingLicense = await License.findOne({
      userId,
      status: { $in: ['active', 'pending'] }
    });

    if (existingLicense) {
      return res.status(400).json({ 
        message: 'User already has an active or pending license',
        license: {
          _id: existingLicense._id,
          status: existingLicense.status,
          type: existingLicense.type,
          expiryDate: existingLicense.expiryDate
        }
      });
    }

    // Create new license
    const plan = LICENSE_PLANS[planType];
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.duration);

    const license = new License({
      userId,
      type: planType,
      features: plan.features,
      limits: plan.limits,
      expiryDate,
      price: plan.price,
      status: 'pending' // Requires coordinator approval
    });

    await license.save();

    res.status(201).json({
      message: 'License purchased successfully, awaiting coordinator approval',
      license: {
        _id: license._id,
        type: license.type,
        status: license.status,
        expiryDate: license.expiryDate,
        price: license.price,
        features: license.features
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error purchasing license', 
      error: error.message 
    });
  }
});

// Approve License (Coordinator only)
router.patch('/approve/:licenseId', deviceAuth, async (req, res) => {
  try {
    const { licenseId } = req.params;

    // Get the license
    const license = await License.findById(licenseId);
    if (!license) {
      return res.status(404).json({ message: 'License not found' });
    }

    // Get the user's pincode
    const user = await User.findById(license.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the current user is a coordinator for this pincode
    const coordinator = await Coordinator.findOne({
      userId: req.user.userId,
      pincodes: user.pincode,
      status: 'active'
    });

    if (!coordinator) {
      return res.status(403).json({ 
        message: 'Not authorized to approve licenses for this pincode' 
      });
    }

    if (license.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot approve license with status: ${license.status}` 
      });
    }

    // Update license status
    license.status = 'active';
    license.approvedBy = coordinator._id;
    await license.save();

    res.json({
      message: 'License approved successfully',
      license: {
        _id: license._id,
        type: license.type,
        status: license.status,
        approvedBy: coordinator._id
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error approving license', 
      error: error.message 
    });
  }
});

export default router;
