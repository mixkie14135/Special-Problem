// frontend/src/app/request-quote/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { toast, Toaster } from "sonner";
import LoginPromptModal from "@/components/ui/LoginPromptModal";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

/* ===== Google Map ===== */
const MAP_LIBRARIES = ["places"];
const DEFAULT_CENTER = { lat: 13.736717, lng: 100.523186 };

/* ===== FE limits ===== */
const MAX_TITLE = 200;
const MAX_DESC = 5000;
const MAX_IMAGES = 8;

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error("load error " + path);
  return res.json();
}

export default function RequestQuotePage() {
  const router = useRouter();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: MAP_LIBRARIES,
  });

  // ===== Auth state =====
  const [authed, setAuthed] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false); // ✅ ADD

  useEffect(() => {
    const read = () => setAuthed(!!getToken());
    read();
    const handler = () => read();
    window.addEventListener("session:change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("session:change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // ===== Form states =====
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Contact info
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Address + map
  const [marker, setMarker] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [subdistrict, setSubdistrict] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [addressLine, setAddressLine] = useState("");

  // Dropdown datasets
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subdistricts, setSubdistricts] = useState([]);

  /* ===== Load data ===== */
  useEffect(() => {
    loadJson("/data/provinces.json").then(setProvinces).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet("/categories");
        setCategories(res.data.data || []);
      } catch {}
    })();
  }, []);

  /* ===== Address cascading ===== */
  async function handleProvinceChange(code) {
    setProvince(code);
    setDistrict("");
    setSubdistrict("");
    setPostalCode("");
    setDistricts([]);
    setSubdistricts([]);
    if (!code) return;
    const all = await loadJson("/data/districts.json");
    setDistricts(all.filter((d) => d.provinceCode == code));
  }

  async function handleDistrictChange(code) {
    setDistrict(code);
    setSubdistrict("");
    setPostalCode("");
    setSubdistricts([]);
    if (!code) return;
    const all = await loadJson("/data/subdistricts.json");
    setSubdistricts(all.filter((t) => t.districtCode == code));
  }

  function handleSubdistrictChange(code) {
    setSubdistrict(code);
    const t = subdistricts.find((x) => x.subdistrictCode == code);
    if (t?.postalCode) setPostalCode(t.postalCode);
  }

  /* ===== Map interactions ===== */
  function handleCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMarker(p);
        setMapCenter(p);
      },
      () => toast.error("ไม่สามารถดึงตำแหน่งปัจจุบันได้")
    );
  }

  function handleMapClick(e) {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarker({ lat, lng });
  }

  /* ===== Images ===== */
  function onPickImages(fileList) {
    const arr = Array.from(fileList || []);
    if (arr.length > MAX_IMAGES) {
      toast.error(`เลือกรูปได้ไม่เกิน ${MAX_IMAGES} ไฟล์`);
      return;
    }
    setImages(arr);
  }

  /* ===== Validation ===== */
  const isFormValid = useMemo(() => {
    return (
      title.trim().length > 0 &&
      description.trim().length > 0 &&
      categoryId &&
      contactFirstName &&
      contactLastName &&
      contactEmail &&
      contactPhone &&
      marker &&
      province &&
      district &&
      subdistrict &&
      postalCode
    );
  }, [
    title,
    description,
    categoryId,
    contactFirstName,
    contactLastName,
    contactEmail,
    contactPhone,
    marker,
    province,
    district,
    subdistrict,
    postalCode,
  ]);

  function validateBeforeSubmit() {
    if (title.length > MAX_TITLE) {
      toast.error(`หัวข้อยาวเกิน ${MAX_TITLE} อักขระ`);
      return false;
    }
    if (description.length > MAX_DESC) {
      toast.error(`รายละเอียดยาวเกิน ${MAX_DESC} อักขระ`);
      return false;
    }
    if (!isFormValid) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return false;
    }
    return true;
  }

  /* ===== Submit ===== */
  async function onSubmit(e) {
    e.preventDefault();
    if (!authed) {
      setShowLoginModal(true); // ✅ เปิด Modal แทน redirect
      return;
    }
    if (!validateBeforeSubmit()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("categoryId", String(categoryId));
      fd.append("contactFirstName", contactFirstName.trim());
      fd.append("contactLastName", contactLastName.trim());
      fd.append("contactEmail", contactEmail.trim());
      fd.append("contactPhone", contactPhone.trim());
      fd.append("latitude", marker.lat);
      fd.append("longitude", marker.lng);
      fd.append("addressLine", addressLine.trim());
      fd.append("placeName", placeName.trim());
      fd.append("province", province);
      fd.append("district", district);
      fd.append("subdistrict", subdistrict);
      fd.append("postalCode", postalCode);

      images.forEach((f) => fd.append("images", f));

      const { data } = await apiPost("/requests", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const publicRef = data?.data?.publicRef;
      if (publicRef) {
        router.push(`/request-quote/success?ref=${encodeURIComponent(publicRef)}`);
      } else {
        toast.success("ส่งคำขอเรียบร้อย");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "ส่งคำขอไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  /* ===== Render ===== */
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Toaster richColors />
      <h1 className="text-2xl font-semibold mb-1">ขอใบเสนอราคา</h1>
      <p className="text-gray-600 mb-6">
        กรอกข้อมูลงานของคุณ แล้วเราจะติดต่อกลับโดยเร็วที่สุด
      </p>

      {!authed && (
        <div className="rounded-lg border bg-amber-50 p-4 mb-6">
          <div className="text-sm text-amber-900">
            ต้องเข้าสู่ระบบก่อนจึงจะสามารถ “ส่งคำขอ” ได้ แต่คุณยังสามารถกรอกแบบฟอร์มไว้ก่อนได้
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* รายละเอียดงาน */}
        <section className="border rounded-lg p-4 space-y-3">
          <h2 className="font-medium">รายละเอียดงาน</h2>

          <div>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="หัวข้อ *"
              value={title}
              maxLength={MAX_TITLE}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {title.length}/{MAX_TITLE}
            </div>
          </div>

          <div>
            <textarea
              className="border rounded px-3 py-2 w-full min-h-[140px]"
              placeholder="รายละเอียด *"
              value={description}
              maxLength={MAX_DESC}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {description.length}/{MAX_DESC}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <select
              className="border rounded px-3 py-2"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">-- เลือกหมวดบริการ --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => onPickImages(e.target.files)}
              />
              {!!images.length && (
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {images.map((f, i) => (
                    <img
                      key={i}
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="h-16 w-full object-cover rounded border"
                      onLoad={(ev) => URL.revokeObjectURL(ev.currentTarget.src)}
                    />
                  ))}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                เลือกได้สูงสุด {MAX_IMAGES} ไฟล์
              </div>
            </div>
          </div>
        </section>

        {/* ผู้ติดต่อ */}
        <section className="border rounded-lg p-4 space-y-3">
          <h2 className="font-medium">ข้อมูลผู้ติดต่อ</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="border rounded px-3 py-2"
              placeholder="ชื่อ *"
              value={contactFirstName}
              onChange={(e) => setContactFirstName(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="นามสกุล *"
              value={contactLastName}
              onChange={(e) => setContactLastName(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="อีเมล *"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="โทรศัพท์ *"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
        </section>

        {/* สถานที่ */}
        <section className="border rounded-lg p-4 space-y-3">
          <h2 className="font-medium">สถานที่หน้างาน</h2>
          <div className="flex justify-end mb-2">
            <button
              type="button"
              className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
              onClick={handleCurrentLocation}
            >
              ใช้ตำแหน่งปัจจุบัน
            </button>
          </div>

          {isLoaded ? (
            <div className="h-72 border rounded">
              <GoogleMap
                center={mapCenter}
                zoom={13}
                mapContainerStyle={{ width: "100%", height: "100%" }}
                onClick={handleMapClick}
              >
                {marker && <Marker position={marker} />}
              </GoogleMap>
            </div>
          ) : (
            <p>กำลังโหลดแผนที่…</p>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="border rounded px-3 py-2"
              placeholder="ชื่อสถานที่ (เช่น หมู่บ้าน/คอนโด)"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="ที่อยู่ (เช่น บ้านเลขที่/ซอย)"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
            />
          </div>

          <div className="grid md:grid-cols-4 gap-3">
            <select
              className="border rounded px-3 py-2"
              value={province}
              onChange={(e) => handleProvinceChange(e.target.value)}
            >
              <option value="">จังหวัด</option>
              {provinces.map((p) => (
                <option key={p.provinceCode} value={p.provinceCode}>
                  {p.provinceNameTh}
                </option>
              ))}
            </select>

            <select
              className="border rounded px-3 py-2"
              value={district}
              onChange={(e) => handleDistrictChange(e.target.value)}
            >
              <option value="">อำเภอ/เขต</option>
              {districts.map((d) => (
                <option key={d.districtCode} value={d.districtCode}>
                  {d.districtNameTh}
                </option>
              ))}
            </select>

            <select
              className="border rounded px-3 py-2"
              value={subdistrict}
              onChange={(e) => handleSubdistrictChange(e.target.value)}
            >
              <option value="">ตำบล/แขวง</option>
              {subdistricts.map((s) => (
                <option key={s.subdistrictCode} value={s.subdistrictCode}>
                  {s.subdistrictNameTh}
                </option>
              ))}
            </select>

            <input
              className="border rounded px-3 py-2"
              placeholder="รหัสไปรษณีย์"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
          </div>
        </section>

        {/* ปุ่ม */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !isFormValid}
            className="px-6 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-60"
          >
            {submitting ? "กำลังส่ง..." : "ส่งคำขอ"}
          </button>
        </div>
      </form>

      {/* ✅ Modal เตือนล็อกอิน */}
      <LoginPromptModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
