'use client';
import {useState,useTransition} from 'react';
import {eventSubdomain} from '@/app/admin/subdomain-actions';
import {eventRootDomain} from '@/lib/event-host';
export function EventSubdomainPanel({eventId,current,suggestion,enabled}:{eventId:string;current:string;suggestion:string;enabled:boolean}){
 const [label,setLabel]=useState(current||suggestion),[message,setMessage]=useState(''),[pending,start]=useTransition();
 function run(save:boolean){start(async()=>{try{const result=await eventSubdomain(eventId,label,save);if(result.label)setLabel(result.label);setMessage(result.error??(save?'Address reserved. It serves the published event once wildcard hosting is enabled.':'Available now. Save to reserve it.'));}catch{setMessage('Unable to reach PassFlow. Try again.');}});}
 return <section className="event-admin-section"><h3>Event address</h3><p>One event subdomain, served by the same PassFlow application.</p><label>Subdomain<input value={label} maxLength={63} onChange={e=>{setLabel(e.target.value);setMessage('');}} placeholder="discoveries" autoCapitalize="none" spellCheck={false}/></label><p>{label}.{eventRootDomain}</p><div className="resource-toolbar"><button className="button button-ghost" disabled={pending} onClick={()=>run(false)}>Check availability</button><button className="button button-dark" disabled={pending} onClick={()=>{if(!current||label===current||confirm('Replace the event address? Links to the old address will stop working.'))run(true);}}>Save address</button></div>{!enabled&&<p>Wildcard hosting is not enabled. Reserving an address does not publish or deploy the event.</p>}{message&&<p role="status">{message}</p>}</section>;
}
