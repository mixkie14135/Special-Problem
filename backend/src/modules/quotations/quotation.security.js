// quotation.security.js
const prisma = require('../../config/prisma');

exports.requireCustomerOwnsQuotation = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: 'error', message: 'invalid quotation id' });
    }
    const q = await prisma.quotation.findUnique({
      where: { id },
      include: { request: { select: { customerId: true } } }
    });
    if (!q) return res.status(404).json({ status: 'error', message: 'Quotation not found' });
    if (q.request.customerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    req.quotation = q;
    next();
  } catch (e) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};
