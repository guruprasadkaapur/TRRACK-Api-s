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
    required: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: true
  },
  idProof: {
    type: {
      type: String,
      required: true,
      enum: ['AADHAAR', 'DRIVING_LICENSE', 'PASSPORT']
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
  rentedItems: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentalItem',
      required: true
    },
    rentalPrice: {
      amount: Number,
      duration: String
    },
    rentalDuration: Number,
    startDate: Date,
    returnDate: Date,
    deposit: Number,
    status: {
      type: String,
      enum: ['active', 'returned', 'overdue'],
      default: 'active'
    },
    condition: {
      type: String,
      enum: ['good', 'damaged', 'lost'],
      default: 'good'
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
  customerStatus: {
    type: String,
    enum: ['good', 'warning', 'bad'],
    default: 'good'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['good', 'warning', 'bad']
    },
    reason: String,
    date: {
      type: Date,
      default: Date.now
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  remarks: String
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
    type: Joi.string().valid('AADHAAR', 'DRIVING_LICENSE', 'PASSPORT').required(),
    number: Joi.string().required()
  }).required(),
  remarks: Joi.string().allow('', null)
});

// Format validation for different ID types
const ID_FORMATS = {
  AADHAAR: /^\d{12}$/,
  DRIVING_LICENSE: /^[A-Z]{2}\d{13}$/,
  PASSPORT: /^[A-Z]{1}\d{7}$/
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
