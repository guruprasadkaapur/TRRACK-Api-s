import morgan from 'morgan';

// Custom token for request body
morgan.token('body', (req) => {
  const body = { ...req.body };
  
  // Remove sensitive information
  if (body.password) body.password = '***';
  if (body.otp) body.otp = '***';
  if (body.token) body.token = '***';
  
  return JSON.stringify(body);
});

// Custom format
const logFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms :body';

// Create logger middleware
const logger = morgan(logFormat, {
  skip: (req, res) => {
    // Skip logging for successful static content requests
    return req.url.startsWith('/uploads/') && res.statusCode === 200;
  },
  stream: {
    write: (message) => {
      // Add timestamp to log
      const log = `${new Date().toISOString()} ${message}`;
      console.log(log);
      
      // Here you could also write to a file or external logging service
    }
  }
});

export default logger;
