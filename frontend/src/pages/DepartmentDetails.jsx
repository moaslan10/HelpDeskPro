import { useEffect, useState } from 'react';
import { ArrowLeft, Users, Ticket, CheckCircle2, Clock3, AlertTriangle, UserRound, Building2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const statusClass = s => (s || 'Open').toLowerCase().replace(' ', '');
const priorityClass = p => (p || 'Medium').toLowerCase();

export default function DepartmentDetails(){
  const { id } = useParams();
  const navigate = useNavigate();
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    let mounted=true;
    const load=async()=>{
      setLoading(true); setError('');
      try{ const r=await api.get(`/departments/${id}`); if(mounted)setData(r.data); }
      catch(e){ if(mounted){setError(e?.response?.data?.message||'Unable to load department details.');setData(null);} }
      finally{if(mounted)setLoading(false);}
    };
    load();
    return ()=>{mounted=false;};
  },[id]);

  if(loading) return <div className="loading">Loading department details...</div>;
  if(error) return <><div className="pageHead"><button className="secondary backBtn" onClick={()=>navigate('/departments')}><ArrowLeft size={16}/> Back to Departments</button></div><div className="errorBox">{error}</div></>;
  if(!data) return null;
  const s=data.Stats||{};

  return <>
    <div className="pageHead deptDetailHead">
      <div><button className="secondary backBtn" onClick={()=>navigate('/departments')}><ArrowLeft size={16}/> Back to Departments</button><div className="detailTitle"><div className="deptIcon large">D</div><div><span className="muted">Department</span><h2>{data.Name}</h2><p>View users, tickets and department activity.</p></div></div></div>
    </div>

    <div className="stats deptStats">
      <div className="stat"><div className="statIcon blue"><Users size={18}/></div><div><span>Users</span><strong>{s.TotalUsers??0}</strong></div></div>
      <div className="stat"><div className="statIcon purple"><Ticket size={18}/></div><div><span>Total Tickets</span><strong>{s.TotalTickets??0}</strong></div></div>
      <div className="stat"><div className="statIcon orange"><Clock3 size={18}/></div><div><span>In Progress</span><strong>{s.InProgressTickets??0}</strong></div></div>
      <div className="stat"><div className="statIcon green"><CheckCircle2 size={18}/></div><div><span>Resolved / Closed</span><strong>{(s.ResolvedTickets??0)+(s.ClosedTickets??0)}</strong></div></div>
      <div className="stat"><div className="statIcon red"><AlertTriangle size={18}/></div><div><span>Overdue</span><strong>{s.OverdueTickets??0}</strong></div></div>
    </div>

    <div className="deptDetailGrid">
      <div className="panel">
        <div className="panelHead"><div><h3>Department Users</h3><span>Users assigned to {data.Name}</span></div></div>
        {!data.Users?.length ? <div className="emptyState">No users are assigned to this department.</div> : <div className="table compactTable"><div className="tr th"><span>User</span><span>Role</span><span>Status</span><span>Created</span></div>{data.Users.map(u=><div className="tr" key={u.Id}><span><b>{u.FullName}</b><small>{u.Email}</small></span><span><em className="pill">{u.Role}</em></span><span><em className={'pill '+(u.IsActive?'resolved':'critical')}>{u.IsActive?'Active':'Inactive'}</em></span><span>{new Date(u.CreatedAt).toLocaleDateString()}</span></div>)}</div>}
      </div>

      <div className="panel">
        <div className="panelHead"><div><h3>Ticket Status</h3><span>Current workload</span></div></div>
        <div className="statusSummary"><div><span>Open</span><b>{s.OpenTickets??0}</b></div><div><span>In Progress</span><b>{s.InProgressTickets??0}</b></div><div><span>Pending</span><b>{s.PendingTickets??0}</b></div><div><span>Resolved</span><b>{s.ResolvedTickets??0}</b></div><div><span>Closed</span><b>{s.ClosedTickets??0}</b></div></div>
      </div>
    </div>

    <div className="panel departmentTicketsPanel">
      <div className="panelHead"><div><h3>Department Tickets</h3><span>All support requests assigned to this department</span></div></div>
      {!data.Tickets?.length ? <div className="emptyState">No tickets found for this department.</div> : <div className="table"><div className="tr th"><span>Ticket</span><span>Priority</span><span>Status</span><span>Created By</span><span>SLA</span></div>{data.Tickets.map(t=><div className="tr deptTicketRow" key={t.Id} onClick={()=>navigate(`/tickets/${t.Id}`)}><span><b>#{t.Id} {t.Title}</b><small>{t.AssignedTo?`Assigned to ${t.AssignedTo}`:'Unassigned'}</small></span><span><em className={'pill '+priorityClass(t.Priority)}>{t.Priority}</em></span><span><em className={'pill '+statusClass(t.Status)}>{t.Status==='InProgress'?'In Progress':t.Status}</em></span><span>{t.CreatedBy}</span><span className={t.Overdue?'overdue':''}>{t.Overdue?'Overdue':new Date(t.SlaDueAt).toLocaleString()}</span></div>)}</div>}
    </div>
  </>;
}
