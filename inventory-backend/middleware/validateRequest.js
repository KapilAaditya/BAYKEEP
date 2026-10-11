const { ZodError } = require('zod');

/**
 * Higher-order middleware to validate incoming request bodies against a Zod schema
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // Parse and sanitize request body according to schema
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod issues into clear field-specific error messages
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: formattedErrors,
        });
      }

      // Pass any unexpected errors to Express error handler
      next(error);
    }
  };
};

module.exports = validateRequest;