import crypto from "node:crypto";
import {getSql,json,clientHash,rateLimit,expirePending,errorResponse,limitBody,requireSameOrigin,hashToken} from "./_lib.js";
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
   if(req.method==="GET"&&action==="list"){
     await expirePending(sql);
     const rows=await sql`SELECT id,day::text,start_min,end_min,service_key,customer_name,
       customer_email,customer_phone,status,created_at,expires_at FROM nizo_appointments
       WHERE created_at>now()-interval '120 days' ORDER BY day DESC,start_min DESC LIMIT 250`;
     return json(res,200,{bookings:rows});
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
