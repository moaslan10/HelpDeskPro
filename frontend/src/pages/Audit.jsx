import {useEffect,useMemo,useState} from 'react';
import {History,Search,ExternalLink,Download,RefreshCw} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import api from '../services/api';

export default function Audit(){
 const nav=useNavigate();
 const [data,setData]=useState([]); const [users,setUsers]=useState([]); const [loading,setLoading]=useState(true);
 const [search,setSearch]=useState(''); const [page,setPage]=useState(1); const [totalPages,setTotalPages]=useState(1); const [action,setAction]=useState(''); const [entity,setEntity]=useState(''); const [userId,setUserId]=useState(''); const [from,setFrom]=useState(''); const [to,setTo]=useState('');
 const load=async()=>{setLoading(true);try{const [logs,us]=await Promise.all([api.get('/audit/paged',{params:{q:search||undefined,action:action||undefined,entity:entity||undefined,userId:userId||undefined,from:from||undefined,to:to||undefined,page,pageSize:25}}),api.get('/audit/users')]);setData(logs.data?.items||[]); setTotalPages(logs.data?.totalPages||1);setUsers(us.data||[])}catch(e){console.error(e)}finally{setLoading(false)}};
 useEffect(()=>{load()},[page]);
 const exportCsv=()=>{const rows=[['Date','User','Email','Action','Entity','Entity ID'],...data.map(x=>[new Date(x.CreatedAt).toLocaleString(),x.UserName,x.UserEmail||'',x.Action,x.Entity,x.EntityId||''])];const csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='helpdesk-audit-log.csv';a.click();URL.revokeObjectURL(a.href)};
 return <>
  <div className="pageHead"><div><h2>Audit Log</h2><p>Track who did what and when across the support workspace.</p></div><div className="actions"><button className="secondary" onClick={load}><RefreshCw size={14}/> Refresh</button><button className="primary small" onClick={exportCsv}><Download size={14}/> Export CSV</button></div></div>
  <div className="panel" style={{marginBottom:18}}><div className="formGrid" style={{marginTop:0,gridTemplateColumns:'1.5fr 1fr 1.2fr 1fr 1fr auto'}}>
   <div><label>Search</label><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="User, action, entity, ID..." onKeyDown={e=>{if(e.key==='Enter')load()}}/></div>
   <div><label>Entity</label><select value={entity} onChange={e=>setEntity(e.target.value)}><option value="">All Entities</option><option>User</option><option>Ticket</option><option>Department</option><option>KnowledgeArticle</option><option>System</option></select></div>
   <div><label>User</label><select value={userId} onChange={e=>setUserId(e.target.value)}><option value="">All Users</option>{users.map(u=><option value={u.Id} key={u.Id}>{u.FullName}</option>)}</select></div>
   <div><label>From</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div>
   <div><label>To</label><input type="date" value={to} onChange={e=>setTo(e.target.value)}/></div>
   <button className="primary small" onClick={()=>{setPage(1);load()}}><Search size={14}/> Filter</button>
  </div></div>
  <div className="panel"><div className="table"><div className="tr th" style={{gridTemplateColumns:'1.35fr 1.6fr 1.5fr 1fr 1fr 90px'}}><span>Date</span><span>User</span><span>Action</span><span>Entity</span><span>ID</span><span></span></div>
  {loading?<div className="loading">Loading audit logs...</div>:data.length===0?<div className="loading">No audit activity found.</div>:data.map(x=><div className="tr" key={x.Id} style={{gridTemplateColumns:'1.35fr 1.6fr 1.5fr 1fr 1fr 90px'}}>
   <span>{new Date(x.CreatedAt).toLocaleString()}</span><span><b>{x.UserName||'System'}</b><small>{x.UserEmail||'System action'}</small></span><span><b><History size={14}/> {x.Action}</b></span><span><i className="pill">{x.Entity}</i></span><span>{x.EntityId||'—'}</span><span>{x.Entity==='Ticket'&&x.EntityId?<button className="secondary" title="Open ticket" onClick={()=>nav(`/tickets/${x.EntityId}`)}><ExternalLink size={14}/></button>:null}</span>
  </div>)}
  </div></div><div className="pagination"><button className="secondary" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page} of {totalPages}</span><button className="secondary" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</button></div>
 </>
}
