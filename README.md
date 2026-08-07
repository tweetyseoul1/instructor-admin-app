# 2급자격과정 강사행정 시스템

교육신고서 / 수료증·자격증 신청서 / 관리자 확인페이지(운영자·강사 통합)를 하나로 묶은 웹앱입니다.
Supabase(인증+DB) + Vercel(호스팅) + Google Sheets(교육신고서 기록 백업)로 동작합니다.

## 1. Supabase 설정

1. 프로젝트 대시보드 > **SQL Editor** 에서 [`supabase/schema.sql`](supabase/schema.sql) 전체 내용을 실행합니다.
   - 테이블(profiles, education_reports, certificate_requests), RLS 정책, `syllabus` 스토리지 버킷이 생성됩니다.
2. **Authentication > Sign In / Providers** 에서 이메일 **Sign up(회원가입) 비활성화**를 권장합니다.
   - 강사 계정은 공개 가입이 아니라, 관리자가 관리자 확인페이지에서 "강사 계정 추가"로만 생성합니다.
3. **Authentication > URL Configuration** 에서 아래를 실제 배포 도메인으로 등록합니다 (비밀번호 재설정 링크가 이 목록에 없으면 동작하지 않습니다).
   - Site URL: `https://<배포도메인>`
   - Redirect URLs: `https://<배포도메인>/reset-password.html`
4. **Project Settings > API** 에서 아래 3개 값을 확인해두세요.
   - `Project URL`
   - `anon public` key
   - `service_role` key (⚠️ 절대 클라이언트 코드에 넣지 마세요)

## 2. 최초 관리자 계정 만들기

공개 가입을 막았기 때문에 첫 계정은 대시보드에서 직접 만듭니다.

1. **Authentication > Users > Add user** 로 본인 이메일/비밀번호 계정을 생성합니다.
2. SQL Editor에서 아래를 실행해 관리자 권한을 부여합니다.
   ```sql
   update public.profiles set role = 'admin' where email = '본인이메일@example.com';
   ```

## 3. 프론트엔드 설정

[`js/config.js`](js/config.js) 를 열어 1번에서 확인한 값으로 채웁니다.

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJ...",
};
```

## 4. Google Sheets 연동 설정 (교육신고서 자동 기록)

강사가 교육신고서를 제출하면 Supabase에 저장됨과 동시에 지정한 구글시트에도 한 행씩 자동으로 기록됩니다.

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트를 만들고 **Google Sheets API**를 사용 설정합니다.
2. **IAM 및 관리자 > 서비스 계정**에서 서비스 계정을 만들고, **키 추가 > JSON**으로 키 파일을 다운로드합니다.
3. 기록할 구글시트를 새로 만들고, 첫 번째 시트 이름을 `교육신고서`로 지정한 뒤 1행에 헤더를 넣어둡니다.
   ```
   제출시각 | 강사명 | 과정명 | 교육기간(시작) | 교육기간(종료) | 총교육시간 | 모집인원 | 수강료 | 교안파일명 | 신고일자
   ```
4. 그 시트를 **서비스 계정 이메일**(JSON 키 안의 `client_email`)에 **편집자(Editor)** 권한으로 공유합니다.
5. 시트 URL에서 스프레드시트 ID를 확인합니다: `https://docs.google.com/spreadsheets/d/『이 부분』/edit`

## 5. Vercel 배포

이 폴더(`instructor-admin-app/`)를 Vercel 프로젝트로 배포합니다. 정적 파일 + 서버리스 함수 2개(`api/create-instructor.js`, `api/log-report-to-sheet.js`)로 구성되어 있어 별도 빌드 설정이 필요 없습니다.

**환경변수 (Vercel Project Settings > Environment Variables)** — 서버 함수 전용, 반드시 설정:

| 이름 | 값 |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 서비스 계정 JSON의 `client_email` |
| `GOOGLE_PRIVATE_KEY` | 서비스 계정 JSON의 `private_key` (줄바꿈 포함 그대로 붙여넣기) |
| `GOOGLE_SHEET_ID` | 4단계에서 확인한 스프레드시트 ID |
| `GOOGLE_SHEET_RANGE` | (선택) 기본값 `교육신고서!A:J` |

CLI로 배포하는 경우:

```bash
npm install
vercel
```

## 6. 페이지 구성

| 파일 | 설명 | 접근 |
|---|---|---|
| `login.html` | 로그인 / 비밀번호 재설정 요청 | 공개 |
| `reset-password.html` | 이메일 링크로 들어와 새 비밀번호 설정 | 공개(재설정 링크 필요) |
| `certificate-request.html` | 서식2: 수료증·자격증(1급/2급) 신청서 | 공개 (학생이 직접 제출) |
| `report.html` | 서식1: 교육신고서 (교안 첨부, 제출 시 구글시트 동기화) | 강사/관리자 로그인 필요 |
| `admin.html` | 서식3: 관리자 확인페이지 (운영자는 전체 총괄, 강사는 본인이 담당한 신청만) | 로그인 필요 |

### 수료증·자격증 신청서의 "신청종류"

학생은 제출 시 아래 3가지 중 하나를 선택합니다 (텍스트 입력이 아닌 드롭다운):
- **수료증** — 자격증비 입금일자 입력란 숨김
- **1급 자격증** / **2급 자격증** — 자격증비 입금일자 입력란 표시

관리자 확인페이지에서는 이 신청종류별로 목록이 그룹핑되어 표시됩니다.

## 7. 동작 확인 체크리스트

- [ ] 관리자 계정으로 로그인 → admin.html에서 "강사 계정 추가"로 강사 초대
- [ ] 초대 이메일 수신 → 링크로 비밀번호 설정 → 강사 계정 로그인
- [ ] 강사 계정으로 report.html에서 교육신고서 제출 (PPT 교안 파일 첨부 포함) → 구글시트에 행이 추가되는지 확인
- [ ] certificate-request.html에서 로그인 없이 신청서 제출 — 수료증 / 1급 자격증 / 2급 자격증 각각 테스트, 자격증 선택 시에만 입금일자 입력란이 나타나는지 확인
- [ ] 강사 계정으로 admin.html 접속 → 본인이 담당한 신청 건만 신청종류별로 그룹핑되어 보이는지 확인
- [ ] 관리자 계정으로 admin.html 접속 → 전체 신청 건이 보이고, 강사 이름 검색·신청종류 필터가 동작하는지 확인
- [ ] 관리자가 발급 상태를 "발급완료"로 토글 → 발급일자 자동 기록 확인
- [ ] 로그인 화면에서 "비밀번호를 잊으셨나요?" → 이메일 수신 → 재설정 후 재로그인
