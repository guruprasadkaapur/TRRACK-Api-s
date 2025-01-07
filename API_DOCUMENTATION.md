# TRakk API Documentation

## Overview
TRakk is a rental item management system API that enables business owners to manage their rental inventory, customers, and rental operations.

## Base URL
```
http://localhost:8000/api
```

## Authentication
All endpoints require proper authentication. Authentication is handled through phone number verification (OTP).

## Rate Limiting
- API endpoints: 100 requests per 15 minutes
- Auth endpoints (login/register): 5 requests per 15 minutes

## Common HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## ID Types
- `businessOwnerId`: MongoDB ObjectId of the registered business owner (main user)
- `customerId`: MongoDB ObjectId of a customer
- `rentalItemId`: MongoDB ObjectId of a rental item
- `licenseId`: MongoDB ObjectId of a business license

## API Endpoints

### 1. User Management

#### Register Business Owner
```http
POST /users/register
```
Request Body:
```json
{
    "fullName": "string",
    "phoneNumber": "10 digits",
    "pincode": "string",
    "zone": "string",
    "area": "string",
    "district": "string",
    "state": "string"
}
```
Response:
```json
{
    "message": "User registered successfully. Please verify OTP.",
    "businessOwnerId": "string",
    "success": true,
    "otp": "string" // In development mode only
}
```

#### Verify OTP
```http
POST /users/verify-otp
```
Request Body:
```json
{
    "businessOwnerId": "string",
    "otp": "string"
}
```
Response:
```json
{
    "message": "OTP verified successfully",
    "verified": true
}
```

### 2. License Management

#### View License Plans
```http
GET /licenses/plans
```
Response:
```json
{
    "Basic": {
        "price": 999,
        "duration": 30,
        "features": ["Basic Rental Management", "Email Support"],
        "limits": {
            "maxItems": 10,
            "maxImagesPerItem": 3,
            "maxActiveRentals": 5
        }
    },
    "Premium": {
        "price": 2999,
        "duration": 30,
        "features": ["Advanced Features"],
        "limits": {
            "maxItems": 50,
            "maxImagesPerItem": 5,
            "maxActiveRentals": 25
        }
    },
    "Enterprise": {
        "price": 9999,
        "duration": 30,
        "features": ["Enterprise Features"],
        "limits": {
            "maxItems": -1,
            "maxImagesPerItem": 10,
            "maxActiveRentals": -1
        }
    }
}
```

#### Purchase License
```http
POST /licenses/purchase
```
Request Body:
```json
{
    "businessOwnerId": "string",
    "planType": "Basic|Premium|Enterprise"
}
```
Response:
```json
{
    "message": "License purchased successfully",
    "license": {
        "type": "string",
        "expiryDate": "date",
        "features": ["string"],
        "limits": {
            "maxItems": "number",
            "maxImagesPerItem": "number",
            "maxActiveRentals": "number"
        }
    }
}
```

### 3. Customer Management

#### Add New Customer
```http
POST /customers
```
Request Body:
```json
{
    "businessOwnerId": "string",
    "fullName": "string",
    "phoneNumber": "10 digits",
    "email": "string",
    "address": "string",
    "idProof": {
        "type": "AADHAAR|VOTER_ID|DRIVING_LICENSE",
        "number": "string"
    },
    "remarks": "string"
}
```
Response:
```json
{
    "message": "Customer added successfully",
    "customer": {
        "customerId": "string",
        "fullName": "string",
        "phoneNumber": "string",
        "email": "string"
    }
}
```

#### Get Customer Details
```http
GET /customers/{customerId}
```
Response:
```json
{
    "customer": {
        "fullName": "string",
        "phoneNumber": "string",
        "email": "string",
        "address": "string",
        "idProof": {
            "type": "AADHAAR|VOTER_ID|DRIVING_LICENSE",
            "number": "string"
        },
        "totalRentals": "number",
        "activeRentals": "number"
    }
}
```

### 4. Rental Item Management

#### Add New Item
```http
POST /rental-items
```
Request Body:
```json
{
    "businessOwnerId": "string",
    "itemName": "string",
    "category": "string",
    "description": "string",
    "rentalPrice": "number",
    "rentalDuration": "daily",
    "imageUrls": ["string"]
}
```
Response:
```json
{
    "message": "Rental item added successfully",
    "item": {
        "rentalItemId": "string",
        "itemName": "string",
        "category": "string",
        "rentalPrice": {
            "amount": "number",
            "duration": "string"
        },
        "availabilityStatus": "available|not available"
    }
}
```

#### Get All Items
```http
GET /rental-items
```
Response:
```json
{
    "items": [{
        "rentalItemId": "string",
        "itemName": "string",
        "category": "string",
        "rentalPrice": "number",
        "availabilityStatus": "available|not available"
    }]
}
```

