import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, X } from 'lucide-react';
import api from '../services/api';

export default function Departments() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await api.get('/departments'); setDepartments(Array.isArray(response.data) ? response.data : []); }
    catch (err) { console.error(err); setDepartments([]); setError(err.response?.data?.message || 'Unable to load departments.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault(); if (!name.trim()) return;
    setSaving(true); setError('');
    try { await api.post('/departments', { name: name.trim() }); setName(''); setShowModal(false); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to add department.'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!id || !window.confirm('Delete department?')) return;
    try { await api.delete(`/departments/${id}`); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to delete department.'); }
  };

  return <>
    <div className="pageHead"><div><h2>Departments</h2><p>Organize employees and tickets by department.</p></div><button className="primary" onClick={()=>{setError('');setName('');setShowModal(true)}}><Plus size={17}/> Add Department</button></div>
    {error && !showModal && <div className="errorBox">{error}</div>}
    {loading ? <div className="loading">Loading departments...</div> : <div className="cardsGrid">{departments.map((x,index)=>{const id=x?.Id??x?.id;const name=x?.Name??x?.name??'Unnamed Department';const users=x?.Users??x?.users??0;const tickets=x?.Tickets??x?.tickets??0;return <div className="deptCard" key={id??index} onClick={()=>id&&navigate(`/departments/${id}`)} role="button" tabIndex={0} onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&id)navigate(`/departments/${id}`)}}><div className="deptIcon">D</div><div className="deptMain"><h3>{name}</h3><p>{users} users · {tickets} tickets</p><span className="deptLink">View department details →</span></div><button onClick={e=>{e.stopPropagation();del(id)}} disabled={!id} title="Delete department"><Trash2 size={16}/></button></div>})}</div>}
    {showModal && <div className="modal" onMouseDown={e=>e.target===e.currentTarget&&!saving&&setShowModal(false)}><div className="modalCard compactModal"><button className="close" type="button" onClick={()=>!saving&&setShowModal(false)}><X size={18}/></button><h2>Add Department</h2><p className="modalSub">Create a new organizational department.</p><form onSubmit={add} className="stackForm"><label>Department Name<input autoFocus required value={name} placeholder="e.g. IT Support" onChange={e=>setName(e.target.value)}/></label>{error&&<div className="error">{error}</div>}<div className="modalActions"><button type="button" className="secondary" onClick={()=>!saving&&setShowModal(false)}>Cancel</button><button className="primary" disabled={saving}>{saving?'Creating...':'Create Department'}</button></div></form></div></div>}
  </>;
}
