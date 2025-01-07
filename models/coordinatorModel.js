import mongoose from 'mongoose';

const coordinatorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pincodes: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return v.length > 0 && v.every(pincode => /^[0-9]{6}$/.test(pincode));
      },
      message: 'At least one valid pincode is required'
    }
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  permissions: {
    type: [String],
    default: ['approve_licenses', 'view_rental_items']
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index for userId and pincodes
coordinatorSchema.index({ userId: 1, pincodes: 1 }, { unique: true });

export default mongoose.model('Coordinator', coordinatorSchema);
