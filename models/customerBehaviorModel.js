import mongoose from 'mongoose';

const customerBehaviorSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    unique: true
  },
  strikes: [{
    date: {
      type: Date,
      required: true
    },
    reason: {
      type: String,
      required: true,
      enum: [
        'late_return',
        'damaged_item',
        'payment_issue',
        'violation_of_terms',
        'no_show',
        'other'
      ]
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentalItem',
      required: true
    },
    severity: {
      type: String,
      required: true,
      enum: ['minor', 'moderate', 'severe']
    },
    description: String,
    additionalCharges: Number,
    resolved: {
      type: Boolean,
      default: false
    },
    resolutionDate: Date,
    resolutionNotes: String
  }],
  status: {
    type: String,
    required: true,
    enum: ['good', 'warning', 'suspended', 'banned'],
    default: 'good'
  },
  totalStrikes: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: String
}, {
  timestamps: true
});

// Method to add a strike
customerBehaviorSchema.methods.addStrike = async function(strikeData) {
  this.strikes.push(strikeData);
  this.totalStrikes += 1;
  this.lastUpdated = new Date();

  // Update customer status based on strikes
  if (this.totalStrikes >= 10 || this.strikes.filter(s => s.severity === 'severe').length >= 3) {
    this.status = 'banned';
  } else if (this.totalStrikes >= 7 || this.strikes.filter(s => s.severity === 'severe').length >= 2) {
    this.status = 'suspended';
  } else if (this.totalStrikes >= 4 || this.strikes.filter(s => s.severity === 'severe').length >= 1) {
    this.status = 'warning';
  }

  await this.save();
  return this.status;
};

// Method to resolve a strike
customerBehaviorSchema.methods.resolveStrike = async function(strikeId, resolutionNotes) {
  const strike = this.strikes.id(strikeId);
  if (!strike) throw new Error('Strike not found');

  strike.resolved = true;
  strike.resolutionDate = new Date();
  strike.resolutionNotes = resolutionNotes;
  this.totalStrikes -= 1;
  this.lastUpdated = new Date();

  // Update status based on current strikes
  if (this.totalStrikes < 4 && this.strikes.filter(s => !s.resolved && s.severity === 'severe').length === 0) {
    this.status = 'good';
  }

  await this.save();
  return this.status;
};

export default mongoose.model('CustomerBehavior', customerBehaviorSchema);
