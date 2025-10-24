// frontend/src/app/admin/categories/page.js
"use client";

import { useEffect, useState } from "react";
import { api, toPublicUrl } from "@/lib/api";
import { toast, Toaster } from "sonner";
import Modal from "@/components/admin/Modal";

export default function AdminCategoriesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // CREATE
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    iconUrl: "", // เก็บเป็น path relative เช่น /uploads/categories/xxx.png
  });
  const [creating, setCreating] = useState(false);

  // EDIT
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    iconUrl: "", // relative path
  });
  const [editing, setEditing] = useState(false);

  // Upload state
  const [uploadingIcon, setUploadingIcon] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/categories");
      setItems(data?.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "โหลดหมวดหมู่ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /** อัปโหลดรูปไอคอน → ได้ path relative กลับมา เก็บในฟอร์ม, พรีวิวใช้ toPublicUrl() */
  async function uploadIcon(file, mode = "create") {
    if (!file) return;
    setUploadingIcon(true);
    try {
      const fd = new FormData();
      fd.append("icon", file);
      const { data } = await api.post("/categories/upload-icon", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const rel = data?.url; // ex. /uploads/categories/abc.png
      if (!rel) return toast.error("อัปโหลดไม่สำเร็จ");

      if (mode === "edit") {
        setEditForm((f) => ({ ...f, iconUrl: rel }));
      } else {
        setCreateForm((f) => ({ ...f, iconUrl: rel }));
      }
      toast.success("อัปโหลดไอคอนสำเร็จ");
    } catch (e) {
      toast.error(e?.response?.data?.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploadingIcon(false);
    }
  }

  async function onCreate(e) {
    e.preventDefault();
    const name = createForm.name.trim();
    if (!name) return toast.error("กรุณากรอกชื่อหมวดหมู่");

    setCreating(true);
    try {
      await api.post("/categories", {
        name,
        description: createForm.description?.trim() || null,
        iconUrl: createForm.iconUrl || null, // ส่ง path relative
      });
      toast.success("เพิ่มหมวดหมู่แล้ว");
      setCreateForm({ name: "", description: "", iconUrl: "" });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "เพิ่มไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(row) {
    setEditItem(row);
    setEditForm({
      name: row.name || "",
      description: row.description || "",
      iconUrl: row.iconUrl || "", // ที่ได้จาก BE (relative หรือ absolute ก็แสดงได้ด้วย toPublicUrl)
    });
    setEditOpen(true);
  }

  async function onSaveEdit() {
    if (!editItem) return;
    setEditing(true);
    try {
      await api.patch(`/categories/${editItem.id}`, {
        name: editForm.name.trim(),
        description: editForm.description?.trim() || null,
        iconUrl: editForm.iconUrl || null, // เก็บตามที่ฟอร์มมี (relative)
      });
      toast.success("อัปเดตแล้ว");
      setEditOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "อัปเดตไม่สำเร็จ");
    } finally {
      setEditing(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("ลบหมวดหมู่นี้?")) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success("ลบแล้ว");
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      toast.error(e?.response?.data?.message || "ลบไม่สำเร็จ");
    }
  }

  return (
    <div className="space-y-6">
      <Toaster richColors />
      <h1 className="text-2xl font-semibold">หมวดหมู่บริการ</h1>

      {/* CREATE */}
      <form onSubmit={onCreate} className="rounded-lg border p-4 space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">ชื่อหมวดหมู่ *</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm({ ...createForm, name: e.target.value })
              }
              placeholder="เช่น ทาสี, ปูกระเบื้อง"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">รายละเอียด</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={createForm.description}
              onChange={(e) =>
                setCreateForm({ ...createForm, description: e.target.value })
              }
              placeholder="บรรยายสั้นๆ"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">ไอคอน</label>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*,.svg"
                onChange={(e) => uploadIcon(e.target.files?.[0], "create")}
                disabled={uploadingIcon}
              />
              {createForm.iconUrl ? (
                <img
                  src={toPublicUrl(createForm.iconUrl)}
                  alt="preview"
                  className="h-10 w-10 object-contain border rounded"
                />
              ) : null}
            </div>
          </div>
        </div>

        <button
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
          disabled={creating}
        >
          {creating ? "กำลังบันทึก..." : "เพิ่มหมวดหมู่"}
        </button>
      </form>

      {/* LIST */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 w-16">ID</th>
              <th className="text-left px-4 py-2">ชื่อ</th>
              <th className="text-left px-4 py-2">รายละเอียด</th>
              <th className="text-left px-4 py-2">ไอคอน</th>
              <th className="text-right px-4 py-2 w-40">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  กำลังโหลด...
                </td>
              </tr>
            ) : items.length ? (
              items.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">{c.id}</td>
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.description || "-"}</td>
                  <td className="px-4 py-2">
                    {c.iconUrl ? (
                      <img
                        src={toPublicUrl(c.iconUrl)}
                        alt=""
                        className="h-8 w-8 object-contain"
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="px-3 py-1.5 rounded border hover:bg-gray-50"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => onDelete(c.id)}
                        className="px-3 py-1.5 rounded text-red-600 hover:bg-red-50"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  ยังไม่มีหมวดหมู่
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT MODAL */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`แก้ไขหมวดหมู่ #${editItem?.id ?? "-"}`}
        footer={
          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-2 rounded border"
              onClick={() => setEditOpen(false)}
            >
              ยกเลิก
            </button>
            <button
              className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
              onClick={onSaveEdit}
              disabled={editing}
            >
              {editing ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">ชื่อ *</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm mb-1">รายละเอียด</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm mb-1">ไอคอน</label>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*,.svg"
                onChange={(e) => uploadIcon(e.target.files?.[0], "edit")}
                disabled={uploadingIcon}
              />
              {editForm.iconUrl ? (
                <img
                  src={toPublicUrl(editForm.iconUrl)}
                  alt="preview"
                  className="h-10 w-10 object-contain border rounded"
                />
              ) : null}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
