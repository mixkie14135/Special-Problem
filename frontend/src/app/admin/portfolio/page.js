// src/app/admin/portfolio/page.js
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { fileUrl } from "@/lib/urls";

export default function AdminPortfolioPage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  // form
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        api.get("/categories"),
        api.get("/portfolio"),
      ]);
      setCategories(cRes?.data?.data || cRes?.data || []);
      setItems(pRes?.data?.data || pRes?.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function onUpload(e) {
    e.preventDefault();
    if (!image || !title.trim()) {
      toast.error("กรอกชื่อผลงานและเลือกรูป");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", image); // backend: uploadPortfolio.single('image')
      fd.append("title", title.trim());
      if (desc.trim()) fd.append("description", desc.trim());
      if (categoryId) fd.append("categoryId", String(categoryId));

      await api.post("/portfolio", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("อัปโหลดผลงานแล้ว");
      // reset form
      setImage(null);
      setTitle("");
      setDesc("");
      setCategoryId("");
      // reload list
      loadAll();
    } catch (e) {
      toast.error(e?.response?.data?.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("ลบผลงานนี้?")) return;
    try {
      await api.delete(`/portfolio/${id}`);
      toast.success("ลบแล้ว");
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      toast.error(e?.response?.data?.message || "ลบไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">ผลงานของเรา</h1>

      {/* Upload form */}
      <form
        onSubmit={onUpload}
        className="rounded-lg border p-4 grid md:grid-cols-2 gap-4"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">ชื่อผลงาน *</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น รีโนเวทบ้าน 2 ชั้น"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">รายละเอียด (ไม่บังคับ)</label>
            <textarea
              className="border rounded px-3 py-2 w-full"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="บรรยายสั้นๆ เกี่ยวกับผลงานนี้"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">หมวดหมู่ (ไม่บังคับ)</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">— ไม่ระบุ —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">รูปผลงาน *</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-gray-500 mt-1">
              รองรับ: jpg, jpeg, png, webp
            </p>
          </div>

          <button
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
            disabled={uploading || !image || !title.trim()}
          >
            {uploading ? "กำลังอัปโหลด..." : "อัปโหลด"}
          </button>
        </div>

        {/* Preview */}
        <div className="rounded-lg border p-4 flex items-center justify-center min-h-48">
          {image ? (
            <img
              alt="preview"
              src={URL.createObjectURL(image)}
              className="max-h-60 object-contain"
            />
          ) : (
            <div className="text-gray-500 text-sm">ตัวอย่างรูปจะปรากฏที่นี่</div>
          )}
        </div>
      </form>

      {/* List */}
      <div className="rounded-lg border p-4">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full text-center text-gray-500 py-10">
              กำลังโหลด...
            </div>
          ) : items.length ? (
            items.map((it) => (
              <div key={it.id} className="rounded-lg border overflow-hidden">
                <div className="aspect-video bg-gray-50">
                  <img
                    src={fileUrl(it.imageUrl)}
                    alt={it.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/vercel.svg";
                    }}
                  />
                </div>
                <div className="p-3 space-y-1">
                  <div className="font-medium">{it.title}</div>
                  {/* หมายเหตุ: portfolio.list ฝั่ง backend ตอนนี้ไม่ได้ include category
                      ถ้าอยากโชว์ ให้ปรับ controller ให้ include หรือ map ฝั่ง FE เอง */}
                  {it.category?.name && (
                    <div className="text-xs text-gray-600">{it.category.name}</div>
                  )}
                  {it.description && (
                    <div className="text-xs text-gray-600 line-clamp-2">
                      {it.description}
                    </div>
                  )}
                  <div className="pt-2 text-right">
                    <button
                      onClick={() => onDelete(it.id)}
                      className="px-3 py-1.5 rounded text-red-600 hover:bg-red-50 text-sm"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 py-10">
              ยังไม่มีผลงาน
            </div>
          )}
        </div>
      </div>
    </div>
  );
}