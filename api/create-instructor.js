const {createClient}=require('@supabase/supabase-js');

function clients(){
  const {SUPABASE_URL:url,SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:service}=process.env;
  if(!url||!anon||!service)return null;
  return {auth:createClient(url,anon),admin:createClient(url,service,{auth:{persistSession:false}})};
}

module.exports=async(req,res)=>{
  if(req.method!=='POST')return res.status(405).json({error:'POST 요청만 허용됩니다.'});
  const token=(req.headers.authorization||'').replace('Bearer ','');
  const c=clients();if(!c)return res.status(500).json({error:'서버 환경변수가 설정되지 않았습니다.'});
  const {data:u,error:ue}=await c.auth.auth.getUser(token);
  if(ue||!u.user)return res.status(401).json({error:'로그인이 필요합니다.'});
  const {data:p}=await c.admin.from('profiles').select('role').eq('id',u.user.id).single();
  if(p?.role!=='admin')return res.status(403).json({error:'운영자만 강사 계정을 등록할 수 있습니다.'});
  const {name,email,temporaryPassword,phone,bankName,bankAccount,accountHolder}=req.body||{};
  if(!name||!email||!temporaryPassword||temporaryPassword.length<8||!phone||!bankName||!bankAccount||!accountHolder)return res.status(400).json({error:'필수 정보와 8자 이상의 임시 비밀번호를 입력해 주세요.'});
  const {data:created,error}=await c.admin.auth.admin.createUser({email,password:temporaryPassword,email_confirm:true,user_metadata:{name,role:'instructor'}});
  if(error)return res.status(400).json({error:error.message});
  await c.admin.from('profiles').upsert({id:created.user.id,email,name,phone,role:'instructor',bank_name:bankName,bank_account:bankAccount,account_holder:accountHolder});
  return res.json({ok:true,userId:created.user.id});
};
