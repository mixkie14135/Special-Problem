"use client";

import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import {
  calcSimpleEstimate,
  loadSimpleCatalog,
  moneyTHB,
} from "@/lib/estimate";
import Link from "next/link";

export default function EstimatePage() {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ฟอร์ม
  const [type, setType] = useState("house"); // house | factory
  const [area, setArea] = useState("");

  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadSimpleCatalog();
        setCatalog(data);
      } catch (e) {
        setErr(e?.message || "โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const typeOptions = useMemo(() => {
    if (!catalog?.types) return [];
    return Object.entries(catalog.types).map(([key, v]) => ({
      value: key,
      label: v.label,
    }));
  }, [catalog]);

  function onCalc(e) {
    e.preventDefault();
    const A = Number(area);
    if (!type) return toast.error("กรุณาเลือกประเภทงาน");
    if (!A || A <= 0)
      return toast.error("กรุณากรอกพื้นที่ (ตร.ม.) ให้ถูกต้อง (> 0)");

    try {
      const r = calcSimpleEstimate({ area: A, type }, catalog);
      setResult(r);
    } catch (e2) {
      toast.error(e2?.message || "คำนวณไม่สำเร็จ");
    }
  }

  if (loading)
    return <div className="max-w-4xl mx-auto px-4 py-8">กำลังโหลด...</div>;
  if (err)
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-red-600">{err}</div>
    );
  if (!catalog)
    return <div className="max-w-4xl mx-auto px-4 py-8">ไม่พบข้อมูล</div>;

  const metaNote = catalog?.meta?.note;
  const srcText = catalog?.meta?.source;
  const unit = catalog?.meta?.unit || "บาท/ตร.ม.";
  const currentType = catalog?.types?.[type];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Toaster richColors />
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">ประเมินราคาเบื้องต้น</h1>
        <p className="text-gray-600">
          กรอกประเภทงานและขนาดพื้นที่ ระบบจะคำนวณช่วงราคาเบื้องต้นให้
          (ไม่ผูกพันราคา) — {srcText}
        </p>
      </header>

      {/* อธิบายโมเดลการประเมิน */}
      <section className="rounded-lg border p-4 space-y-2 bg-gray-50">
        <h2 className="font-medium">
          โมเดลการประเมินราคาเบื้องต้น (Cover-All per sq.m.)
        </h2>
        <p className="text-sm text-gray-700">
          หน้านี้ใช้เรตราคา <strong>เหมารวมต่อพื้นที่ (บาท/ตร.ม.)</strong>{" "}
          เพื่อให้ลูกค้าเห็นงบประมาณโดยประมาณ
          ก่อนเข้าสู่ขั้นตอนสำรวจหน้างาน/ออกแบบ/ขอใบเสนอราคาจริง
          เรตราคานี้สามารถใช้เป็นแนวทางได้ทั้ง
          <strong> งานก่อสร้างใหม่</strong> และ{" "}
          <strong>งานรีโนเวท/ต่อเติมทั่วไป</strong>
        </p>

        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="rounded border bg-white p-3">
            <div className="font-medium mb-1">รวมโดยทั่วไป</div>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              <li>
                งานโครงสร้าง/สถาปัตย์พื้นฐาน (ฐานราก, คาน, เสา, พื้น, หลังคา,
                ผนัง, ฉาบ, ทาสี)
              </li>
              <li>วัสดุมาตรฐานตามเกรดทั่วไป</li>
              <li>งานระบบพื้นฐานในปริมาณทั่วไป (ไฟฟ้า/ประปาภายในพื้นที่งาน)</li>
              <li>ค่าแรงช่างและค่าควบคุมงานตามมาตรฐาน</li>
            </ul>
          </div>
          <div className="rounded border bg-white p-3">
            <div className="font-medium mb-1">ยังไม่รวมโดยปกติ</div>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              <li>
                งานระบบเฉพาะ: ไฟฟ้าแรงสูง, ปรับอากาศ, ดับเพลิง,
                สุขาภิบาลอุตสาหกรรม
              </li>
              <li>
                วัสดุ/งานพิเศษ: Built-in, กระจกพิเศษ, พื้น PU/อีพ็อกซี, Food
                Grade, Hygiene
              </li>
              <li>งานรื้อถอนซับซ้อน/แก้โครงสร้างเดิม (ต้องสำรวจหน้างานจริง)</li>
              <li>
                เงื่อนไขพิเศษ: ทำงานกลางคืน, เข้าพื้นที่ยาก, เครื่องจักรยก/เครน,
                เดินทางไกล
              </li>
            </ul>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          *หมายเหตุ:* รายการ “รวม/ไม่รวม”
          ข้างต้นเป็นเกณฑ์มาตรฐานสำหรับการสื่อสารเบื้องต้นเท่านั้น
          ราคาจริงจะยืนยันหลังจากมีแบบ/สCOPEชัดเจนหรือสำรวจหน้างาน
        </p>
      </section>

      {/* Form */}
      <form onSubmit={onCalc} className="rounded-lg border p-4 space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <label className="block">
            <div className="text-xs text-gray-600 mb-1">ประเภทงาน</div>
            <select
              className="border rounded px-3 py-2 w-full"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {currentType && (
              <div className="text-xs text-gray-500 mt-1">
                เรตราคา: {moneyTHB(currentType.min)} –{" "}
                {moneyTHB(currentType.max)} ต่อ {unit}
              </div>
            )}
          </label>

          <label className="block md:col-span-2">
            <div className="text-xs text-gray-600 mb-1">พื้นที่ (ตร.ม.)</div>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="เช่น 120"
              inputMode="decimal"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 rounded bg-black text-white hover:bg-gray-800"
          >
            คำนวณราคา
          </button>
        </div>
      </form>

      {/* Result */}
      {result && (
        <section className="rounded-lg border p-4 space-y-4">
          <h2 className="font-medium">สรุปประมาณการ</h2>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="rounded border p-3">
              <div className="text-xs text-gray-600">ราคาต่ำสุด (Min)</div>
              <div className="text-xl font-semibold">
                {moneyTHB(result.min)}
              </div>
            </div>
            <div className="rounded border p-3">
              <div className="text-xs text-gray-600">ราคาสูงสุด (Max)</div>
              <div className="text-xl font-semibold">
                {moneyTHB(result.max)}
              </div>
            </div>
            <div className="rounded border p-3">
              <div className="text-xs text-gray-600">ราคาเฉลี่ย (Avg)</div>
              <div className="text-xl font-semibold">
                {moneyTHB(result.avg)}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 border p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">รวมโดยประมาณ</div>
              <div className="text-2xl font-bold">{moneyTHB(result.total)}</div>
            </div>
            <Link
              href="/request-quote"
              className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800"
            >
              ขอใบเสนอราคาจริง
            </Link>
          </div>

          {/* หมายเหตุการประเมิน */}
          <section className="rounded-lg border p-4 bg-white">
            <h3 className="font-medium mb-2">หมายเหตุการประเมิน</h3>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li>
                เป็นการประเมินราคาเบื้องต้นแบบเหมารวมต่อ ตร.ม.
                เพื่อช่วยวางงบประมาณคร่าว ๆ ของลูกค้า
              </li>
              <li>
                ใช้เป็นแนวทางได้ทั้งงานก่อสร้างใหม่และงานรีโนเวท/ต่อเติมทั่วไป
              </li>
              <li>
                รวมค่าแรงและวัสดุพื้นฐานตามมาตรฐานทั่วไป{" "}
                <span className="text-gray-500">
                  (ดู “รวมโดยทั่วไป” ด้านบน)
                </span>
              </li>
              <li>
                ยังไม่รวมงานระบบ/วัสดุ/เงื่อนไขพิเศษ
                และอาจปรับตามแบบและสภาพหน้างานจริง
              </li>
              <li>
                ตัวเลขที่แสดงเป็นช่วงราคา (Min–Max/Avg)
                เพื่อสะท้อนความไม่แน่นอนก่อนเห็นหน้างาน
              </li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              หากต้องการใบเสนอราคาจริง
              โปรดนัดหมายสำรวจหน้างานหรือส่งแบบ/สCOPEงานเพื่อประเมินอย่างละเอียด
            </p>
          </section>
        </section>
      )}

      {/* ข้อควรรู้ก่อนขอใบเสนอราคา */}
      <section className="rounded-lg border p-4 space-y-3 bg-gray-50">
        <h2 className="font-medium">ข้อควรรู้ก่อนขอใบเสนอราคา</h2>

        <details className="rounded border bg-white p-3">
          <summary className="font-medium cursor-pointer">
            เรต 9,000–20,000 บาท/ตร.ม. สำหรับ “บ้าน” ครอบคลุมอะไร
          </summary>
          <div className="mt-2 text-sm text-gray-700">
            รวมค่าแรงและวัสดุพื้นฐานของงานโครงสร้าง–สถาปัตย์ทั่วไป (ฐานราก
            โครงสร้าง หลังคา ผนัง พื้น ฝ้า ทาสี) และระบบพื้นฐานในปริมาณทั่วไป{" "}
            <strong>ยังไม่รวม</strong>{" "}
            งานระบบเฉพาะ/วัสดุพิเศษ/รื้อถอนซับซ้อน/เงื่อนไขพิเศษ
            ช่วงราคาไว้เพื่อเผื่อความต่างของสภาพหน้างานและสเปกที่ยังไม่ล็อก
          </div>
        </details>

        <details className="rounded border bg-white p-3">
          <summary className="font-medium cursor-pointer">
            ใช้กับงานรีโนเวท/ต่อเติมได้หรือไม่
          </summary>
          <div className="mt-2 text-sm text-gray-700">
            ใช้เป็นแนวทางเบื้องต้นได้ แต่อาจต้องสำรวจหน้างานเพื่อยืนยันสCOPE
            (มีรื้อถอน/แก้โครงสร้างเดิมหรือไม่)
            แล้วจึงออกใบเสนอราคาจริงให้ตรงกับงาน
          </div>
        </details>

        <details className="rounded border bg-white p-3">
          <summary className="font-medium cursor-pointer">
            แตกต่างจากใบเสนอราคาจริงอย่างไร
          </summary>
          <div className="mt-2 text-sm text-gray-700">
            หน้านี้เป็น <strong>ประเมินเบื้องต้น</strong>{" "}
            ต่อพื้นที่เพื่อเห็นงบคร่าว ๆ ส่วนใบเสนอราคาจริงอิงแบบ รายการสเปก
            สภาพหน้างาน และเงื่อนไขการทำงาน จึงอาจต่างจากตัวเลขเบื้องต้นได้
          </div>
        </details>
      </section>
    </div>
  );
}
