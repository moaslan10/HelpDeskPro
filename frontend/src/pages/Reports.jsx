import {useEffect,useMemo,useState} from 'react';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,LineChart,Line,CartesianGrid} from 'recharts';
import {Download,Printer,RefreshCw} from 'lucide-react';
import api from '../services/api';

const empty={summary:{},sla:{},byStatus:[],byPriority:[],byDepartment:[],byDay:[],support:[]};
const presets=[['7','Last 7 days'],['30','Last 30 days'],['90','Last 90 days']];

export default function Reports(){
 const[d,setD]=useState(empty); const[loading,setLoading]=useState(true); const[range,setRange]=useState('30'); const[from,setFrom]=useState(''); const[to,setTo]=useState(''); const[error,setError]=useState('');
 const load=async()=>{setLoading(true);setError('');try{const p={};if(from)p.from=from;if(to)p.to=to;const r=await api.get('/reports',{params:p});setD(r.data||empty)}catch(e){setError(e?.response?.data||'Failed to load reports.')}finally{setLoading(false)}};
 useEffect(()=>{load()},[from,to]);
 const applyPreset=(days)=>{const end=new Date();const start=new Date();start.setDate(end.getDate()-Number(days)+1);setFrom(start.toISOString().slice(0,10));setTo(end.toISOString().slice(0,10));setRange(String(days))};
 const exportCsv=async()=>{try{const r=await api.get('/exports/tickets.csv',{responseType:'blob'});const u=URL.createObjectURL(r.data);const a=document.createElement('a');a.href=u;a.download='helpdesk-tickets-report.csv';a.click();URL.revokeObjectURL(u)}catch{setError('Export failed.')}};
 const s=d.summary||{};
 const cards=[['Total Tickets',s.total||0,'blue'],['Open',s.open||0,'orange'],['In Progress',s.inProgress||0,'purple'],['Pending',s.pending||0,'orange'],['Resolved',s.resolved||0,'green'],['Closed',s.closed||0,'green'],['Overdue',s.overdue||0,'red'],['Critical',s.critical||0,'red']];
 return <>
  <div className="pageHead"><div><h2>Reports & Analytics</h2><p>Track workload, SLA performance and support activity.</p></div><div style={{display:'flex',gap:8}}><button className="secondary" onClick={()=>window.print()}><Printer size={14}/> Print / PDF</button><button className="primary" onClick={exportCsv}><Download size={14}/> Export CSV</button><button className="secondary" onClick={load}><RefreshCw size={14}/> Refresh</button></div></div>
  <div className="reportFilters panel"><div><b>Date Range</b><small>Filter all report metrics</small></div><div className="reportPresets">{presets.map(([v,l])=><button key={v} className={range===v?'selected':''} onClick={()=>applyPreset(v)}>{l}</button>)}</div><label>From<input type="date" value={from} onChange={e=>{setRange('custom');setFrom(e.target.value)}}/></label><label>To<input type="date" value={to} onChange={e=>{setRange('custom');setTo(e.target.value)}}/></label></div>
  {error&&<div className="error">{error}</div>}
  {loading?<div className="loading">Loading reports...</div>:<>
   <div className="stats reportStats">{cards.map(([l,v,c])=><div className="stat" key={l}><div className={'statIcon '+c}><span style={{fontSize:18}}>•</span></div><div><span>{l}</span><strong>{v}</strong></div></div>)}</div>
   <div className="reportHighlight"><div><span>SLA Compliance</span><strong>{s.slaRate||0}%</strong><small>{d.sla?.met||0} of {d.sla?.totalClosed||0} resolved/closed tickets met SLA</small></div><div><span>Average Resolution</span><strong>{s.avgResolutionHours||0}h</strong><small>Average time from creation to resolution</small></div><div><span>Overdue Tickets</span><strong>{s.overdue||0}</strong><small>Active tickets beyond SLA deadline</small></div></div>
   <div className="chartGrid"><div className="panel chart"><h3>Tickets Over Time</h3><ResponsiveContainer width="100%" height={280}><LineChart data={d.byDay}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Line type="monotone" dataKey="value"/></LineChart></ResponsiveContainer></div><div className="panel chart"><h3>Tickets by Status</h3><ResponsiveContainer width="100%" height={280}><BarChart data={d.byStatus}><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value"/></BarChart></ResponsiveContainer></div><div className="panel chart"><h3>Tickets by Priority</h3><ResponsiveContainer width="100%" height={280}><BarChart data={d.byPriority}><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value"/></BarChart></ResponsiveContainer></div><div className="panel chart"><h3>Tickets by Department</h3><ResponsiveContainer width="100%" height={280}><BarChart data={d.byDepartment}><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value"/></BarChart></ResponsiveContainer></div></div>
   <div className="panel reportTable"><div className="panelHead"><div><h3>Support Performance</h3><span>Assigned ticket workload and resolution performance</span></div></div><div className="table"><div className="tr th"><span>Support Agent</span><span>Total</span><span>Resolved</span><span>Overdue</span><span>Avg. Resolution</span></div>{(d.support||[]).map(x=><div className="tr supportRow" key={x.name}><b>{x.name}</b><span>{x.total}</span><span>{x.resolved}</span><span><i className={'pill '+(x.overdue?'critical':'resolved')}>{x.overdue}</i></span><span>{Number(x.avgResolutionHours||0).toFixed(1)}h</span></div>)}{!(d.support||[]).length&&<div className="emptyTable">No assigned support tickets in this period.</div>}</div></div>
  </>}
 </>;
}
