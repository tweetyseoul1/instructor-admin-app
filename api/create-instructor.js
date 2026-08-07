const {createClient}=require('@supabase/supabase-js');
module.exports=async(req,res)=>{if(req.method!=='POST')return res.status(405).json({error:'POST 요청만 허용됩니다.'});
 const token=(req.headers.authorization||'').replace('Bearer ','');if(!token)return res.status(401).json({error:'로그인이 필요합니다.'});
 const {SUPABASE_URL:url,SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:service}=process.env;if(!url||!anon||!service)return res.status(500).json({error:'서버 환경변수가 설정되지 않았습니다.'});
 const auth=createClient(url,anon),admin=createClient(url,service,{auth:{persistSession:false}});const {data:u,error:ue}=await auth.auth.getUser(token);if(ue||!u.user)return res.status(401).json({error:'유효하지 않은 로그인입니다.'});
 const {data:p}=await admin.from('profiles').select('role').eq('id',u.user.id).single();if(p?.role!=='admin')return res.status(403).json({error:'운영자만 강사를 등록할 수 있습니다.'});
 const {name,email,phone,bankName,bankAccount,accountHolder}=req.body||{};if(!name||!email||!bankName||!bankAccount||!accountHolder)return res.status(400).json({error:'필수 정보를 모두 입력해 주세요.'});
 const {data:invited,error}=await admin.auth.admin.inviteUserByEmail(email,{data:{name,role:'instructor'}});if(error)return res.status(400).json({error:error.message});
 await admin.from('profiles').upsert({id:invited.user.id,email,name,phone,role:'instructor',bank_name:bankName,bank_account:bankAccount,account_holder:accountHolder});return res.json({ok:true});};
