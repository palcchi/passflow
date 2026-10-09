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

  const tone=(t:string)=>t==='on'?'ui-badge ui-badge-success':t==='warn'?'ui-badge ui-badge-warning':'ui-badge';

  return <>
    <section className="ui-section" aria-labelledby="figma-title">
      <div className="ui-sectionhead"><div>
        <h2 id="figma-title" className="ui-h2">Design in Figma</h2>
        <p>Figma owns every word, colour and hover effect. PassFlow runs sign-up, tickets and QR passes. Sync publishes right away.</p>
      </div></div>
      <ol className="ui-steps">
        <li>
          <strong>Open the PassFlow plugin</strong>
          <span>In any Figma Design file: Actions, Plugins, search PassFlow, then run it.</span>
        </li>
        <li>
          <strong>Pair this event</strong>
          <span>Paste the code into the plugin. It works once and expires after 10 minutes.</span>
          {code
            ? <div className="ui-paircode"><output aria-label="Pairing code" className="ui-mono">{code}</output><button className="ui-btn ui-btn-primary ui-btn-sm" onClick={copy}>{copied?'Copied':'Copy'}</button><button className="ui-btn ui-btn-ghost ui-btn-sm" disabled={pending} onClick={()=>run(()=>createPairingCode(eventId))}>New code</button></div>
            : <div><button className="ui-btn ui-btn-primary ui-btn-sm" disabled={pending||!ready} onClick={()=>run(()=>createPairingCode(eventId))}>{pending?'Creating…':'Get pairing code'}</button></div>}
          {!ready&&<span role="status" className="ui-notice ui-notice-warning">Pairing is not available on this server yet. Ask the PassFlow admin to finish the server setup.</span>}
        </li>
        <li>
          <strong>Design your pages and passes</strong>
          <span>Start from Blank, Minimal or Festival. Links and hover effects come from Figma prototype interactions. Mark your Register button in the plugin.</span>
        </li>
        <li>
          <strong>Press Sync</strong>
          <span>Your live site and passes update instantly. If something would break, the plugin selects the layer to fix and nothing changes here.</span>
        </li>
      </ol>
    </section>

    {message&&<p role="status" className="ui-notice ui-mt">{message}</p>}

    <section className="ui-section" aria-labelledby="live-title">
      <div className="ui-sectionhead"><div><h2 id="live-title" className="ui-h2">Live from Figma</h2>
        <p>{live.length?'What your last Sync published.':'Nothing synced yet. Press Sync in the plugin to publish your first design.'}</p></div></div>
      {live.length>0&&<ul className="ui-list">{live.map(v=><li key={v.id} className="ui-listrow">
        <span className="ui-listrow-main"><strong>{kindLabel[v.kind]??v.kind}</strong><small>{v.name}, synced {when(v.published_at??v.updated_at)}</small></span>
        <span className="ui-listrow-end">
          <a className="ui-btn ui-btn-secondary ui-btn-sm" href={`/organizer/events/${eventId}/design/preview/${v.id}`}>Preview</a>
          <button className="ui-btn ui-btn-ghost ui-btn-sm ui-text-danger" disabled={pending} onClick={()=>{if(confirm(v.kind==='website'?'Take the Figma website offline? The event shows the PassFlow default page until you sync again.':'Remove this pass design? Passes fall back to the standard layout until you sync again.'))run(()=>retireStudio(eventId,v.id,v.revision,false),'Removed.');}}>Remove</button>
        </span>
      </li>)}</ul>}
    </section>

    {connections.length>0&&<section className="ui-section" aria-labelledby="files-title">
      <div className="ui-sectionhead"><div><h2 id="files-title" className="ui-h2">Connected files</h2></div></div>
      <ul className="ui-list">{connections.map(c=>{const [label,t]=linkState(c);return <li key={c.id} className="ui-listrow">
        <span className="ui-listrow-main"><strong>{c.file_name}</strong><small>{c.last_synced_at?`Last sync ${when(c.last_synced_at)}`:'Not synced yet'}</small></span>
        <span className="ui-listrow-end"><span className={tone(t)}>{label}</span>
          {!c.revoked_at&&<button className="ui-btn ui-btn-ghost ui-btn-sm" disabled={pending} onClick={()=>{if(confirm('Disconnect this Figma file? Published designs stay live.'))run(()=>revokePluginLink(eventId,c.id),'Disconnected.');}}>Disconnect</button>}
        </span>
      </li>;})}</ul>
    </section>}
  </>;
}
