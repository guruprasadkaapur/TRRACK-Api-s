import mongoose from 'mongoose';

const rentalItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Furniture', 'Electronics', 'Tools', 'Sports', 'Books', 'Vehicles', 'Others'],
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  rentalPrice: {
    amount: {
      type: Number,
      required: true
    },
    duration: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true
    }
  },
  availabilityStatus: {
    type: String,
    enum: ['available', 'not available'],
    default: 'available'
  },
  currentRental: {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    startDate: Date,
    endDate: Date,
    deposit: Number,
    totalAmount: Number,
    returnDetails: {
      returnDate: Date,
      condition: {
        type: String,
        enum: ['excellent', 'good', 'damaged']
      },
      comments: String,
      additionalCharges: {
        amount: Number,
        reason: String
      }
    }
  },
  rentalHistory: [{
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    startDate: Date,
    endDate: Date,
    deposit: Number,
    totalAmount: Number,
    returnDetails: {
      returnDate: Date,
      condition: {
        type: String,
        enum: ['excellent', 'good', 'damaged']
      },
      comments: String,
      additionalCharges: {
        amount: Number,
        reason: String
      }
    },
    status: {
      type: String,
      enum: ['completed', 'cancelled'],
      required: true
    }
  }],
  images: [{
    path: String,
    filename: String
  }],
  location: {
    pincode: String,
    zone: String
  }
});

// When a rental is completed, add it to history
rentalItemSchema.methods.completeRental = async function() {
  if (this.currentRental) {
    this.rentalHistory.push({
      ...this.currentRental,
      status: 'completed'
    });
    this.currentRental = null;
    this.availabilityStatus = 'available';
    await this.save();
  }
};

export default mongoose.model('RentalItem', rentalItemSchema);
