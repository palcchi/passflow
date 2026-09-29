'use client';
import {useActionState} from 'react';
import {saveWebsiteContent} from '@/app/admin/website-content-actions';
import type {EventWebsiteContent} from '@/lib/event-website-content';
export function WebsiteContentForm({eventId,content}:{eventId:string;content:EventWebsiteContent}){
 const [state,action,pending]=useActionState<{error?:string;success?:boolean},FormData>(async (_state,form)=>saveWebsiteContent(form),{});
 return <form action={action} className="event-admin-stack"><input type="hidden" name="eventId" value={eventId}/><p>Figma controls layout. Edit the live schedule, speakers and sponsors here. One row per line: name | details.</p>
 <label>Schedule<textarea name="schedule" rows={7} defaultValue={content.schedule.map(x=>x.time+' | '+x.title).join('\n')} placeholder="10:00 | Doors open"/></label>
 <label>Speakers<textarea name="speakers" rows={7} defaultValue={content.speakers.map(x=>x.name+' | '+x.role).join('\n')} placeholder="Ari | Keynote speaker"/></label>
 <label>Sponsors<textarea name="sponsors" rows={7} defaultValue={content.sponsors.map(x=>x.name+' | '+x.url).join('\n')} placeholder="Partner | https://example.com"/></label>
 <button type="submit" className="button button-dark" disabled={pending}>{pending?'Saving…':'Save live content'}</button>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">Content saved.</p>}</form>;
}
