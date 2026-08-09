const {createClient}=require('@supabase/supabase-js');

module.exports=async(req,res)=>{
  if(req.method!=='POST')return res.status(405).json({error:'POST 요청만 허용됩니다.'});
  const token=(req.headers.authorization||'').replace('Bearer ','');
  const {SUPABASE_URL:url,SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:service}=process.env;
  if(!url||!anon||!service)return res.status(500).json({error:'서버 환경변수가 설정되지 않았습니다.'});
  const auth=createClient(url,anon),admin=createClient(url,service,{auth:{persistSession:false}});
  const {data:u,error:ue}=await auth.auth.getUser(token);if(ue||!u.user)return res.status(401).json({error:'로그인이 필요합니다.'});
  const {data:p}=await admin.from('profiles').select('role').eq('id',u.user.id).single();if(p?.role!=='admin')return res.status(403).json({error:'운영자만 비밀번호를 재설정할 수 있습니다.'});
  const {instructorId,newPassword}=req.body||{};if(!instructorId||!newPassword||newPassword.length<8)return res.status(400).json({error:'8자 이상의 새 임시 비밀번호를 입력해 주세요.'});
  const {data:target}=await admin.from('profiles').select('role').eq('id',instructorId).single();if(target?.role!=='instructor')return res.status(400).json({error:'강사 계정이 아닙니다.'});
  const {error}=await admin.auth.admin.updateUserById(instructorId,{password:newPassword});if(error)return res.status(400).json({error:error.message});
  return res.json({ok:true});
};
