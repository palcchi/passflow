import 'server-only';
import {createHash} from 'crypto';
import type {pluginServer} from '@/lib/figma-plugin-server';

const DATA_IMAGE=/^data:image\/(png|jpeg|webp);base64,([a-z\d+/=]+)$/i;
const MAX_BYTES=5*1024*1024,MAX_IMAGES=150;
const obj=(v:unknown):Record<string,unknown>|null=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:null;

// Moves inline images from a plugin sync into the public event-assets bucket and swaps in their URLs.
// Paths are content hashes, so unchanged artwork is never uploaded twice across auto-syncs.
export async function hoistFigmaImages(server:ReturnType<typeof pluginServer>,eventId:string,website:unknown,passes:unknown[]){
  const slots:{owner:Record<string,unknown>;key:string}[]=[];
  const site=obj(website);
  if(site){
    const frames=[site.desktop,site.tablet,site.mobile,...(Array.isArray(site.pages)?site.pages.flatMap(p=>{const o=obj(p);return o?[o.desktop,o.tablet,o.mobile]:[];}):[])];
    for(const f of frames){const nodes=obj(f)?.nodes;if(!Array.isArray(nodes))continue;
      for(const n of nodes){const node=obj(n);if(!node)continue;
        if(typeof node.image==='string')slots.push({owner:node,key:'image'});
        const bg=obj(node.bg);if(bg&&typeof bg.image==='string')slots.push({owner:bg,key:'image'});
      }
    }
  }
  for(const p of passes){const layers=obj(obj(p)?.document)?.layers;if(Array.isArray(layers))for(const l of layers){const layer=obj(l);if(layer&&typeof layer.src==='string')slots.push({owner:layer,key:'src'});}}
  const inline=slots.filter(s=>(s.owner[s.key] as string).startsWith('data:'));
  if(inline.length>MAX_IMAGES)throw Error('too_many_images');
  const done=new Map<string,string>();
  for(const slot of inline){
    const value=slot.owner[slot.key] as string,match=DATA_IMAGE.exec(value);
    if(!match)throw Error('invalid_image');
    let url=done.get(value);
    if(!url){
      const bytes=Buffer.from(match[2],'base64');if(bytes.length>MAX_BYTES)throw Error('image_too_large');
      const ext=match[1].toLowerCase()==='jpeg'?'jpg':match[1].toLowerCase(),path=`${eventId}/figma/${createHash('sha256').update(bytes).digest('hex')}.${ext}`;
      const bucket=server.storage.from('event-assets'),{data:exists}=await bucket.exists(path);
      if(!exists){const {error}=await bucket.upload(path,bytes,{contentType:'image/'+match[1].toLowerCase(),upsert:true,cacheControl:'31536000'});if(error)throw Error('asset_upload_failed');}
      url=bucket.getPublicUrl(path).data.publicUrl;done.set(value,url);
    }
    slot.owner[slot.key]=url;
  }
}
