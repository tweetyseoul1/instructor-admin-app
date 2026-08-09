const {createClient}=require('@supabase/supabase-js');

module.exports=async(req,res)=>{
  if(req.method!=='POST')return res.status(405).json({error:'POST 요청만 허용됩니다.'});
  const {SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:service,OPERATOR_SIGNUP_CODE:signupCode}=process.env;
  if(!url||!service||!signupCode)return res.status(500).json({error:'운영자 가입 환경이 설정되지 않았습니다.'});
  const {name,email,password,passwordConfirm,operatorCode}=req.body||{};
  if(!name||!email||!password||password.length<8)return res.status(400).json({error:'성명, 이메일, 8자 이상 비밀번호를 입력해 주세요.'});
  if(password!==passwordConfirm)return res.status(400).json({error:'비밀번호 확인이 일치하지 않습니다.'});
  if(operatorCode!==signupCode)return res.status(403).json({error:'운영자 등록코드가 올바르지 않습니다.'});
  const admin=createClient(url,service,{auth:{persistSession:false}});
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name}});
  if(error)return res.status(400).json({error:error.message});
  const {error:profileError}=await admin.from('profiles').upsert({id:data.user.id,email,name,role:'admin'});
  if(profileError){await admin.auth.admin.deleteUser(data.user.id);return res.status(400).json({error:profileError.message})}
  return res.json({ok:true});
};
