// src/modules/auth/auth.routes.js
const { Router } = require('express');
const ctrl = require('./auth.controller');
const { requireAuth } = require('../../middlewares/auth');

const router = Router();

router.post('/auth/register', ctrl.register);
router.post('/auth/login', ctrl.login);
router.get('/auth/me', requireAuth, ctrl.me);
router.post('/auth/logout', ctrl.logout); // เผื่ออยากกดออกจากระบบ

module.exports = router;
