import crypto from "node:crypto";
import {
 SERVICES, LIMIT_DAYS, localNow, validDay, daysFromNow, isSunday,
 availableStarts, getSql, json, limitBody, strip, requireSameOrigin,
 clientHash, hashToken, rateLimit, expirePending, errorResponse
} from "./_lib.js";
export default async function handler(req,res) {
 const action=String(req.query?.action||"config");
 if(req.method!=="GET"&&req.method!=="POST")return json(res,405,{error:"Method not allowed"});
 if(req.method==="POST"&&!requireSameOrigin(req))return json(res,403,{error:"Bad request origin"});
 try{
   const sql=getSql();
   if(req.method==="GET"&&action==="config"){
      return json(res,200,{
        active:true, timezone:"Europe/Brussels",open:"10:00",close:"20:00",closed_weekdays:[0],
        booking_type:"request_only",pending_expires_hours:48,advance_days:LIMIT_DAYS,
        prices_are_proposed:true,
        services:Object.entries(SERVICES).map(([id,s])=>({id,...s}))
      });
   }
   if(req.method==="GET"&&action==="slots"){
     const date=String(req.query.date||""), key=String(req.query.service||"");
     if(!validDay(date)||!SERVICES[key])return json(res,400,{error:"Choose a valid date and service"});
     if(isSunday(date))return json(res,200,{date,service:key,slots:[],closed:true});
     if(daysFromNow(date)<0||daysFromNow(date)>LIMIT_DAYS)return json(res,400,{error:"Date outside booking window"});
     await expirePending(sql);
     const busy=await sql`SELECT start_min,end_min FROM nizo_appointments
       WHERE day=${date}::date AND status IN ('pending','confirmed')`;
     const slots=availableStarts(date,SERVICES[key],busy);
     return json(res,200,{date,service:key,slots,closed:false});
   }
   if(req.method==="POST"&&action==="status"){
     const body=limitBody(req,500);
     const id=String(body?.id||""),token=String(body?.token||"");
     if(!/^[0-9a-f-]{36}$/i.test(id)||token.length<24)return json(res,400,{error:"Invalid reference"});
     await expirePending(sql);
     const rows=await sql`SELECT status,day::text,start_min,service_key FROM nizo_appointments
       WHERE id=${id}::uuid AND customer_token_hash=${hashToken(token)}`;
     if(!rows.length)return json(res,404,{error:"Booking reference not found"});
     const b=rows[0];
     return json(res,200,{status:b.status,date:b.day,time:String(Math.floor(b.start_min/60)).padStart(2,"0")+":"+String(b.start_min%60).padStart(2,"0"),service:b.service_key});
   }
   if(req.method==="POST"&&action==="request"){
     const body=limitBody(req);
     if(!body)return json(res,400,{error:"Invalid booking data"});
     if(strip(body.website,200))return json(res,400,{error:"Invalid submission"});
     if(body.consent!==true)return json(res,400,{error:"Consent is required"});
     const date=String(body.date||""),service=String(body.service||""),time=String(body.time||"");
     const name=strip(body.name,70),email=strip(body.email,200).toLowerCase(),phone=strip(body.phone,35);
     if(!validDay(date)||!SERVICES[service]||isSunday(date)||daysFromNow(date)<0||daysFromNow(date)>LIMIT_DAYS) return json(res,400,{error:"Invalid date or service"});
     if(name.length<2||name.length>70||!/^.{1,80}@.{2,160}\.[a-z]{2,}$/i.test(email)||phone.length>35)return json(res,400,{error:"Enter valid name and email"});
     if(!/^(?:1[0-9]|20):(?:00|30)$/.test(time))return json(res,400,{error:"Choose one of the available times"});
     const minute=Number(time.slice(0,2))*60+Number(time.slice(3));
     if(!availableStarts(date,SERVICES[service]).some(s=>s.minute===minute))return json(res,409,{error:"Time no longer available"});
     const ipKey=clientHash(req,"reservation");
     const permitted=await rateLimit(sql,ipKey,6);
     if(!permitted)return json(res,429,{error:"Too many requests. Please call the salon."});
     await expirePending(sql);
     const token=crypto.randomBytes(32).toString("base64url");
     const rows=await sql`INSERT INTO nizo_appointments
       (day,start_min,end_min,service_key,customer_name,customer_email,customer_phone,customer_token_hash,ip_hash)
       VALUES (${date}::date,${minute},${minute+SERVICES[service].minutes},${service},${name},${email},${phone},${hashToken(token)},${ipKey})
       RETURNING id,day::text,start_min,status`;
     const inserted=rows[0];
     return json(res,201,{
       id:inserted.id,token,status:inserted.status,
       date:inserted.day,time,service,
       message:"Request saved. Appointment is NOT confirmed until the salon approves it."
     });
   }
   return json(res,404,{error:"Endpoint not found"});
 }catch(e){return errorResponse(res,e);}
}
