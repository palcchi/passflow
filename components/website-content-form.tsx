'use client';
import {useActionState} from 'react';
import {saveWebsiteContent} from '@/app/admin/website-content-actions';
import type {EventWebsiteContent} from '@/lib/event-website-content';

type State={error?:string;success?:boolean};

export function WebsiteContentForm({eventId,content}:{eventId:string;content:EventWebsiteContent}){
  const [state,action,pending]=useActionState<State,FormData>(async (_state,form)=>saveWebsiteContent(form),{});
  const fields=[
    {name:'schedule',label:'Schedule',hint:'One item per line: time | title',placeholder:'10:00 | Doors open\n11:00 | Opening keynote',value:content.schedule.map(x=>x.time+' | '+x.title)},
    {name:'speakers',label:'Speakers',hint:'One person per line: name | role',placeholder:'Ari Wijaya | Keynote speaker',value:content.speakers.map(x=>x.name+' | '+x.role)},
    {name:'sponsors',label:'Sponsors',hint:'One sponsor per line: name | https:// link',placeholder:'Partner | https://example.com',value:content.sponsors.map(x=>x.name+' | '+x.url)},
  ];
  return <form action={action} className="event-admin-stack">
    <input type="hidden" name="eventId" value={eventId}/>
    {fields.map(f=><label key={f.name} className="content-field">
      <span>{f.label} <small>· {f.value.length} {f.value.length===1?'row':'rows'}</small></span>
      <textarea name={f.name} rows={6} defaultValue={f.value.join('\n')} placeholder={f.placeholder} spellCheck={false}/>
      <small>{f.hint}</small>
    </label>)}
    <div className="event-admin-actions">
      <button type="submit" className="button button-dark" disabled={pending}>{pending?'Saving…':'Save live content'}</button>
    </div>
    {state.error&&<p role="alert" className="design-alert">{state.error}</p>}
    {state.success&&!pending&&<p role="status" className="design-success">Content saved. The live website is updated.</p>}
  </form>;
}
