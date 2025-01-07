import express from 'express';
import User from '../models/userModel.js';
import otpService from '../services/otpService.js';
import License from '../models/licenseModel.js';
import Joi from 'joi';
import { userValidationSchema } from '../models/userModel.js';
import RentalItem from '../models/rentalItemModel.js';
import { isPincodeValid, getPincodeData, pincodeData } from '../utils/pincodeZones.js';
import deviceTokenService from '../services/deviceTokenService.js';
import deviceAuth from '../middleware/deviceAuthMiddleware.js';

const router = express.Router();

// Centralized OTP Cache Management
const otpCache = {
  data: new Map(),
  
  set(key, value, ttl = 10 * 60 * 1000) {
    this.data.set(key, {
      ...value,
      createdAt: Date.now()
    });
    
    // Auto-cleanup
    setTimeout(() => {
      this.data.delete(key);
    }, ttl);
  },
  
  get(key) {
    const entry = this.data.get(key);
    if (!entry) return null;
    
    // Check expiry
    if (Date.now() - entry.createdAt > 10 * 60 * 1000) {
      this.data.delete(key);
      return null;
    }
    
    return entry;
  },
  
  delete(key) {
    this.data.delete(key);
  }
};

// Validation Middleware
const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || !/^[0-9]{10}$/.test(phoneNumber)) {
    throw new Error('Invalid phone number format');
  }
};

// Validation schemas
const loginSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required()
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { 
      fullName, 
      phoneNumber, 
      pincode, 
      zone, 
      area, 
      district, 
      state 
    } = req.body;

    // Validate inputs
    validatePhoneNumber(phoneNumber);

    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ 
        success: false,
        message: 'Full name is required and must be at least 2 characters long' 
      });
    }

    // Validate pincode
    if (!isPincodeValid(pincode)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid pincode',
        validPincodes: Object.keys(pincodeData)
      });
    }

    const locationData = getPincodeData(pincode);

    // Validate zone and area
    if (zone && !locationData.zones.includes(zone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid zone for the provided pincode',
        availableZones: locationData.zones
      });
    }

    if (area && !locationData.areas.includes(area)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid area for the provided pincode',
        availableAreas: locationData.areas
      });
    }

    // Check existing user
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(409).json({ 
        success: false,
        message: 'Phone number already registered',
        isPhoneVerified: existingUser.isPhoneVerified
      });
    }

    // Generate OTP
    const otpResponse = await otpService.sendOTP(phoneNumber, 'registration');

    // Store registration data with OTP
    const registrationData = {
      fullName: fullName.trim(),
      phoneNumber,
      pincode,
      zone: zone || locationData.zones[0],
      area: area || locationData.areas[0],
      district: locationData.district,
      state: locationData.state
    };

    // Cache OTP and registration data
    otpCache.set(`register:${phoneNumber}`, {
      ...registrationData,
      otp: otpResponse.otp
    });

    res.json({
      success: true,
      message: 'OTP sent successfully',
      locationData: {
        zones: locationData.zones,
        areas: locationData.areas,
        district: locationData.district,
        state: locationData.state
      },
      ...(process.env.NODE_ENV === 'development' && { otp: otpResponse.otp })
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Registration request failed', 
      error: error.message 
    });
  }
});

