import {useEffect,useState} from 'react';
import {Bell,Check,CheckCheck,Clock,MessageSquare,Ticket as TicketIcon,AlertTriangle,CheckCircle} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import api from '../services/api';

function iconFor(type){
  if(type?.startsWith('sla:')) return <AlertTriangle size={17}/>;
  if(type?.startsWith('ticket:')) return <TicketIcon size={17}/>;
  if(type==='comment') return <MessageSquare size={17}/>;
  if(type==='success') return <CheckCircle size={17}/>;
  return <Bell size={17}/>;
}

export default function Notifications(){
  const [data,setData]=useState([]),[loading,setLoading]=useState(true);
  const navigate=useNavigate();
  const load=async()=>{try{const r=await api.get('/notifications');setData(r.data||[]);}finally{setLoading(false)}};
  useEffect(()=>{load();},[]);
  const read=async id=>{await api.put(`/notifications/${id}/read`);load()};
  const all=async()=>{await api.put('/notifications/read-all');load()};
  const open=async n=>{
    if(!n.IsRead) await api.put(`/notifications/${n.Id}/read`);
    const m=(n.Type||'').match(/^(?:ticket|sla(?:-warning|-overdue)):(\d+)$/);
    if(m) navigate(`/tickets/${m[1]}`); else load();
  };
  return <>
    <div className="pageHead"><div><h2>Notifications</h2><p>Updates about tickets, assignments, SLA and system activity.</p></div><button className="secondary" onClick={all}><CheckCheck size={16}/> Mark all read</button></div>
    <div className="panel"><div className="notificationList">
      {loading?<div className="loading">Loading notifications...</div>:data.length===0?<div className="loading">No notifications yet.</div>:data.map(n=><div className={'notification '+(!n.IsRead?'unread':'')} key={n.Id} onClick={()=>open(n)}>
        <div className="notificationIcon">{iconFor(n.Type)}</div>
        <div className="notificationBody"><b>{n.Title}</b><p>{n.Message}</p><small>{new Date(n.CreatedAt).toLocaleString()}</small></div>
        <div className="notificationActions">{!n.IsRead&&<button className="secondary smallBtn" onClick={e=>{e.stopPropagation();read(n.Id)}}><Check size={14}/> Read</button>}</div>
      </div>)}
    </div></div>
  </>
}
