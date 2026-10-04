import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, Building2, UserCircle2, Camera, Clock3, Activity, X, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

const defaultPrefs = { email: true, tickets: true, assignments: true, sla: true };

export default function Profile(){
  const { user, setUser } = useAuth();
  const [profile,setProfile]=useState(null);
  const [activity,setActivity]=useState([]);
  const [editOpen,setEditOpen]=useState(false);
  const [passwordOpen,setPasswordOpen]=useState(false);
  const [form,setForm]=useState({FullName:'',Email:''});
  const [password,setPassword]=useState({CurrentPassword:'',NewPassword:'',ConfirmPassword:''});
  const [prefs,setPrefs]=useState(()=>JSON.parse(localStorage.getItem('hd_notification_prefs')||JSON.stringify(defaultPrefs)));
  const [avatar,setAvatar]=useState(()=>localStorage.getItem('hd_avatar')||'');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);

  const load=async()=>{
    try{
      const [p,a]=await Promise.all([api.get('/profile'),api.get('/profile/activity')]);
      setProfile(p.data); setForm({FullName:p.data.FullName||'',Email:p.data.Email||''}); setActivity(a.data||[]);
    }catch(e){setError(e.response?.data?.message||'Could not load profile.');}
  };
  useEffect(()=>{load();},[]);

  const saveProfile=async(e)=>{
    e.preventDefault(); setSaving(true); setError(''); setMessage('');
    try{
      const {data}=await api.put('/profile',form); setProfile(data);
      localStorage.setItem('hd_user',JSON.stringify(data));
      if(setUser) setUser(data);
      setEditOpen(false); setMessage('Profile updated successfully.'); load();
    }catch(e){setError(e.response?.data?.message||'Could not update profile.');}
    finally{setSaving(false);}
  };
  const changePassword=async(e)=>{
    e.preventDefault(); setSaving(true); setError(''); setMessage('');
    try{ await api.post('/profile/change-password',password); setPassword({CurrentPassword:'',NewPassword:'',ConfirmPassword:''}); setPasswordOpen(false); setMessage('Password changed successfully.'); load(); }
    catch(e){setError(e.response?.data?.message||'Could not change password.');}
    finally{setSaving(false);}
  };
  const pickAvatar=(e)=>{
    const file=e.target.files?.[0]; if(!file) return;
    if(!file.type.startsWith('image/')){setError('Please choose an image file.');return;}
    if(file.size>2*1024*1024){setError('Avatar must be smaller than 2MB.');return;}
    const reader=new FileReader(); reader.onload=()=>{const v=String(reader.result);localStorage.setItem('hd_avatar',v);setAvatar(v);setMessage('Profile photo updated.');}; reader.readAsDataURL(file);
  };
  const togglePref=(key)=>{const next={...prefs,[key]:!prefs[key]};setPrefs(next);localStorage.setItem('hd_notification_prefs',JSON.stringify(next));};
  const display=profile||user||{};
  const initial=display.FullName?.[0]||'U';
  return <>
    <div className="profileHero profileHeroPro">
      <div className="profileAvatarWrap">
        {avatar?<img src={avatar} className="profileAvatarImg"/>:<div className="profileAvatar">{initial}</div>}
        <label className="avatarEdit" title="Change photo"><Camera size={15}/><input type="file" accept="image/*" onChange={pickAvatar}/></label>
      </div>
      <div className="profileHeroText"><span className="muted">Account</span><h2>{display.FullName||'User'}</h2><p>{display.Role||'Employee'} · HelpDeskPro workspace</p></div>
      <button className="secondary profileEditBtn" onClick={()=>{setError('');setMessage('');setEditOpen(true)}}>Edit Profile</button>
    </div>

    {message&&<div className="profileSuccess"><CheckCircle2 size={16}/>{message}</div>}
    {error&&<div className="errorBox profileError">{error}</div>}

    <div className="profileGrid">
      <div className="panel"><div className="panelHead"><h3>Profile Information</h3></div>
        <div className="info"><Mail/><div><span>Email</span><b>{display.Email||'—'}</b></div></div>
        <div className="info"><ShieldCheck/><div><span>Role</span><b>{display.Role||'—'}</b></div></div>
        <div className="info"><Building2/><div><span>Department</span><b>{display.Department||'—'}</b></div></div>
        <div className="info"><UserCircle2/><div><span>Account Status</span><b>{display.IsActive===false?'Inactive':'Active'}</b></div></div>
      </div>
      <div className="panel"><h3>Security</h3>
        <div className="security"><Lock/><div><b>Password</b><p>Keep your account secure with a strong password.</p><button className="secondary" onClick={()=>{setError('');setMessage('');setPasswordOpen(true)}}>Change Password</button></div></div>
        <div className="securityMeta"><div><Clock3 size={16}/><span>Last Login<b>{display.LastLoginAt?new Date(display.LastLoginAt).toLocaleString():'Not available'}</b></span></div><div><Lock size={16}/><span>Account Created<b>{display.CreatedAt?new Date(display.CreatedAt).toLocaleDateString():'—'}</b></span></div></div>
      </div>
    </div>

    <div className="profileGrid profileLower">
      <div className="panel"><h3>Notification Preferences</h3><p className="profileHint">Choose which alerts you want to receive on this device.</p>
        {[['email','Email notifications'],['tickets','Ticket updates'],['assignments','New assignments'],['sla','SLA alerts']].map(([k,label])=><div className="prefRow" key={k}><span>{label}</span><button className={'toggle '+(prefs[k]?'on':'')} onClick={()=>togglePref(k)}><i/></button></div>)}
      </div>
      <div className="panel"><div className="panelHead"><h3>Recent Activity</h3><Activity size={17}/></div>
        {activity.length?<div className="activityList">{activity.slice(0,8).map(x=><div className="activityItem" key={x.Id}><div className="activityDot"/><div><b>{x.Action}</b><span>{x.Entity}{x.EntityId?` #${x.EntityId}`:''} · {new Date(x.CreatedAt).toLocaleString()}</span></div></div>)}</div>:<p className="profileHint">No recent activity yet.</p>}
      </div>
    </div>

    {editOpen&&<div className="modal"><div className="modalCard compactModal"><button className="close" onClick={()=>setEditOpen(false)}><X size={16}/></button><div className="modalTitle"><h2>Edit Profile</h2><p className="modalSub">Update your personal account information.</p></div><form className="stackForm" onSubmit={saveProfile}><label>Full Name<input value={form.FullName} onChange={e=>setForm({...form,FullName:e.target.value})} required/></label><label>Email<input type="email" value={form.Email} onChange={e=>setForm({...form,Email:e.target.value})} required/></label>{error&&<div className="error">{error}</div>}<div className="modalActions"><button type="button" className="secondary" onClick={()=>setEditOpen(false)}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving...':'Save Changes'}</button></div></form></div></div>}

    {passwordOpen&&<div className="modal"><div className="modalCard compactModal"><button className="close" onClick={()=>setPasswordOpen(false)}><X size={16}/></button><div className="modalTitle"><h2>Change Password</h2><p className="modalSub">Use a strong password with at least 6 characters.</p></div><form className="stackForm" onSubmit={changePassword}><label>Current Password<input type="password" value={password.CurrentPassword} onChange={e=>setPassword({...password,CurrentPassword:e.target.value})} required/></label><label>New Password<input type="password" value={password.NewPassword} onChange={e=>setPassword({...password,NewPassword:e.target.value})} minLength={6} required/></label><label>Confirm New Password<input type="password" value={password.ConfirmPassword} onChange={e=>setPassword({...password,ConfirmPassword:e.target.value})} minLength={6} required/></label>{error&&<div className="error">{error}</div>}<div className="modalActions"><button type="button" className="secondary" onClick={()=>setPasswordOpen(false)}>Cancel</button><button className="primary" disabled={saving}>{saving?'Changing...':'Change Password'}</button></div></form></div></div>}
  </>;
}
