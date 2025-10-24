// backend/src/modules/dashboard/dashboard.controller.js
const prisma = require('../../config/prisma');
const DEV = process.env.NODE_ENV !== 'production'; // CHANGED: กัน ReferenceError ถ้าอ้าง DEV ด้านล่าง

/**
 * GET /api/admin/overview
 * Query (optional): from, to (ISO)
 * Return: KPIs + breakdown status
 */
exports.overview = async (req, res) => {
  try {
    const { from, to } = req.query || {};
    const whereRange = {};
    if (from || to) {
      whereRange.createdAt = {};
      if (from) whereRange.createdAt.gte = new Date(from);
      if (to) whereRange.createdAt.lte = new Date(to);
    }

    const total = await prisma.serviceRequest.count({ where: whereRange });
    const byStatus = await prisma.serviceRequest.groupBy({
      by: ['status'],
      _count: { status: true },
      where: whereRange
    });

    const [
      pendingSurvey,
      surveyDone,
      quoted,
      approved,
      rejected
    ] = await Promise.all([
      prisma.serviceRequest.count({ where: { ...whereRange, status: 'SURVEY' } }),
      prisma.serviceRequest.count({ where: { ...whereRange, status: 'SURVEY_DONE' } }),
      prisma.serviceRequest.count({ where: { ...whereRange, status: 'QUOTED' } }),
      prisma.serviceRequest.count({ where: { ...whereRange, status: 'APPROVED' } }),
      prisma.serviceRequest.count({ where: { ...whereRange, status: 'REJECTED' } }),
    ]);

    const conversion = quoted ? Math.round((approved / quoted) * 100) : null;

    return res.json({
      status: 'ok',
      data: {
        totals: { requests: total },
        breakdown: byStatus.map(s => ({ status: s.status, count: s._count.status })),
        kpis: { pendingSurvey, surveyDone, quoted, approved, rejected, conversion }
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/**
 * GET /api/admin/site-visits/upcoming
 * Query:
 *   - ช่วงเวลา: days (default 14) หรือ dateFrom + dateTo (ISO)
 *   - กรอง: status=PENDING|DONE|CANCELLED (ว่าง = ทุกสถานะ), q (คำขอ/ชื่อลูกค้า)
 *   - เฉพาะคำขอ/ลูกค้า: requestId, customerId
 *   - page, pageSize
 */
exports.upcomingVisits = async (req, res) => {
  // 1) log ว่า route โดนยิงจริง พร้อมพารามิเตอร์
  console.log('[CTRL] upcomingVisits hit', req.query);

  try {
    const {
      days, dateFrom, dateTo,
      status, q, requestId, customerId,
      page = 1, pageSize = 20,
    } = req.query || {};

    const take = Math.max(1, Math.min(100, Number(pageSize)));
    const skip = Math.max(0, (Number(page) - 1) * take);

    // --- เวลา ---
    const now = new Date();
    let scheduledAt;
    if (dateFrom || dateTo) {
      const gte = dateFrom ? new Date(dateFrom) : undefined;
      const lte = dateTo   ? new Date(dateTo)   : undefined;
      scheduledAt = { ...(gte && { gte }), ...(lte && { lte }) };
    } else {
      const within = Math.max(1, Math.min(365, Number(days || 14)));
      const until = new Date(now.getTime() + within * 86400000);
      scheduledAt = { gte: now, lte: until };
    }

    // --- where หลัก ---
    const where = {
      scheduledAt,
      ...(status    ? { status: String(status) } : {}),
      ...(requestId ? { requestId: Number(requestId) } : {}),
    };

    // --- เงื่อนไขฝั่ง request (สำคัญ: ต้อง { is: ... })
    const requestFilter = {};
    if (customerId) requestFilter.customerId = Number(customerId);
    if (q && String(q).trim()) {
      const kw = String(q).trim();
      requestFilter.OR = [
        { title: { contains: kw } },                                    // CHANGED: ลบ mode
        { customer: { is: { firstName: { contains: kw } } } },          // CHANGED: ลบ mode
        { customer: { is: { lastName:  { contains: kw } } } },          // CHANGED: ลบ mode
      ];
    }
    if (Object.keys(requestFilter).length > 0) {
      where.request = { is: requestFilter };
    }

    // 2) log where ที่จะยิงจริง (เผื่อ type ผิด)
    console.log('[CTRL] upcomingVisits where =', JSON.stringify(where, null, 2));

    const [items, total] = await Promise.all([
      prisma.siteVisit.findMany({
        where,
        skip, take,
        orderBy: [{ id: 'asc' }, { scheduledAt: 'asc' }],
        include: {
          request: {
            select: {
              id: true, publicRef: true, title: true, status: true, customerId: true,
              customer: { select: { firstName: true, lastName: true, phone: true, email: true } }
            }
          }
        }
      }),
      prisma.siteVisit.count({ where }),
    ]);

    // --- ธง "ล่าสุด" ---
    const reqIds = [...new Set(items.map(v => v.requestId))];
    const latestMap = {};
    if (reqIds.length) {
      const latestPerReq = await prisma.siteVisit.findMany({
        where: { requestId: { in: reqIds } },
        select: { id: true, requestId: true, scheduledAt: true },
        orderBy: [{ requestId: 'asc' }, { scheduledAt: 'desc' }, { id: 'desc' }],
      });
      for (const v of latestPerReq) if (!latestMap[v.requestId]) latestMap[v.requestId] = v.id;
    }

    const enhanced = items.map(v => ({
      ...v,
      isLatestForRequest: latestMap[v.requestId] === v.id,
      displayCustomerName: v.request?.customer
        ? `${v.request.customer.firstName} ${v.request.customer.lastName}`.trim()
        : '-',
      displayWhen: new Date(v.scheduledAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }),
    }));

    return res.json({
      status: 'ok',
      data: enhanced,
      meta: { page: Number(page), pageSize: take, total, totalPages: Math.ceil(total / take) }
    });
  } catch (e) {
    // 3) log error แบบเต็ม ๆ
    console.error('upcomingVisits error >>>', e);
    // 4) ส่งรายละเอียดกลับ *เฉพาะ dev* เพื่อวิเคราะห์หน้า FE ได้เลย
    const payload = { status: 'error', message: 'Server error' };
    if (DEV) { // CHANGED: ใช้ DEV ที่เรากำหนดไว้ข้างบน
      payload.debug = {
        name: e?.name,
        code: e?.code,
        message: e?.message,
        meta: e?.meta,
        stack: e?.stack,
      };
    }
    return res.status(500).json(payload);
  }
};

/**
 * GET /api/admin/quotations/pending
 * Query: page, pageSize, q
 */
exports.pendingQuotations = async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize || 20)));
    const skip = Math.max(0, (page - 1) * pageSize);
    const kw = req.query?.q ? String(req.query.q) : null;

    const where = { status: 'PENDING' };
    if (kw) {
      where.request = {
        is: {
          OR: [
            { title: { contains: kw } },                               // CHANGED: ลบ mode
            { customer: { is: { email:     { contains: kw } } } },     // CHANGED:
            { customer: { is: { firstName: { contains: kw } } } },     // CHANGED:
            { customer: { is: { lastName:  { contains: kw } } } },     // CHANGED:
          ]
        }
      };
    }

    const [items, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip, take: pageSize,
        include: {
          request: {
            select: {
              id: true, title: true, status: true,
              customer: { select: { firstName: true, lastName: true, email: true } }
            }
          }
        }
      }),
      prisma.quotation.count({ where })
    ]);

    const now = new Date();
    const enhanced = items.map((q) => {
      const name = q.request?.customer
        ? `${q.request.customer.firstName} ${q.request.customer.lastName}`.trim()
        : '-';

      let validUntilStatus = null;
      let validUntilText = null;
      if (q.validUntil) {
        const d = new Date(q.validUntil);
        validUntilStatus = d < now ? 'EXPIRED' : 'ACTIVE';
        validUntilText = d.toLocaleDateString('th-TH', { dateStyle: 'medium' });
      }

      return {
        ...q,
        displayCustomerName: name,
        priceDisplay: q.totalPrice != null
          ? new Intl.NumberFormat('th-TH').format(q.totalPrice) + ' บาท'
          : null,
        validUntilStatus,
        validUntilText
      };
    });

    return res.json({
      status: 'ok',
      data: enhanced,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (e) {
    console.error('pendingQuotations error:', e);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};
