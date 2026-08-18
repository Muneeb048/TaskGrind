/**
 * Wraps an async Express route handler so any thrown error is
 * automatically forwarded to the next() error-handling middleware.
 *
 * @param {Function} fn - Async route handler (req, res, next)
 * @returns {Function}  - Wrapped handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
