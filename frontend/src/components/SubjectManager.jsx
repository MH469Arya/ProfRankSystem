import { useState, useEffect } from "react";
import { Table, Button, Modal, Input } from "./ui/SharedComponents";

export default function SubjectManager() {
  const [subjects, setSubjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", sem: "" });
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchSubjects = async () => {
    const res = await fetch("/api/subjects", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    const data = await res.json();
    setSubjects(data);
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

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
    if (selectedIds.length === subjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(subjects.map((s) => s.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected subject(s)? This will also remove any professor assignments linked to them.`,
      )
    )
      return;

    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/subjects/batch-delete", {
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
      await fetchSubjects();
    } catch (err) {
      console.error("Batch delete failed:", err);
      alert("Server error during batch delete");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        // EDIT
        await fetch(`/api/subjects/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(formData),
        });
      } else {
        // ADD
        await fetch("/api/subjects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(formData),
        });
      }

      closeModal();
      fetchSubjects();
    } catch (err) {
      alert("Failed to save subject");
    }
  };

  const openModal = (subject = null) => {
    if (subject) {
      setEditingId(subject.id);
      setFormData({ name: subject.name, sem: subject.sem });
    } else {
      setEditingId(null);
      setFormData({ name: "", sem: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", sem: "" });
  };

  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Delete ${name}? This will also remove any professor assignments linked to them.`,
      )
    )
      return;

    const token = localStorage.getItem("token");

    const res = await fetch(`/api/subjects/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Delete failed");
      return;
    }

    setSelectedIds((prev) => prev.filter((i) => i !== id));
    await fetchSubjects();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold uppercase tracking-wide">
          Manage Subjects
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
          <Button onClick={() => openModal()}>+ Add Subject</Button>
        </div>
      </div>

      <Table
        headers={
          selectMode
            ? [
                "Sr. No",
                "Subject Name",
                "Semester",
                "Actions",
                <span className="flex items-center gap-2 justify-start whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="w-5 h-5 cursor-pointer shrink-0"
                    style={{ border: "2px solid black" }}
                    checked={subjects.length > 0 && selectedIds.length === subjects.length}
                    onChange={toggleSelectAll}
                  />
                  Select All
                </span>,
              ]
            : ["Sr. No", "Subject Name", "Semester", "Actions"]
        }
        data={subjects}
        renderRow={(s, index) => (
          <tr key={s.id} className="hover:bg-gray-50">
            <td className="p-3 border-r border-gray-200 w-16 text-center">
              {index + 1}
            </td>
            <td className="p-3 border-r border-gray-200 font-medium">
              {s.name}
            </td>
            <td className="p-3 border-r border-gray-200 font-medium">
              Sem {s.sem}
            </td>
            <td className="p-3 flex gap-2">
              <Button
                variant="secondary"
                onClick={() => openModal(s)}
                className="text-xs px-2 py-1"
              >
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(s.id, s.name)}
                className="text-xs px-2 py-1"
              >
                Remove
              </Button>
            </td>
            {selectMode && (
              <td className="p-3">
                <div className="flex items-center justify-start pl-1">
                  <input
                    type="checkbox"
                    className="w-5 h-5 cursor-pointer shrink-0"
                    style={{ border: "2px solid black" }}
                    checked={selectedIds.includes(s.id)}
                    onChange={() => toggleSelect(s.id)}
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
        title={editingId ? "Edit Subject" : "Add Subject"}
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Subject Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="e.g. Data Structures"
          />

          <Input
            label="Semester"
            type="number"
            min="1"
            max="8"
            value={formData.sem}
            onChange={(e) =>
              setFormData({ ...formData, sem: Number(e.target.value) })
            }
            required
            placeholder="1 - 8"
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
