import mongoose from 'mongoose';

const licenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Basic', 'Premium', 'Enterprise'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'expired'],
    default: 'pending'
  },
  features: [{
    type: String
  }],
  limits: {
    maxItems: Number,
    maxImagesPerItem: Number,
    maxActiveRentals: Number
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentId: {
    type: String
  },
  coordinators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coordinator'
  }],
  maxCoordinators: {
    type: Number,
    default: function() {
      // Dynamically set max coordinators based on license type
      switch(this.type) {
        case 'Basic': return 1;
        case 'Premium': return 3;
        case 'Enterprise': return 10;
        default: return 0;
      }
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('License', licenseSchema);
