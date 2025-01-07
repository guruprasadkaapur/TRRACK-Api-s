import twilio from 'twilio';
import crypto from 'crypto';

class OTPService {
    constructor() {
        this.client = null;
        this.otpCache = new Map();
        this.initTwilio();
    }

    initTwilio() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        
        if (accountSid && authToken) {
            this.client = twilio(accountSid, authToken);
        }
    }

    generateOTP() {
        // Always return a fixed OTP in development
        return process.env.NODE_ENV === 'development' 
            ? '918302' 
            : crypto.randomInt(100000, 999999).toString();
    }

    async sendOTP(phoneNumber, otpType = 'registration') {
        try {
            // Generate OTP
            const otp = this.generateOTP();
            
            // Store OTP with timestamp and type
            const otpData = {
                otp,
                timestamp: Date.now(),
                attempts: 0,
                type: otpType
            };
            
            this.otpCache.set(phoneNumber, otpData);

            // Always log OTP in development mode
            console.log(`Development Mode - OTP for ${phoneNumber} (${otpType}): ${otp}`);

            // If Twilio is configured, send SMS
            if (this.client) {
                const message = await this.client.messages.create({
                    body: `Your ${otpType} OTP for TRakk is: ${otp}. Valid for 10 minutes.`,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: phoneNumber
                });
                
                return {
                    success: true,
                    message: 'OTP sent successfully',
                    messageId: message.sid,
                    otp
                };
            } else {
                // Development mode: return OTP in response
                return {
                    success: true,
                    message: 'OTP generated (Development Mode)',
                    otp
                };
            }
        } catch (error) {
            console.error('Error sending OTP:', error);
            throw new Error('Failed to send OTP');
        }
    }

    async verifyOTP(phoneNumber, userOTP, otpType = 'registration') {
        try {
            const otpData = this.otpCache.get(phoneNumber);
            
            // Debug logging
            console.log('Verification Debug:', {
                phoneNumber,
                userOTP,
                otpType,
                cachedOTP: otpData ? otpData.otp : 'NO OTP FOUND',
                cachedType: otpData ? otpData.type : 'N/A'
            });
            
            // Check if OTP exists
            if (!otpData) {
                return {
                    success: false,
                    message: 'No OTP found. Please request a new OTP.'
                };
            }

            // Check OTP type
            if (otpData.type !== otpType) {
                return {
                    success: false,
                    message: 'Invalid OTP type'
                };
            }

            // Check if OTP is expired (10 minutes)
            const timeDiff = Date.now() - otpData.timestamp;
            if (timeDiff > 10 * 60 * 1000) {
                this.otpCache.delete(phoneNumber);
                return {
                    success: false,
                    message: 'OTP expired. Please request a new OTP.'
                };
            }

            // Check attempts
            if (otpData.attempts >= 3) {
                this.otpCache.delete(phoneNumber);
                return {
                    success: false,
                    message: 'Too many attempts. Please request a new OTP.'
                };
            }

            // Verify OTP
            if (otpData.otp === userOTP) {
                this.otpCache.delete(phoneNumber);
                return {
                    success: true,
                    message: 'OTP verified successfully'
                };
            }

            // Increment attempts
            otpData.attempts += 1;
            this.otpCache.set(phoneNumber, otpData);

            return {
                success: false,
                message: `Invalid OTP. ${3 - otpData.attempts} attempts remaining.`
            };
        } catch (error) {
            console.error('Error verifying OTP:', error);
            throw new Error('Failed to verify OTP');
        }
    }

    // Clean up expired OTPs periodically
    startCleanupTask() {
        setInterval(() => {
            const now = Date.now();
            for (const [phoneNumber, otpData] of this.otpCache.entries()) {
                if (now - otpData.timestamp > 10 * 60 * 1000) {
                    this.otpCache.delete(phoneNumber);
                }
            }
        }, 5 * 60 * 1000); // Run every 5 minutes
    }
}

// Create a singleton instance
const otpService = new OTPService();
otpService.startCleanupTask();

export default otpService;
