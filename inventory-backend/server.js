const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ==========================================
// 1. Core Middlewares
// ==========================================

// Production-ready CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
  })
);

app.use(express.json());

// ==========================================
// 2. Health Check Route
// ==========================================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 3. Mount Application Routes
// ==========================================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/items', require('./routes/itemRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/purchases', require('./routes/purchaseRoutes'));
app.use('/api/supplier-payments', require('./routes/supplierPaymentRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// ==========================================
// 3.5. Serve Frontend in Production
// ==========================================
if (process.env.NODE_ENV === 'production') {
  // Corrected from 'frontend' to 'client' to match your repository folder
  const frontendDistPath = path.join(__dirname, '../client/dist');

  app.use(express.static(frontendDistPath));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(frontendDistPath, 'index.html'));
  });
}

// ==========================================
// 4. Error Handling Middlewares
// ==========================================
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
app.use(notFound);
app.use(errorHandler);

// ==========================================
// 5. Start Server
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});