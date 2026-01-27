import { useState, useEffect } from 'react';
import { Table, Button, Modal, Input } from './ui/SharedComponents';

export default function SubjectManager() {
    const [subjects, setSubjects] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '' });

    useEffect(() => {
        setSubjects([
            { id: 101, name: 'Data Structures' },
            { id: 102, name: 'Algorithms' },
            { id: 103, name: 'Database Management' }
        ]);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingId) {
            setSubjects(subjects.map(s => s.id === editingId ? { ...s, ...formData } : s));
        } else {
            const newId = subjects.length > 0 ? Math.max(...subjects.map(s => s.id)) + 1 : 1;
            setSubjects([...subjects, { id: newId, ...formData }]);
        }
        closeModal();
    };

    const openModal = (subject = null) => {
        if (subject) {
            setEditingId(subject.id);
            setFormData({ name: subject.name });
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
        if (confirm('Remove this subject?')) {
            setSubjects(subjects.filter(s => s.id !== id));
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold uppercase tracking-wide">Manage Subjects</h2>
                <Button onClick={() => openModal()}>+ Add Subject</Button>
            </div>

            <Table
                headers={['ID', 'Subject Name', 'Actions']}
                data={subjects}
                renderRow={(s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                        <td className="p-3 border-r border-gray-200 w-16 text-center">{s.id}</td>
                        <td className="p-3 border-r border-gray-200 font-medium">{s.name}</td>
                        <td className="p-3 flex gap-2">
                            <Button variant="secondary" onClick={() => openModal(s)} className="text-xs px-2 py-1">Edit</Button>
                            <Button variant="danger" onClick={() => handleDelete(s.id)} className="text-xs px-2 py-1">Remove</Button>
                        </td>
                    </tr>
                )}
            />

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Edit Subject' : 'Add Subject'}>
                <form onSubmit={handleSubmit}>
                    <Input
                        label="Subject Name"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="e.g. Data Structures"
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
