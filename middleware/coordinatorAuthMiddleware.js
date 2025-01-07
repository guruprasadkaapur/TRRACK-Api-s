import Coordinator from '../models/coordinatorModel.js';

const checkCoordinatorPermission = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Find coordinator entry
      const coordinator = await Coordinator.findOne({ 
        userId: req.user._id,
        status: 'active'
      });

      if (!coordinator) {
        return res.status(403).json({ 
          message: 'You are not a coordinator or your invitation is pending' 
        });
      }

      // Check if coordinator has required permissions
      const hasPermission = requiredPermissions.every(permission => 
        coordinator.permissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'Insufficient coordinator permissions',
          requiredPermissions,
          availablePermissions: coordinator.permissions
        });
      }

      // Attach coordinator info to request
      req.coordinator = coordinator;
      next();
    } catch (error) {
      res.status(500).json({ 
        message: 'Error checking coordinator permissions', 
        error: error.message 
      });
    }
  };
};

export default checkCoordinatorPermission;
