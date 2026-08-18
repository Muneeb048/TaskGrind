import ApiError from "../utils/ApiError.js";

/**
 * Global error-handling middleware.
 * Must be registered AFTER all routes.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  // Known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join("; ") });
  }

  // Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  // Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === "CastError") {
    return res.status(400).json({ error: `Invalid ${err.path}: ${err.value}` });
  }

  // Unexpected errors
  console.error("Unhandled error:", err);
  return res.status(500).json({ error: "Internal server error" });
};

export default errorHandler;
