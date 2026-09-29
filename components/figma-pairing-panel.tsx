'use client';
import {useEffect,useState,useSyncExternalStore,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {createPairingCode,revokePluginLink} from '@/app/admin/figma-pairing-actions';
import {publishStudio,retireStudio,restoreFigmaPublication} from '@/app/admin/studio-actions';
type Connection={id:string;file_name:string;expires_at:string;revoked_at:string|null;last_synced_at:string|null;external_change_at:string|null};
type Version={id:string;name:string;status:string;revision:number;updated_at:string;publication_number:number|null;published_at:string|null};
type Result={error?:string;success?:boolean;code?:string};

const CODE_LIFETIME_MS=10*60*1000;
const dateFormat:Intl.DateTimeFormatOptions={dateStyle:'medium',timeStyle:'short'};

function connectionState(c:Connection,now:number):{label:string;tone:'ok'|'warn'|'off'}{
  if(c.revoked_at)return {label:'Revoked',tone:'off'};
  if(Date.parse(c.expires_at)<now)return {label:'Expired — pair again',tone:'off'};
  if(c.external_change_at)return {label:'Changes detected outside the plugin',tone:'warn'};
  if(c.last_synced_at)return {label:'Synced',tone:'ok'};
  return {label:'Connected, awaiting first sync',tone:'warn'};
}

const noopSubscribe=()=>()=>{};
function LocalTime({value}:{value:string}){
  // Server render uses UTC; the client swaps in the viewer's own timezone without a hydration mismatch.
  const local=useSyncExternalStore(noopSubscribe,()=>true,()=>false);
  const date=new Date(value);
  return <time dateTime={value}>{local?date.toLocaleString(undefined,dateFormat):date.toLocaleString('en-GB',{...dateFormat,timeZone:'UTC'})+' UTC'}</time>;
}

export function FigmaPairingPanel({eventId,connections,versions,ready,now}:{eventId:string;connections:Connection[];versions:Version[];ready:boolean;now:number}){
  const [pending,startTransition]=useTransition();
  const [code,setCode]=useState<{value:string;expiresAt:number}|null>(null);
  const [remaining,setRemaining]=useState(0);
  const [copied,setCopied]=useState(false);
  const [message,setMessage]=useState<{text:string;error:boolean}|null>(null);
  const router=useRouter();

  useEffect(()=>{if(!ready)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')router.refresh();},15000);return ()=>clearInterval(timer);},[ready,router]);
  useEffect(()=>{
    if(!code)return;
    const tick=()=>{const left=Math.max(0,code.expiresAt-Date.now());setRemaining(left);if(!left)setCode(null);};
    tick();const timer=setInterval(tick,1000);return ()=>clearInterval(timer);
  },[code]);

  function run(work:()=>Promise<Result>,successText='Saved.'){
    startTransition(async()=>{
      try{
        const result=await work();
        if(result.error){setMessage({text:result.error,error:true});return;}
        if(result.code){setCode({value:result.code,expiresAt:Date.now()+CODE_LIFETIME_MS});setCopied(false);setMessage(null);return;}
        setMessage({text:successText,error:false});router.refresh();
      }catch{setMessage({text:'Connection interrupted. Please try again.',error:true});}
    });
  }
  async function copyCode(){
    if(!code)return;
    try{await navigator.clipboard.writeText(code.value);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{setCopied(false);}
  }
  const minutes=Math.floor(remaining/60000),seconds=Math.floor(remaining/1000)%60;
  const drafts=versions.filter(v=>v.status==='draft').length,live=versions.find(v=>v.status==='published');

  return <div className="event-admin-stack">
    <header className="event-admin-local-heading">
      <span className="section-kicker">Design</span>
      <h2>Your event, designed in Figma.</h2>
      <p>Figma owns the look. PassFlow owns tickets, registration and publishing. Sync only updates a private draft; the live site changes when you publish here.</p>
    </header>

    <section className="event-admin-section">
      <h3>Pair a Figma file</h3>
      <ol>
        <li>Open your Figma file and run the standard PassFlow plugin.</li>
        <li>Generate a code below and enter it under <strong>Pair Event</strong>.</li>
        <li>Insert a starter template, edit, then preview and publish here.</li>
      </ol>
      <div className="event-admin-actions">
        <button type="button" className="button button-dark" disabled={pending||!ready} onClick={()=>run(()=>createPairingCode(eventId))}>{code?'Generate new code':'Generate pairing code'}</button>
        <a className="button button-ghost" href="/figma-plugin-standard.zip" download>Download plugin</a>
      </div>
      {code&&<div className="pairing-code" role="status" aria-live="polite">
        <code>{code.value}</code>
        <small>Expires in {minutes}:{String(seconds).padStart(2,'0')} · single use</small>
        <button type="button" className="button button-ghost" onClick={copyCode}>{copied?'Copied':'Copy'}</button>
      </div>}
      {!ready&&<p role="status">Pairing needs the database migration and server configuration. No connection is active yet.</p>}
      <p className="text-sm">The older account plugin does not support pairing. The download includes development-install instructions.</p>
    </section>

    {message&&<div role={message.error?'alert':'status'} className="studio-notice status-dismissible"><span>{message.text}</span><button type="button" aria-label="Dismiss" onClick={()=>setMessage(null)}>×</button></div>}

    <section className="event-admin-section">
      <h3>Paired files</h3>
      {!connections.length&&<p>No paired files yet.</p>}
      {connections.map(c=>{const state=connectionState(c,now);return <div key={c.id} className="resource-record">
        <strong>{c.file_name}</strong>
        <p><span className="connection-state" data-tone={state.tone}>{state.label}</span></p>
        {c.last_synced_at&&<small>Last sync: <LocalTime value={c.last_synced_at}/></small>}
        {!c.revoked_at&&<div className="resource-toolbar"><button type="button" className="button button-ghost" disabled={pending} onClick={()=>{if(confirm('Revoke this plugin connection? Existing published designs remain live.'))run(()=>revokePluginLink(eventId,c.id),'Connection revoked.');}}>Revoke connection</button></div>}
      </div>;})}
    </section>

    <section className="event-admin-section">
      <h3>Drafts & published versions</h3>
      <p className="text-sm">{live?`Live: ${live.name}${live.publication_number?' · publication '+live.publication_number:''}`:'Nothing published yet — the basic event page is live.'}{drafts?` · ${drafts} draft${drafts>1?'s':''} waiting for review`:''}</p>
      {!versions.length&&<p>Insert a template and sync from Figma to create the first draft.</p>}
      {versions.map(v=><div key={v.id} className="resource-record">
        <strong>{v.name}</strong>
        <p><span className="connection-state" data-tone={v.status==='published'?'ok':v.status==='draft'?'warn':'off'}>{v.status}</span> · revision {v.revision}{v.publication_number?' · publication '+v.publication_number:''}</p>
        {v.published_at&&<small>Published: <LocalTime value={v.published_at}/></small>}
        <div className="resource-toolbar">
          <a className="button button-ghost" href={`/admin/events/${eventId}/design/preview/${v.id}`}>Preview</a>
          {v.status==='draft'&&<button type="button" className="button button-dark" disabled={pending} onClick={()=>{if(confirm('Publish this reviewed version? Only the live website design changes. Tickets and QR credentials stay unchanged.'))run(()=>publishStudio(eventId,v.id,v.revision),'Published. The live website now uses this version.');}}>Publish</button>}
          {v.status!=='draft'&&<button type="button" className="button button-ghost" disabled={pending} onClick={()=>run(()=>restoreFigmaPublication(eventId,v.id),'Copied to a new draft.')}>Restore to draft</button>}
          {v.status==='published'&&<button type="button" className="button button-ghost" disabled={pending} onClick={()=>{if(confirm('Unpublish and return to the fallback event page?'))run(()=>retireStudio(eventId,v.id,v.revision,false),'Unpublished. The basic event page is live again.');}}>Unpublish</button>}
        </div>
      </div>)}
    </section>
  </div>;
}
