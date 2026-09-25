import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
export async function POST(request:Request){
  const body=await request.json().catch(()=>null) as {station?:string;code?:string}|null; const station=String(body?.station??"").trim(); const code=String(body?.code??"").trim();
  if(!station||!code)return NextResponse.json({ok:false,reason:"invalid_request"},{status:400});
  const context=await requireUser(`/scan/${station}`);
  const {data:stationRow,error:stationError}=await context.supabase.from("scanner_stations").select("id").eq("slug",station).eq("is_active",true).maybeSingle();
  if(stationError||!stationRow)return NextResponse.json({ok:false,reason:"station_not_found"},{status:404});
  const {data,error}=await context.supabase.rpc("validate_scan",{p_station_id:stationRow.id,p_code:code});
  if(error)return NextResponse.json({ok:false,reason:"validation_failed"},{status:400});
  return NextResponse.json(data,{headers:{"Cache-Control":"private, no-store"}});
}
