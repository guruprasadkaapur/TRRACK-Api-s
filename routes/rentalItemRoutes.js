import express from 'express';
import RentalItem from '../models/rentalItemModel.js';
import User from '../models/userModel.js';
import checkLicense from '../middleware/licenseCheckMiddleware.js';
import checkCoordinatorPermission from '../middleware/coordinatorAuthMiddleware.js';

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

    // Validate image URLs
    if (!imageUrls || !Array.isArray(imageUrls)) {
      return res.status(400).json({ message: 'Image URLs must be provided as an array' });
    }

    // Validate URL format
    const validUrls = imageUrls.every(url => /^(http|https):\/\/[^ "]+$/.test(url));
    if (!validUrls) {
      return res.status(400).json({ message: 'Invalid image URL format' });
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
        zone: user.zone,
        area: user.area,
        district: user.district,
        state: user.state
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
    console.log('Fetching rental items');
    const rentalItems = await RentalItem.find({});
    res.json(rentalItems);
  } catch (error) {
    console.error('Error fetching rental items:', error);
    res.status(500).json({ message: 'Error fetching rental items', error: error.message });
  }
});

// Get user's rental items
router.get('/user/:userId', checkLicense, async (req, res) => {
  try {
    const items = await RentalItem.find({ userId: req.params.userId });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rental items', error: error.message });
  }
});

// Update rental item
router.put('/:itemId', checkLicense, async (req, res) => {
  try {
    const { itemId } = req.params;
    const updateData = { ...req.body };

    // If new image URLs are provided, validate them
    if (updateData.imageUrls) {
      if (!Array.isArray(updateData.imageUrls)) {
        return res.status(400).json({ message: 'Image URLs must be provided as an array' });
      }

      const validUrls = updateData.imageUrls.every(url => /^(http|https):\/\/[^ "]+$/.test(url));
      if (!validUrls) {
        return res.status(400).json({ message: 'Invalid image URL format' });
      }

      updateData.images = updateData.imageUrls.map(url => ({
        path: url,
        filename: url.split('/').pop()
      }));
      delete updateData.imageUrls;
    }

    // Update rental price if provided
    if (updateData.rentalPrice && updateData.rentalDuration) {
      updateData.rentalPrice = {
        amount: parseFloat(updateData.rentalPrice),
        duration: updateData.rentalDuration
      };
    }

    const item = await RentalItem.findByIdAndUpdate(
      itemId,
      updateData,
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: 'Rental item not found' });
    }

    res.json({
      message: 'Rental item updated successfully',
      item
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating rental item', error: error.message });
  }
});

// Delete rental item
router.delete('/:itemId', checkLicense, async (req, res) => {
  try {
    const item = await RentalItem.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Rental item not found' });
    }

    await item.deleteOne();
    res.json({ message: 'Rental item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting rental item', error: error.message });
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

// Approve rental item (requires coordinator permission)
router.patch('/approve/:itemId', 
  checkCoordinatorPermission(['approve_rentals']), 
  async (req, res) => {
    try {
      const { itemId } = req.params;
      const { status = 'available' } = req.body;

      const rentalItem = await RentalItem.findById(itemId);
      if (!rentalItem) {
        return res.status(404).json({ message: 'Rental item not found' });
      }

      // Check if the item belongs to the same license as the coordinator
      const license = await License.findOne({ 
        _id: rentalItem.licenseId,
        coordinators: req.coordinator._id
      });

      if (!license) {
        return res.status(403).json({ 
          message: 'You can only approve items under your license' 
        });
      }

      rentalItem.availabilityStatus = status;
      rentalItem.approvedBy = req.coordinator._id;
      await rentalItem.save();

      res.json({
        message: 'Rental item status updated',
        rentalItem: {
          _id: rentalItem._id,
          itemName: rentalItem.itemName,
          availabilityStatus: rentalItem.availabilityStatus
        }
      });
    } catch (error) {
      res.status(500).json({ 
        message: 'Error approving rental item', 
        error: error.message 
      });
    }
});

export default router;
