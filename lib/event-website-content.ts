export type EventWebsiteContent={schedule:{time:string;title:string}[];speakers:{name:string;role:string}[];sponsors:{name:string;url:string}[]};
export function readWebsiteContent(input:unknown):EventWebsiteContent{
 const v=input&&typeof input==='object'?input as Record<string,unknown>:{};
 const rows=(key:keyof EventWebsiteContent,first:string,second:string)=>Array.isArray(v[key])?v[key].slice(0,30).map(x=>x&&typeof x==='object'?x as Record<string,unknown>:{}).map(x=>({[first]:typeof x[first]==='string'?x[first].slice(0,120):'',[second]:typeof x[second]==='string'?x[second].slice(0,500):''})).filter(x=>x[first]):[];
 return {schedule:rows('schedule','time','title') as EventWebsiteContent['schedule'],speakers:rows('speakers','name','role') as EventWebsiteContent['speakers'],sponsors:rows('sponsors','name','url') as EventWebsiteContent['sponsors']};
}
export function parseWebsiteRows(input:string,kind:keyof EventWebsiteContent){const rows=input.trim()?input.trim().split('\n'):[];if(rows.length>30||input.length>6000)throw Error('Maximum 30 rows and 6,000 characters per section.');
 return rows.map(line=>{const [a,...rest]=line.split('|'),b=rest.join('|');if(!a?.trim()||!b?.trim()||a.length>120||b.length>500)throw Error('Use one entry per line: name | details.');
  if(kind==='sponsors'){let u:URL;try{u=new URL(b.trim());}catch{throw Error('Sponsor links must use HTTPS.');}if(u.protocol!=='https:'||u.username||u.password)throw Error('Sponsor links must use HTTPS.');}
  return kind==='schedule'?{time:a.trim(),title:b.trim()}:kind==='speakers'?{name:a.trim(),role:b.trim()}:{name:a.trim(),url:b.trim()};});
}
