// backend/src/modules/quotations/quotation.routes.js
const { Router } = require('express');
const ctrl = require('./quotation.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const { uploadQuotation } = require('../../utils/upload');
const { requireCustomerOwnsQuotation } = require('./quotation.security');
console.log('[ROUTE] quotation.routes loaded');
const router = Router();

// Admin
router.post('/quotations/:requestId(\\d+)', requireAuth, requireAdmin, uploadQuotation.single('file'), ctrl.create); // upload pdf
router.patch('/quotations/:id(\\d+)', requireAuth, requireAdmin, uploadQuotation.single('file'), ctrl.update);

// Shared (admin หรือเจ้าของคำขอ)
router.get('/quotations/:requestId(\\d+)', requireAuth, ctrl.getByRequest);
// Admin: list all quotations (with filters)
router.get('/quotations', requireAuth, requireAdmin, ctrl.listAll);

// Customer
router.post('/quotations/:id(\\d+)/decision', requireAuth, requireCustomerOwnsQuotation, ctrl.decision);

// (ออปชัน) ลูกค้าดูของตัวเองทั้งหมด
router.get('/my/quotations', requireAuth, ctrl.listMine);

module.exports = router;

