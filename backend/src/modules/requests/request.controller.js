// backend/src/modules/requests/request.controller.js
const prisma = require("../../config/prisma");
let transporter, mailFrom;
try {
  ({ transporter, mailFrom } = require("../../config/mailer"));
} catch {
  mailFrom = () => '"Bon Plus Thai" <no-reply@bonplusthai.local>';
}

/* ---------- Helpers ---------- */
const MAX_TITLE = 200;
const MAX_DESC  = 5000;
const trimOrNull = (v) => (typeof v === "string" ? v.trim() : v) || null;
const isNum = (v) => v !== null && v !== "" && Number.isFinite(Number(v));
const safeStr = (v, max) => {
  if (v == null) return "";
  const s = String(v).trim();
  return s.length > max ? s.slice(0, max) : s;
};
const pad2 = (n) => String(n).padStart(2, "0");
const pad5 = (n) => String(n).padStart(5, "0");

function formatThaiAddress({ addressLine, subdistrict, district, province, postalCode, placeName, formattedAddress }) {
  if (formattedAddress) return formattedAddress;
  const segs = [];
  if (placeName) segs.push(placeName);
  if (addressLine) segs.push(addressLine);
  const tail = [subdistrict, district, province, postalCode].filter(Boolean).join(" ");
  if (tail) segs.push(tail);
  return segs.join(" • ");
}

// ต้องครบทั้ง “พิกัด” และ “จังหวัด/อำเภอ/ตำบล/รหัสไปรษณีย์”
function validateFullThaiLocation(p) {
  const hasPin = isNum(p.latitude) && isNum(p.longitude);
  const hasFullAddr = !!p.province && !!p.district && !!p.subdistrict && !!p.postalCode;
  return hasPin && hasFullAddr;
}

/* =====================================
 * ลูกค้า: สร้างคำขอ
 * POST /api/requests (multipart images?)
 * ===================================== */
