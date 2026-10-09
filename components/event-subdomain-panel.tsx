'use client';
import {useState,useTransition} from 'react';
import {eventSubdomain} from '@/app/organizer/events/subdomain-actions';
import {eventRootDomain} from '@/lib/event-host';
export function EventSubdomainPanel({eventId,current,suggestion,enabled}:{eventId:string;current:string;suggestion:string;enabled:boolean}){
 const [label,setLabel]=useState(current||suggestion),[message,setMessage]=useState(''),[pending,start]=useTransition();
 function run(save:boolean){start(async()=>{try{const result=await eventSubdomain(eventId,label,save);if(result.label)setLabel(result.label);setMessage(result.error??(save?'Address reserved. It serves the published event once wildcard hosting is enabled.':'Available now. Save to reserve it.'));}catch{setMessage('Unable to reach PassFlow. Try again.');}});}
 return <section className="ui-card ui-settings-card" aria-labelledby="address-title">
  <div className="ui-settings-side"><h2 id="address-title" className="ui-h3">Event address</h2><p>A short web address for this event, served by PassFlow.</p></div>
  <div className="ui-stack">
   <div className="ui-row ui-address">
    <label className="ui-affix"><span className="sr-only">Subdomain</span><input value={label} maxLength={63} onChange={e=>{setLabel(e.target.value);setMessage('');}} placeholder="discoveries" autoCapitalize="none" spellCheck={false}/><span>.{eventRootDomain}</span></label>
    <button className="ui-btn ui-btn-secondary" disabled={pending} onClick={()=>run(false)}>Check</button>
    <button className="ui-btn ui-btn-primary" disabled={pending} onClick={()=>{if(!current||label===current||confirm('Replace the event address? Links to the old address will stop working.'))run(true);}}>Save</button>
   </div>
   {message&&<p role="status" className="ui-notice">{message}</p>}
   {!enabled&&<p className="ui-small">Custom addresses are reserved now and go live once wildcard hosting is enabled.</p>}
  </div>
 </section>;
}
