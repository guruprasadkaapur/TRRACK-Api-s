import express from 'express';
import Coordinator from '../models/coordinatorModel.js';
import User from '../models/userModel.js';
import adminAuth from '../middleware/adminAuthMiddleware.js';
import deviceAuth from '../middleware/deviceAuthMiddleware.js';
import { getPincodeData } from '../utils/pincodeZones.js';

const router = express.Router();

// Middleware to check both device and admin authentication
const checkAdminAuth = [deviceAuth, adminAuth];

// Add a new coordinator (Admin only)
router.post('/add', checkAdminAuth, async (req, res) => {
  try {
    const { userId, pincodes } = req.body;

    // Validate pincodes
    if (!Array.isArray(pincodes) || pincodes.length === 0) {
      return res.status(400).json({ message: 'At least one pincode is required' });
    }

    // Validate pincode format
    const invalidPincodes = pincodes.filter(pincode => !/^[0-9]{6}$/.test(pincode));
    if (invalidPincodes.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid pincode format', 
        invalidPincodes 
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if coordinator already exists for any of these pincodes
    const existingCoordinator = await Coordinator.findOne({
      userId,
      pincodes: { $in: pincodes }
    });

    if (existingCoordinator) {
      return res.status(400).json({ 
        message: 'User is already a coordinator for some of these pincodes',
        conflictingPincodes: existingCoordinator.pincodes.filter(p => pincodes.includes(p))
      });
    }

    // Create new coordinator
    const coordinator = new Coordinator({
      userId,
      pincodes,
      addedBy: req.admin._id
    });

    await coordinator.save();

    res.status(201).json({
      message: 'Coordinator added successfully',
      coordinator: {
        _id: coordinator._id,
        userId: coordinator.userId,
        pincodes: coordinator.pincodes,
        status: coordinator.status
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error adding coordinator', 
      error: error.message 
    });
  }
});

// Get all coordinators (Admin only)
router.get('/', checkAdminAuth, async (req, res) => {
  try {
    const coordinators = await Coordinator.find({})
      .populate('userId', 'fullName phoneNumber')
      .populate('addedBy', 'fullName phoneNumber')
      .select('-__v');
    
    res.json(coordinators);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching coordinators', 
      error: error.message 
    });
  }
});

// Get coordinator by ID (Admin only)
router.get('/:id', checkAdminAuth, async (req, res) => {
  try {
    const coordinator = await Coordinator.findById(req.params.id)
      .populate('userId', 'fullName phoneNumber')
      .populate('addedBy', 'fullName phoneNumber')
      .select('-__v');
    
    if (!coordinator) {
      return res.status(404).json({ message: 'Coordinator not found' });
    }
    
    res.json(coordinator);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching coordinator', 
      error: error.message 
    });
  }
});

// Update coordinator pincodes (Admin only)
router.patch('/:id/pincodes', checkAdminAuth, async (req, res) => {
  try {
    const { pincodes } = req.body;

    // Validate pincodes
    if (!Array.isArray(pincodes) || pincodes.length === 0) {
      return res.status(400).json({ message: 'At least one pincode is required' });
    }

    // Validate pincode format
    const invalidPincodes = pincodes.filter(pincode => !/^[0-9]{6}$/.test(pincode));
    if (invalidPincodes.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid pincode format', 
        invalidPincodes 
      });
    }

    const coordinator = await Coordinator.findById(req.params.id);
    if (!coordinator) {
      return res.status(404).json({ message: 'Coordinator not found' });
    }

    // Check for conflicts with other coordinators
    const existingCoordinator = await Coordinator.findOne({
      _id: { $ne: coordinator._id },
      userId: coordinator.userId,
      pincodes: { $in: pincodes }
    });

    if (existingCoordinator) {
      return res.status(400).json({ 
        message: 'Another coordinator exists for some of these pincodes',
        conflictingPincodes: existingCoordinator.pincodes.filter(p => pincodes.includes(p))
      });
    }

    coordinator.pincodes = pincodes;
    await coordinator.save();

    res.json({
      message: 'Coordinator pincodes updated successfully',
      coordinator: {
        _id: coordinator._id,
        userId: coordinator.userId,
        pincodes: coordinator.pincodes,
        status: coordinator.status
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating coordinator pincodes', 
      error: error.message 
    });
  }
});

// Update coordinator status (Admin only)
router.patch('/:id/status', checkAdminAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const coordinator = await Coordinator.findById(req.params.id);
    if (!coordinator) {
      return res.status(404).json({ message: 'Coordinator not found' });
    }

    coordinator.status = status;
    await coordinator.save();

    res.json({
      message: 'Coordinator status updated successfully',
      coordinator: {
        _id: coordinator._id,
        userId: coordinator.userId,
        status: coordinator.status
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating coordinator status', 
      error: error.message 
    });
  }
});

export default router;
