import mongoose from 'mongoose';
import Joi from 'joi';

const customerSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    match: /^[0-9]{10}$/
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  address: {
    type: String,
    required: true
  },
  idProof: {
    type: {
      type: String,
      required: true,
      enum: ['AADHAAR', 'VOTER_ID', 'DRIVING_LICENSE']
    },
    number: {
      type: String,
      required: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  remarks: String,
  rentedItems: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentalItem'
    },
    rentalDuration: {
      type: Number,
      required: true,
      min: 1
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    returnDate: Date,
    deposit: Number,
    status: {
      type: String,
      enum: ['active', 'returned', 'overdue'],
      default: 'active'
    },
    rentalPrice: {
      amount: Number,
      duration: String
    }
  }],
  activeRentals: {
    type: Number,
    default: 0
  },
  totalRentals: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Validation schema for customer registration
export const customerValidationSchema = Joi.object({
  userId: Joi.string().required(),
  fullName: Joi.string().required().min(3).max(50),
  phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required(),
  email: Joi.string().email().required(),
  address: Joi.string().required().min(10),
  idProof: Joi.object({
    type: Joi.string().valid('AADHAAR', 'VOTER_ID', 'DRIVING_LICENSE').required(),
    number: Joi.string().required()
  }).required(),
  remarks: Joi.string().allow('', null)
});

// Format validation for different ID types
const ID_FORMATS = {
  AADHAAR: /^\d{12}$/,
  VOTER_ID: /^[A-Z]{3}\d{7}$/,
  DRIVING_LICENSE: /^[A-Z]{2}\d{13}$/
};

// Middleware to validate ID proof format
customerSchema.pre('save', function(next) {
  const format = ID_FORMATS[this.idProof.type];
  if (!format || !format.test(this.idProof.number)) {
    next(new Error(`Invalid ${this.idProof.type} format`));
    return;
  }
  next();
});

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