#### Search Items
```http
GET /rental-items/search?query=camera
```
Response:
```json
{
    "items": [{
        "rentalItemId": "string",
        "itemName": "string",
        "category": "string",
        "rentalPrice": "number"
    }]
}
```

### 5. Rental Operations

#### Rent Item to Customer
```http
POST /customers/{customerId}/rent-item
```
Request Body:
```json
{
    "rentalItemId": "string",
    "rentalDuration": "number",
    "deposit": "number"
}
```
Response:
```json
{
    "message": "Item rented successfully",
    "rental": {
        "rentalItemId": "string",
        "itemName": "string",
        "startDate": "date",
        "returnDate": "date",
        "deposit": "number",
        "payableAmount": "number",
        "status": "active"
    }
}
```

#### Return Item
```http
POST /customers/{customerId}/return-item
```
Request Body:
```json
{
    "rentalItemId": "string"
}
```
Response:
```json
{
    "message": "Item returned successfully",
    "rental": {
        "rentalItemId": "string",
        "status": "returned",
        "returnDate": "date"
    }
}
```

#### View Active Rentals for a Customer
```http
GET /customers/{customerId}/active-rentals
```
Example:
```http
GET /customers/677bae18a660819efd8a9470/active-rentals  # 677bae18a660819efd8a9470 is the customerId
```
Response:
```json
{
    "activeRentals": [{
        "rentalItemId": "string",
        "itemName": "string",
        "startDate": "date",
        "returnDate": "date",
        "deposit": "number",
        "payableAmount": "number",
        "status": "active"
    }],
    "count": "number"
}
```
Note: This endpoint returns active rentals for a specific customer identified by their `customerId`.

#### Get All Active Rentals
```http
GET /customers/active-rentals
```
This endpoint returns all active rentals across all customers, sorted by return date (closest first).

Response:
```json
{
    "totalActiveRentals": "number",
    "rentals": [{
        "customerName": "string",
        "customerPhone": "string",
        "itemName": "string",
        "itemCategory": "string",
        "rentalDuration": "number",
        "startDate": "date",
        "returnDate": "date",
        "deposit": "number",
        "payableAmount": "number",
        "pricePerDay": "number",
        "daysRemaining": "number"
    }]
}
```

#### View All Rentals
```http
GET /customers/rented-items/{businessOwnerId}?status=active|returned|all
```
Response:
```json
{
    "totalRentals": "number",
    "activeRentals": "number",
    "returnedRentals": "number",
    "rentals": [{
        "customerId": "string",
        "customerName": "string",
        "customerPhone": "string",
        "rentalItemId": "string",
        "itemName": "string",
        "itemCategory": "string",
        "rentalDuration": "number",
        "startDate": "date",
        "returnDate": "date",
        "deposit": "number",
        "payableAmount": "number",
        "status": "active|returned",
        "pricePerDay": "number"
    }]
}
```

#### View Customer's Rental History
```http
GET /customers/{customerId}/rental-history
```
Response:
```json
{
    "rentalHistory": [{
        "rentalItemId": "string",
        "itemName": "string",
        "rentalDuration": "number",
        "startDate": "date",
        "returnDate": "date",
        "status": "active|returned",
        "payableAmount": "number"
    }]
}
```

### 6. Payment Operations

#### Record Payment
```http
POST /payments/record
```
Request Body:
```json
{
    "rentalId": "string",
    "amount": "number",
    "paymentMode": "CASH|UPI|CARD"
}
```
Response:
```json
{
    "message": "Payment recorded successfully",
    "payment": {
        "paymentId": "string",
        "amount": "number",
        "status": "completed",
        "timestamp": "date"
    }
}
```

#### Get Payment History
```http
GET /payments/history/{businessOwnerId}
```
Response:
```json
{
    "totalPayments": "number",
    "payments": [{
        "paymentId": "string",
        "customerName": "string",
        "itemName": "string",
        "amount": "number",
        "paymentMode": "CASH|UPI|CARD",
        "timestamp": "date"
    }]
}
```

## Error Handling
All endpoints return error responses in the following format:
```json
{
    "message": "Error description",
    "error": "Detailed error information"
}
```

## Security Features
1. Phone number verification
2. Rate limiting
3. Input validation
4. MongoDB query sanitization
5. XSS protection
6. Secure headers

## License Plans and Features
1. Basic Plan:
   - 10 rental items
   - 3 images per item
   - 5 active rentals
   - Basic support

2. Premium Plan:
   - 50 rental items
   - 5 images per item
   - 25 active rentals
   - Priority support
   - Analytics dashboard

3. Enterprise Plan:
   - Unlimited rental items
   - 10 images per item
   - Unlimited active rentals
   - 24/7 support
   - Advanced analytics
   - Custom features
