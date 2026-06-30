// supabase/functions/esdm-jar/index.ts
// ESDM JAR 생성기 — 통합 백엔드 (Edge Function)
//
// 한 함수에서 action 으로 분기:
//   - generate      : 프롬프트 → Anthropic 호출 (AI 생성)
//   - seedAdmin     : 최초 관리자 계정 1회 생성
//   - login         : 아이디/비번 로그인 → 토큰 발급
//   - listUsers     : (관리자) 선생님 목록
//   - createUser    : (관리자) 선생님 계정 부여
//   - setActive     : (관리자) 선생님 활성/비활성
//   - resetPw       : (관리자) 선생님 비번 재설정
//   - savePlan      : (로그인) JAR 저장
//   - listPlans     : (로그인) 내 JAR 목록
//   - deletePlan    : (로그인) 내 JAR 삭제
//
// 배포:
//   supabase functions deploy esdm-jar --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase secrets set ADMIN_SEED_SECRET=원하는문자열   // seedAdmin 보호용
//   (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 는 기본 제공)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ADMIN_SEED_SECRET = Deno.env.get("ADMIN_SEED_SECRET") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const db = createClient(SB_URL, SB_SERVICE);

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

// ---- 비밀번호 해시 (PBKDF2, salt 포함) ----
async function hashPw(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex
    ? hexToBytes(saltHex)
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256
  );
  const hash = bytesToHex(new Uint8Array(bits));
  return `${bytesToHex(salt)}:${hash}`;
}
async function verifyPw(password, stored) {
  const [saltHex] = stored.split(":");
  const candidate = await hashPw(password, saltHex);
  return candidate === stored;
}
function bytesToHex(b) {
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(h) {
  const a = new Uint8Array(h.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
  return a;
}

// ---- 단순 토큰 : userId.role.exp 를 서비스키로 HMAC 서명 ----
async function makeToken(userId, role) {
  const exp = Date.now() + 1000 * 60 * 60 * 12; // 12시간
  const payload = `${userId}.${role}.${exp}`;
  const sig = await hmac(payload);
  return btoa(`${payload}.${sig}`);
}
async function readToken(token) {
  try {
    const raw = atob(token);
    const parts = raw.split(".");
    const sig = parts.pop();
    const payload = parts.join(".");
    if ((await hmac(payload)) !== sig) return null;
    const [userId, role, exp] = payload.split(".");
    if (Date.now() > Number(exp)) return null;
    return { userId, role };
  } catch {
    return null;
  }
}
async function hmac(msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SB_SERVICE),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return bytesToHex(new Uint8Array(sig));
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

  try {
    // ===== AI 생성 =====
    if (action === "generate") {
      const auth = await readToken(body.token || "");
      if (!auth) return json({ error: "unauthorized" }, 401);
      const { prompt } = body;
      if (!prompt) return json({ error: "prompt 누락" }, 400);
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
    }

    // ===== 최초 관리자 시드 (1회) =====
    if (action === "seedAdmin") {
      if (!ADMIN_SEED_SECRET || body.secret !== ADMIN_SEED_SECRET)
        return json({ error: "forbidden" }, 403);
      const { username, password, name } = body;
      if (!username || !password || !name)
        return json({ error: "필드 누락" }, 400);
      const exists = await db
        .from("esdm_users")
        .select("id")
        .eq("role", "admin")
        .limit(1);
      if (exists.data && exists.data.length > 0)
        return json({ error: "관리자 이미 존재" }, 409);
      const pw_hash = await hashPw(password);
      const ins = await db
        .from("esdm_users")
        .insert({ username, pw_hash, name, role: "admin" })
        .select("id")
        .single();
      if (ins.error) return json({ error: ins.error.message }, 400);
      return json({ ok: true, id: ins.data.id });
    }

    // ===== 로그인 =====
    if (action === "login") {
      const { username, password } = body;
      const u = await db
        .from("esdm_users")
        .select("*")
        .eq("username", username)
        .single();
      if (u.error || !u.data) return json({ error: "계정 없음" }, 401);
      if (!u.data.active) return json({ error: "비활성 계정" }, 403);
      const ok = await verifyPw(password, u.data.pw_hash);
      if (!ok) return json({ error: "비밀번호 불일치" }, 401);
      const token = await makeToken(u.data.id, u.data.role);
      return json({
        token,
        user: { id: u.data.id, name: u.data.name, role: u.data.role },
      });
    }

    // ===== 관리자 전용 가드 =====
    async function requireAdmin() {
      const auth = await readToken(body.token || "");
      if (!auth || auth.role !== "admin") return null;
      return auth;
    }

    if (action === "listUsers") {
      if (!(await requireAdmin())) return json({ error: "forbidden" }, 403);
      const r = await db
        .from("esdm_users")
        .select("id, username, name, role, active, created_at")
        .order("created_at", { ascending: true });
      return json({ users: r.data || [] });
    }

    if (action === "createUser") {
      if (!(await requireAdmin())) return json({ error: "forbidden" }, 403);
      const { username, password, name } = body;
      if (!username || !password || !name)
        return json({ error: "필드 누락" }, 400);
      const pw_hash = await hashPw(password);
      const ins = await db
        .from("esdm_users")
        .insert({ username, pw_hash, name, role: "therapist" })
        .select("id, username, name, role, active")
        .single();
      if (ins.error) return json({ error: ins.error.message }, 400);
      return json({ user: ins.data });
    }

    if (action === "setActive") {
      if (!(await requireAdmin())) return json({ error: "forbidden" }, 403);
      const { userId, active } = body;
      const r = await db.from("esdm_users").update({ active }).eq("id", userId);
      if (r.error) return json({ error: r.error.message }, 400);
      return json({ ok: true });
    }

    if (action === "resetPw") {
      if (!(await requireAdmin())) return json({ error: "forbidden" }, 403);
      const { userId, password } = body;
      if (!password) return json({ error: "비번 누락" }, 400);
      const pw_hash = await hashPw(password);
      const r = await db
        .from("esdm_users")
        .update({ pw_hash })
        .eq("id", userId);
      if (r.error) return json({ error: r.error.message }, 400);
      return json({ ok: true });
    }

    // ===== JAR 저장/조회 (본인) =====
    if (action === "savePlan") {
      const auth = await readToken(body.token || "");
      if (!auth) return json({ error: "unauthorized" }, 401);
      const { title, levels, toys, domains, plan } = body;
      const ins = await db
        .from("esdm_plans")
        .insert({ user_id: auth.userId, title, levels, toys, domains, plan })
        .select("id, created_at")
        .single();
      if (ins.error) return json({ error: ins.error.message }, 400);
      return json({ plan: ins.data });
    }

    if (action === "listPlans") {
      const auth = await readToken(body.token || "");
      if (!auth) return json({ error: "unauthorized" }, 401);
      const r = await db
        .from("esdm_plans")
        .select("id, title, levels, toys, domains, plan, created_at")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false });
      return json({ plans: r.data || [] });
    }

    if (action === "deletePlan") {
      const auth = await readToken(body.token || "");
      if (!auth) return json({ error: "unauthorized" }, 401);
      const r = await db
        .from("esdm_plans")
        .delete()
        .eq("id", body.planId)
        .eq("user_id", auth.userId);
      if (r.error) return json({ error: r.error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: "server_error", detail: String(e) }, 500);
  }
});
