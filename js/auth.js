// Shared auth/nav helpers. Requires supabaseClient.js (defines `sb`) loaded first.

async function getSessionUser() {
  const { data } = await sb.auth.getSession();
  return data.session ? data.session.user : null;
}

async function getProfile(userId) {
  const { data, error } = await sb
    .from("profiles")
    .select("id, email, name, role")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data;
}

// Redirects to login.html if not authenticated. Returns { user, profile }.
async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    window.location.href = "login.html";
    throw new Error("redirecting to login");
  }
  const profile = await getProfile(user.id);
  return { user, profile };
}

function initNav(activeHref, profile) {
  const el = document.getElementById("site-header");
  if (!el) return;
  const link = (href, label) =>
    `<a href="${href}" class="${href === activeHref ? "active" : ""}">${label}</a>`;

  el.innerHTML = `
    <div class="site-inner">
      <div class="wordmark">
        <a href="admin.html"><span class="name">2급자격과정 강사행정</span></a>
        <span class="tag">교육신고 · 수료증 · 관리 통합 시스템</span>
      </div>
      <nav class="tabs">
        ${link("report.html", "교육신고서")}
        ${link("certificate-request.html", "수료증 신청서")}
        ${link("admin.html", "관리자 확인페이지")}
        <span class="who">${profile ? (profile.name || profile.email) + (profile.role === "admin" ? " · 운영자" : " · 강사") : ""}</span>
        <button class="logout btn ghost" id="logout-btn">로그아웃</button>
      </nav>
    </div>
  `;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await sb.auth.signOut();
      window.location.href = "login.html";
    });
  }
}

function showMsg(el, text, kind) {
  el.textContent = text;
  el.className = "msg show " + (kind || "error");
}
function hideMsg(el) {
  el.className = "msg";
}
