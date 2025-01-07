# TRakk API

A rental item management system with customer tracking and license management.

## Project Structure

```
TRakk_API/
│
├── models/              # Database models
├── routes/             # Route definitions
├── middleware/         # Custom middleware
├── services/          # Business logic and services
├── config/            # Configuration files
├── uploads/           # File uploads directory
│
├── server.js          # Main application file
├── .env               # Environment variables
└── package.json       # Project dependencies
```

## Features

1. **User Management**
   - Phone number based authentication
   - OTP verification via Twilio
   - Location tracking

2. **License Management**
   - Multiple subscription plans
   - Usage limits
   - Expiry tracking

3. **Rental Item Management**
   - Add/Edit/Delete items
   - Image management
   - Availability tracking

4. **Customer Management**
   - Customer registration
   - Rental history
   - ID verification

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env`:
   ```env
   PORT=8000
   MONGODB_URI=your_mongodb_uri
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   ```

3. Start the server:
   ```bash
   npm start
   ```

## API Documentation

### User Endpoints

- POST `/api/users/register` - Register new user
- POST `/api/users/verify-otp` - Verify registration OTP
- POST `/api/users/login` - User login
- POST `/api/users/verify-login-otp` - Verify login OTP

### License Endpoints

- GET `/api/licenses/plans` - View available plans
- POST `/api/licenses/purchase` - Purchase license
- GET `/api/licenses/status/:userId` - Check license status

### Rental Item Endpoints

- POST `/api/rental-items` - Add new item
- GET `/api/rental-items/user/:userId` - Get user's items
- PUT `/api/rental-items/:itemId` - Update item
- DELETE `/api/rental-items/:itemId` - Delete item

### Customer Endpoints

- POST `/api/customers` - Add new customer
- GET `/api/customers/owner/:userId` - Get all customers
- POST `/api/customers/:customerId/rent-item` - Rent item
- POST `/api/customers/:customerId/return-item/:rentalId` - Return item
- GET `/api/customers/:customerId/rental-history` - View history

## Security Features

- Phone verification using Twilio
- License-based access control
- Input validation using Joi
- Secure file uploads
- Rate limiting for OTP attempts

## Development

Run in development mode:
```bash
npm run dev
```

## License

MIT License
