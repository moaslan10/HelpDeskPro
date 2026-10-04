import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CalendarDays, Tag } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';

export default function KnowledgeDetails(){
  const {id}=useParams();
  const [article,setArticle]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{
    let mounted=true;
    const load=async()=>{
      try{
        const r=await api.get(`/knowledge/${id}`);
        if(mounted)setArticle(r.data);
      }catch(e){
        if(mounted)setError(e.response?.status===404?'Article not found.':(e.response?.data?.message||'Unable to load article.'));
      }finally{if(mounted)setLoading(false);}
    };
    load();
    return()=>{mounted=false};
  },[id]);

  if(loading)return <div className="loading">Loading article...</div>;
  if(error)return <><Link className="secondary backBtn" to="/knowledge"><ArrowLeft size={15}/> Back to Knowledge Base</Link><div className="errorBox" style={{marginTop:18}}>{error}</div></>;
  if(!article)return null;

  const title=article.Title ?? article.title ?? '';
  const category=article.Category ?? article.category ?? 'General';
  const content=article.Content ?? article.content ?? '';
  const updated=article.UpdatedAt ?? article.updatedAt;

  return <>
    <div className="pageHead">
      <div><span className="muted">Knowledge Base</span><h2>Article Details</h2><p>Step-by-step guidance for common IT problems.</p></div>
      <Link className="secondary backBtn" to="/knowledge"><ArrowLeft size={15}/> Back to Knowledge Base</Link>
    </div>
    <article className="knowledgeDetail panel">
      <div className="knowledgeIcon"><BookOpen size={28}/></div>
      <div className="knowledgeMeta">
        <span className="articleCategory"><Tag size={13}/> {category}</span>
        {updated&&<span className="articleDate"><CalendarDays size={13}/> Updated {new Date(updated).toLocaleString()}</span>}
      </div>
      <h2>{title}</h2>
      <div className="knowledgeContent">{content}</div>
    </article>
  </>;
}