exports.create = async (req, res) => {
  const tag = "[Request.create]";
  try {
    const userId = req.user.id;
    const {
      title, description, categoryId,
      contactFirstName, contactLastName, contactEmail, contactPhone,
      latitude, longitude, placeName, formattedAddress, addressLine,
      subdistrict, district, province, postalCode, placeId,
    } = req.body || {};

    // 1) required
    const titleStr = safeStr(title, MAX_TITLE);
    const descStr  = safeStr(description, MAX_DESC);
    if (!titleStr || !descStr || !categoryId) {
      return res.status(400).json({ status: "error", message: "title, description, categoryId are required" });
    }
    if (!contactFirstName || !contactLastName || !contactEmail || !contactPhone) {
      return res.status(400).json({ status: "error", message: "contact fields are required" });
    }

    // 2) location rule
    const locPayload = { latitude, longitude, subdistrict, district, province, postalCode };
    if (!validateFullThaiLocation(locPayload)) {
      return res.status(400).json({
        status: "error",
        message: "กรุณา ‘ปักหมุดพิกัด’ และกรอก ‘จังหวัด/อำเภอ/ตำบล/รหัสไปรษณีย์’ ให้ครบถ้วน",
      });
    }

    // 3) normalize
    const numCategoryId = Number(categoryId);
    if (!Number.isInteger(numCategoryId) || numCategoryId <= 0) {
      return res.status(400).json({ status: "error", message: "categoryId must be a positive integer" });
    }
    const numLat = Number(latitude);
    const numLng = Number(longitude);
    if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
      return res.status(400).json({ status: "error", message: "latitude/longitude invalid" });
    }

    // 4) create (ยังไม่ใส่ publicRef)
    let created;
    try {
      created = await prisma.serviceRequest.create({
        data: {
          title: titleStr,
          description: descStr,
          contactFirstName: String(contactFirstName).trim(),
          contactLastName:  String(contactLastName).trim(),
          contactEmail:     String(contactEmail).trim(),
          contactPhone:     String(contactPhone).trim(),

          latitude: numLat,
          longitude: numLng,
          placeName:         trimOrNull(placeName),
          formattedAddress:  trimOrNull(formattedAddress),
          addressLine:       trimOrNull(addressLine),
          subdistrict:       trimOrNull(subdistrict),
          district:          trimOrNull(district),
          province:          trimOrNull(province),
          postalCode:        trimOrNull(postalCode),
          placeId:           trimOrNull(placeId),

          customer: { connect: { id: userId } },
          category: { connect: { id: numCategoryId } },
        },
        select: { id: true, title: true, createdAt: true },
      });
    } catch (e) {
      console.error(tag, "Create failed:", e.message);
      return res.status(500).json({ status: "error", message: "สร้างคำขอไม่สำเร็จ (DB create)" });
    }

    // 4.1) build publicRef แล้วอัปเดต
    const createdAt = created.createdAt || new Date();
    const yyyy = createdAt.getFullYear();
    const MM = pad2(createdAt.getMonth() + 1);
    const seq = pad5(created.id);
    const publicRef = `REQ-${yyyy}${MM}-${seq}`;

    try {
      await prisma.serviceRequest.update({
        where: { id: created.id },
        data: { publicRef },
      });
    } catch (e) {
      console.error(tag, "Update publicRef failed:", e.message);
      // ไม่ fail ให้ผู้ใช้ — แต่ log ไว้
    }

    // 5) images
    let images = [];
    if (req.files?.length) {
      try {
        images = await Promise.all(
          req.files.map((f) =>
            prisma.requestImage.create({
              data: { requestId: created.id, imageUrl: `/uploads/requests/${f.filename}` },
              select: { id: true, imageUrl: true, createdAt: true },
            })
          )
        );
      } catch (e) {
        console.error(tag, "Save images failed:", e.message);
      }
    }

    // 6) email (optional)
    try {
      if (transporter && process.env.SMTP_HOST && process.env.SMTP_USER) {
        const addrText = formatThaiAddress({
          addressLine: trimOrNull(addressLine),
          subdistrict: trimOrNull(subdistrict),
          district: trimOrNull(district),
          province: trimOrNull(province),
          postalCode: trimOrNull(postalCode),
          placeName: trimOrNull(placeName),
          formattedAddress: trimOrNull(formattedAddress),
        });

        await transporter.sendMail({
          from: mailFrom(),
          to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
          subject: `คำขอใหม่: ${created.title} (${publicRef})`,
          html: `
            <p>มีคำขอใหม่จากลูกค้า</p>
            <ul>
              <li><strong>เลขอ้างอิง:</strong> ${publicRef}</li>
              <li><strong>หัวข้อ:</strong> ${created.title}</li>
              <li><strong>ผู้ติดต่อ:</strong> คุณ ${String(contactFirstName).trim()} ${String(contactLastName).trim()}</li>
              <li><strong>อีเมล/โทร:</strong> ${String(contactEmail).trim()} / ${String(contactPhone).trim()}</li>
              <li><strong>ที่ตั้ง:</strong> ${addrText || "-"}</li>
              <li><strong>พิกัด:</strong> ${numLat}, ${numLng}</li>
            </ul>
          `,
        });
      }
    } catch (e) {
      console.error(tag, "Email failed:", e.message);
    }

    // 7) response
    return res.status(201).json({
      status: "ok",
      data: { id: created.id, publicRef, title: created.title, images },
    });
  } catch (err) {
    console.error("[Request.create] Fatal:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
};

/* =======================
 * ADMIN: list ทั้งหมด (optional filter status)
 * GET /api/requests
 * ======================= */
exports.listAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;

    const items = await prisma.serviceRequest.findMany({
      where,
      orderBy: { id: 'asc' },
      include: {
        images: true,
        category: true,
        // เดิม select name ซึ่งไม่มีใน schema → เปลี่ยนเป็น firstName/lastName  // CHANGED:
        customer: { select: { id: true, firstName: true, lastName: true, email: true } }, // CHANGED:
      },
    });
    res.json({ status: 'ok', data: items });
  } catch (e) {
    console.error('listAll error:', e); // CHANGED:
    res.status(500).json({ status: 'error', message: e.message });
  }
};

/* =======================
 * CUSTOMER: list ของตัวเอง
 * GET /api/my/requests
 * ======================= */
exports.listMine = async (req, res) => {
  try {
    const items = await prisma.serviceRequest.findMany({
      where: { customerId: req.user.id },
      orderBy: { id: 'desc' },
      include: { images: true, category: true },
    });
  res.json({ status: 'ok', data: items });
  } catch (e) {
    console.error('listMine error:', e); // CHANGED:
    res.status(500).json({ status: 'error', message: e.message });
  }
};

/* =======================
 * ADMIN: detail
 * GET /api/requests/:id
 * ======================= */
