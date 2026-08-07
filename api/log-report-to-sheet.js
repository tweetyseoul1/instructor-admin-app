// Vercel Serverless Function.
// 교육신고서 제출 시 Google Sheets에 같은 내용을 한 행으로 기록합니다.
// 로그인한 사용자(강사/관리자)만 호출 가능. Supabase가 기록의 원본(source of truth)이며,
// 이 함수는 구글시트에 "복사본"을 남기는 용도입니다 — 실패해도 신고서 제출 자체는 이미 완료된 상태입니다.
//
// 필요한 환경변수 (Vercel Project Settings):
//   SUPABASE_URL, SUPABASE_ANON_KEY   (토큰 검증용)
//   GOOGLE_SERVICE_ACCOUNT_EMAIL      (서비스 계정 이메일)
//   GOOGLE_PRIVATE_KEY                (서비스 계정 개인키, PEM 형식 그대로. 줄바꿈은 \n으로 저장해도 됨)
//   GOOGLE_SHEET_ID                   (기록할 스프레드시트 ID, URL의 /d/ 뒤 값)
//   GOOGLE_SHEET_RANGE                (선택, 기본값 "교육신고서!A:J")

const { google } = require("googleapis");
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const range = process.env.GOOGLE_SHEET_RANGE || "교육신고서!A:J";

  if (!supabaseUrl || !supabaseAnonKey || !sheetId || !serviceEmail || !privateKey) {
    res.status(500).json({ error: "서버 환경변수가 설정되지 않았습니다 (Google Sheets 연동 미설정)." });
    return;
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: userData, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !userData || !userData.user) {
    res.status(401).json({ error: "유효하지 않은 세션입니다." });
    return;
  }

  const {
    instructorName,
    courseName,
    periodStart,
    periodEnd,
    totalHours,
    capacity,
    tuition,
    syllabusFilename,
    reportDate,
  } = req.body || {};

  try {
    const jwt = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth: jwt });

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[
          new Date().toISOString(),
          instructorName || "",
          courseName || "",
          periodStart || "",
          periodEnd || "",
          totalHours ?? "",
          capacity ?? "",
          tuition ?? "",
          syllabusFilename || "",
          reportDate || "",
        ]],
      },
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "구글시트 기록 실패" });
  }
};
