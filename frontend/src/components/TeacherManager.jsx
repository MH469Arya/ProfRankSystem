import { useState, useEffect } from "react";
import { Table, Button, Modal, Input } from "./ui/SharedComponents";

export default function TeacherManager() {
  const [teachers, setProffs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "" });
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    fetchProffs();
  }, []);

  const fetchProffs = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/proffs", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    setProffs(data);
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIds([]);
  };
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === teachers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(teachers.map((t) => t.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected professor(s)? This will also remove any subject assignments linked to them.`,
      )
    )
      return;

    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/proffs/batch-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Batch delete failed");
        return;
      }

      setSelectedIds([]);
      await fetchProffs();
    } catch (err) {
      console.error("Batch delete failed:", err);
      alert("Server error during batch delete");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (editingId) {
      await fetch(`/api/proffs/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
    } else {
      await fetch("/api/proffs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
    }

    await fetchProffs();
    closeModal();
  };

  const openModal = (teacher = null) => {
    if (teacher) {
      setEditingId(teacher.id);
      setFormData({ name: teacher.name });
    } else {
      setEditingId(null);
      setFormData({ name: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ name: "" });
  };

  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Delete ${name}? This will also remove any subject assignments linked to them.`,
      )
    )
      return;

    const token = localStorage.getItem("token");

    const res = await fetch(`/api/proffs/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Delete failed");
      return;
    }

    setSelectedIds((prev) => prev.filter((i) => i !== id));
    await fetchProffs();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold uppercase tracking-wide">
          Manage Teachers
        </h2>
        <div className="flex gap-2">
          {selectMode && selectedIds.length > 0 && (
            <Button
              variant="danger"
              onClick={handleBatchDelete}
              className="text-xs px-3 py-2"
            >
              Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Button onClick={toggleSelectMode} className="text-xs px-3 py-2">
            {selectMode ? "Cancel" : "Select"}
          </Button>
          <Button onClick={() => openModal()}>+ Add Teacher</Button>
        </div>
      </div>

      <Table
        headers={
          selectMode
            ? [
                "ID",
                "Name",
                "Actions",
                <div className="flex items-center justify-center gap-1.5" title="Select All">
                  <input
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer shrink-0"
                    style={{ border: "2px solid black" }}
                    checked={teachers.length > 0 && selectedIds.length === teachers.length}
                    onChange={toggleSelectAll}
                  />
                  <span className="text-xs font-bold uppercase tracking-tight whitespace-nowrap">SELECT ALL</span>
                </div>,
              ]
            : ["ID", "Name", "Actions"]
        }
        data={teachers}
        renderRow={(t) => (
          <tr key={t.id} className="hover:bg-gray-50">
            <td className="p-3 border-r border-gray-200">{t.id}</td>
            <td className="p-3 border-r border-gray-200 font-medium">
              {t.name}
            </td>
            <td className="p-3 flex gap-2">
              <Button
                variant="secondary"
                onClick={() => openModal(t)}
                className="text-xs px-2 py-1"
              >
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(t.id, t.name)}
                className="text-xs px-2 py-1"
              >
                Remove
              </Button>
            </td>
            {selectMode && (
              <td className="p-3 w-28 text-center">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer shrink-0"
                    style={{ border: "2px solid black" }}
                    checked={selectedIds.includes(t.id)}
                    onChange={() => toggleSelect(t.id)}
                  />
                </div>
              </td>
            )}
          </tr>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Teacher" : "Add Teacher"}
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g. Teacher 1"
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
