import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';
import readline from 'readline';
import crypto from 'crypto';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const validatePhoneNumber = (phoneNumber) => {
  return /^[0-9]{10}$/.test(phoneNumber);
};

const validatePincode = (pincode) => {
  return /^[0-9]{6}$/.test(pincode);
};

const createProductionAdmin = async () => {
  try {
    // Generate a secure secret key
    const secretKey = crypto.randomBytes(32).toString('hex');
    console.log('\n=== Production Admin Creation ===\n');
    console.log('IMPORTANT: Save this secret key securely. It will be required for future admin operations:');
    console.log(secretKey);
    console.log('\n================================\n');

    // Get admin details
    const fullName = await question('Enter admin full name: ');
    const phoneNumber = await question('Enter admin phone number (10 digits): ');
    
    if (!validatePhoneNumber(phoneNumber)) {
      throw new Error('Invalid phone number format. Must be 10 digits.');
    }

    const pincode = await question('Enter pincode (6 digits): ');
    if (!validatePincode(pincode)) {
      throw new Error('Invalid pincode format. Must be 6 digits.');
    }

    const zone = await question('Enter zone: ');
    const area = await question('Enter area: ');
    const district = await question('Enter district: ');
    const state = await question('Enter state: ');

    // Confirm creation
    const confirm = await question('\nConfirm admin creation? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Admin creation cancelled');
      process.exit(0);
    }

    // Connect to MongoDB
    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      throw new Error('User with this phone number already exists');
    }

    // Create admin user
    const admin = new User({
      fullName,
      phoneNumber,
      pincode,
      zone,
      area,
      district,
      state,
      role: 'admin',
      isPhoneVerified: true // Since this is a production admin
    });

    await admin.save();

    console.log('\nAdmin created successfully!');
    console.log({
      _id: admin._id,
      fullName: admin.fullName,
      phoneNumber: admin.phoneNumber,
      role: admin.role
    });

    // Store secret key in .env
    console.log('\nIMPORTANT: Add this line to your .env file:');
    console.log(`ADMIN_SECRET_KEY=${secretKey}`);

  } catch (error) {
    console.error('\nError:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    rl.close();
  }
};

// Add validation for environment
if (process.env.NODE_ENV !== 'production') {
  console.log('WARNING: This script should only be run in production environment!');
  process.exit(1);
}

createProductionAdmin();
