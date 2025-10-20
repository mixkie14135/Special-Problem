// src\modules\quotations\quotation.controller.js
const prisma = require('../../config/prisma');
const { toPublicUrl, deleteFile } = require('../../config/storage')

let transporter, mailFrom;
try { ({ transporter, mailFrom } = require('../../config/mailer')); }
catch { mailFrom = () => '"Bon Plus Thai" <no-reply@bonplusthai.local>'; }

// helper
function asNumber(x) {
  if (x === null || x === undefined || x === '') return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Admin: upload/create quotation (PDF)
 * POST /api/quotations/:requestId (multipart: file + optional fields)
 */
exports.create = async (req, res) => {
  try {
    const requestId = Number(req.params.requestId);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ status: 'error', message: 'requestId invalid' });
    }
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'file (pdf) is required' });
    }

    const { totalPrice, validUntil } = req.body || {};
    const price = asNumber(totalPrice);
    if (totalPrice !== undefined && Number.isNaN(price)) {
      return res.status(400).json({ status: 'error', message: 'totalPrice must be number' });
    }
    const validDate = validUntil ? new Date(validUntil) : null;
    if (validUntil && isNaN(validDate.getTime())) {
      return res.status(400).json({ status: 'error', message: 'validUntil must be ISO date' });
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: { customer: true }
    });
    if (!request) return res.status(404).json({ status: 'error', message: 'ServiceRequest not found' });

    // Guard: ต้องมีนัดหมาย → APPROVED → DONE ก่อน
    const latestVisit = await prisma.siteVisit.findFirst({
      where: { requestId },
      orderBy: { scheduledAt: 'desc' }
    });
    if (!latestVisit) {
      return res.status(409).json({ status: 'error', message: 'ยังไม่มีนัดหมายดูหน้างานสำหรับคำขอนี้ (ต้องนัดหมายก่อน)' });
    }
    if (latestVisit.customerResponse !== 'APPROVED') {
      return res.status(409).json({ status: 'error', message: 'ลูกค้ายังไม่ยืนยันนัดหมายดูหน้างาน (ต้องให้ลูกค้า APPROVED ก่อน)' });
    }
    if (latestVisit.status !== 'DONE') {
      return res.status(409).json({ status: 'error', message: 'ยังไม่ได้ทำการดูหน้างานให้เสร็จ (แอดมินต้องเปลี่ยนสถานะนัดหมายเป็น DONE ก่อน)' });
    }

    const q = await prisma.quotation.create({
      data: {
        fileUrl: toPublicUrl(req.file.path),
        totalPrice: price === null ? null : price,
        validUntil: validDate,
        status: 'PENDING',
        request: { connect: { id: requestId } }
      }
    });

    await prisma.serviceRequest.update({ where: { id: requestId }, data: { status: 'QUOTED' } });

    try {
      if (transporter && process.env.SMTP_HOST && process.env.SMTP_USER && request.customer?.email) {
        await transporter.sendMail({
          from: mailFrom(),
          to: request.customer.email,
          subject: `ใบเสนอราคา (คำขอ #${request.id})`,
          html: `
            <p>เรียน คุณ ${request.contactFirstName} ${request.contactLastName}</p>
            <p>เราได้ส่งใบเสนอราคาแล้ว กรุณาเข้าสู่ระบบเพื่อดูรายละเอียดและยอมรับ/ปฏิเสธ</p>
            <p><strong>ยอดรวม:</strong> ${price ?? '-'}<br/>
               <strong>ใช้ได้ถึง:</strong> ${validDate ? validDate.toLocaleDateString('th-TH') : '-'}</p>
          `
        });
      }
    } catch (e) { console.error('Email error (quotation create):', e.message); }

    return res.status(201).json({ status: 'ok', data: q });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/**
 * Admin: update (re-upload / adjust fields)
 * PATCH /api/quotations/:id (multipart optional)
 */
exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: 'error', message: 'invalid id' });
    }

    const { totalPrice, validUntil } = req.body || {};
    const data = {};

    if (totalPrice !== undefined) {
      const price = asNumber(totalPrice);
      if (Number.isNaN(price)) {
        return res.status(400).json({ status: 'error', message: 'totalPrice must be number' });
      }
      data.totalPrice = price;
    }

    if (validUntil !== undefined) {
      if (!validUntil) data.validUntil = null;
      else {
        const d = new Date(validUntil);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ status: 'error', message: 'validUntil must be ISO date' });
        }
        data.validUntil = d;
      }
    }

    if (req.file) {
      const prev = await prisma.quotation.findUnique({ where: { id } });
      data.fileUrl = toPublicUrl(req.file.path);
      if (prev?.fileUrl && prev.fileUrl !== data.fileUrl) {
        deleteFile(prev.fileUrl);
      }
    }

    const q = await prisma.quotation.update({ where: { id }, data });
    return res.json({ status: 'ok', data: q });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ status: 'error', message: 'Quotation not found' });
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/**
 * Shared: get quotations by request (admin or owner)
 * GET /api/quotations/:requestId
 * query: ?latest=true   → คืนใบล่าสุดใบเดียว
 *        (ค่าอื่น/ไม่ส่ง) → คืนลิสต์ทั้งหมด (ล่าสุดก่อน)
 */