// Verify Registration OTP
router.post('/register-verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp, deviceInfo = {} } = req.body;

    // Validate inputs
    validatePhoneNumber(phoneNumber);

    if (!otp) {
      return res.status(400).json({ 
        success: false,
        message: 'OTP is required' 
      });
    }

    // Retrieve cached registration data
    const cachedData = otpCache.get(`register:${phoneNumber}`);
    if (!cachedData) {
      return res.status(400).json({ 
        success: false,
        message: 'Registration request expired. Please restart registration.' 
      });
    }

    // Verify OTP
    const verificationResult = await otpService.verifyOTP(phoneNumber, otp, 'registration');
    if (!verificationResult.success) {
      return res.status(400).json(verificationResult);
    }

    // Create new user
    const user = new User({
      fullName: cachedData.fullName,
      phoneNumber: cachedData.phoneNumber,
      pincode: cachedData.pincode,
      zone: cachedData.zone,
      area: cachedData.area,
      district: cachedData.district,
      state: cachedData.state,
      isPhoneVerified: true
    });

    await user.save();

    // Create device token
    const deviceTokenResponse = await deviceTokenService.createDeviceToken(
      user._id, 
      deviceInfo
    );

    // Clear OTP cache
    otpCache.delete(`register:${phoneNumber}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        pincode: user.pincode,
        zone: user.zone,
        area: user.area,
        district: user.district,
        state: user.state,
        isPhoneVerified: user.isPhoneVerified
      },
      deviceToken: deviceTokenResponse.token,
      deviceId: deviceTokenResponse.deviceId
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'OTP verification failed', 
      error: error.message 
    });
  }
});

// Initiate Login (Request OTP)
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Validate inputs
    validatePhoneNumber(phoneNumber);

    // Check if user exists
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found. Please register first.' 
      });
    }

    // Generate Login OTP
    const otpResponse = await otpService.sendOTP(phoneNumber, 'login');

    // Cache login OTP
    otpCache.set(`login:${phoneNumber}`, {
      userId: user._id
    });

    res.json({
      success: true,
      message: 'Login OTP sent successfully',
      ...(process.env.NODE_ENV === 'development' && { otp: otpResponse.otp })
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Login request failed', 
      error: error.message 
    });
  }
});

// Verify Login OTP
router.post('/verify-login-otp', async (req, res) => {
  try {
    const { phoneNumber, otp, deviceInfo = {} } = req.body;

    // Validate inputs
    validatePhoneNumber(phoneNumber);

    if (!otp) {
      return res.status(400).json({ 
        success: false,
        message: 'OTP is required' 
      });
    }

    // Retrieve cached login data
    const cachedData = otpCache.get(`login:${phoneNumber}`);
    if (!cachedData) {
      return res.status(400).json({ 
        success: false,
        message: 'Login request expired. Please request a new OTP.' 
      });
    }

    // Verify OTP
    const verificationResult = await otpService.verifyOTP(phoneNumber, otp, 'login');
    if (!verificationResult.success) {
      return res.status(400).json(verificationResult);
    }

    // Find user
    const user = await User.findById(cachedData.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Create device token
    const deviceTokenResponse = await deviceTokenService.createDeviceToken(
      user._id, 
      deviceInfo
    );

    // Clear login OTP cache
    otpCache.delete(`login:${phoneNumber}`);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        _id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        pincode: user.pincode,
        zone: user.zone,
        area: user.area,
        district: user.district,
        state: user.state,
        isPhoneVerified: user.isPhoneVerified
      },
      deviceToken: deviceTokenResponse.token,
      deviceId: deviceTokenResponse.deviceId
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Login verification failed', 
      error: error.message 
    });
  }
});

// Verify OTP for registration
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP
    const verificationResult = await otpService.verifyOTP(user.phoneNumber, otp, 'registration');
    if (!verificationResult.success) {
      return res.status(400).json(verificationResult);
    }

    // Update user verification status
    user.isPhoneVerified = true;
    await user.save();

    res.json({
      message: 'Phone number verified successfully',
      user: {
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        pincode: user.pincode,
        zone: user.zone,
        area: user.area,
        district: user.district,
        state: user.state,
        isPhoneVerified: user.isPhoneVerified
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
});

// Login with phone number
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, deviceInfo = {} } = req.body;

    // Validate phone number
    if (!phoneNumber || !/^[0-9]{10}$/.test(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Find user
    let user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has single device restriction
    const existingDevices = await DeviceToken.find({ 
      userId: user._id, 
      isActive: true 
    });

    // If user has existing active devices and single device mode is on
    if (existingDevices.length > 0 && user.singleDeviceMode) {
      return res.status(403).json({ 
        message: 'Multiple device login is not allowed. Please contact admin or co-admin to deactivate other devices.',
        existingDevices: existingDevices.map(device => device.deviceInfo.deviceId)
      });
    }

    // Send OTP using OTP service
    const otpResponse = await otpService.sendOTP(phoneNumber, 'login');

    // Create device token with single device mode option
    const deviceTokenResponse = await deviceTokenService.createDeviceToken(
      user._id, 
      deviceInfo, 
      { singleDeviceMode: user.singleDeviceMode }
    );

    res.json({
      message: otpResponse.message,
      userId: user._id,
      success: otpResponse.success,
      deviceRestricted: deviceTokenResponse.isRestricted,
      ...(process.env.NODE_ENV === 'development' && { 
        otp: otpResponse.otp,
        deviceId: deviceTokenResponse.deviceId 
      })
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating OTP', error: error.message });
  }
});

// Verify login OTP
router.post('/verify-login-otp', async (req, res) => {
  try {
    const { userId, otp, deviceInfo } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP using OTP service
    const verificationResult = await otpService.verifyOTP(user.phoneNumber, otp, 'login');
    if (!verificationResult.success) {
      return res.status(400).json(verificationResult);
    }

    // Create device token
    const { token, deviceId } = await deviceTokenService.createDeviceToken(user._id, {
      deviceInfo: deviceInfo || {}
    });

    res.json({
      message: 'Login successful',
      user: {
        _id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        isPhoneVerified: user.isPhoneVerified
      },
      deviceToken: token,
      deviceId
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying login OTP', error: error.message });
  }
});

// Get user's active devices
router.get('/devices', deviceAuth, async (req, res) => {
  try {
    const devices = await deviceTokenService.getUserDevices(req.user.userId);
    res.json({ devices });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching devices', error: error.message });
  }
});

// Logout from current device
router.post('/logout', deviceAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    await deviceTokenService.deactivateToken(token);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging out', error: error.message });
  }
});

// Logout from all other devices
router.post('/logout-other-devices', deviceAuth, async (req, res) => {
  try {
    await deviceTokenService.deactivateOtherDevices(req.user.userId, req.user.deviceId);
    res.json({ message: 'Logged out from all other devices' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging out from other devices', error: error.message });
  }
});

// Get user details (for debugging)
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user details', error: error.message });
  }
});

// Enable single device mode for a user
router.post('/enable-single-device-mode', deviceAuth, async (req, res) => {
  try {
    const adminId = req.user._id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user to enable single device mode
    user.singleDeviceMode = true;
    user.singleDeviceModeSetBy = adminId;
    await user.save();

    // Deactivate existing device tokens
    await DeviceToken.updateMany(
      { userId: user._id, isActive: true },
      { 
        isActive: false, 
        isRestricted: true,
        restrictionReason: 'single_device',
        deactivatedAt: new Date()
      }
    );

    res.json({ 
      message: 'Single device mode enabled successfully',
      userId: user._id
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error enabling single device mode', 
      error: error.message 
    });
  }
});

// Disable single device mode for a user
router.post('/disable-single-device-mode', deviceAuth, async (req, res) => {
  try {
    const adminId = req.user._id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user to disable single device mode
    user.singleDeviceMode = false;
    user.singleDeviceModeSetBy = null;
    await user.save();

    // Reactivate the most recent device token
    const latestDeviceToken = await DeviceToken.findOne({ 
      userId: user._id, 
      isRestricted: true,
      restrictionReason: 'single_device'
    }).sort({ createdAt: -1 });

    if (latestDeviceToken) {
      latestDeviceToken.isActive = true;
      latestDeviceToken.isRestricted = false;
      latestDeviceToken.restrictionReason = null;
      await latestDeviceToken.save();
    }

    res.json({ 
      message: 'Single device mode disabled successfully',
      userId: user._id
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error disabling single device mode', 
      error: error.message 
    });
  }
});

export default router;
