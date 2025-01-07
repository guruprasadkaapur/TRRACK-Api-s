import deviceTokenService from '../services/deviceTokenService.js';

const deviceAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        try {
            const decoded = await deviceTokenService.verifyToken(token);
            req.user = { userId: decoded.userId, deviceId: decoded.deviceId };
            
            // Update last active timestamp
            await deviceTokenService.updateLastActive(token);
            
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Invalid token' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error authenticating device', error: error.message });
    }
};

export default deviceAuth;
