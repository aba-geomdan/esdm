// supabase/functions/esdm-jar/index.ts
// ESDM JAR 생성기 — AI 놀이계획 생성 전용 릴레이 (A방식 전환 후)
//
// 인증·계정·저장은 Supabase Auth + RLS 로 이관됨.
// 이 함수는 이제 generate(AI 호출) 하나만 담당한다.
//
// 배포:
//   supabase functions deploy esdm-jar --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   (SUPABASE_URL, SUPABASE_ANON_KEY 는 기본 제공)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// 로그인한 Supabase Auth 사용자인지 검증 (access_token → /auth/v1/user)
async function verifyAuth(req) {
  const authz = req.headers.get("authorization") || "";
  const token = authz.replace(/^Bearer\s+/i, "");
  // anon key 만 온 경우(로그인 안 됨)는 거부
  if (!token || token === SB_ANON) return null;
  try {
    const r = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_ANON, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const user = await r.json();
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const action = body.action || "generate";
  if (action !== "generate") return json({ error: "unknown action" }, 400);

  // 로그인 사용자만 AI 호출 허용
  const user = await verifyAuth(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  const { prompt } = body;
  if (!prompt) return json({ error: "prompt 누락" }, 400);

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await r.json();
    if (!r.ok) return json({ error: "anthropic_error", detail: data }, 502);
    const text = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    return json({ text });
  } catch (e) {
    return json({ error: "server_error", detail: String(e) }, 500);
  }
});
