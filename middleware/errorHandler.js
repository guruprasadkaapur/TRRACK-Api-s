const errorHandler = (err, req, res, next) => {
  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // MongoDB Duplicate Key Error
  if (err.code === 11000) {
    return res.status(409).json({
      status: 'error',
      message: 'Duplicate record found',
      error: Object.keys(err.keyPattern).join(', ') + ' already exists'
    });
  }

  // MongoDB Validation Error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      error: Object.values(err.errors).map(e => e.message)
    });
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
      error: 'Please provide a valid authentication token'
    });
  }

  // Default Error
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export default errorHandler;
