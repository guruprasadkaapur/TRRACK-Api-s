import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';

dotenv.config();

const createFirstAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find user by phone number
    const user = await User.findOne({ phoneNumber: '9999888877' });
    if (!user) {
      console.error('User not found');
      process.exit(1);
    }

    // Update user to admin
    user.role = 'admin';
    await user.save();

    console.log('Successfully created first admin:');
    console.log({
      _id: user._id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

createFirstAdmin();