exports.getByRequest = async (req, res) => {
  try {
    const requestId = Number(req.params.requestId);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ status: 'error', message: 'invalid requestId' });
    }

    const latest = String(req.query.latest || '').toLowerCase() === 'true';

    if (latest) {
      const q = await prisma.quotation.findFirst({
        where: { requestId },
        orderBy: { createdAt: 'desc' },
        include: { request: { select: { id: true, customerId: true } } }
      });
      if (!q) return res.status(404).json({ status: 'error', message: 'Quotation not found' });

      // สิทธิ์: admin หรือเจ้าของคำขอ
      if (req.user.role !== 'ADMIN' && q.request.customerId !== req.user.id) {
        return res.status(403).json({ status: 'error', message: 'Forbidden' });
      }
      return res.json({ status: 'ok', data: q });
    }

    // คืนทั้งหมด
    const list = await prisma.quotation.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
      include: { request: { select: { id: true, customerId: true } } }
    });
    if (!list.length) return res.status(404).json({ status: 'error', message: 'Quotation not found' });

    if (req.user.role !== 'ADMIN' && list[0].request.customerId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    // ตัดฟิลด์ request ออกจากแต่ละแถวถ้าต้องการ
    return res.json({ status: 'ok', data: list });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

exports.listAll = async (req, res) => {
  try {
    const {
      requestId,
      customerId,
      status,              // PENDING | APPROVED | REJECTED
      dateFrom,            // ISO string
      dateTo,              // ISO string
      q,                   // keyword: title/ชื่อลูกค้า/อีเมล
      page = 1,
      pageSize = 20,
      sort = 'createdAt:desc'
    } = req.query;

    const where = {};
    if (requestId) where.requestId = Number(requestId);
    if (status) where.status = status;

    // เงื่อนไขเกี่ยวข้องกับคำขอ/ลูกค้า
    const andReq = [];
    if (customerId) andReq.push({ customerId: Number(customerId) });
    if (q) {
      const kw = String(q);
      andReq.push({
        OR: [
          { title: { contains: kw, mode: 'insensitive' } },
          { customer: { email: { contains: kw, mode: 'insensitive' } } },
          { customer: { firstName: { contains: kw, mode: 'insensitive' } } },
          { customer: { lastName:  { contains: kw, mode: 'insensitive' } } },
        ]
      });
    }
    if (andReq.length) where.request = { AND: andReq };

    // ช่วงวันที่ (อิง createdAt ของใบเสนอราคา)
    if (dateFrom || dateTo) {
      const gte = dateFrom ? new Date(dateFrom) : undefined;
      const lte = dateTo ? new Date(dateTo) : undefined;
      where.createdAt = { ...(gte && { gte }), ...(lte && { lte }) };
    }

    const [sortField, sortDir] = String(sort).split(':');
    const take = Math.max(1, Math.min(100, Number(pageSize)));
    const skip = Math.max(0, (Number(page) - 1) * take);

    const [items, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        orderBy: { [sortField || 'createdAt']: (sortDir === 'asc' ? 'asc' : 'desc') },
        skip,
        take,
        include: {
          request: {
            select: {
              id: true, title: true, status: true,
              customerId: true,
              customer: { select: { firstName: true, lastName: true, email: true } }
            }
          }
        }
      }),
      prisma.quotation.count({ where })
    ]);

    return res.json({
      status: 'ok',
      data: items,
      meta: { page: Number(page), pageSize: take, total, totalPages: Math.ceil(total / take) }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};


/**
 * Customer: approve/reject quotation
 * POST /api/quotations/:id/decision
 * body: { decision: "APPROVED" | "REJECTED" }
 * -> sync ServiceRequest.status
 */
exports.decision = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { decision } = req.body || {};
    const allowed = ['APPROVED', 'REJECTED'];
    if (!allowed.includes(decision)) {
      return res.status(400).json({ status: 'error', message: 'decision must be APPROVED or REJECTED' });
    }

    // โหลดพร้อม owner (requireCustomerOwnsQuotation ทำไปแล้ว แต่กันสองชั้น)
    const q = await prisma.quotation.findUnique({
      where: { id },
      include: { request: { include: { customer: true } } }
    });
    if (!q) return res.status(404).json({ status: 'error', message: 'Quotation not found' });
    if (req.user.role !== 'ADMIN' && q.request.customerId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    // อัปเดต Quotation + sync Request
    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: decision }
    });

    const newReqStatus = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    await prisma.serviceRequest.update({
      where: { id: q.requestId },
      data: { status: newReqStatus }
    });

    // แจ้งแอดมิน (optional)
    try {
      const adminTo = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
      if (transporter && adminTo) {
        await transporter.sendMail({
          from: mailFrom(),
          to: adminTo,
          subject: `ลูกค้าตัดสินใจใบเสนอราคา (#${q.id}) – ${decision}`,
          html: `
            <p>คำขอ #${q.requestId}: ${q.request.title}</p>
            <p>ลูกค้า: ${q.request.customer?.firstName} ${q.request.customer?.lastName} (${q.request.customer?.email})</p>
            <p>การตัดสินใจ: <strong>${decision}</strong></p>
          `
        });
      }
    } catch (e) { console.error('Email error (quotation decision):', e.message); }

    return res.json({ status: 'ok', data: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/**
 * (Optional) ลูกค้าดูใบเสนอราคาของตัวเองทั้งหมด (ลิสต์ล่าสุดก่อน)
 * GET /api/my/quotations
 */
exports.listMine = async (req, res) => {
  try {
    const items = await prisma.quotation.findMany({
      where: { request: { customerId: req.user.id } },
      orderBy: { createdAt: 'desc' },
      include: { request: { select: { id: true, title: true, status: true } } }
    });
    return res.json({ status: 'ok', data: items });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};
