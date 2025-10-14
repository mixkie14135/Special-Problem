const prisma = require('../../config/prisma');

/**
 * GET /api/admin/overview
 * Query (optional): from, to (ISO)  ช่วงเวลาสำหรับกราฟ/สถิติ
 * Return: KPIs + breakdown status + (ออปชัน) series รายวัน
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

    // KPIs
    const total = await prisma.serviceRequest.count({ where: whereRange });
    const byStatus = await prisma.serviceRequest.groupBy({
      by: ['status'],
      _count: { status: true },
      where: whereRange
    });

    // ตัวเลขพิเศษที่ใช้บ่อย
    const [
      pendingSurvey, // กำลังรอนัด/อยู่ขั้น SURVEY
      surveyDone,    // ดูหน้างานเสร็จ
      quoted,        // ส่งใบเสนอราคาแล้ว
      approved,      // ลูกค้าตกลง
      rejected       // ปฏิเสธ/ปิดเคส
    ] = await Promise.all([
      prisma.serviceRequest.count({ where: { ...whereRange, status: 'SURVEY' } }),
      prisma.serviceRequest.count({ where: { ...whereRange, status: 'SURVEY_DONE' } }),
      prisma.serviceRequest.count({ where: { ...whereRange, status: 'QUOTED' } }),
      prisma.serviceRequest.count({ where: { ...whereRange, status: 'APPROVED' } }),
      prisma.serviceRequest.count({ where: { ...whereRange, status: 'REJECTED' } }),
    ]);

    // Conversion (ประมาณ): APPROVED / QUOTED
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
 * GET /api/admin/requests/recent
 * Query: page=1&pageSize=20&status=NEW|SURVEY|...&q=keyword
 */
exports.recentRequests = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,            // NEW | SURVEY | SURVEY_DONE | QUOTED | APPROVED | REJECTED
      q,                 // คีย์เวิร์ด
      categoryId,        // หมวดบริการ
      dateFrom,          // ISO
      dateTo,            // ISO
      sort = 'createdAt:desc'
    } = req.query || {};

    const take = Math.max(1, Math.min(100, Number(pageSize)));
    const skip = Math.max(0, (Number(page) - 1) * take);
    const [sortField, sortDir] = String(sort).split(':');

    const where = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = Number(categoryId);
    if (q) {
      const kw = String(q);
      where.OR = [
        { title:            { contains: kw } },
        { description:      { contains: kw } },
        { contactEmail:     { contains: kw } },
        { contactFirstName: { contains: kw } },
        { contactLastName:  { contains: kw } },
      ];
    }
    if (dateFrom || dateTo) {
      const gte = dateFrom ? new Date(dateFrom) : undefined;
      const lte = dateTo   ? new Date(dateTo)   : undefined;
      where.createdAt = { ...(gte && { gte }), ...(lte && { lte }) };
    }

    const [items, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        orderBy: { [sortField || 'createdAt']: (sortDir === 'asc' ? 'asc' : 'desc') },
        skip, take,
        select: {
          id: true, title: true, status: true, createdAt: true,
          district: true,           // ✅ เพิ่ม
          province: true,           // ✅ เพิ่ม
          categoryId: true,
          category: { select: { id: true, name: true } },
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
        }
      }),
      prisma.serviceRequest.count({ where })
    ]);

    // ---- ฟิลด์เสริมสำหรับ UI ----
    const enhanced = items.map((x) => ({
      ...x,
      displayCustomerName: x.customer
        ? `${x.customer.firstName} ${x.customer.lastName}`.trim()
        : '-',
      shortAddress: [x.district, x.province].filter(Boolean).join(', ') || null,
    }));

    return res.json({
      status: 'ok',
      data: enhanced,
      meta: { page: Number(page), pageSize: take, total, totalPages: Math.ceil(total / take) }
    });
  } catch (e) {
    console.error('recentRequests error:', e);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};


/**
 * GET /api/admin/site-visits/upcoming
 * Query: days=14 (default 14 วันถัดไป), page, pageSize
 */
exports.upcomingVisits = async (req, res) => {
  try {
    const days = Number(req.query.days || 14);
    const page = Number(req.query.page || 1);
    const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize || 20)));
    const skip = Math.max(0, (page - 1) * pageSize);

    const { requestId, customerId, dateFrom, dateTo } = req.query || {};

    const now = new Date();
    const until = new Date(now.getTime() + days * 86400000);

    const where = {
      status: 'PENDING',
      scheduledAt: { gte: now, lte: until }
    };

    // override ด้วยช่วงแบบกำหนดเอง ถ้าส่งมา
    if (dateFrom || dateTo) {
      const gte = dateFrom ? new Date(dateFrom) : undefined;
      const lte = dateTo   ? new Date(dateTo)   : undefined;
      where.scheduledAt = { ...(gte && { gte }), ...(lte && { lte }) };
    }

    if (requestId || customerId) {
      where.request = { is: {} };
      if (requestId) where.request.is.id = Number(requestId);
      if (customerId) where.request.is.customerId = Number(customerId);
    }

    const [items, total] = await Promise.all([
      prisma.siteVisit.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip, take: pageSize,
        include: {
          request: {
            select: {
              id: true, title: true,
              customerId: true,
              customer: { select: { firstName: true, lastName: true, phone: true, email: true } }
            }
          }
        }
      }),
      prisma.siteVisit.count({ where })
    ]);

    // ---- ฟิลด์เสริมสำหรับ UI ----
    const enhanced = items.map((v) => ({
      ...v,
      displayCustomerName: v.request?.customer
        ? `${v.request.customer.firstName} ${v.request.customer.lastName}`.trim()
        : '-',
      displayWhen: new Date(v.scheduledAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }),
    }));

    return res.json({
      status: 'ok',
      data: enhanced,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (e) {
    console.error('upcomingVisits error:', e);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};


/**
 * GET /api/admin/quotations/pending
 * Query: page, pageSize, q (ค้นคำขอ/ลูกค้า)
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
            { title: { contains: kw } },
            { customer: { is: { email:     { contains: kw } } } },
            { customer: { is: { firstName: { contains: kw } } } },
            { customer: { is: { lastName:  { contains: kw } } } },
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

    // ---- ฟิลด์เสริมสำหรับ UI ----
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
        validUntilStatus, // 'ACTIVE' | 'EXPIRED' | null
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


