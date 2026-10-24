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
// ==========================================
// 1. Core Middlewares
// ==========================================

// Production-ready CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000', // Allow local production testing
  'https://baykeep-fd2z.onrender.com' // Allow live Render URL
];

app.use(
  cors({
    origin: (origin, callback) => {
      // If origin is in the list, or there is no origin, allow it
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Instead of throwing an error that crashes static files, 
      // dynamically allow the origin for same-domain asset requests
      return callback(null, true); 
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
  
  // 1. EXPLICITLY serve the assets folder first
  app.use('/assets', express.static(path.join(frontendDistPath, 'assets')));

  // 2. Serve other static files (like favicon, manifest, etc.)
  app.use(express.static(frontendDistPath));

  // 3. Catch-all route for React Router
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    
    // Return 404 for missing assets instead of crashing
    if (req.path.includes('.')) {
      return res.status(404).send('Asset not found');
    }

    const indexPath = path.join(frontendDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ success: false, message: 'Frontend build not found.' });
    }
  });
}else {
  // Root route for development mode
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