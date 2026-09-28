export const eventRootDomain='passflow.my.id';
export const reservedEventLabels=new Set(['www','admin','api','app','login','auth','support','mail','smtp','imap','pop','static','assets','cdn','status','help','docs','blog','dev','test','staging','preview','vercel','dashboard','account','accounts','register','billing','security','webhooks','figma','passflow','ns1','ns2']);
export function normalizeEventLabel(value:string){return value.trim().toLowerCase();}
export function validEventLabel(label:string){return label.length>=3&&label.length<=63&&/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(label)&&!label.startsWith('xn--')&&!reservedEventLabels.has(label);}
// Read Host, never client-supplied forwarded-host. Nested hosts fail closed.
export function eventHostLabel(host:string):string|null{
 const value=host.toLowerCase();
 if(!value.endsWith('.'+eventRootDomain))return null;
 const label=value.slice(0,-eventRootDomain.length-1);
 return validEventLabel(label)?label:null;
}
