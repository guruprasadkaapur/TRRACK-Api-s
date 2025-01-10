import express from 'express';
import RentalItem from '../models/rentalItemModel.js';
import User from '../models/userModel.js';
import CustomerBehavior from '../models/customerBehaviorModel.js';
import checkLicense from '../middleware/licenseCheckMiddleware.js';

const router = express.Router();

// Add new rental item
router.post('/', checkLicense, async (req, res) => {
  try {
    const {
      userId,
      itemName,
      category,
      description,
      rentalPrice,
      rentalDuration,
      imageUrls
    } = req.body;

    // Get user's location details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const rentalItem = new RentalItem({
      userId,
      itemName,
      category,
      description,
      rentalPrice: {
        amount: parseFloat(rentalPrice),
        duration: rentalDuration
      },
      images: imageUrls.map(url => ({
        path: url,
        filename: url.split('/').pop()
      })),
      location: {
        pincode: user.pincode,
        zone: user.zone
      }
    });

    await rentalItem.save();

    res.status(201).json({
      message: 'Rental item added successfully',
      item: rentalItem
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding rental item', error: error.message });
  }
});

// Get all rental items
router.get('/', async (req, res) => {
  try {
    const rentalItems = await RentalItem.find({});
    res.json(rentalItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rental items', error: error.message });
  }
});

// Get rental item by ID
router.get('/:itemId', async (req, res) => {
  try {
    const item = await RentalItem.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Rental item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rental item', error: error.message });
  }
});

// Rent an item
router.post('/:itemId/rent', checkLicense, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { rentalDuration, deposit, userId } = req.body;

    // Find the item
    const item = await RentalItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ 
        status: 'error',
        message: 'Rental item not found' 
      });
    }

    if (item.availabilityStatus !== 'available') {
      return res.status(400).json({ 
        status: 'error',
        message: 'Item is not available for rent' 
      });
    }

    let totalAmount;
    switch(item.rentalPrice.duration) {
      case 'daily':
        totalAmount = rentalDuration * item.rentalPrice.amount;
        break;
      case 'weekly':
        totalAmount = Math.ceil(rentalDuration / 7) * item.rentalPrice.amount;
        break;
      case 'monthly':
        totalAmount = Math.ceil(rentalDuration / 30) * item.rentalPrice.amount;
        break;
    }

    item.availabilityStatus = 'not available';
    item.currentRental = {
      customerId: userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + rentalDuration * 24 * 60 * 60 * 1000),
      deposit,
      totalAmount
    };

    await item.save();

    res.status(200).json({
      status: 'success',
      message: 'Item rented successfully',
      data: {
        itemId: item._id,
        startDate: item.currentRental.startDate,
        endDate: item.currentRental.endDate,
        deposit,
        totalAmount,
        rentalDuration
      }
    });

  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to rent item',
      error: error.message 
    });
  }
});

// Get rental history for an item
router.get('/:itemId/history/:userId', checkLicense, async (req, res) => {
  try {
    const { itemId, userId } = req.params;

    const item = await RentalItem.findById(itemId)
      .populate('rentalHistory.customerId', 'name email phone');

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Rental item not found'
      });
    }

    // Filter history for specific user if needed
    const rentalHistory = item.rentalHistory.filter(
      rental => rental.customerId.toString() === userId
    );

    res.status(200).json({
      status: 'success',
      data: {
        itemId: item._id,
        itemName: item.itemName,
        currentRental: item.currentRental && item.currentRental.customerId.toString() === userId ? item.currentRental : null,
        rentalHistory
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch rental history',
      error: error.message
    });
  }
});

// Complete current rental
router.post('/:itemId/complete', checkLicense, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { userId } = req.body;

    const item = await RentalItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Rental item not found'
      });
    }

    if (!item.currentRental) {
      return res.status(400).json({
        status: 'error',
        message: 'No active rental found for this item'
      });
    }

    await item.completeRental();

    res.status(200).json({
      status: 'success',
      message: 'Rental completed successfully',
      data: {
        itemId: item._id,
        rentalHistory: item.rentalHistory
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to complete rental',
      error: error.message
    });
  }
});

