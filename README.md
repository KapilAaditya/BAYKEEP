# Baykeep — Inventory & Ledger Management System

> A modern, multi-user inventory tracking and supplier accounts payable web application built with the MERN stack (MongoDB, Express.js, React, Node.js) and Tailwind CSS.

---

## Overview

**Baykeep** helps businesses and warehouse teams maintain accurate inventory counts, monitor stock movements, and manage dealer payables. It features configurable low-stock threshold alerts that visually flag depleted products, a multi-user role permission system, and a flexible ledger to track purchase invoices and partial supplier payments over time.

---

## Key Features

### 1. Inventory & Stock Management
* **Catalog Management**: Add, update, and categorize items with SKU codes, unit costs, retail prices, and storage locations.
* **Custom Low-Stock Visual Alerts ("Turn Red")**: Set individual safety stock thresholds per item. When stock falls to or below the limit, items are automatically highlighted with red warning badges and prioritized on the dashboard.
* **Stock In / Stock Out Workflows**: Quick stock movements with required reason logging (e.g., shipment arrival, sales dispatch, damaged inventory).
* **Audit Trail**: Every inventory adjustment is recorded with previous count, new count, timestamp, and the responsible user.

### 2. Supplier & Dealer Ledger (Accounts Payable)
* **Dealer Balances**: Track total billed amounts, total payments made, and current outstanding balances owed to each supplier.
* **Flexible Installment Payments**: Log partial payments of any amount at any time (Cash, UPI, Bank Transfer, Cheque).
* **Installment History & Counts**: View complete payment logs showing exactly how many times a dealer was paid, along with reference IDs and dates.

### 3. Purchase Bills & Invoicing
* **Multi-Item Invoice Builder**: Record incoming shipments across multiple products in a single bill.
* **Automated Stocking**: Submitting a purchase bill automatically restocks item quantities and updates the dealer's outstanding balance.
* **Bill Reversal / Voiding**: Safely delete mistaken bills with automatic rollbacks for stock quantities, supplier debts, and associated payments.

### 4. Role-Based Access Control (RBAC)
* **Admin**: Complete system access, role assignment, category configuration, and record deletion.
* **Manager**: Create and edit products, manage purchase bills, record payments, and adjust inventory.
* **Staff**: View catalog levels and record basic stock-in / stock-out transactions.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Axios, React Router v7 |
| **Backend** | Node.js, Express.js, Zod (Request Validation) |
| **Database** | MongoDB, Mongoose ODM |
| **Security** | JSON Web Tokens (JWT), Bcrypt.js, CORS |

---

## Project Structure

```text
baykeep/
├── backend/
│   ├── config/             # Database connection (MongoDB Atlas)
│   ├── controllers/        # Route controllers (Auth, Items, Suppliers, Purchases, etc.)
│   ├── middleware/         # JWT verification, Role authorization, Zod validation, Error handling
│   ├── models/             # Mongoose schemas & Zod validation rules
│   ├── routes/             # Express API route declarations
│   ├── utils/              # Token generation utilities
│   ├── .env                # Backend environment variables
│   ├── package.json
│   └── server.js           # Server entry point
│
└── frontend/
    ├── public/             # Brand SVGs and favicons
    ├── src/
    │   ├── api/            # Pre-configured Axios client with auth interceptors
    │   ├── components/     # Shared components (Layout, ProtectedRoute, Logo)
    │   ├── context/        # Global AuthContext & state management
    │   ├── pages/          # Application views (Dashboard, Inventory, Suppliers, Purchases, etc.)
    │   ├── App.jsx         # Route registry
    │   ├── index.css       # Tailwind CSS directives
    │   └── main.jsx
    ├── tailwind.config.js
    └── vite.config.js
