# 배움온 교육 행정 통합센터

강사 교육신고, 수강자의 수료증·1급·2급 자격증 신청, 운영자/강사별 업무 현황을 제공하는 반응형 홈페이지입니다. 설정 전에는 브라우저 미리보기 모드로 바로 체험할 수 있습니다.

## 미리보기

`index.html`을 열거나 `npm install && npm start`를 실행합니다.

- 운영자: `admin@baeumon.kr` / `admin123`
- 강사: `teacher@baeumon.kr` / `teacher123`

미리보기 데이터는 현재 브라우저의 localStorage에만 저장됩니다. 실제 개인정보를 입력하지 마세요.

## 실제 운영 연결

1. Supabase 프로젝트의 SQL Editor에서 `supabase/schema.sql`을 실행합니다.
2. `js/config.js`에 Project URL과 anon public key를 입력합니다.
3. Vercel 프로젝트에 아래 서버 환경변수를 등록합니다.
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`
   - 선택: `GOOGLE_SHEET_RANGE` (기본값 `교육신고!A:J`)
4. Google Sheet의 `교육신고` 탭 1행에 `제출시각, 강사명, 연락처, 과정명, 시작일, 종료일, 교육시간, 수강인원, PPT파일명, 로그인계정` 헤더를 만듭니다.
5. 해당 시트를 Google 서비스 계정 이메일에 편집자 권한으로 공유합니다.
6. Supabase Authentication에서 운영자 계정을 만든 후 `profiles.role`을 `admin`으로 변경합니다. 강사 계정은 운영자 화면의 강사 등록 기능으로 초대합니다.

비밀키와 계좌번호 전체를 공개 HTML이나 구글시트에 저장하지 마세요. 계좌정보는 Supabase RLS로 보호하며, 수강자 화면에는 선택한 강사의 입금 안내 용도로만 표시됩니다.

## 반영된 요청

- 교육신고서에서 소속, 자격, 교육장소, 서명/인 항목 제거
- 강의 PPT 첨부 및 Google Sheets 기록 연동
- 강사 성명·계좌 등록과 수강자 강사 선택
- 수료증/1급/2급 구분, 사진·서명 제거, 자격증비 입금일
- 운영자 전체 조회, 강사 본인 담당 수강자·신청자 조회
- 이메일 기반 비밀번호 재설정
- 수강생 수수료 신청서 제거
