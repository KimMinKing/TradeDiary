import { useEffect, useState } from 'react';
import { createPlan, deletePlan, getPlans, togglePlanDone, updatePlan } from '../api/exchangeApi';

const emptyForm = () => ({ planDate: new Date().toISOString().slice(0,10), symbol:'', direction:'', content:'' });
const formatDate = value => new Intl.DateTimeFormat('en-US',{weekday:'short',month:'long',day:'numeric'}).format(new Date(`${value}T00:00:00`));

const TradePlanPage = ({ embedded=false, onSaved=null }) => {
  const [plans,setPlans]=useState([]),[loading,setLoading]=useState(true),[form,setForm]=useState(emptyForm),[editId,setEditId]=useState(null),[open,setOpen]=useState(false),[filter,setFilter]=useState('all');
  const load=()=>getPlans().then(response=>setPlans(response.data)).finally(()=>setLoading(false));
  useEffect(()=>{load();},[]);
  const reset=()=>{setForm(emptyForm());setEditId(null);setOpen(false);};
  const submit=async event=>{event.preventDefault();if(!form.content.trim())return;const payload={plan_date:form.planDate,symbol:form.symbol||null,direction:form.direction||null,content:form.content};const response=editId?await updatePlan(editId,payload):await createPlan(payload);setPlans(current=>editId?current.map(item=>item.id===editId?response.data:item):[response.data,...current]);if(onSaved)await onSaved();reset();};
  const toggle=async id=>{const response=await togglePlanDone(id);setPlans(current=>current.map(item=>item.id===id?response.data:item));};
  const remove=async id=>{if(!window.confirm('Delete this plan?'))return;await deletePlan(id);setPlans(current=>current.filter(item=>item.id!==id));};
  const edit=plan=>{setForm({planDate:plan.plan_date,symbol:plan.symbol||'',direction:plan.direction||'',content:plan.content});setEditId(plan.id);setOpen(true);};
  const done=plans.filter(item=>item.done).length,active=plans.length-done;
  const shown=plans.filter(item=>filter==='all'||(filter==='done'?item.done:!item.done));
  const groups=Object.entries(shown.reduce((result,item)=>{(result[item.plan_date]??=[]).push(item);return result;},{})).sort((a,b)=>b[0].localeCompare(a[0]));
  return <div className={embedded?'':'page'}>
    <header className="page-header"><div><h1 className="page-title">Trade plans</h1><p className="text-sm text-secondary">Write a pre-trade plan and track whether you followed it.</p></div><button className={open&&!editId?'compact-secondary-action':'compact-primary-action'} onClick={()=>open?reset():setOpen(true)}>{open&&!editId?'Close':<><span>+</span> New plan</>}</button></header>
    {plans.length>0&&<div className="plan-filters">{[['all',`All ${plans.length}`],['active',`Open ${active}`],['done',`Completed ${done}`]].map(([key,label])=><button className={filter===key?'active':''} key={key} onClick={()=>setFilter(key)}>{label}</button>)}</div>}
    {open&&<form className="card plan-form" onSubmit={submit}><h3>{editId?'Edit plan':'New trade plan'}</h3><div><input className="input" type="date" value={form.planDate} onChange={e=>setForm({...form,planDate:e.target.value})}/><input className="input" placeholder="Symbol (optional)" value={form.symbol} onChange={e=>setForm({...form,symbol:e.target.value.toUpperCase()})}/><select className="input" value={form.direction} onChange={e=>setForm({...form,direction:e.target.value})}><option value="">Side not set</option><option value="LONG">Long</option><option value="SHORT">Short</option></select></div><textarea className="input" placeholder="Describe the setup, entry thesis, target, stop and position size." value={form.content} onChange={e=>setForm({...form,content:e.target.value})} required/><footer><button type="button" className="btn" onClick={reset}>Cancel</button><button className="btn btn-primary">{editId?'Save changes':'Save plan'}</button></footer></form>}
    {loading?<div className="empty-state">Loading plans...</div>:shown.length===0?<div className="card empty-state"><b>{filter==='done'?'No completed plans':filter==='active'?'No open plans':'No trade plans yet'}</b><p>Document your decision before entering and review execution later in the journal.</p>{filter==='all'&&<button className="btn btn-primary" onClick={()=>setOpen(true)}>Create first plan</button>}</div>:<div className="plan-groups">{groups.map(([date,items])=><section key={date}><header><b>{formatDate(date)}</b><span>{items.filter(item=>item.done).length}/{items.length} completed</span></header>{items.map(plan=><article className={`card plan-item${plan.done?' done':''}`} key={plan.id}><button className="plan-check" onClick={()=>toggle(plan.id)} aria-label="Toggle completion">{plan.done?'✓':''}</button><div>{(plan.symbol||plan.direction)&&<small>{plan.symbol} {plan.direction}</small>}<p>{plan.content}</p></div><footer><button onClick={()=>edit(plan)}>Edit</button><button onClick={()=>remove(plan.id)}>Delete</button></footer></article>)}</section>)}</div>}
  </div>;
};
export default TradePlanPage;
