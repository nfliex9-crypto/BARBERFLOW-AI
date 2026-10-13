import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";
export const SERVICES = Object.freeze({
  haircut: {name:"Herenknipbeurt",minutes:30,price_cents:2500},
  beard: {name:"Baard bijwerken",minutes:30,price_cents:1500},
  combo: {name:"Knippen + baard",minutes:45,price_cents:3500},
  styling: {name:"Haarstyling",minutes:30,price_cents:2000}
});
export const LIMIT_DAYS = 60;
const fmt = new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
export function localNow() {
  const p=Object.fromEntries(fmt.formatToParts(new Date()).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
  return {day:p.year+"-"+p.month+"-"+p.day,minute:Number(p.hour)*60+Number(p.minute)};
}
export function validDay(day){
  if(typeof day!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
  const d=new Date(day+"T12:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===day;
}
export function daysFromNow(day){
  return (Date.parse(day+"T00:00:00Z")-Date.parse(localNow().day+"T00:00:00Z"))/86400000;
}
export function isSunday(day){return new Date(day+"T12:00:00Z").getUTCDay()===0;}
export function availableStarts(day,service,busy=[]){
  if(!validDay(day)||isSunday(day))return [];
  const offset=daysFromNow(day);if(offset<0||offset>LIMIT_DAYS)return [];
  const now=localNow(),out=[];
  for(let start=600;start+service.minutes<=1200;start+=30){
    if(day===now.day&&start<now.minute+60)continue;
    if(busy.some(x=>start<x.end_min&&start+service.minutes>x.start_min))continue;
    out.push({time:String(Math.floor(start/60)).padStart(2,"0")+":"+String(start%60).padStart(2,"0"),minute:start});
  }
  return out;
}
export function getSql(){
  if(!process.env.DATABASE_URL)throw Error("Booking database not configured");
  return neon(process.env.DATABASE_URL);
}
export function json(res,status,value){
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.status(status).json(value);
}
export function limitBody(req,max=1800){
  let data=req.body;
  if(typeof data==="string"&&data.length<=max){try{data=JSON.parse(data);}catch{return null;}}
  if(!data||typeof data!=="object"||Array.isArray(data)||JSON.stringify(data).length>max)return null;
  return data;
}
export function strip(text,max){return typeof text==="string"?text.trim().replace(/[\u0000-\u001f\u007f]/g," ").slice(0,max):"";}
export function requireSameOrigin(req){
  const origin=req.headers.origin;
  if(!origin)return true;
  try{const u=new URL(origin);return u.host===req.headers.host&&u.protocol==="https:";}catch{return false;}
}
export function clientHash(req,purpose){
  const ip=String(req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"unknown").split(",")[0].trim();
  const key=process.env.NIZO_APP_SECRET;
  if(!key||key.length<32)throw Error("NIZO secret missing");
  return crypto.createHmac("sha256",key).update(purpose+":"+ip).digest("hex");
}
export function hashToken(value){return crypto.createHash("sha256").update(value).digest("hex");}
export async function rateLimit(sql,key,max){
  const rows=await sql`INSERT INTO nizo_rate_limits(key,window_start,hits)
    VALUES(${key},date_trunc('hour',now()),1)
    ON CONFLICT(key,window_start) DO UPDATE SET hits=nizo_rate_limits.hits+1 RETURNING hits`;
  return Number(rows[0]?.hits||0)<=max;
}
export async function expirePending(sql){
  await sql`UPDATE nizo_appointments SET status='expired',updated_at=now()
    WHERE status='pending' AND expires_at<=now()`;
}
export function errorResponse(res,e){
  if(e?.code==="23P01")return json(res,409,{error:"Time slot already requested. Choose another."});
  console.error("NIZO DB/API error",String(e?.message||e).replace(/postgres(?:ql)?:\/\/[^\s]+/gi,"[redacted]"));
  return json(res,503,{error:"Booking temporarily unavailable. Call 0471 82 16 30."});
}

export async function getSalonServices(sql){
 const rows=await sql`SELECT service_key,name,duration_minutes,price_cents,active,price_confirmed
   FROM nizo_services ORDER BY CASE service_key
     WHEN 'haircut' THEN 1 WHEN 'beard' THEN 2 WHEN 'combo' THEN 3 WHEN 'styling' THEN 4 END`;
 return rows.map(s=>({
   id:s.service_key,name:s.name,minutes:Number(s.duration_minutes),
   price_cents:Number(s.price_cents),active:!!s.active,price_confirmed:!!s.price_confirmed
 }));
}
export async function findSalonService(sql,key){
 if(!Object.hasOwn(SERVICES,key))return null;
 const services=await getSalonServices(sql);
 return services.find(s=>s.id===key&&s.active)||null;
}
export async function isClosedDate(sql,day){
 const rows=await sql`SELECT 1 FROM nizo_closed_dates WHERE day=${day}::date LIMIT 1`;
 return rows.length>0;
}
export function shiftDay(day,n){
 const date=new Date(day+"T12:00:00Z");
 date.setUTCDate(date.getUTCDate()+n);
 return date.toISOString().slice(0,10);
}
