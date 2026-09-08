// Shared validators for auth + expenses + categories routes.
const { body, param, query } = require('express-validator');

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters'),
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters'),
  body('currency').optional().isISO4217().withMessage('Invalid currency code'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
];

const expenseRules = [
  body('amount')
    .isFloat({ min: 0.01, max: 1e9 })
    .withMessage('Amount must be a positive number')
    .toFloat(),
  body('category_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('category_id must be a positive integer')
    .toInt(),
  body('category').optional({ nullable: true }).trim().isLength({ min: 1, max: 40 }),
  body('date')
    .if((value, { req }) => req.method === 'POST' ? true : value !== undefined)
    .isISO8601({ strict: true })
    .withMessage('Date must be a valid ISO date (YYYY-MM-DD)')
    .customSanitizer((v) => v.slice(0, 10)),
  body('notes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be ≤ 500 characters'),
];

const categoryRules = [
  body('name').trim().isLength({ min: 1, max: 40 }).withMessage('Name must be 1-40 characters'),
  body('icon').optional().trim().isLength({ max: 8 }),
  body('color').optional().matches(/^#[0-9a-fA-F]{6}$/).withMessage('Color must be hex, e.g. #f97316'),
];

const idParam = [param('id').isInt({ min: 1 }).toInt()];

const filterQuery = [
  query('from').optional().isISO8601({ strict: true }).withMessage('from must be YYYY-MM-DD'),
  query('to').optional().isISO8601({ strict: true }).withMessage('to must be YYYY-MM-DD'),
  query('category_id').optional().isInt({ min: 1 }).toInt(),
  query('search').optional().trim().escape(),
  query('min_amount').optional().isFloat({ min: 0 }).toFloat(),
  query('max_amount').optional().isFloat({ min: 0 }).toFloat(),
];

module.exports = { registerRules, loginRules, expenseRules, categoryRules, idParam, filterQuery };
