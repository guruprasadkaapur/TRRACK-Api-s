import License from '../models/licenseModel.js';
import RentalItem from '../models/rentalItemModel.js';

const checkLicense = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.params.userId || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const license = await License.findOne({
      userId: userId,
      status: 'active',
      expiryDate: { $gt: new Date() }
    });

    if (!license) {
      return res.status(403).json({
        message: 'Active license required',
        error: 'Please purchase a license to manage rental items'
      });
    }

    // Check limits only for POST requests (adding new items)
    if (req.method === 'POST') {
      // Check total items limit
      if (license.limits.maxItems !== -1) {
        const currentItems = await RentalItem.countDocuments({ userId });
        if (currentItems >= license.limits.maxItems) {
          return res.status(403).json({
            message: 'Plan limit reached',
            error: `Your ${license.type} plan allows maximum of ${license.limits.maxItems} items. Please upgrade your plan to add more items.`
          });
        }
      }

      // Check images per item limit for rental items
      if (req.body.images && Array.isArray(req.body.images)) {
        if (req.body.images.length > license.limits.maxImagesPerItem) {
          return res.status(403).json({
            message: 'Image limit exceeded',
            error: `Your ${license.type} plan allows maximum of ${license.limits.maxImagesPerItem} images per item.`
          });
        }
      }

      // Check active rentals limit
      if (license.limits.maxActiveRentals !== -1) {
        const activeRentals = await RentalItem.countDocuments({ 
          userId,
          availabilityStatus: 'not available'
        });
        if (activeRentals >= license.limits.maxActiveRentals) {
          return res.status(403).json({
            message: 'Active rentals limit reached',
            error: `Your ${license.type} plan allows maximum of ${license.limits.maxActiveRentals} active rentals. Please upgrade your plan for more.`
          });
        }
      }
    }

    // Add license info to request object for potential future use
    req.license = license;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking license', error: error.message });
  }
};

export default checkLicense;
