import express from 'express';
import Customer, { customerValidationSchema } from '../models/customerModel.js';
import RentalItem from '../models/rentalItemModel.js';
import checkLicense from '../middleware/licenseCheckMiddleware.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Get all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find()
      .select('-__v')
      .sort('-createdAt');

    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
});

// Add new customer (No license check needed)
router.post('/', async (req, res) => {
  try {
    const { error } = customerValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { userId } = req.body;
    
    // Check if phone number already exists for this owner
    const existingCustomer = await Customer.findOne({
      ownerId: userId,
      phoneNumber: req.body.phoneNumber
    });

    if (existingCustomer) {
      return res.status(400).json({
        message: 'Customer with this phone number already exists'
      });
    }

    const customer = new Customer({
      ownerId: userId,
      fullName: req.body.fullName,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email,
      address: req.body.address,
      idProof: req.body.idProof,
      remarks: req.body.remarks
    });

    await customer.save();

    res.status(201).json({
      message: 'Customer added successfully',
      customer
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding customer', error: error.message });
  }
});

// Get all customers for a user (No license check needed)
router.get('/owner/:userId', async (req, res) => {
  try {
    const customers = await Customer.find({ ownerId: req.params.userId })
      .select('-__v')
      .sort('-createdAt');

    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
});

// Get customer details (No license check needed)
router.get('/:customerId', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId)
      .populate('rentedItems.itemId')
      .select('-__v');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer details', error: error.message });
  }
});

