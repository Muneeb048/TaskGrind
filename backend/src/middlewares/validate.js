import ApiError from "../utils/ApiError.js";

/**
 * Creates a Zod validation middleware.
 *
 * @param {Object} schemas - Object with optional `body`, `params`, `query` Zod schemas
 * @param {import("zod").ZodSchema} [schemas.body]   - Validates req.body
 * @param {import("zod").ZodSchema} [schemas.params] - Validates req.params
 * @param {import("zod").ZodSchema} [schemas.query]  - Validates req.query
 * @returns {Function} Express middleware
 *
 * @example
 * router.post("/projects", validate({ body: createProjectSchema }), controller.create);
 * router.get("/projects/:id", validate({ params: objectIdParamSchema }), controller.get);
 */
const validate = (schemas) => (req, _res, next) => {
  const errors = [];

  for (const [source, schema] of Object.entries(schemas)) {
    if (!schema) continue;

    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const issues = result.error.issues.map(
        (issue) => `${source}.${issue.path.join(".")}: ${issue.message}`
      );
      errors.push(...issues);
    } else {
      // Replace the raw value with the parsed/coerced value
      req[source] = result.data;
    }
  }

  if (errors.length > 0) {
    throw ApiError.badRequest(errors.join("; "));
  }

  next();
};

export default validate;
