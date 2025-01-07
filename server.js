import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import userRoutes from './routes/userRoutes.js';
import licenseRoutes from './routes/licenseRoutes.js';
import rentalItemRoutes from './routes/rentalItemRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import coordinatorRoutes from './routes/coordinatorRoutes.js';

// Middleware
import errorHandler from './middleware/errorHandler.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';
import logger from './middleware/logger.js';
import security from './middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Security Middleware
app.use(security.helmet);
app.use(security.mongoSanitize);
app.use(security.xss);
app.use(security.customHeaders);

// Basic Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging
app.use(logger);

// Rate Limiting
app.use('/api/', apiLimiter);
app.use('/api/users/(login|register)', authLimiter);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/rental-items', rentalItemRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/coordinators', coordinatorRoutes);

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
