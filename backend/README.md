# SplitEasy Backend - Node.js/Express API

A comprehensive expense splitting and financial management API built with Node.js, Express.js, and MongoDB. This application provides robust features for managing group expenses, settlements, wallets, and financial tracking.

## 🚀 Features

### Core Functionality
- **User Authentication & Authorization** - JWT-based auth with role-based access control (RBAC)
- **Group Management** - Create and manage expense groups with member administration
- **Expense Tracking** - Add, edit, and categorize expenses with flexible splitting options
- **Settlement System** - Automated settlement calculations with cash flow optimization
- **Wallet Management** - Personal wallet tracking with transfer capabilities
- **Global Settlements** - Cross-group settlement management
- **Excel Integration** - Import/export expenses via Excel files
- **Activity Logging** - Comprehensive audit trail for all user actions
- **Notifications** - Real-time notifications for expense and settlement activities

### Advanced Features
- **Balance Calculation** - Precise financial calculations using Decimal128
- **Settlement Optimization** - Minimizes number of transactions needed
- **Multiple Split Types** - Equal, exact amount, and percentage-based splits
- **File Upload Support** - Secure file handling with validation
- **Pagination & Filtering** - Efficient data retrieval with search capabilities
- **Error Handling** - Comprehensive error management with proper HTTP status codes

## 🛠 Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Joi for request validation
- **File Upload**: Multer for handling file uploads
- **Excel Processing**: xlsx for Excel file operations
- **Logging**: Winston for application logging
- **Security**: Helmet, CORS, rate limiting

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5.0 or higher)
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spliteasy-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=8000
   DATABASE_URL=mongodb://localhost:27017/spliteasy
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRATION=7d
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   UPLOAD_PATH=uploads/
   MAX_FILE_SIZE=5242880
   ```

4. **Create required directories**
   ```bash
   mkdir uploads logs
   ```

5. **Start MongoDB**
   Make sure MongoDB is running on your system.

6. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:8000/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "gender": "Male"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <jwt-token>
```

### Group Endpoints

#### Create Group
```http
POST /groups
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "title": "Trip to Paris",
  "description": "Vacation expenses",
  "type": "Travel",
  "currency": "USD"
}
```

#### Get User Groups
```http
GET /groups?page=1&limit=20
Authorization: Bearer <jwt-token>
```

#### Add Member to Group
```http
POST /groups/:groupId/members
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "userId": "user-id-here",
  "isAdmin": false
}
```

### Expense Endpoints

#### Create Expense
```http
POST /expenses
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "groupId": "group-id-here",
  "description": "Dinner at restaurant",
  "amount": 120.50,
  "currency": "USD",
  "category": "Food",
  "splitType": "equal",
  "note": "Great meal!"
}
```

#### Get Group Expenses
```http
GET /expenses/:groupId?page=1&limit=20&category=Food
Authorization: Bearer <jwt-token>
```

#### Upload Excel File
```http
POST /expenses/:groupId/upload
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

file: <excel-file>
```

#### Download Excel Report
```http
GET /expenses/:groupId/download?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <jwt-token>
```

### Settlement Endpoints

#### Get Group Balances
```http
GET /settle/:groupId/balances
Authorization: Bearer <jwt-token>
```

#### Get Suggested Settlements
```http
GET /settle/:groupId/settlements
Authorization: Bearer <jwt-token>
```

#### Record Settlement
```http
POST /settle/:groupId/record
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "fromUserId": "debtor-user-id",
  "toUserId": "creditor-user-id",
  "amount": 50.00,
  "message": "Settling dinner expense"
}
```

#### Accept Settlement
```http
POST /settle/:settlementId/accept
Authorization: Bearer <jwt-token>
```

### Wallet Endpoints

#### Create Wallet
```http
POST /wallets
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Main Checking",
  "category": "bank",
  "balance": 1000.00
}
```

#### Transfer Between Wallets
```http
POST /wallets/transfer
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "fromWalletId": "source-wallet-id",
  "toWalletId": "destination-wallet-id",
  "amount": 100.00,
  "description": "Monthly savings transfer"
}
```

## 🗄 Database Models

### User Model
- Authentication and profile information
- Role-based permissions
- Global settlement preferences

### Group Model
- Group metadata and settings
- Owner and member management
- Currency and categorization

### Expense Model
- Expense details with Decimal128 precision
- Multiple split types support
- File attachments and categorization

### Settlement Models
- Group-specific settlements
- Global cross-group settlements
- Status tracking and approval workflow

### Wallet Model
- Personal financial account tracking
- Balance management with precision
- Transaction history

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **Rate Limiting** - Protection against brute force attacks
- **Input Validation** - Comprehensive request validation
- **CORS Configuration** - Cross-origin request security
- **Helmet Security** - Security headers and protection
- **File Upload Security** - Type and size validation

## 📊 Business Logic

### Balance Calculation Algorithm
The application implements sophisticated balance calculation considering:
- User payments (credits)
- User expense shares (debits)
- Group settlements
- Global settlement adjustments
- Decimal precision handling

### Settlement Optimization
Cash flow minimization algorithm that:
- Calculates net balances between users
- Minimizes the number of required transactions
- Handles different settlement modes (separate, auto-adjust, hybrid)

### Excel Processing
Robust Excel import/export functionality:
- Validates data integrity
- Handles date parsing and formatting
- Supports batch expense creation
- Generates comprehensive reports

## 🚦 Error Handling

The API implements comprehensive error handling with:
- Proper HTTP status codes
- Detailed error messages
- Validation error reporting
- Centralized error middleware
- Development vs production error responses

## 📝 Logging

Winston-based logging system with:
- Different log levels (error, warn, info, debug)
- File-based logging for production
- Console logging for development
- Request/response logging with Morgan

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=8000
DATABASE_URL=mongodb://your-production-db-url
JWT_SECRET=your-production-jwt-secret
JWT_EXPIRATION=7d
ALLOWED_ORIGINS=https://your-frontend-domain.com
UPLOAD_PATH=/app/uploads/
MAX_FILE_SIZE=5242880
LOG_LEVEL=info
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8000
CMD ["npm", "start"]
```

## 📈 Performance Considerations

- **Database Indexing** - Optimized indexes for query performance
- **Pagination** - Efficient data retrieval for large datasets
- **Connection Pooling** - MongoDB connection optimization
- **Caching Strategy** - Redis integration ready for scaling
- **File Size Limits** - Configurable upload limits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the error logs for debugging

## 🔄 API Versioning

Current API version: v1
Base URL: `/api/v1` (future versions will use `/api/v2`, etc.)

## 📋 Changelog

### Version 1.0.0
- Initial release with full feature set
- User authentication and authorization
- Group and expense management
- Settlement system with optimization
- Wallet management
- Excel import/export
- Comprehensive API documentation