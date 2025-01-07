import mongoose from 'mongoose';

const deviceTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    deviceInfo: {
        deviceId: {
            type: String,
            required: true
        },
        platform: String,
        model: String,
        lastActive: Date,
        ipAddress: String
    },
    // New fields for device restriction
    isRestricted: {
        type: Boolean,
        default: false
    },
    restrictionReason: {
        type: String,
        enum: ['single_device', 'admin_restriction', null],
        default: null
    },
    restrictedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    deactivatedAt: Date,
    expiresAt: Date
}, { timestamps: true });

// Index for faster queries and token uniqueness
deviceTokenSchema.index({ token: 1 }, { unique: true });
deviceTokenSchema.index({ userId: 1 });
deviceTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

const DeviceToken = mongoose.model('DeviceToken', deviceTokenSchema);
export default DeviceToken;
