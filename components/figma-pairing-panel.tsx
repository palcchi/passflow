'use client';
import {useEffect,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {createPairingCode,revokePluginLink} from '@/app/organizer/events/figma-pairing-actions';
import {retireStudio} from '@/app/organizer/events/studio-actions';
type Connection={id:string;file_name:string;expires_at:string;revoked_at:string|null;last_synced_at:string|null;external_change_at:string|null};
type Version={id:string;kind:string;name:string;status:string;revision:number;updated_at:string;publication_number:number|null;published_at:string|null};
type Result={error?:string;success?:boolean;code?:string};

const kindLabel:Record<string,string>={website:'Website',digital:'Digital pass',id_card:'ID card',wristband:'Wristband'};
const when=(iso:string)=>new Date(iso).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC';

export function FigmaPairingPanel({eventId,connections,versions,ready,now}:{eventId:string;connections:Connection[];versions:Version[];ready:boolean;now:number}){
  const [pending,startTransition]=useTransition(),[code,setCode]=useState(''),[message,setMessage]=useState(''),[copied,setCopied]=useState(false);
  const router=useRouter();
  useEffect(()=>{if(!ready)return;const timer=setInterval(()=>{if(document.visibilityState==='visible')router.refresh();},15000);return ()=>clearInterval(timer);},[ready,router]);
  function run(work:()=>Promise<Result>,done='Saved.'){
    startTransition(async()=>{
      try{const result=await work();setMessage(result.error??(result.code?'':done));if(result.code){setCode(result.code);setCopied(false);}}
      catch{setMessage('Connection interrupted. Please try again.');}
    });
  }
  async function copy(){try{await navigator.clipboard.writeText(code);setCopied(true);}catch{setMessage('Copy failed. Select the code and copy it manually.');}}
  // Sync publishes directly, so only live rows matter; leftovers from the old draft flow are hidden until the next Sync deletes them.
  const live=versions.filter(v=>v.status==='published');
  const linkState=(c:Connection)=>c.revoked_at?['Revoked','muted']:Date.parse(c.expires_at)<now?['Expired','muted']:c.external_change_at?['Changed outside plugin','warn']:c.last_synced_at?['Synced','on']:['Waiting for first sync','warn'];

  return <div className="event-admin-stack figma-panel-stack">
    <section className="event-admin-section">
      <div className="event-admin-section-head"><div>
        <span className="section-kicker">Website from Figma</span>
        <h2>Design your event website in Figma.</h2>
        <p>Figma is your website: every word, color and hover effect. PassFlow runs sign-up, live tickets and QR passes. Press Sync in the plugin and the website and passes update right away.</p>
      </div></div>
      <ol className="figma-steps">
        <li>
          <strong>Open the PassFlow plugin in Figma</strong>
          <span>In any Figma Design file: Actions → Plugins → search “PassFlow”, then run it.</span>
        </li>
        <li>
          <strong>Pair this event</strong>
          <span>Paste the code into the plugin. It works once and expires after 10 minutes.</span>
          {code
            ? <div className="figma-code"><output aria-label="Pairing code">{code}</output><button className="button button-dark" onClick={copy}>{copied?'Copied':'Copy'}</button><button className="button button-ghost" disabled={pending} onClick={()=>run(()=>createPairingCode(eventId))}>New code</button></div>
            : <button className="button button-dark" disabled={pending||!ready} onClick={()=>run(()=>createPairingCode(eventId))}>{pending?'Creating…':'Get pairing code'}</button>}
          {!ready&&<span role="status">Pairing is not available on this server yet. Ask the PassFlow admin to finish the server setup.</span>}
        </li>
        <li>
          <strong>Design everything in Figma</strong>
          <span>Start Blank, Minimal or Festival. Type your own text; links and hover effects come from Figma prototype interactions. Mark your Register button in the plugin.</span>
        </li>
        <li>
          <strong>Press Sync</strong>
          <span>Sync publishes straight to your live site and passes. If something would break, the plugin selects the layer to fix and nothing changes here. Tickets and QR codes are never touched.</span>
        </li>
      </ol>
    </section>

    {message&&<p role="status" className="studio-notice">{message}</p>}

    <section className="event-admin-section">
      <div className="event-admin-section-head"><div><span className="section-kicker">Live from Figma</span><h2>What Sync published</h2>
        {!live.length&&<p>Nothing synced yet. Press Sync in the plugin to publish your first design.</p>}</div></div>
      {live.map(v=><div key={v.id} className="resource-record">
        <span><strong>{kindLabel[v.kind]??v.kind}</strong><small>{v.name} · synced {when(v.published_at??v.updated_at)}</small></span>
        <a className="event-admin-text-action" href={`/organizer/events/${eventId}/design/preview/${v.id}`}>Preview</a>
        <button className="event-admin-danger-link" disabled={pending} onClick={()=>{if(confirm(v.kind==='website'?'Take the Figma website offline? The event shows the PassFlow default page until you sync again.':'Remove this pass design? Passes fall back to the standard layout until you sync again.'))run(()=>retireStudio(eventId,v.id,v.revision,false),'Removed.');}}>Remove</button>
      </div>)}
    </section>

    {connections.length>0&&<section className="event-admin-section">
      <div className="event-admin-section-head"><div><span className="section-kicker">Files</span><h2>Connected Figma files</h2></div></div>
      {connections.map(c=>{const [label,tone]=linkState(c);return <div key={c.id} className="resource-record">
        <div className="figma-version-head"><strong>{c.file_name}</strong><span className={'figma-badge figma-badge-'+tone}>{label}</span></div>
        {c.last_synced_at&&<p>Last sync {when(c.last_synced_at)}</p>}
        {!c.revoked_at&&<button className="button button-ghost" disabled={pending} onClick={()=>{if(confirm('Disconnect this Figma file? Published designs stay live.'))run(()=>revokePluginLink(eventId,c.id),'Disconnected.');}}>Disconnect</button>}
      </div>;})}
    </section>}
  </div>;
}