// Update customer (No license check needed)
router.put('/:customerId', async (req, res) => {
  try {
    const { error } = customerValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.customerId,
      {
        fullName: req.body.fullName,
        phoneNumber: req.body.phoneNumber,
        email: req.body.email,
        address: req.body.address,
        idProof: req.body.idProof,
        remarks: req.body.remarks
      },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({
      message: 'Customer updated successfully',
      customer
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating customer', error: error.message });
  }
});

// Rent an item to a customer
router.post('/:customerId/rent-item', async (req, res) => {
  try {
    const { itemId, rentalDuration, deposit } = req.body;
    const customerId = req.params.customerId;

    // Validate input
    if (!itemId || !rentalDuration || !deposit) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find customer and item
    const customer = await Customer.findById(customerId);
    const rentalItem = await RentalItem.findById(itemId);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (!rentalItem) {
      return res.status(404).json({ message: 'Rental item not found' });
    }

    // Check if item is available
    if (rentalItem.availabilityStatus !== 'available') {
      return res.status(400).json({ message: 'Item is not available for rent' });
    }

    // Calculate return date based on rental duration
    const startDate = new Date();
    const returnDate = new Date(startDate);
    
    // Add the number of rental days to the return date
    if (typeof rentalDuration !== 'number' || rentalDuration < 1) {
      return res.status(400).json({ message: 'Rental duration must be a positive number of days' });
    }
    returnDate.setDate(returnDate.getDate() + rentalDuration);

    // Add rental to customer's rentedItems
    customer.rentedItems.push({
      itemId: rentalItem._id,
      rentalDuration,
      startDate,
      returnDate,
      deposit,
      status: 'active',
      rentalPrice: rentalItem.rentalPrice
    });

    // Update customer's rental counts
    customer.activeRentals += 1;
    customer.totalRentals += 1;

    // Update item availability
    rentalItem.availabilityStatus = 'not available';

    // Save both documents
    await Promise.all([
      customer.save(),
      rentalItem.save()
    ]);

    res.status(200).json({
      message: 'Item rented successfully',
      rental: {
        itemId: rentalItem._id,
        itemName: rentalItem.itemName,
        startDate,
        returnDate,
        deposit,
        rentalPrice: rentalItem.rentalPrice,
        rentalDuration
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error renting item', error: error.message });
  }
});

// Return a rented item
router.post('/:customerId/return-item', async (req, res) => {
  try {
    const { itemId } = req.body;
    const customerId = req.params.customerId;

    // Validate input
    if (!itemId) {
      return res.status(400).json({ message: 'Item ID is required' });
    }

    // Find customer and item
    const customer = await Customer.findById(customerId);
    const rentalItem = await RentalItem.findById(itemId);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (!rentalItem) {
      return res.status(404).json({ message: 'Rental item not found' });
    }

    // Find the rental in customer's rentedItems
    const rentalIndex = customer.rentedItems.findIndex(
      rental => rental.itemId.toString() === itemId && rental.status === 'active'
    );

    if (rentalIndex === -1) {
      return res.status(404).json({ message: 'Active rental not found for this item' });
    }

    // Update rental status
    customer.rentedItems[rentalIndex].status = 'returned';
    customer.activeRentals = customer.rentedItems.filter(rental => rental.status === 'active').length;

    // Update item availability
    rentalItem.availabilityStatus = 'available';

    // Save both documents
    await Promise.all([
      customer.save(),
      rentalItem.save()
    ]);

    res.status(200).json({
      message: 'Item returned successfully',
      rental: customer.rentedItems[rentalIndex]
    });
  } catch (error) {
    res.status(500).json({ message: 'Error returning item', error: error.message });
  }
});

// Get active rentals for a customer
router.get('/:customerId/active-rentals', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId)
      .populate({
        path: 'rentedItems.itemId',
        match: { 'rentedItems.status': 'active' }
      });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const activeRentals = customer.rentedItems.filter(rental => rental.status === 'active');

    res.json({
      activeRentals,
      count: activeRentals.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active rentals', error: error.message });
  }
});

// Get rental history for a customer
router.get('/:customerId/rental-history', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId)
      .populate('rentedItems.itemId')
      .select('rentedItems');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const activeRentals = customer.rentedItems.filter(rental => rental.status === 'active').length;

    res.json({
      rentalHistory: customer.rentedItems,
      totalRentals: customer.rentedItems.length,
      activeRentals: activeRentals
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rental history', error: error.message });
  }
});

// Get all rented items with customer details
router.get('/rented-items/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query; // Optional status filter (active, returned, all)

    // Find all customers for this user
    const customers = await Customer.find({ ownerId: userId })
      .populate({
        path: 'rentedItems.itemId',
        select: 'itemName category rentalPrice'
      });

    let allRentals = [];

    // Process each customer's rentals
    customers.forEach(customer => {
      customer.rentedItems.forEach(rental => {
        // Skip if status filter is provided and doesn't match
        if (status && status !== 'all' && rental.status !== status) {
          return;
        }

        // Calculate payable amount based on rental duration and price
        const rentalDays = rental.rentalDuration;
        const pricePerDay = rental.itemId ? rental.itemId.rentalPrice.amount : rental.rentalPrice.amount;
        const payableAmount = rentalDays * pricePerDay;

        allRentals.push({
          customerName: customer.fullName,
          customerPhone: customer.phoneNumber,
          itemName: rental.itemId ? rental.itemId.itemName : 'Item Deleted',
          itemCategory: rental.itemId ? rental.itemId.category : 'N/A',
          rentalDuration: rental.rentalDuration,
          startDate: rental.startDate,
          returnDate: rental.returnDate,
          deposit: rental.deposit,
          payableAmount: payableAmount,
          status: rental.status,
          pricePerDay: pricePerDay
        });
      });
    });

    // Sort rentals by status (active first) and then by start date
    allRentals.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.startDate) - new Date(a.startDate);
    });

    res.json({
      totalRentals: allRentals.length,
      activeRentals: allRentals.filter(r => r.status === 'active').length,
      returnedRentals: allRentals.filter(r => r.status === 'returned').length,
      rentals: allRentals
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rental items', error: error.message });
  }
});