// Get all rental history for a specific customer
router.get('/customer/:userId/history', checkLicense, async (req, res) => {
  try {
    const { userId } = req.params;

    // Find all items where this customer has current or past rentals
    const items = await RentalItem.find({
      $or: [
        { 'currentRental.customerId': userId },
        { 'rentalHistory.customerId': userId }
      ]
    }).select('itemName category description rentalPrice currentRental rentalHistory images');

    // Format the response data
    const rentalHistory = items.map(item => {
      const history = {
        itemId: item._id,
        itemName: item.itemName,
        category: item.category,
        description: item.description,
        rentalPrice: item.rentalPrice,
        image: item.images[0]?.path || null,
        rentals: []
      };

      // Add current rental if it belongs to this customer
      if (item.currentRental && item.currentRental.customerId.toString() === userId) {
        history.rentals.push({
          ...item.currentRental.toObject(),
          status: 'active'
        });
      }

      // Add past rentals for this customer
      const pastRentals = item.rentalHistory.filter(
        rental => rental.customerId.toString() === userId
      );
      history.rentals.push(...pastRentals);

      // Sort rentals by start date, most recent first
      history.rentals.sort((a, b) => b.startDate - a.startDate);

      return history;
    });

    res.status(200).json({
      status: 'success',
      data: {
        customerId: userId,
        totalItems: rentalHistory.length,
        rentalHistory
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch customer rental history',
      error: error.message
    });
  }
});

// Return a rented item
router.post('/:itemId/return', checkLicense, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { 
      userId,
      condition,
      comments,
      additionalCharges
    } = req.body;

    const item = await RentalItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Rental item not found'
      });
    }

    // Check if item is currently rented
    if (!item.currentRental) {
      return res.status(400).json({
        status: 'error',
        message: 'No active rental found for this item'
      });
    }

    // Verify if the rental belongs to the user
    if (item.currentRental.customerId.toString() !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'This rental does not belong to the specified user'
      });
    }

    // Calculate any late return fees
    const currentDate = new Date();
    const endDate = new Date(item.currentRental.endDate);
    let lateFees = 0;
    let daysLate = 0;

    if (currentDate > endDate) {
      daysLate = Math.ceil((currentDate - endDate) / (1000 * 60 * 60 * 24));
      lateFees = daysLate * (item.rentalPrice.amount * 0.1); // 10% of daily rate per day late
    }

    // Add return details
    item.currentRental.returnDetails = {
      returnDate: currentDate,
      condition,
      comments,
      additionalCharges: {
        amount: (additionalCharges?.amount || 0) + lateFees,
        reason: additionalCharges?.reason || (lateFees > 0 ? `Late return fee for ${daysLate} days` : '')
      }
    };

    // Calculate deposit refund based on condition
    let depositRefund = item.currentRental.deposit;
    if (condition === 'damaged') {
      depositRefund = 0; // No deposit refund for damaged items
    } else if (condition === 'good') {
      depositRefund = item.currentRental.deposit * 0.9; // 90% refund for good condition
    }

    // Add strikes for bad behavior
    let customerBehavior = await CustomerBehavior.findOne({ customerId: userId });
    if (!customerBehavior) {
      customerBehavior = new CustomerBehavior({ customerId: userId });
    }

    // Add strike for late return
    if (daysLate > 0) {
      await customerBehavior.addStrike({
        date: currentDate,
        reason: 'late_return',
        itemId: item._id,
        severity: daysLate > 7 ? 'severe' : daysLate > 3 ? 'moderate' : 'minor',
        description: `Returned ${daysLate} days late`,
        additionalCharges: lateFees
      });
    }

    // Add strike for damaged item
    if (condition === 'damaged') {
      await customerBehavior.addStrike({
        date: currentDate,
        reason: 'damaged_item',
        itemId: item._id,
        severity: 'severe',
        description: comments || 'Item returned in damaged condition',
        additionalCharges: additionalCharges?.amount || 0
      });
    }

    // Move current rental to history
    item.rentalHistory.push({
      ...item.currentRental.toObject(),
      status: 'completed'
    });

    // Clear current rental and make item available
    item.currentRental = null;
    item.availabilityStatus = 'available';

    await item.save();

    res.status(200).json({
      status: 'success',
      message: 'Item returned successfully',
      data: {
        itemId: item._id,
        returnDetails: item.rentalHistory[item.rentalHistory.length - 1].returnDetails,
        depositRefund,
        lateFees,
        totalCharges: (additionalCharges?.amount || 0) + lateFees,
        finalAmount: depositRefund - ((additionalCharges?.amount || 0) + lateFees),
        customerStatus: customerBehavior.status
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to process item return',
      error: error.message
    });
  }
});

export default router;
