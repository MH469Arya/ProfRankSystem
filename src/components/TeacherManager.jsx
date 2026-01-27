import { useState, useEffect } from 'react';
import { Table, Button, Modal, Input } from './ui/SharedComponents';

export default function TeacherManager() {
    const [teachers, setTeachers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '' });

    useEffect(() => {
        setTeachers([
            { id: 101, name: 'Teacher 1' },
            { id: 102, name: 'Teacher 2' }
        ]);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingId) {
            setTeachers(teachers.map(t => t.id === editingId ? { ...t, ...formData } : t));
        } else {
            const newId = teachers.length > 0 ? Math.max(...teachers.map(t => t.id)) + 1 : 1;
            setTeachers([...teachers, { id: newId, ...formData }]);
        }
        closeModal();
    };

    const openModal = (teacher = null) => {
        if (teacher) {
            setEditingId(teacher.id);
            setFormData({ name: teacher.name });
        } else {
            setEditingId(null);
            setFormData({ name: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData({ name: '' });
    };

    const handleDelete = (id) => {
        if (confirm('Remove this teacher?')) {
            setTeachers(teachers.filter(t => t.id !== id));
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold uppercase tracking-wide">Manage Teachers</h2>
                <Button onClick={() => openModal()}>+ Add Teacher</Button>
            </div>

            <Table
                headers={['ID', 'Name', 'Actions']}
                data={teachers}
                renderRow={(t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                        <td className="p-3 border-r border-gray-200">{t.id}</td>
                        <td className="p-3 border-r border-gray-200 font-medium">{t.name}</td>
                        <td className="p-3 flex gap-2">
                            <Button variant="secondary" onClick={() => openModal(t)} className="text-xs px-2 py-1">Edit</Button>
                            <Button variant="danger" onClick={() => handleDelete(t.id)} className="text-xs px-2 py-1">Remove</Button>
                        </td>
                    </tr>
                )}
            />

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Edit Teacher' : 'Add Teacher'}>
                <form onSubmit={handleSubmit}>
                    <Input
                        label="Full Name"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="e.g. Teacher 1"
                    />
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button type="submit">Save</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
