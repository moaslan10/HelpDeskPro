import {Routes,Route,Navigate,Link,useLocation,useNavigate} from 'react-router-dom';
import {LayoutDashboard,Ticket,Users,Building2,BookOpen,BarChart3,LogOut,Search,Menu,UserCircle,Bell,History,CheckCheck,ChevronRight,X,Sun,Moon} from 'lucide-react';
import React from 'react';
import api from './services/api';
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';
import {useAuth} from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import UsersPage from './pages/Users';
import Departments from './pages/Departments';
import DepartmentDetails from './pages/DepartmentDetails';
import Knowledge from './pages/Knowledge';
import KnowledgeDetails from './pages/KnowledgeDetails';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Audit from './pages/Audit';

const items=[['/','Dashboard',LayoutDashboard],['/tickets','Tickets',Ticket],['/users','Users',Users],['/departments','Departments',Building2],['/knowledge','Knowledge Base',BookOpen],['/reports','Reports',BarChart3],['/profile','Profile',UserCircle],['/notifications','Notifications',Bell],['/audit','Audit Log',History]];

function SearchResults({results,onOpen}){
 const groups=[
  ['Tickets',results.tickets,'ticket'],
  ['Users',results.users,'user'],
  ['Departments',results.departments,'department'],
  ['Knowledge Base',results.knowledge,'knowledge'],
  ['Audit Log',results.audit,'audit']
 ];
 const total=groups.reduce((n,[,items])=>n+items.length,0);
 if(!total)return <div className="globalSearchEmpty">No results found.</div>;
 return <div className="globalSearchResults">{groups.map(([title,list,type])=>list.length>0&&<div className="globalSearchGroup" key={title}><div className="globalSearchGroupTitle">{title}</div>{list.slice(0,5).map(item=><button className="globalSearchItem" key={`${type}-${item.Id}`} onClick={()=>onOpen(type,item)}><span className="globalSearchItemIcon">{type==='ticket'?<Ticket size={15}/>:type==='user'?<Users size={15}/>:type==='department'?<Building2 size={15}/>:type==='knowledge'?<BookOpen size={15}/>:<History size={15}/>}</span><span className="globalSearchItemText"><b>{type==='ticket'?`#${item.Id} ${item.Title}`:type==='user'?item.FullName:type==='department'?item.Name:type==='knowledge'?item.Title:item.Action}</b><small>{type==='ticket'?[item.Status,item.Priority,item.Department].filter(Boolean).join(' • '):type==='user'?[item.Email,item.Role,item.Department].filter(Boolean).join(' • '):type==='knowledge'?item.Category:type==='audit'?[item.Entity,item.EntityId?`#${item.EntityId}`:'',item.User].filter(Boolean).join(' • '):'Open details'}</small></span><ChevronRight size={14}/></button>)}</div>)}</div>;
}

