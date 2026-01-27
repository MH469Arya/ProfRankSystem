import { useState, useEffect } from 'react';
import { Table, Button, Modal, Input } from './ui/SharedComponents';

export default function DepartmentManager() {
    const [departments, setDepartments] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', hodEmail: '' });

    // Mock Data Fetch
    useEffect(() => {
        setDepartments([
            { id: 1, name: 'Computer Engineering', hodEmail: 'compwd@college.edu' },
            { id: 2, name: 'AIML', hodEmail: 'aimlhod@college.edu' },
            { id: 3, name: 'IT', hodEmail: 'ithod@college.edu' }
        ]);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingId) {
            setDepartments(departments.map(d =>
                d.id === editingId ? { ...d, ...formData } : d
            ));
        } else {
            const newId = departments.length > 0 ? Math.max(...departments.map(d => d.id)) + 1 : 1;
            setDepartments([...departments, { id: newId, ...formData }]);
        }
        closeModal();
    };

    const openModal = (dept = null) => {
        if (dept) {
            setEditingId(dept.id);
            setFormData({ name: dept.name, hodEmail: dept.hodEmail });
        } else {
            setEditingId(null);
            setFormData({ name: '', hodEmail: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData({ name: '', hodEmail: '' });
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this department?')) {
            setDepartments(departments.filter(d => d.id !== id));
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold uppercase tracking-wide">Manage Departments</h2>
                <Button onClick={() => openModal()}>+ Add Department</Button>
            </div>

            <Table
                headers={['ID', 'Department Name', 'HOD Email', 'Actions']}
                data={departments}
                renderRow={(dept) => (
                    <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 border-r border-gray-200">{dept.id}</td>
                        <td className="p-3 border-r border-gray-200 font-medium">{dept.name}</td>
                        <td className="p-3 border-r border-gray-200">{dept.hodEmail}</td>
                        <td className="p-3 flex gap-2">
                            <Button variant="secondary" onClick={() => openModal(dept)} className="text-xs px-2 py-1">Edit</Button>
                            <Button variant="danger" onClick={() => handleDelete(dept.id)} className="text-xs px-2 py-1">Delete</Button>
                        </td>
                    </tr>
                )}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingId ? 'Edit Department' : 'Add Department'}
            >
                <form onSubmit={handleSubmit}>
                    <Input
                        label="Department Name"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="e.g. Computer Engineering"
                    />
                    <Input
                        label="HOD Email"
                        type="email"
                        value={formData.hodEmail}
                        onChange={e => setFormData({ ...formData, hodEmail: e.target.value })}
                        required
                        placeholder="e.g. hod@example.com"
                    />
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
