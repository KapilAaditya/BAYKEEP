const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { z } = require('zod');

/* =========================================================
   1. Zod Validation Schemas (Request Payload Validation)
========================================================= */

// Schema for User Registration
const registerUserSchema = z.object({
    name: z
        .string({ required_error: 'Name is required' })
        .trim()
        .min(2, 'Name must be at least 2 characters long')
        .max(50, 'Name cannot exceed 50 characters'),
    email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .email('Please provide a valid email address'),
    password: z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters long'),
    role: z
        .enum(['admin', 'manager', 'staff'], {
            errorMap: () => ({ message: 'Role must be admin, manager, or staff' }),
        })
        .default('staff'),
});

// Schema for User Login
const loginUserSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .trim()
        .email('Please provide a valid email address'),
    password: z
        .string({ required_error: 'Password is required' })
        .min(1, 'Password cannot be empty'),
});

// Schema for Admin Updating a User's Role
const updateUserRoleSchema = z.object({
    role: z.enum(['admin', 'manager', 'staff'], {
        errorMap: () => ({ message: 'Role must be admin, manager, or staff' }),
    }),
});

/* =========================================================
   2. Mongoose Schema & Model (Database Persistence)
========================================================= */

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false, // Hidden from queries by default
        },
        role: {
            type: String,
            enum: ['admin', 'manager', 'staff'],
            default: 'staff',
        },
    },
    {
        timestamps: true,
    }
);

// Encrypt password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Password verification method
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Export both the Mongoose Model and Zod schemas
module.exports = {
    User,
    registerUserSchema,
    loginUserSchema,
    updateUserRoleSchema,
};