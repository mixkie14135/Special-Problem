const prisma = require('../../config/prisma');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(tz);

let transporter, mailFrom;
try {
  ({ transporter, mailFrom } = require('../../config/mailer'));
} catch {
  console.warn('Mailer not configured, emails will be skipped.');
  mailFrom = () => '"Bon Plus Thai" <no-reply@bonplusthai.local>';
}

const TH_TZ = 'Asia/Bangkok';

// helper: format time for email
function fmt(dt) {
  return dayjs(dt).tz(TH_TZ).format('dddd D MMMM YYYY HH:mm น. (เวลาไทย)');
}

// ============ Admin: create site-visit ============
exports.create = async (req, res) => {
  try {
    const { requestId, scheduledAt } = req.body || {};

    if (!requestId || !scheduledAt) {
      return res.status(400).json({ status: 'error', message: 'requestId และ scheduledAt จำเป็น' });
    }
    const reqId = Number(requestId);
    if (!Number.isInteger(reqId) || reqId <= 0) {
      return res.status(400).json({ status: 'error', message: 'requestId ต้องเป็นเลขจำนวนบวก' });
    }

    const when = new Date(scheduledAt);
    if (isNaN(when.getTime())) {
      return res.status(400).json({ status: 'error', message: 'scheduledAt รูปแบบไม่ถูกต้อง (ISO)' });
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { id: reqId },
      include: { customer: { select: { email: true, firstName: true, lastName: true, phone: true } } }
    });
    if (!request) return res.status(404).json({ status: 'error', message: 'ServiceRequest not found' });

    const visit = await prisma.siteVisit.create({
      data: {
        scheduledAt: when,
        status: 'PENDING',
        request: { connect: { id: reqId } }
      }
    });

    await prisma.serviceRequest.update({
      where: { id: reqId },
      data: { status: 'SURVEY' }
    });

    // email (optional)
    try {
      if (transporter && process.env.SMTP_HOST && process.env.SMTP_USER && request.customer?.email) {
        await transporter.sendMail({
          from: mailFrom(),
          to: request.customer.email,
          subject: `นัดหมายดูหน้างาน (คำขอ #${request.id})`,
          html: `
            <p>เรียน คุณ ${request.contactFirstName} ${request.contactLastName}</p>
            <p>เราได้นัดหมายดูหน้างานสำหรับคำขอ: <strong>${request.title}</strong></p>
            <p><strong>วันและเวลา:</strong> ${when.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>
            <p><strong>สถานที่:</strong> ${request.formattedAddress || request.placeName || request.addressLine || 'ตามข้อมูลที่ให้ไว้'}</p>
            <p>หากไม่สะดวก โปรดตอบกลับเพื่อแจ้งวันที่สะดวก</p>
          `
        });
      }
    } catch (e) {
      console.error('Email error (create site-visit):', e.message);
    }

    const detail = await prisma.siteVisit.findUnique({
      where: { id: visit.id },
      include: { request: { include: { customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } } }
    });

    return res.status(201).json({ status: 'ok', data: detail });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};


