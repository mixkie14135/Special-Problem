// backend/src/modules/site-visits/siteVisit.security.js
const prisma = require('../../config/prisma');

exports.requireCustomerOwnsVisit = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: 'error', message: 'invalid site-visit id' });
    }

    const visit = await prisma.siteVisit.findUnique({
      where: { id },
      include: { request: { select: { customerId: true } } }
    });

    if (!visit) return res.status(404).json({ status: 'error', message: 'SiteVisit not found' });
    if (visit.request.customerId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    req.siteVisit = visit; // เผื่อ controller อยากใช้ต่อ
    next();
  } catch (e) {
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};
