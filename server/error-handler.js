/**
 * SWF API Error Handler
 * Standardizes API error responses with consistent status codes and formats
 */

// Error response class
class ApiError extends Error {
  constructor(statusCode, message, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode || `ERR_${statusCode}`;
    this.timestamp = new Date().toISOString();
  }
}

// Factory functions for common error types
const errorTypes = {
  badRequest: (message, errorCode) => new ApiError(400, message || 'Bad Request', errorCode),
  unauthorized: (message, errorCode) => new ApiError(401, message || 'Unauthorized', errorCode),
  forbidden: (message, errorCode) => new ApiError(403, message || 'Forbidden', errorCode),
  notFound: (message, errorCode) => new ApiError(404, message || 'Resource Not Found', errorCode),
  conflict: (message, errorCode) => new ApiError(409, message || 'Conflict', errorCode),
  internal: (message, errorCode) => new ApiError(500, message || 'Internal Server Error', errorCode),
  serviceUnavailable: (message, errorCode) => new ApiError(503, message || 'Service Unavailable', errorCode)
};

// Middleware for handling errors
const errorHandler = (err, req, res, next) => {
  console.error(`API Error: ${err.message}`);
  
  // If the error is one of our ApiError instances, use its properties
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      code: err.errorCode,
      timestamp: err.timestamp
    });
  }
  
  // For unhandled errors, send a generic 500 response
  return res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred',
    code: 'ERR_INTERNAL',
    timestamp: new Date().toISOString()
  });
};

// Middleware for handling 404 routes
const notFoundHandler = (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'ERR_ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString()
  });
};

// Utility for async route handlers to automatically catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ApiError,
  errorTypes,
  errorHandler,
  notFoundHandler,
  asyncHandler
};