import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../services/api';

const initialForm = { fullName: '', email: '', password: '123456', role: 2, departmentId: '', isActive: true };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [usersRes, departmentsRes] = await Promise.all([api.get('/users'), api.get('/departments')]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setDepartments(Array.isArray(departmentsRes.data) ? departmentsRes.data : []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.response?.data?.message || 'Unable to load users.');
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadInitial = async () => {
      try {
        const [usersRes, departmentsRes] = await Promise.all([api.get('/users'), api.get('/departments')]);
        if (!mounted) return;
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        setDepartments(Array.isArray(departmentsRes.data) ? departmentsRes.data : []);
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Unable to load users.');
      }
    };
    loadInitial();
    return () => { mounted = false; };
  }, []);

  const openAdd = () => {
    setError('');
    setForm(initialForm);
    setShowModal(true);
  };

  const closeAdd = () => {
    if (saving) return;
    setShowModal(false);
  };

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/users', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: Number(form.role),
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        isActive: form.isActive
      });
      setShowModal(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create user.');
    } finally {
      setSaving(false);
    }
  };

  return <>
    <div className="pageHead">
      <div><h2>Users</h2><p>Manage system users and support roles.</p></div>
      <button className="primary" onClick={openAdd}><Plus size={17}/> Add User</button>
    </div>

    {error && !showModal && <div className="errorBox">{error}</div>}

    <div className="panel">
      <div className="table">
        <div className="tr th"><span>Name</span><span>Email</span><span>Role</span><span>Department</span><span>Status</span></div>
        {users.map(x => <div className="tr" key={x.Id ?? x.id}>
          <span><b>{x.FullName ?? x.fullName}</b></span>
          <span>{x.Email ?? x.email}</span>
          <span><em className="pill blue">{x.Role ?? x.role}</em></span>
          <span>{x.Department ?? x.department ?? '—'}</span>
          <span>{(x.IsActive ?? x.isActive) ? 'Active' : 'Inactive'}</span>
        </div>)}
      </div>
    </div>

    {showModal && <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && closeAdd()}>
      <div className="modalCard userModal">
        <button className="close" type="button" onClick={closeAdd}><X size={18}/></button>
        <div className="modalTitle"><div><h2>Add User</h2><p>Create a new HelpDeskPro account.</p></div></div>
        <form onSubmit={add} className="formGrid userForm">
          <label>Full Name<input required value={form.fullName} placeholder="e.g. Mostafa Mohamed" onChange={e=>setForm({...form, fullName:e.target.value})}/></label>
          <label>Email<input required type="email" value={form.email} placeholder="name@helpdeskpro.com" onChange={e=>setForm({...form, email:e.target.value})}/></label>
          <label>Password<input required minLength={6} type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})}/></label>
          <label>Role<select value={form.role} onChange={e=>setForm({...form, role:Number(e.target.value)})}><option value={0}>Admin</option><option value={1}>Support</option><option value={2}>Employee</option></select></label>
          <label>Department<select value={form.departmentId} onChange={e=>setForm({...form, departmentId:e.target.value})}><option value="">No department</option>{departments.map(d=><option key={d.Id ?? d.id} value={d.Id ?? d.id}>{d.Name ?? d.name}</option>)}</select></label>
          <label>Status<select value={form.isActive ? 'active' : 'inactive'} onChange={e=>setForm({...form, isActive:e.target.value === 'active'})}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          {error && <div className="error formError">{error}</div>}
          <div className="modalActions"><button type="button" className="secondary" onClick={closeAdd}>Cancel</button><button className="primary" disabled={saving}>{saving ? 'Creating...' : 'Create User'}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
