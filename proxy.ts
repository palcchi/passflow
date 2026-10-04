import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import {createClient} from '@supabase/supabase-js';
import {eventHostLabel,eventRootDomain} from '@/lib/event-host';
import type {Database} from '@/lib/supabase/database.types';

export async function proxy(request: NextRequest) {
  const host=(request.headers.get('host')??'').toLowerCase();
  if(host.endsWith('.'+eventRootDomain)&&host!=='www.'+eventRootDomain){
    const label=eventHostLabel(host),config=getSupabaseConfig();
    const unavailable=()=>new NextResponse('Event not found',{status:404,headers:{'Cache-Control':'no-store'}});
    if(!label||!config||process.env.PASSFLOW_EVENT_SUBDOMAINS_ENABLED!=='true')return unavailable();
    if(!['GET','HEAD'].includes(request.method))return new NextResponse('Use the main PassFlow domain for this action',{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
    const publicClient=createClient<Database>(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:slug,error}=await publicClient.rpc('resolve_event_subdomain',{p_label:label});
    if(error||!slug||!/^[a-zA-Z0-9_-]+$/.test(slug))return unavailable();
    // Extra Figma pages (/agenda) and /calendar stay on the event host; sign-up and anything else moves to
    // the canonical app origin, where auth cookies live.
    const path=request.nextUrl.pathname,page=/^\/([a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?)$/.exec(path)?.[1];
    if(path!=='/'&&(!page||page==='claim')){
      const canonical=new URL('https://'+eventRootDomain);
      canonical.pathname='/e/'+slug+path;canonical.search=request.nextUrl.search;
      return NextResponse.redirect(canonical,307);
    }
    const url=request.nextUrl.clone();url.pathname='/e/'+slug+(page?'/'+page:'');
    const headers=new Headers(request.headers);headers.set('x-passflow-path',url.pathname);
    const response=NextResponse.rewrite(url,{request:{headers}});response.headers.set('Cache-Control','private, no-store');return response;
  }
  function nextResponse() {
    const headers = new Headers(request.headers);
    headers.set("x-passflow-path", request.nextUrl.pathname);
    return NextResponse.next({ request: { headers } });
  }

  let response = nextResponse();
  const config = getSupabaseConfig();

  if (config) {
    const supabase = createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = nextResponse();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    try {
      await supabase.auth.getUser();
    } catch {
      // Server page/action guards validate again and deny access on auth failure.
    }
  }

  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|woff2|css|js|zip)$).*)',
    "/",
    "/e/:slug",
    "/api/scan",
    "/admin/:path*",
    "/account/:path*",
    "/profile",
    "/api/figma/:path*",
    "/events",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/auth/:path*",
    "/scan/:path*",
    "/e/:slug/claim",
    "/unauthorized",
  ],
};
