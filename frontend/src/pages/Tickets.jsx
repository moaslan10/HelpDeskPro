import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Plus, Eye, Trash2, X, MessageSquare, Paperclip, Star, Clock, Download, UserCheck, CheckCircle2, RotateCcw } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Tickets() {
  const { user } = useAuth();
  const { id: routeTicketId } = useParams();
  const isStaff = user?.Role === 'Admin' || user?.Role === 'Support';
  const [data, setData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [statusSaving, setStatusSaving] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', tags: '', departmentId: '' });
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(0);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page,setPage]=useState(1); const [pageSize]=useState(10); const [totalPages,setTotalPages]=useState(1);

  const load = async () => {
    try {
      const r = await api.get('/tickets/paged', { params: { q: q || undefined, page, pageSize } });
      setData(Array.isArray(r.data?.items) ? r.data.items : []); setTotalPages(r.data?.totalPages||1);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data || 'Could not load tickets.');
    }
  };

  const loadAgents = async () => {
    try {
      const r = await api.get('/users');
      setAgents((Array.isArray(r.data) ? r.data : []).filter(u => (u.Role === 'Admin' || u.Role === 'Support') && u.IsActive));
    } catch (e) {
      console.error(e);
    }
  };

  const loadDepartments = async () => {
    try {
      const r = await api.get('/departments');
      setDepartments(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { setPage(1); }, [q]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([load(), loadDepartments(), loadAgents()]);
    };
    init();
  }, [page]);

  useEffect(() => {
    if (!routeTicketId) return;
    const openRouteTicket = async () => {
      try {
        setError('');
        const r = await api.get(`/tickets/${routeTicketId}`);
        setOpen(r.data);
        setRating(0);
      } catch (e) {
        console.error(e);
        setError(e?.response?.data?.message || 'Could not open this ticket.');
      }
    };
    openRouteTicket();
  }, [routeTicketId]);

  const add = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        tags: form.tags.trim(),
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        assignedToId: null
      };
      await api.post('/tickets', payload);
      setForm({ title: '', description: '', priority: 'Medium', tags: '', departmentId: '' });
      await load();
      document.getElementById('newTicket')?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      console.error(e);
      const message = typeof e?.response?.data === 'string' ? e.response.data : (e?.response?.data?.message || 'Could not create ticket.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const del = async (id) => {
    if (confirm('Delete this ticket?')) {
      await api.delete('/tickets/' + id);
      await load();
    }
  };

  const detail = async (id) => {
    setOpen((await api.get('/tickets/' + id)).data);
    setRating(0);
  };

  const changeStatus = async (nextStatus) => {
    if (!open || open.Status === nextStatus) return;
    setStatusSaving(true);
    setError('');
    try {
      await api.post(`/tickets/${open.Id}/status`, { status: nextStatus });
      await detail(open.Id);
      await load();
    } catch (e) {
      const message = typeof e?.response?.data === 'string' ? e.response.data : (e?.response?.data?.message || 'Could not change ticket status.');
      setError(message);
    } finally {
      setStatusSaving(false);
    }
  };

  const assignTicket = async (value) => {
    if (!open) return;
    setAssignSaving(true);
    setError('');
    try {
      await api.post(`/tickets/${open.Id}/assign`, { assignedToId: value ? Number(value) : null });
      await detail(open.Id);
      await load();
    } catch (e) {
      const message = typeof e?.response?.data === 'string' ? e.response.data : (e?.response?.data?.message || 'Could not assign ticket.');
      setError(message);
    } finally {
      setAssignSaving(false);
    }
  };

  const addComment = async () => {
    if (!comment.trim() || !open) return;
    await api.post(`/tickets/${open.Id}/comments`, JSON.stringify(comment), { headers: { 'Content-Type': 'application/json' } });
    setComment('');
    detail(open.Id);
  };

  const upload = async () => {
    if (!file || !open) return;
    const fd = new FormData();
    fd.append('file', file);
    await api.post(`/tickets/${open.Id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setFile(null);
    detail(open.Id);
  };

  const rate = async () => {
    if (!rating || !open) return;
    await api.post(`/tickets/${open.Id}/rate`, { rating, comment: 'Rated from HelpDeskPro' });
    detail(open.Id);
  };

  const download = async (a) => {
    const r = await api.get(`/tickets/${open.Id}/attachments/${a.Id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const el = document.createElement('a');
    el.href = url;
    el.download = a.FileName;
    el.click();
    URL.revokeObjectURL(url);
  };

  return <>
    <div className="pageHead">
      <div><h2>Support Tickets</h2><p>Create, assign and track support requests with SLA, tags and attachments.</p></div>
      <button className="primary" onClick={() => document.getElementById('newTicket')?.scrollIntoView({ behavior: 'smooth' })}><Plus size={17}/> New Ticket</button>
    </div>

    {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

    <div className="panel">
      <div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Search tickets or tags..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}/></div></div>
      <div className="table">
        <div className="tr th"><span>Ticket</span><span>Priority</span><span>Status</span><span>SLA</span><span>Actions</span></div>
        {data.map(x => <div className="tr" key={x.Id}>
          <span><b>#{x.Id} {x.Title}</b><small>{x.CreatedBy} {x.Tags && ' · ' + x.Tags}</small></span>
          <span><em className={'pill ' + (x.Priority || 'Medium').toLowerCase()}>{x.Priority}</em></span>
          <span><em className={'pill ' + (x.Status || 'Open').toLowerCase().replace(' ', '')}>{x.Status}</em></span>
          <span className={x.Overdue ? 'overdue' : ''}>{x.Overdue ? 'Overdue' : new Date(x.SlaDueAt).toLocaleString()}</span>
          <span className="actions"><button onClick={() => detail(x.Id)}><Eye size={16}/></button><button onClick={() => del(x.Id)}><Trash2 size={16}/></button></span>
        </div>)}
        {!data.length && <div style={{ padding: 24, textAlign: 'center' }}>No tickets found.</div>}
      </div>
      <div className="pagination"><button className="secondary" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page} of {totalPages}</span><button className="secondary" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</button></div>
    </div>

    <div className="panel formPanel" id="newTicket">
      <h3>Create New Ticket</h3>
      <form onSubmit={add} className="formGrid">
        <input required placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/>
        <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select>
        <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
          <option value="">Select department (optional)</option>
          {departments.map(d => <option key={d.Id} value={d.Id}>{d.Name}</option>)}
        </select>
        <input placeholder="Tags (network, printer, email)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}/>
        <textarea required placeholder="Describe the issue..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/>
        <button disabled={loading} className="primary">{loading ? 'Creating...' : 'Create Ticket'}</button>
      </form>
    </div>

    {open && <div className="modal"><div className="modalCard">
      <button className="close" onClick={() => setOpen(null)}><X/></button>
      <h2 className="modalTitle">#{open.Id} {open.Title}</h2>
      <div className="modalMeta"><span className={'pill ' + open.Priority.toLowerCase()}>{open.Priority}</span><span className={'pill ' + open.Status.toLowerCase().replace(' ', '')}>{open.Status}</span>{open.Tags?.split(',').filter(Boolean).map(t => <span className="tag" key={t}>{t.trim()}</span>)}</div>
      <div className="slaBar"><div className={'slaItem ' + (open.Overdue ? 'overdue' : '')}><Clock size={13}/> SLA due<strong>{open.Overdue ? 'Overdue' : new Date(open.SlaDueAt).toLocaleString()}</strong></div><div className="slaItem"><span>Assigned</span><strong>{open.AssignedTo || 'Unassigned'}</strong></div></div>
      <div className="ticketWorkflow">
        <div className="workflowTitle"><b>Ticket workflow</b><span>Current: {open.Status}</span></div>
        <div className="workflowSteps">{['Open','InProgress','Pending','Resolved','Closed'].map((s, i) => <span key={s} className={open.Status === s ? 'current' : ''}>{i + 1}. {s === 'InProgress' ? 'In Progress' : s}</span>)}</div>
        {isStaff ? <div className="workflowControls">
          <select value={open.Status} onChange={e => changeStatus(e.target.value)} disabled={statusSaving}>
            {open.Status === 'Open' && <><option value="Open">Open</option><option value="InProgress">In Progress</option></>}
            {open.Status === 'InProgress' && <><option value="InProgress">In Progress</option><option value="Pending">Pending</option><option value="Resolved">Resolved</option></>}
            {open.Status === 'Pending' && <><option value="Pending">Pending</option><option value="InProgress">In Progress</option></>}
            {open.Status === 'Resolved' && <><option value="Resolved">Resolved</option><option value="InProgress">In Progress</option><option value="Closed">Closed</option></>}
            {open.Status === 'Closed' && <><option value="Closed">Closed</option><option value="InProgress">Reopen / In Progress</option></>}
          </select>
          <select value={agents.find(a => a.FullName === open.AssignedTo)?.Id || ''} onChange={e => assignTicket(e.target.value)} disabled={assignSaving}>
            <option value="">Unassigned</option>{agents.map(a => <option key={a.Id} value={a.Id}>{a.FullName} · {a.Role}</option>)}
          </select>
          {open.Status !== 'InProgress' && open.Status !== 'Closed' && <button className="secondary" onClick={() => changeStatus('InProgress')} disabled={statusSaving}><RotateCcw size={14}/> Work on it</button>}
          {open.Status === 'InProgress' && <button className="primary" onClick={() => changeStatus('Resolved')} disabled={statusSaving}><CheckCircle2 size={14}/> Resolve</button>}
          {open.Status === 'Resolved' && <button className="primary" onClick={() => changeStatus('Closed')} disabled={statusSaving}><CheckCircle2 size={14}/> Close Ticket</button>}
        </div> : open.Status === 'Resolved' ? <div className="workflowControls"><button className="secondary" onClick={() => changeStatus('InProgress')} disabled={statusSaving}><RotateCcw size={14}/> Still not fixed</button><button className="primary" onClick={() => changeStatus('Closed')} disabled={statusSaving}><CheckCircle2 size={14}/> Confirm & Close</button></div> : null}
        {open.Status === 'Resolved' && <div className="workflowHint">If the issue is still not fixed, move it back to <b>In Progress</b>. Otherwise close the ticket.</div>}
      </div>
      <p>{open.Description}</p><hr/><h3><MessageSquare size={18}/> Comments</h3>
      {open.Comments?.map(c => <div className="comment" key={c.Id}><b>{c.User}</b><span>{c.Body}</span></div>)}
      <div className="commentBox"><input placeholder="Write a comment..." value={comment} onChange={e => setComment(e.target.value)}/><button className="primary" onClick={addComment}>Send</button></div>
      <hr/><h3><Paperclip size={18}/> Attachments</h3>
      {open.Attachments?.map(a => <div className="comment" key={a.Id}><b>{a.FileName}</b><span>{Math.round(a.Size / 1024)} KB</span><button className="secondary" onClick={() => download(a)}><Download size={14}/> Download</button></div>)}
      <div className="commentBox"><input type="file" onChange={e => setFile(e.target.files?.[0] || null)}/><button className="primary" onClick={upload}>Upload</button></div>
      <hr/><h3><Star size={18}/> Satisfaction</h3><div className="slaBar">{[1,2,3,4,5].map(n => <button key={n} className="secondary" onClick={() => setRating(n)} aria-label={`Rate ${n}`}><Star size={14} fill={n <= rating ? 'currentColor' : 'none'}/>{n}</button>)}<button className="primary" onClick={rate}>Save Rating</button></div>{open.Rating && <small>Current rating: {open.Rating}/5</small>}
    </div></div>}
  </>;
}
