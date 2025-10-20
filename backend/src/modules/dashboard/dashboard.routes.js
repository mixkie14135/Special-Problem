// backend/src/modules/dashboard/dashboard.routes.js
const { Router } = require('express');
const ctrl = require('./dashboard.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
console.log('[ROUTE] dashboard loaded');

const router = Router();

router.get('/admin/overview', requireAuth, requireAdmin, ctrl.overview);
router.get('/admin/requests/recent', requireAuth, requireAdmin, ctrl.recentRequests);
router.get('/admin/site-visits/upcoming', requireAuth, requireAdmin, ctrl.upcomingVisits);
router.get('/admin/quotations/pending', requireAuth, requireAdmin, ctrl.pendingQuotations);

module.exports = router;
