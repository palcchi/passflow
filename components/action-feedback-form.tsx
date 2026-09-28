"use client";
import {useState,useTransition,type ReactNode} from 'react';
export function ActionFeedbackForm({action,children,className}:{action:(form:FormData)=>Promise<unknown>;children:ReactNode;className?:string}){
  const [message,setMessage]=useState('');const [pending,startTransition]=useTransition();
  return <form className={className} action={form=>startTransition(async()=>{setMessage('');try{const result=await action(form) as {error?:string}|undefined;setMessage(result?.error??'Saved successfully.');}catch{setMessage('The change could not be saved. Please try again.');}})}><fieldset disabled={pending} className="resource-fields">{children}</fieldset>{message&&<p role="status">{message}</p>}</form>;
}