function Shell(){
 const {user,logout}=useAuth();
 const loc=useLocation();
 const navigate=useNavigate();
 const [unread,setUnread]=React.useState(0);
 const [recent,setRecent]=React.useState([]);
 const [showNotifs,setShowNotifs]=React.useState(false);
 const [dark,setDark]=React.useState(()=>localStorage.getItem('hd_dark')==='1');
 const [search,setSearch]=React.useState('');
 const [searchOpen,setSearchOpen]=React.useState(false);
 const [searchLoading,setSearchLoading]=React.useState(false);
 const [results,setResults]=React.useState({tickets:[],users:[],departments:[],knowledge:[],audit:[]});
 const searchRef=React.useRef(null);
 React.useEffect(()=>{document.body.classList.toggle('darkMode',dark);localStorage.setItem('hd_dark',dark?'1':'0')},[dark]);

 const loadNotifs=async()=>{try{const [c,n]=await Promise.all([api.get('/notifications/unread-count'),api.get('/notifications')]);setUnread(c.data?.count||0);setRecent((n.data||[]).slice(0,5));}catch{}};
 React.useEffect(()=>{loadNotifs();const id=setInterval(loadNotifs,15000);return()=>clearInterval(id)},[]);
 React.useEffect(()=>{
  const token=localStorage.getItem('hd_token'); if(!token) return;
  const base=(import.meta.env.VITE_API_URL||'http://localhost:5001/api').replace(/\/api$/,'');
  const connection=new HubConnectionBuilder().withUrl(`${base}/hubs/notifications`,{accessTokenFactory:()=>token,transport:HttpTransportType.LongPolling}).withAutomaticReconnect().build();
  connection.on('notification',()=>loadNotifs());
  connection.start().catch(()=>{});
  return()=>{connection.stop().catch(()=>{})};
 },[]);

 React.useEffect(()=>{
  const onDown=e=>{if(searchRef.current&&!searchRef.current.contains(e.target))setSearchOpen(false)};
  document.addEventListener('mousedown',onDown);
  return()=>document.removeEventListener('mousedown',onDown);
 },[]);

 React.useEffect(()=>{
  const value=search.trim();
  if(!value){setResults({tickets:[],users:[],departments:[],knowledge:[],audit:[]});setSearchLoading(false);return;}
  setSearchLoading(true);
  const timer=setTimeout(async()=>{
   try{const r=await api.get('/search',{params:{q:value}});setResults(r.data||{tickets:[],users:[],departments:[],knowledge:[],audit:[]});}
   catch{setResults({tickets:[],users:[],departments:[],knowledge:[],audit:[]});}
   finally{setSearchLoading(false);}
  },250);
  return()=>clearTimeout(timer);
 },[search]);

 const openSearchResult=(type,item)=>{
  setSearchOpen(false);setSearch('');
  if(type==='ticket')navigate(`/tickets/${item.Id}`);
  else if(type==='user')navigate('/users');
  else if(type==='department')navigate(`/departments/${item.Id}`);
  else if(type==='knowledge')navigate(`/knowledge/${item.Id}`);
  else if(type==='audit')navigate('/audit');
 };

 const openNotification=async n=>{try{if(!n.IsRead)await api.put(`/notifications/${n.Id}/read`)}finally{setShowNotifs(false);const m=(n.Type||'').match(/^(?:ticket|sla(?:-warning|-overdue)):(\d+)$/);if(m)navigate(`/tickets/${m[1]}`);else navigate('/notifications');loadNotifs();}};
 return <div className="app"><aside><div className="brand"><div className="logo">H</div><div><b>HelpDeskPro</b><small>IT Support System</small></div></div><nav>{items.map(([p,n,I])=><Link className={loc.pathname===p?'active':''} to={p} key={p}><I size={19}/>{n}</Link>)}</nav><div className="sideUser"><div className="avatar">{user?.FullName?.[0]||'U'}</div><div><b>{user?.FullName}</b><small>{user?.Role}</small></div><button onClick={logout}><LogOut size={17}/></button></div></aside><main><header><button className="mobileMenu"><Menu/></button><div><span className="muted">Workspace</span><h1>{items.find(x=>x[0]===loc.pathname)?.[1]||'HelpDeskPro'}</h1></div><div className="headerRight"><div className="searchTop globalSearchWrap" ref={searchRef}><Search size={16}/><input value={search} onFocus={()=>setSearchOpen(true)} onChange={e=>{setSearch(e.target.value);setSearchOpen(true)}} onKeyDown={e=>{if(e.key==='Escape'){setSearch('');setSearchOpen(false)}}} placeholder="Search everything..."/>{search&&<button className="globalSearchClear" onClick={()=>{setSearch('');setSearchOpen(false)}}><X size={13}/></button>}{searchOpen&&search&&<div className="globalSearchDropdown">{searchLoading?<div className="globalSearchEmpty">Searching...</div>:<SearchResults results={results} onOpen={openSearchResult}/>}</div>}</div><div className="notifWrap"><button className="headerBell" onClick={()=>setShowNotifs(v=>!v)} title="Notifications"><Bell size={19}/>{unread>0&&<span className="notifBadge">{unread>99?'99+':unread}</span>}</button>{showNotifs&&<div className="notifDropdown"><div className="notifDropHead"><b>Notifications</b><button onClick={()=>{navigate('/notifications');setShowNotifs(false)}}><CheckCheck size={14}/> View all</button></div>{recent.length===0?<div className="notifEmpty">No notifications yet.</div>:recent.map(n=><button className={'notifItem '+(!n.IsRead?'unread':'')} key={n.Id} onClick={()=>openNotification(n)}><span className="notifMiniIcon"><Bell size={14}/></span><span><b>{n.Title}</b><small>{n.Message}</small></span><ChevronRight size={14}/></button>)}</div>}</div><button className="themeToggle" onClick={()=>setDark(v=>!v)} title={dark?'Light mode':'Dark mode'}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><div className="avatar">{user?.FullName?.[0]||'U'}</div></div></header><section className="content"><Routes><Route path="/" element={<Dashboard/>}/><Route path="/tickets" element={<Tickets/>}/><Route path="/tickets/:id" element={<Tickets/>}/><Route path="/users" element={<UsersPage/>}/><Route path="/departments" element={<Departments/>}/><Route path="/departments/:id" element={<DepartmentDetails/>}/><Route path="/knowledge" element={<Knowledge/>}/><Route path="/knowledge/:id" element={<KnowledgeDetails/>}/><Route path="/reports" element={<Reports/>}/><Route path="/profile" element={<Profile/>}/><Route path="/notifications" element={<Notifications/>}/><Route path="/audit" element={<Audit/>}/></Routes></section></main></div>}
export default function App(){const{user}=useAuth();return user?<Shell/>:<Routes><Route path="/login" element={<Login/>}/><Route path="*" element={<Navigate to="/login"/>}/></Routes>}
