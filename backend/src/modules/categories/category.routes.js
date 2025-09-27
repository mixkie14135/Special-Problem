const { Router } = require('express');
const ctrl = require('./category.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');

const router = Router();

router.get('/categories', ctrl.list);
router.post('/categories', requireAuth, requireAdmin, ctrl.create);
router.patch('/categories/:id', requireAuth, requireAdmin, ctrl.update);
router.delete('/categories/:id', requireAuth, requireAdmin, ctrl.remove);

module.exports = router;