exports.detail = async (req, res) => {
  try {
    const id = Number(req.params.id);
    console.log('[REQ] GET /api/requests/%s', id); // log ช่วยไล่

    const item = await prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        images: true,
        category: true,
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        // เพิ่ม siteVisits เพื่อให้ FE ใช้ตรวจ precheckReadyToQuote ได้   // CHANGED:
        siteVisits: { orderBy: { scheduledAt: 'asc' } }, // CHANGED:
      },
    });

    if (!item) {
      return res.status(404).json({ status: 'error', message: 'Request not found' });
    }

    return res.json({ status: 'ok', data: item });
  } catch (e) {
    console.error('[requests.detail] error:', e);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

/* =======================
 * ADMIN: listRecent (q/status/sort/paging)
 * GET /api/admin/requests/recent
 * ======================= */
exports.listRecent = async (req, res) => {
  try {
    const {
      q = '', status = '', page = 1, pageSize = 10, sort = 'createdAt:desc',
    } = req.query;

    const where = {};
    if (status) where.status = status;

    const and = [];
    if (q) {
      const kw = String(q).trim();                                                // CHANGED:
      const exactId = /^\d+$/.test(kw) ? Number(kw) : null;                       // CHANGED:
      const looksLikeRef = /^REQ-\d{6}-\d{5}$/i.test(kw);                          // CHANGED:

      const OR = [];                                                               // CHANGED:
      if (exactId) OR.push({ id: exactId });                                       // CHANGED:
      if (looksLikeRef) {                                                          // CHANGED:
        OR.push({ publicRef: kw });                                                // CHANGED:
      } else {
        OR.push({ publicRef: { contains: kw } });                                  // CHANGED: (removed mode)
      }

      OR.push(
        { title:            { contains: kw } },                                    // CHANGED: (removed mode)
        { description:      { contains: kw } },                                    // CHANGED: (removed mode)
        { contactFirstName: { contains: kw } },                                    // CHANGED: (removed mode)
        { contactLastName:  { contains: kw } },                                    // CHANGED: (removed mode)
        { contactEmail:     { contains: kw } },                                    // CHANGED: (removed mode)
        { contactPhone:     { contains: kw } },                                    // CHANGED: (removed mode)
        { customer: { is: { email:     { contains: kw } } } },                     // CHANGED: (wrapped in is, removed mode)
        { customer: { is: { firstName: { contains: kw } } } },                     // CHANGED:
        { customer: { is: { lastName:  { contains: kw } } } },                     // CHANGED:
      );

      and.push({ OR });                                                            // CHANGED:
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
        },
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    res.json({
      status: 'ok',
      data: items,
      meta: { page: Number(page), pageSize: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (e) {
    console.error('listRecent error:', e); // CHANGED:
    res.status(500).json({ status: 'error', message: e.message || 'Server error' });
  }
};

// --- ลูกค้า: ดูรายละเอียดคำขอของตัวเอง ---
exports.detailMine = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: "error", message: "invalid id" });
    }
    const item = await prisma.serviceRequest.findFirst({
      where: { id, customerId: req.user.id },
      include: {
        images: true,
        category: true,
        siteVisits: { orderBy: { scheduledAt: 'asc' } },
        quotations: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!item) return res.status(404).json({ status: "error", message: "Request not found" });
    return res.json({ status: "ok", data: item });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
};

// --- ลูกค้า: อัปโหลดรูปเพิ่มให้คำขอของตนเอง ---
exports.addImagesMine = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: "error", message: "invalid id" });
    }
    // own check
    const own = await prisma.serviceRequest.findFirst({
      where: { id, customerId: req.user.id }, select: { id: true }
    });
    if (!own) return res.status(404).json({ status: "error", message: "Request not found" });

    if (!req.files?.length) {
      return res.status(400).json({ status: "error", message: "no files" });
    }
    const images = await Promise.all(
      req.files.map((f) =>
        prisma.requestImage.create({
          data: { requestId: id, imageUrl: `/uploads/requests/${f.filename}` },
          select: { id: true, imageUrl: true, createdAt: true },
        })
      )
    );
    return res.status(201).json({ status: "ok", data: images });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
};

// --- ลูกค้า: ยกเลิกคำขอของตนเอง (ได้เฉพาะสถานะ NEW) ---
exports.cancelMine = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: "error", message: "invalid id" });
    }
    const reqItem = await prisma.serviceRequest.findFirst({
      where: { id, customerId: req.user.id }, select: { id: true, status: true }
    });
    if (!reqItem) return res.status(404).json({ status: "error", message: "Request not found" });
    if (reqItem.status !== "NEW") {
      return res.status(409).json({ status: "error", message: "ยกเลิกได้เฉพาะคำขอที่ยังเป็นสถานะ NEW" });
    }
    const updated = await prisma.serviceRequest.update({
      where: { id }, data: { status: "REJECTED" },
      select: { id: true, status: true }
    });
    return res.json({ status: "ok", data: updated });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
};
