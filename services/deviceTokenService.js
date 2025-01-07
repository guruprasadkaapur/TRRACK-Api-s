import jwt from 'jsonwebtoken';
import DeviceToken from '../models/deviceTokenModel.js';
import crypto from 'crypto';

class DeviceTokenService {
    constructor() {
        this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        this.TOKEN_EXPIRY = '30d'; // Token expires in 30 days
    }

    // Generate a unique device ID
    generateDeviceId() {
        return crypto.randomBytes(16).toString('hex');
    }

    // Generate JWT token
    generateToken(userId, deviceInfo) {
        return jwt.sign(
            { 
                userId,
                deviceId: deviceInfo.deviceId,
                type: 'device_token'
            },
            this.JWT_SECRET,
            { expiresIn: this.TOKEN_EXPIRY }
        );
    }

    // Verify JWT token
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET);
            const deviceToken = await DeviceToken.findOne({
                token,
                isActive: true,
                userId: decoded.userId
            });

            if (!deviceToken) {
                throw new Error('Invalid token');
            }

            // Check if device is restricted
            if (deviceToken.isRestricted) {
                throw new Error('Device access restricted. Contact admin.');
            }

            return decoded;
        } catch (error) {
            throw new Error('Invalid token or restricted access');
        }
    }

    // Create new device token with single device restriction
    async createDeviceToken(userId, deviceInfo, options = {}) {
        try {
            // Check if user already has a device token
            const existingDeviceTokens = await DeviceToken.find({ 
                userId, 
                isActive: true 
            });

            // If single device mode is enabled and user already has a device
            if (options.singleDeviceMode && existingDeviceTokens.length > 0) {
                // Deactivate existing tokens
                await DeviceToken.updateMany(
                    { userId, isActive: true },
                    { 
                        isActive: false, 
                        isRestricted: true,
                        restrictionReason: 'single_device',
                        deactivatedAt: new Date()
                    }
                );
            }

            // Generate device ID if not provided
            if (!deviceInfo.deviceId) {
                deviceInfo.deviceId = this.generateDeviceId();
            }

            // Generate JWT token
            const token = this.generateToken(userId, deviceInfo);

            // Calculate expiry date
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

            // Create device token record
            const deviceToken = new DeviceToken({
                userId,
                token,
                deviceInfo: {
                    ...deviceInfo,
                    lastActive: new Date()
                },
                expiresAt,
                isRestricted: options.singleDeviceMode || false,
                restrictionReason: options.singleDeviceMode ? 'single_device' : null
            });

            await deviceToken.save();
            return { 
                token, 
                deviceId: deviceInfo.deviceId,
                isRestricted: deviceToken.isRestricted
            };
        } catch (error) {
            console.error('Error creating device token:', error);
            throw new Error('Failed to create device token');
        }
    }

    // Update last active timestamp
    async updateLastActive(token) {
        await DeviceToken.updateOne(
            { token },
            { 
                'deviceInfo.lastActive': new Date(),
                isActive: true
            }
        );
    }

    // Deactivate device token
    async deactivateToken(token) {
        await DeviceToken.updateOne(
            { token },
            { isActive: false }
        );
    }

    // Get all active devices for a user
    async getUserDevices(userId) {
        return await DeviceToken.find({
            userId,
            isActive: true
        }).select('deviceInfo createdAt');
    }

    // Deactivate other devices with admin-level control
    async deactivateOtherDevices(userId, currentDeviceId, adminId = null) {
        try {
            const result = await DeviceToken.updateMany(
                { 
                    userId, 
                    'deviceInfo.deviceId': { $ne: currentDeviceId },
                    isActive: true 
                },
                { 
                    isActive: false,
                    isRestricted: true,
                    restrictionReason: 'admin_restriction',
                    restrictedBy: adminId,
                    deactivatedAt: new Date() 
                }
            );

            return result.modifiedCount;
        } catch (error) {
            console.error('Error deactivating other devices:', error);
            throw new Error('Failed to deactivate other devices');
        }
    }

    // Reactivate device token
    async reactivateDeviceToken(deviceId, adminId) {
        try {
            const result = await DeviceToken.updateOne(
                { 
                    'deviceInfo.deviceId': deviceId,
                    isRestricted: true 
                },
                { 
                    isActive: true,
                    isRestricted: false,
                    restrictionReason: null,
                    restrictedBy: null
                }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            console.error('Error reactivating device token:', error);
            throw new Error('Failed to reactivate device token');
        }
    }
}

export default new DeviceTokenService();
