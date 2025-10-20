// backend/src/modules/requests/request.controller.js
const prisma = require('../../config/prisma');
const { transporter, mailFrom } = require('../../config/mailer');

// ตรวจสอบกติกาที่อยู่ไทย: ต้องมี (lat,lng) หรือ (province+district+postalCode)
function validateThaiLocation(p) {
  const hasPin = p.latitude != null && p.longitude != null && p.latitude !== '' && p.longitude !== '';
  const hasMinAddr = !!p.province && !!p.district && !!p.postalCode;
  return hasPin || hasMinAddr;
}

exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title, description, categoryId,
      contactFirstName, contactLastName, contactEmail, contactPhone,
      latitude, longitude, placeName, formattedAddress, addressLine,
      subdistrict, district, province, postalCode, placeId
    } = req.body || {};

    // 1) required fields
    if (!title || !description || !categoryId) {
      return res.status(400).json({ status: 'error', message: 'title, description, categoryId are required' });
    }
    if (!contactFirstName || !contactLastName || !contactEmail || !contactPhone) {
      return res.status(400).json({ status: 'error', message: 'contact fields are required' });
    }

    // 2) location rule (ไทย)
    const hasPin = latitude && longitude;
    const hasMinAddr = province && district && postalCode;
    if (!hasPin && !hasMinAddr) {
      return res.status(400).json({
        status: 'error',
        message: 'ต้องปักหมุด (latitude, longitude) หรือกรอก province+district+postalCode อย่างน้อย'
      });
    }

    // 3) normalize/parse
    const numCategoryId = Number(categoryId);
    if (!Number.isInteger(numCategoryId) || numCategoryId <= 0) {
      return res.status(400).json({ status: 'error', message: 'categoryId must be a positive integer' });
    }
    const numLat = latitude ? Number(latitude) : null;
    const numLng = longitude ? Number(longitude) : null;

    // 4) create request (ใช้ connect แทน customerId/categoryId)
    const created = await prisma.serviceRequest.create({
      data: {
        title,
        description,
        contactFirstName,
        contactLastName,
        contactEmail,
        contactPhone,

        latitude: numLat,
        longitude: numLng,
        placeName: placeName || null,
        formattedAddress: formattedAddress || null,
        addressLine: addressLine || null,
        subdistrict: subdistrict || null,
        district: district || null,
        province: province || null,
        postalCode: postalCode || null,
        placeId: placeId || null,

        customer: { connect: { id: userId } },      // ✅ ใช้ connect
        category: { connect: { id: numCategoryId } } // ✅ ใช้ connect
      }
    });

    // 5) images (ไม่มี createManyAndReturn → ใช้ Promise.all)
    let images = [];
    if (req.files && req.files.length) {
      images = await Promise.all(
        req.files.map(f =>
          prisma.requestImage.create({
            data: {
              requestId: created.id,
              imageUrl: `/uploads/requests/${f.filename}`
            }
          })
        )
      );
    }

    // 6) email (optional)
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && transporter) {
        await transporter.sendMail({
          from: mailFrom(),
          to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
          subject: `คำขอใหม่: ${title}`,
          html: `
            <p>มีคำขอใหม่จากลูกค้า</p>
            <ul>
              <li>ผู้ติดต่อ: คุณ ${contactFirstName} ${contactLastName}</li>
              <li>อีเมล: ${contactEmail}</li>
              <li>โทร: ${contactPhone}</li>
              <li>บริการ (categoryId): #${numCategoryId}</li>
              <li>รายละเอียด: ${description}</li>
            </ul>
          `
        });
      }
    } catch (e) {
      console.error('Email error:', e.message);
    }

    return res.status(201).json({
      status: 'ok',
      data: { ...created, images }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// แอดมิน list ทั้งหมด (filter status ได้ เช่น ?status=NEW)
exports.listAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const items = await prisma.serviceRequest.findMany({
      where,
      orderBy: { id: 'asc' },
      include: { images: true, category: true, customer: { select: { id: true, name: true, email: true } } }
    });
    res.json({ status: 'ok', data: items });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ลูกค้า list ของตัวเอง
exports.listMine = async (req, res) => {
  try {
    const items = await prisma.serviceRequest.findMany({
      where: { customerId: req.user.id },
      orderBy: { id: 'desc' },
      include: { images: true, category: true }
    });
    res.json({ status: 'ok', data: items });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// แอดมิน detail
exports.detail = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.serviceRequest.findUnique({
      where: { id },
      include: { images: true, category: true, customer: { select: { id: true, name: true, email: true, phone: true } } }
    });
    if (!item) return res.status(404).json({ status: 'error', message: 'Request not found' });
    res.json({ status: 'ok', data: item });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ status: 'error', message: 'Request not found' });
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// แอดมิน: ลิสต์คำขอล่าสุด (รองรับ q/status/sort/paging)
exports.listRecent = async (req, res) => {
  try {
    const {
      q = '',
      status = '',
      page = 1,
      pageSize = 10,
      sort = 'createdAt:desc',
    } = req.query;

    const where = {};
    if (status) where.status = status;

    // คีย์เวิร์ด: ค้น title/description/ผู้ติดต่อ/อีเมล/โทร/อีเมลลูกค้า/ชื่อลูกค้า
    const and = [];
    if (q) {
      const kw = String(q);
      and.push({
        OR: [
          { title: { contains: kw, mode: 'insensitive' } },
          { description: { contains: kw, mode: 'insensitive' } },
          { contactFirstName: { contains: kw, mode: 'insensitive' } },
          { contactLastName:  { contains: kw, mode: 'insensitive' } },
          { contactEmail:     { contains: kw, mode: 'insensitive' } },
          { contactPhone:     { contains: kw, mode: 'insensitive' } },
          { customer: { email:     { contains: kw, mode: 'insensitive' } } },
          { customer: { firstName: { contains: kw, mode: 'insensitive' } } },
          { customer: { lastName:  { contains: kw, mode: 'insensitive' } } },
          // จะขยายเพิ่มเช่น category.name ก็ได้ถ้าต้องการ:
          // { category: { name: { contains: kw, mode: 'insensitive' } } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const [sortField, sortDir] = String(sort).split(':');
    const orderBy = { [sortField || 'createdAt']: (sortDir === 'asc' ? 'asc' : 'desc') };

    const take = Math.max(1, Math.min(100, Number(pageSize)));
    const skip = Math.max(0, (Number(page) - 1) * take);

    const [items, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          category: true,
          customer: { select: { id: true, firstName: true, lastName: true, email: true } },
          // ถ้าต้องการภาพในตาราง ให้ใส่ images: true
        },
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    return res.json({
      status: 'ok',
      data: items,
      meta: { page: Number(page), pageSize: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

