const {google}=require('googleapis');
const {createClient}=require('@supabase/supabase-js');

module.exports=async(req,res)=>{
  if(req.method!=='POST')return res.status(405).json({error:'POST 요청만 허용됩니다.'});
  const {SUPABASE_URL:url,SUPABASE_ANON_KEY:anon,GOOGLE_SHEET_ID:id,GOOGLE_SERVICE_ACCOUNT_EMAIL:email,GOOGLE_PRIVATE_KEY:key}=process.env;
  if(!url||!anon||!id||!email||!key)return res.status(500).json({error:'Google Sheets 환경변수가 설정되지 않았습니다.'});
  const token=(req.headers.authorization||'').replace('Bearer ','');
  const {data,error}=await createClient(url,anon).auth.getUser(token);
  if(error||!data.user)return res.status(401).json({error:'로그인이 필요합니다.'});
  const b=req.body||{};
  try{
    const auth=new google.auth.JWT({email,key:key.replace(/\\n/g,'\n'),scopes:['https://www.googleapis.com/auth/spreadsheets']});
    const sheets=google.sheets({version:'v4',auth});
    await sheets.spreadsheets.values.append({spreadsheetId:id,range:process.env.GOOGLE_APPLICATION_SHEET_RANGE||'수료자격신청!A:K',valueInputOption:'USER_ENTERED',insertDataOption:'INSERT_ROWS',requestBody:{values:[[new Date().toISOString(),b.studentName||'',b.birthDate||'',b.phone||'',b.email||'',b.requestType||'',b.courseName||'',b.completionDate||'',b.paymentDate||'',b.instructorId||'','접수']]}});
    return res.json({ok:true});
  }catch(e){return res.status(500).json({error:e.message})}
};
