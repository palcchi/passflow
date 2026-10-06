'use client';
import {useState,useTransition} from 'react';
import {eventSubdomain} from '@/app/organizer/events/subdomain-actions';
import {eventRootDomain} from '@/lib/event-host';
export function EventSubdomainPanel({eventId,current,suggestion,enabled}:{eventId:string;current:string;suggestion:string;enabled:boolean}){
 const [label,setLabel]=useState(current||suggestion),[message,setMessage]=useState(''),[pending,start]=useTransition();
 function run(save:boolean){start(async()=>{try{const result=await eventSubdomain(eventId,label,save);if(result.label)setLabel(result.label);setMessage(result.error??(save?'Address reserved. It serves the published event once wildcard hosting is enabled.':'Available now. Save to reserve it.'));}catch{setMessage('Unable to reach PassFlow. Try again.');}});}
 return <section className="event-admin-section">
  <div className="event-admin-section-head"><div><span className="section-kicker">Event address</span><h2>Subdomain</h2><p>A short address for this event, served by the same PassFlow app.</p></div></div>
  <div className="subdomain-row">
   <label className="subdomain-field"><span className="sr-only">Subdomain</span><input className="event-admin-input" value={label} maxLength={63} onChange={e=>{setLabel(e.target.value);setMessage('');}} placeholder="discoveries" autoCapitalize="none" spellCheck={false}/><span>.{eventRootDomain}</span></label>
   <button className="button button-ghost" disabled={pending} onClick={()=>run(false)}>Check availability</button>
   <button className="button button-dark" disabled={pending} onClick={()=>{if(!current||label===current||confirm('Replace the event address? Links to the old address will stop working.'))run(true);}}>Save address</button>
  </div>
  {message&&<p role="status" className="studio-notice">{message}</p>}
  {!enabled&&<p className="event-admin-note">Wildcard hosting is not enabled yet. Reserving an address does not publish or deploy the event.</p>}
 </section>;
}