// Get all active rentals across all customers
router.get('/active-rentals', async (req, res) => {
  try {
    // Find all customers with active rentals
    const customers = await Customer.find({
      'rentedItems.status': 'active'
    }).populate({
      path: 'rentedItems.itemId',
      select: 'itemName category rentalPrice'
    });

    let allActiveRentals = [];

    customers.forEach(customer => {
      const activeRentals = customer.rentedItems.filter(rental => rental.status === 'active');
      
      activeRentals.forEach(rental => {
        const pricePerDay = rental.itemId ? rental.itemId.rentalPrice.amount : rental.rentalPrice.amount;
        const payableAmount = rental.rentalDuration * pricePerDay;

        allActiveRentals.push({
          customerName: customer.fullName,
          customerPhone: customer.phoneNumber,
          itemName: rental.itemId ? rental.itemId.itemName : 'Item Deleted',
          itemCategory: rental.itemId ? rental.itemId.category : 'N/A',
          rentalDuration: rental.rentalDuration,
          startDate: rental.startDate,
          returnDate: rental.returnDate,
          deposit: rental.deposit,
          payableAmount: payableAmount,
          pricePerDay: pricePerDay,
          daysRemaining: Math.ceil((new Date(rental.returnDate) - new Date()) / (1000 * 60 * 60 * 24))
        });
      });
    });

    // Sort by return date (closest first)
    allActiveRentals.sort((a, b) => new Date(a.returnDate) - new Date(b.returnDate));

    res.json({
      totalActiveRentals: allActiveRentals.length,
      rentals: allActiveRentals
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active rentals', error: error.message });
  }
});

// Get rental status summary for all customers
router.get('/rental-status/all', async (req, res) => {
  try {
    const customers = await Customer.find()
      .populate('rentedItems.itemId')
      .select('fullName rentedItems');

    // Initialize status counters
    const rentalStatus = {
      active: [],
      returned: [],
      overdue: [],
      total: 0
    };

    // Current date for overdue check
    const currentDate = new Date();

    // Process rentals for all customers
    customers.forEach(customer => {
      customer.rentedItems.forEach(rental => {
        const returnDate = new Date(rental.returnDate);
        const rentalInfo = {
          customerName: customer.fullName,
          customerId: customer._id,
          itemName: rental.itemId.itemName,
          itemId: rental.itemId._id,
          startDate: rental.startDate,
          returnDate: rental.returnDate,
          rentalDuration: rental.rentalDuration,
          deposit: rental.deposit,
          rentalPrice: rental.rentalPrice
        };
        
        // Check if rental is overdue (if active and past return date)
        if (rental.status === 'active' && returnDate < currentDate) {
          rental.status = 'overdue';
          rentalStatus.overdue.push(rentalInfo);
        } else if (rental.status === 'active') {
          rentalStatus.active.push(rentalInfo);
        } else if (rental.status === 'returned') {
          rentalStatus.returned.push(rentalInfo);
        }
      });
      rentalStatus.total += customer.rentedItems.length;
    });

    // Create summary
    const summary = {
      totalRentals: rentalStatus.total,
      activeRentals: rentalStatus.active.length,
      returnedRentals: rentalStatus.returned.length,
      overdueRentals: rentalStatus.overdue.length,
      details: {
        active: rentalStatus.active,
        returned: rentalStatus.returned,
        overdue: rentalStatus.overdue
      }
    };

    res.json({
      message: 'Overall rental status retrieved successfully',
      summary: summary
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching overall rental status', error: error.message });
  }
});

// Update customer status
router.post('/:customerId/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    const customerId = req.params.customerId;
    
    // Get user ID from token
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, 'your-secret-key'); // Using the same secret as in auth
    const reportedBy = decoded.userId;

    // Validate status
    if (!['good', 'warning', 'bad'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be good, warning, or bad' });
    }

    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Update customer status
    customer.customerStatus = status;
    customer.statusHistory.push({
      status,
      reason,
      date: new Date(),
      reportedBy
    });

    await customer.save();

    res.json({
      message: 'Customer status updated successfully',
      customerStatus: customer.customerStatus,
      statusHistory: customer.statusHistory
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating customer status', error: error.message });
  }
});

// Get all bad customers
router.get('/status/bad', async (req, res) => {
  try {
    const badCustomers = await Customer.find({ customerStatus: 'bad' })
      .populate('statusHistory.reportedBy', 'fullName email')
      .select('fullName phoneNumber email customerStatus statusHistory rentedItems');

    const customerDetails = badCustomers.map(customer => ({
      customerId: customer._id,
      fullName: customer.fullName,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      currentStatus: customer.customerStatus,
      statusHistory: customer.statusHistory.map(history => ({
        status: history.status,
        reason: history.reason,
        date: history.date,
        reportedBy: history.reportedBy ? {
          fullName: history.reportedBy.fullName,
          email: history.reportedBy.email
        } : null
      })),
      activeRentals: customer.rentedItems.filter(item => item.status === 'active').length,
      overdueRentals: customer.rentedItems.filter(item => item.status === 'overdue').length,
      damagedItems: customer.rentedItems.filter(item => item.condition === 'damaged').length
    }));

    res.json({
      message: 'Bad customers retrieved successfully',
      count: customerDetails.length,
      customers: customerDetails
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bad customers', error: error.message });
  }
});

export default router;
