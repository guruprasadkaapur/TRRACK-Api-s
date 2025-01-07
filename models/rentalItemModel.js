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
  imageUrls: [{
    type: String,
    validate: {
      validator: function(url) {
        return /^(http|https):\/\/[^ "]+$/.test(url);
      },
      message: 'Invalid image URL format'
    }
  }],
  location: {
    pincode: String,
    zone: String,
    area: String,
    district: String,
    state: String
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coordinator',
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('RentalItem', rentalItemSchema);