// ============ Admin: update site-visit (reschedule / done / cancel) ============
exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { scheduledAt, status } = req.body || {};

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ status: 'error', message: 'id ต้องเป็นเลขจำนวนบวก' });
    }

    const visit = await prisma.siteVisit.findUnique({
      where: { id },
      include: { request: { include: { customer: true } } }
    });
    if (!visit) return res.status(404).json({ status: 'error', message: 'SiteVisit not found' });

    const data = {};

    if (scheduledAt !== undefined) {
      const when = new Date(scheduledAt);
      if (isNaN(when.getTime())) {
        return res.status(400).json({ status: 'error', message: 'scheduledAt รูปแบบไม่ถูกต้อง (ISO)' });
      }
      data.scheduledAt = when;
    }

    if (status !== undefined) {
      const allowed = ['PENDING', 'DONE', 'CANCELLED'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ status: 'error', message: 'status ต้องเป็น PENDING | DONE | CANCELLED' });
      }
      data.status = status;
    }

    await prisma.siteVisit.update({ where: { id }, data });

    // sync serviceRequest
    if (data.status === 'DONE') {
      await prisma.serviceRequest.update({ where: { id: visit.requestId }, data: { status: 'SURVEY_DONE' } });
    } else if (data.status === 'CANCELLED') {
      await prisma.serviceRequest.update({ where: { id: visit.requestId }, data: { status: 'REJECTED' } });
    }

    // email (optional)
    try {
      const reqData = await prisma.serviceRequest.findUnique({
        where: { id: visit.requestId },
        include: { customer: true }
      });
      const to = reqData?.customer?.email;
      if (transporter && process.env.SMTP_HOST && process.env.SMTP_USER && to) {
        if (data.scheduledAt && data.status !== 'CANCELLED') {
          await transporter.sendMail({
            from: mailFrom(),
            to,
            subject: `อัปเดตนัดหมายดูหน้างาน (คำขอ #${visit.requestId})`,
            html: `
              <p>เรียน คุณ ${reqData.contactFirstName} ${reqData.contactLastName}</p>
              <p>มีการอัปเดตเวลานัดหมายดูหน้างาน:</p>
              <p><strong>วันและเวลาใหม่:</strong> ${data.scheduledAt.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>
            `
          });
        }
        if (data.status === 'CANCELLED') {
          await transporter.sendMail({
            from: mailFrom(),
            to,
            subject: `ยกเลิกนัดหมายดูหน้างาน (คำขอ #${visit.requestId})`,
            html: `
              <p>เรียน คุณ ${reqData.contactFirstName} ${reqData.contactLastName}</p>
              <p>นัดหมายดูหน้างานถูกยกเลิก หากต้องการนัดหมายใหม่ โปรดติดต่อกลับ</p>
            `
          });
        }
      }
    } catch (e) {
      console.error('Email error (update site-visit):', e.message);
    }

    const detail = await prisma.siteVisit.findUnique({
      where: { id },
      include: { request: { include: { customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } } }
    });

    return res.json({ status: 'ok', data: detail });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ============ Admin: list ============
exports.list = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status; // PENDING | DONE | CANCELLED
    const items = await prisma.siteVisit.findMany({
      where,
      orderBy: [{ scheduledAt: 'asc' }, { id: 'desc' }],
      include: { request: { select: { id: true, title: true, contactFirstName: true, contactLastName: true, formattedAddress: true } } }
    });
    res.json({ status: 'ok', data: items });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ============ Admin: detail ============
exports.detail = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.siteVisit.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            images: true
          }
        }
      }
    });
    if (!item) return res.status(404).json({ status: 'error', message: 'SiteVisit not found' });
    res.json({ status: 'ok', data: item });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ status: 'error', message: 'SiteVisit not found' });
    res.status(500).json({ status: 'error', message: err.message });
  }
};


exports.respond = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { decision, note } = req.body || {};
    const allowed = ['APPROVED', 'REJECTED'];
    if (!allowed.includes(decision)) {
      return res.status(400).json({ status: 'error', message: 'decision ต้องเป็น APPROVED หรือ REJECTED' });
    }

    const visit = await prisma.siteVisit.findUnique({
      where: { id },
      include: { request: { include: { customer: true } } }
    });
    if (!visit) return res.status(404).json({ status: 'error', message: 'SiteVisit not found' });

    const updated = await prisma.siteVisit.update({
      where: { id },
      data: {
        customerResponse: decision,
        customerNote: note || null,
        respondedAt: new Date()
      }
    });

    // (ออปชัน) อีเมลแจ้งแอดมิน
    try {
      let transporter, mailFrom;
      ({ transporter, mailFrom } = require('../../config/mailer'));
      const adminTo = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
      if (transporter && adminTo) {
        await transporter.sendMail({
          from: mailFrom(),
          to: adminTo,
          subject: `ลูกค้าตอบนัดหมาย (#${visit.id}) – ${decision}`,
          html: `
            <p>คำขอ #${visit.requestId}: ${visit.request.title}</p>
            <p>ลูกค้า: คุณ ${visit.request.contactFirstName} ${visit.request.contactLastName} (${visit.request.contactEmail}, ${visit.request.contactPhone})</p>
            <p>การตอบ: <strong>${decision}</strong></p>
            ${note ? `<p>หมายเหตุ: ${note}</p>` : ''}
            <p>วันนัด: ${new Date(visit.scheduledAt).toLocaleString('th-TH',{ timeZone: 'Asia/Bangkok' })}</p>
          `
        });
      }
    } catch (e) {
      // ไม่ทำให้ API ล้มถ้าไม่มีเมล
    }

    return res.json({ status: 'ok', data: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};
