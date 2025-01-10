const Customer = require('../models/customerModel');
const RentalItem = require('../models/rentalItemModel');

// Add new customer (No license check needed)
exports.addCustomer = async (req, res) => {
  try {
    // Validation logic for the customer data and other CRUD functionality
    const { error } = customerValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Logic for creating and saving the customer
    const customer = new Customer(req.body);
    await customer.save();

    res.status(201).json({
      message: 'Customer added successfully',
      customer
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding customer', error: error.message });
  }
};

// Get all customers for a user (No license check needed)
exports.getCustomersByUserId = async (req, res) => {
  try {
    const customers = await Customer.find({ ownerId: req.params.userId }).select('-__v').sort('-createdAt');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
};
