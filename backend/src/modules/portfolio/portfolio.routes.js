// src\modules\portfolio\portfolio.routes.js
const { Router } = require('express');
const ctrl = require('./portfolio.controller');
const { requireAuth, requireAdmin } = require('../../middlewares/auth');
const { uploadPortfolio } = require('../../utils/upload');

const router = Router();

router.get('/portfolio', ctrl.list);
router.post('/portfolio', requireAuth, requireAdmin, uploadPortfolio.single('image'), ctrl.create);
router.patch('/portfolio/:id', requireAuth, requireAdmin, uploadPortfolio.single('image'), ctrl.update);
router.delete('/portfolio/:id', requireAuth, requireAdmin, ctrl.remove);

module.exports = router;
