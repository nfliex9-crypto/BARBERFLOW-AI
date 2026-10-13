import crypto from "node:crypto";
import {getSql,json,clientHash,rateLimit,expirePending,errorResponse,limitBody,requireSameOrigin,validDay,daysFromNow,localNow,shiftDay,getSalonServices,strip,SERVICES} from "./_lib.js";
function verifyPassword(candidate){
 const expected=process.env.NIZO_ADMIN_PASSWORD||"";
 if(expected.length<16||typeof candidate!=="string"||candidate.length>200)return false;
 const a=crypto.createHash("sha256").update(candidate).digest();
 const b=crypto.createHash("sha256").update(expected).digest();
 return crypto.timingSafeEqual(a,b);
}
function cookieToken(){
 const payload=Buffer.from(JSON.stringify({v:1,until:Date.now()+8*3600*1000})).toString("base64url");
 const sig=crypto.createHmac("sha256",process.env.NIZO_APP_SECRET).update(payload).digest("base64url");
 return payload+"."+sig;
}
function isAdmin(req){
 try{
   const cookie=String(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("nizo_owner="))?.slice(11);
   if(!cookie)return false;
   const [payload,sig]=cookie.split(".");
   if(!payload||!sig)return false;
   const expected=crypto.createHmac("sha256",process.env.NIZO_APP_SECRET).update(payload).digest();
   const supplied=Buffer.from(sig,"base64url");
   if(supplied.length!==expected.length||!crypto.timingSafeEqual(supplied,expected))return false;
   const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));
   return data.v===1&&data.until>Date.now()&&data.until<Date.now()+9*3600*1000;
 }catch{return false;}
}
export default async function handler(req,res){
 const action=String(req.query.action||"list");
 if(req.method!=="GET"&&req.method!=="POST")return json(res,405,{error:"Method not allowed"});
 if(req.method==="POST"&&(!requireSameOrigin(req)||req.headers["content-type"]?.split(";")[0]!=="application/json"))
   return json(res,403,{error:"Invalid request origin or content type"});
 try{
   const sql=getSql();
   if(req.method==="POST"&&action==="login"){
     const key=clientHash(req,"admin-login");
     if(!await rateLimit(sql,key,12))return json(res,429,{error:"Too many login attempts"});
     const b=limitBody(req,500);
     if(!verifyPassword(b?.password))return json(res,401,{error:"Invalid password"});
     res.setHeader("Set-Cookie","nizo_owner="+cookieToken()+"; Path=/api; Max-Age=28800; HttpOnly; Secure; SameSite=Strict");
     return json(res,200,{ok:true});
   }
   if(!isAdmin(req))return json(res,401,{error:"Sign in to manage bookings"});
   if(req.method==="POST"&&action==="logout"){
     res.setHeader("Set-Cookie","nizo_owner=; Path=/api; Max-Age=0; HttpOnly; Secure; SameSite=Strict");
     return json(res,200,{ok:true});
   }
   if(req.method==="GET"&&action==="overview"){
     await expirePending(sql);
     const today=localNow().day;
     const counts=await sql`SELECT COUNT(*)::int AS total,
       COUNT(*) FILTER(WHERE status='pending')::int AS pending,
       COUNT(*) FILTER(WHERE status='confirmed')::int AS confirmed,
       COUNT(*) FILTER(WHERE status='declined')::int AS declined,
       COUNT(*) FILTER(WHERE status='cancelled')::int AS cancelled,
       COUNT(*) FILTER(WHERE status='expired')::int AS expired,
       COUNT(*) FILTER(WHERE day=${today}::date AND status IN ('pending','confirmed'))::int AS today,
       COUNT(*) FILTER(WHERE day>=${today}::date AND status='confirmed')::int AS future_confirmed
       FROM nizo_appointments`;
     const daily=await sql`SELECT day::text AS day,
       COUNT(*) FILTER(WHERE status='pending')::int AS pending,
       COUNT(*) FILTER(WHERE status='confirmed')::int AS confirmed
       FROM nizo_appointments WHERE day BETWEEN ${today}::date AND ${shiftDay(today,13)}::date
       GROUP BY day ORDER BY day ASC`;
     return json(res,200,{metrics:counts[0],days:daily,today,timezone:'Europe/Brussels'});
   }
   if(req.method==="GET"&&action==="list"){
     await expirePending(sql);
     const today=localNow().day;
     const from=String(req.query.from||shiftDay(today,-30)),to=String(req.query.to||shiftDay(today,60));
     if(!validDay(from)||!validDay(to)||from>to||
        (Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))>366*86400000)
       return json(res,400,{error:'Invalid date range (max 366 days)'});
     const rows=await sql`SELECT id,day::text,start_min,end_min,service_key,customer_name,
       customer_email,customer_phone,status,created_at,expires_at FROM nizo_appointments
       WHERE day BETWEEN ${from}::date AND ${to}::date
       ORDER BY day ASC,start_min ASC LIMIT 501`;
     return json(res,200,{bookings:rows.slice(0,500),truncated:rows.length>500,from,to});
   }
   if(req.method==="GET"&&action==="settings"){
     const services=await getSalonServices(sql);
     const closed=await sql`SELECT day::text AS day,reason FROM nizo_closed_dates
       WHERE day>=${localNow().day}::date ORDER BY day LIMIT 120`;
     return json(res,200,{services,closed,opening_hours:'Monday–Saturday 10:00–20:00; Sunday closed',
       services_limit:4,pricing_owner_confirmed:services.every(s=>s.price_confirmed)});
   }
   if(req.method==="POST"&&action==="service"){
     if(req.headers['x-nizo-action']!=='booking-update')return json(res,403,{error:'Missing action header'});
     const body=limitBody(req,600);
     const key=String(body?.id||'');
     const name=strip(body?.name,65);
     const minutes=Number(body?.minutes),price=Number(body?.price_cents);
     if(!Object.hasOwn(SERVICES,key)||name.length<2||
        !Number.isInteger(minutes)||minutes<15||minutes>180||minutes%15!==0||
        !Number.isInteger(price)||price<0||price>50000||
        typeof body?.active!=='boolean'||typeof body?.price_confirmed!=='boolean')
       return json(res,400,{error:'Invalid service details'});
     const rows=await sql`UPDATE nizo_services SET name=${name},duration_minutes=${minutes},
       price_cents=${price},active=${body.active},price_confirmed=${body.price_confirmed},
       updated_at=now() WHERE service_key=${key} RETURNING service_key`;
     if(!rows.length)return json(res,404,{error:'Service not found'});
     return json(res,200,{saved:true,service_key:key});
   }
   if(req.method==="POST"&&action==="close-day"){
     if(req.headers['x-nizo-action']!=='booking-update')return json(res,403,{error:'Missing action header'});
     const body=limitBody(req,300);
     const day=String(body?.day||'');
     if(!validDay(day)||daysFromNow(day)<0||daysFromNow(day)>365)
       return json(res,400,{error:'Choose a future date within one year'});
     const busy=await sql`SELECT COUNT(*)::int AS total FROM nizo_appointments WHERE day=${day}::date
       AND status IN ('pending','confirmed')`;
     if(Number(busy[0].total)>0)return json(res,409,{error:'Existing active appointments. Contact customers before closing this day.'});
     const reason=strip(body?.reason,120)||'Salon closed';
     await sql`INSERT INTO nizo_closed_dates(day,reason) VALUES(${day}::date,${reason})
       ON CONFLICT(day) DO UPDATE SET reason=EXCLUDED.reason`;
     return json(res,200,{saved:true,day});
   }
   if(req.method==="POST"&&action==="open-day"){
     if(req.headers['x-nizo-action']!=='booking-update')return json(res,403,{error:'Missing action header'});
     const body=limitBody(req,200);
     const day=String(body?.day||'');
     if(!validDay(day)||daysFromNow(day)<0||daysFromNow(day)>365)
       return json(res,400,{error:'Invalid date'});
     await sql`DELETE FROM nizo_closed_dates WHERE day=${day}::date`;
     return json(res,200,{saved:true,day});
   }
   if(req.method==="POST"&&action==="update"){
     if(req.headers["x-nizo-action"]!=="booking-update")return json(res,403,{error:"Missing action header"});
     const b=limitBody(req,400);
     const id=String(b?.id||""),status=String(b?.status||"");
     if(!/^[0-9a-f-]{36}$/i.test(id)||!["confirmed","declined","cancelled"].includes(status))return json(res,400,{error:"Invalid update"});
     await expirePending(sql);
     const rows=await sql`UPDATE nizo_appointments
       SET status=${status},updated_at=now()
       WHERE id=${id}::uuid AND (
         (status='pending' AND ${status} IN ('confirmed','declined'))
         OR (status='confirmed' AND ${status}='cancelled')
       ) RETURNING id,status`;
     if(!rows.length)return json(res,409,{error:"This booking cannot transition to that status"});
     return json(res,200,{booking:rows[0]});
   }
   return json(res,404,{error:"Not found"});
 }catch(e){return errorResponse(res,e);}
}
