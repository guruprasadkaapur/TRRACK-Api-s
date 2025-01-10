import express from 'express';
import CustomerBehavior from '../models/customerBehaviorModel.js';
import checkLicense from '../middleware/licenseCheckMiddleware.js';

const router = express.Router();

// Add a strike to a customer
router.post('/:customerId/strike', checkLicense, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { reason, itemId, severity, description, additionalCharges } = req.body;

    let customerBehavior = await CustomerBehavior.findOne({ customerId });
    
    // Create new record if customer doesn't exist
    if (!customerBehavior) {
      customerBehavior = new CustomerBehavior({ customerId });
    }

    const strikeData = {
      date: new Date(),
      reason,
      itemId,
      severity,
      description,
      additionalCharges
    };

    const newStatus = await customerBehavior.addStrike(strikeData);

    res.status(200).json({
      status: 'success',
      message: 'Strike added successfully',
      data: {
        customerId,
        newStatus,
        totalStrikes: customerBehavior.totalStrikes,
        strike: strikeData
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to add strike',
      error: error.message
    });
  }
});

// Get customer behavior history
router.get('/:customerId', checkLicense, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const customerBehavior = await CustomerBehavior.findOne({ customerId })
      .populate('strikes.itemId', 'itemName category');

    if (!customerBehavior) {
      return res.status(200).json({
        status: 'success',
        data: {
          customerId,
          status: 'good',
          totalStrikes: 0,
          strikes: []
        }
      });
    }

    res.status(200).json({
      status: 'success',
      data: customerBehavior
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch customer behavior',
      error: error.message
    });
  }
});

// Resolve a strike
router.post('/:customerId/strike/:strikeId/resolve', checkLicense, async (req, res) => {
  try {
    const { customerId, strikeId } = req.params;
    const { resolutionNotes } = req.body;

    const customerBehavior = await CustomerBehavior.findOne({ customerId });
    if (!customerBehavior) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer behavior record not found'
      });
    }

    const newStatus = await customerBehavior.resolveStrike(strikeId, resolutionNotes);

    res.status(200).json({
      status: 'success',
      message: 'Strike resolved successfully',
      data: {
        customerId,
        newStatus,
        totalStrikes: customerBehavior.totalStrikes
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to resolve strike',
      error: error.message
    });
  }
});

// Get all customers with bad behavior (warning, suspended, or banned status)
router.get('/bad-customers/list', checkLicense, async (req, res) => {
  try {
    const badCustomers = await CustomerBehavior.find({
      status: { $in: ['warning', 'suspended', 'banned'] }
    })
    .sort({ totalStrikes: -1 })
    .populate('customerId', 'name email phone');

    res.status(200).json({
      status: 'success',
      data: {
        total: badCustomers.length,
        customers: badCustomers
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch bad customers',
      error: error.message
    });
  }
});

export default router;
