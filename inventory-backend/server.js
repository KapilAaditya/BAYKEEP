const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
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
// ==========================================
// 3.5. Serve Frontend in Production
// ==========================================
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.resolve(__dirname, '../client/dist');
  console.log('Serving frontend from:', frontendDistPath);
  console.log('Directory exists:', fs.existsSync(frontendDistPath));

  // Serve static assets with proper configuration
  app.use(express.static(frontendDistPath, {
    maxAge: '1d', // Cache static assets for performance
    etag: true
  }));

  // Catch-all route for React Router (only for non-file requests)
  app.get('*', (req, res, next) => {
    // If the request is for an API route or a static file with an extension, skip it
    if (req.path.startsWith('/api') || req.path.includes('.')) {
      return next();
    }

    const indexPath = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({
        success: false,
        message: `Frontend build files not found at ${frontendDistPath}`,
      });
    }
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Inventory Backend API is running successfully!',
      healthCheck: '/api/health',
    });
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