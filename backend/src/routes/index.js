// Router mounting for /api.
const express = require('express');
const { registerRules, loginRules, expenseRules, categoryRules, idParam, filterQuery } = require('../middleware/validators');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const expenseController = require('../controllers/expenseController');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

// ---------- Auth ----------
router.post('/auth/register', registerRules, validate, authController.register);
router.post('/auth/login', loginRules, validate, authController.login);
router.get('/auth/me', auth, authController.me);
router.put('/auth/me', auth, authController.updateProfile);

// ---------- Categories ----------
router.get('/categories', auth, categoryController.listCategories);
router.post('/categories', auth, categoryRules, validate, categoryController.createCategory);
router.put('/categories/:id', auth, idParam, validate, categoryRules, validate, categoryController.updateCategory);
router.delete('/categories/:id', auth, idParam, validate, categoryController.deleteCategory);

// ---------- Expenses ----------
router.get('/expenses', auth, filterQuery, validate, expenseController.listExpenses);
router.post('/expenses', auth, expenseRules, validate, expenseController.createExpense);
router.put('/expenses/:id', auth, idParam, validate, expenseRules, validate, expenseController.updateExpense);
router.delete('/expenses/:id', auth, idParam, validate, expenseController.deleteExpense);
router.get('/expenses/summary', auth, expenseController.summary);
router.get('/expenses/export', auth, filterQuery, validate, expenseController.exportCsv);
router.get('/expenses/backup', auth, expenseController.backup);
router.post('/expenses/restore', auth, expenseController.restore);

// ---------- Health ----------
router.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

module.exports = router;
