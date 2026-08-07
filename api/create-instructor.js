// Vercel Serverless Function.
// Creates (invites) a new instructor account. Only callable by an authenticated admin.
// Requires env vars (set in Vercel project settings, never in client code):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    res.status(500).json({ error: "서버 환경변수(SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다." });
    return;
  }

  const authClient = createClient(url, anonKey);
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData || !userData.user) {
    res.status(401).json({ error: "유효하지 않은 세션입니다." });
    return;
  }

  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerProfile, error: profileErr } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileErr || !callerProfile || callerProfile.role !== "admin") {
    res.status(403).json({ error: "관리자만 강사 계정을 생성할 수 있습니다." });
    return;
  }

  const { email, name } = req.body || {};
  if (!email || !name) {
    res.status(400).json({ error: "이메일과 이름을 입력해주세요." });
    return;
  }

  const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { name, role: "instructor" },
  });

  if (inviteErr) {
    res.status(400).json({ error: inviteErr.message });
    return;
  }

  res.status(200).json({ ok: true, userId: invited.user ? invited.user.id : null });
};
