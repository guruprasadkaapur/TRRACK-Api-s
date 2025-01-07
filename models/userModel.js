import mongoose from 'mongoose';
import Joi from 'joi';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  pincode: {
    type: String,
    required: function() {
      return this.role !== 'admin';
    }
  },
  zone: {
    type: String,
    required: function() {
      return this.role !== 'admin';
    }
  },
  area: {
    type: String,
    required: function() {
      return this.role !== 'admin';
    }
  },
  district: {
    type: String,
    required: function() {
      return this.role !== 'admin';
    }
  },
  state: {
    type: String,
    required: function() {
      return this.role !== 'admin';
    }
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  singleDeviceMode: {
    type: Boolean,
    default: false
  },
  singleDeviceModeSetBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  password: {
    type: String,
    required: function() {
      return this.role === 'admin';
    }
  },
  otp: {
    code: {
      type: String,
      required: false
    },
    expiresAt: {
      type: Date,
      required: false
    }
  }
}, { timestamps: true });

// Validation schema
export const userValidationSchema = Joi.object({
  fullName: Joi.string().required(),
  phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required(),
  pincode: Joi.string().pattern(/^[0-9]{6}$/).when('role', {
    is: 'admin',
    then: Joi.string().optional(),
    otherwise: Joi.string().required()
  }),
  zone: Joi.string().optional(),
  area: Joi.string().optional(),
  district: Joi.string().optional(),
  state: Joi.string().optional()
});

const User = mongoose.model('User', userSchema);
export default User;
