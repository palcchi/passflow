"use client";
import {useState,useTransition} from 'react';
import {publishFigmaDraft} from '@/app/admin/studio-actions';
export function PublishFigmaButton({eventId,id}:{eventId:string;id:string}){
  const [pending,startTransition]=useTransition();const [error,setError]=useState('');
  return <div><button className="button button-dark" disabled={pending} onClick={()=>{if(!confirm('Publish this Figma draft for participants? Check placeholder overlays in the preview first. A published Studio design takes priority for the same format.'))return;startTransition(async()=>{try{const result=await publishFigmaDraft(eventId,id);setError(result.error??'Published.');}catch{setError('Publishing failed. Please try again.');}});}}>{pending?'Publishing…':'Publish draft'}</button>{error&&<p role="status">{error}</p>}</div>;
}
