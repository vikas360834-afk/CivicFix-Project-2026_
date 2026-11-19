import { body, validationResult } from "express-validator";

/** Run express-validator chain and return first error as 422, or continue. */
export const validate = (chain) => async (req, res, next) => {
  await Promise.all(chain.map((c) => c.run(req)));
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(422).json({
    error: errors.array()[0].msg,
    fields: errors.array().map((e) => e.path),
  });
};