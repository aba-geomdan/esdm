# 함께놀이 플래너 (ESDM 공동활동루틴)

검단ABA언어행동연구소 · 민다혜 (BCBA)

---

## 배포 순서 (처음 한 번만)

### 1단계. Supabase 테이블 만들기
Supabase 프로젝트(vdubgrxwijydwfabwpnk) → SQL Editor → `supabase/schema.sql` 내용 붙여넣고 실행.
→ esdm_users(계정), esdm_plans(저장된 계획) 두 테이블이 생김.

### 2단계. Edge Function 배포
```bash
supabase functions deploy esdm-jar --no-verify-jwt
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...본인키
supabase secrets set ADMIN_SEED_SECRET=원하는비밀문자열
```

### 3단계. 관리자 계정(민다혜) 생성  ← 1회만
아래 명령을 터미널에 그대로 (ADMIN_SEED_SECRET은 2단계에서 정한 값):
```bash
curl -X POST https://vdubgrxwijydwfabwpnk.supabase.co/functions/v1/esdm-jar \
  -H "Content-Type: application/json" \
  -d '{
    "action": "seedAdmin",
    "secret": "위에서_정한_ADMIN_SEED_SECRET",
    "username": "민다혜",
    "password": "abageomdan1121",
    "name": "민다혜"
  }'
```
→ {"ok":true,...} 가 나오면 관리자 계정 완성. (이미 있으면 "관리자 이미 존재")

### 4단계. GitHub Pages 배포
```bash
cd esdm-jar
git init
git add .
git commit -m "init 함께놀이 플래너"
git branch -M main
git remote add origin https://github.com/aba-geomdan/esdm.git
git push -u origin main
```
GitHub 저장소 → Settings → Pages → Source: **GitHub Actions** 선택.
→ 잠시 후 https://aba-geomdan.github.io/esdm/ 에서 접속.

---

## 사용 흐름
1. 관리자(민다혜)로 로그인 → "계정 관리"에서 선생님 아이디·비번 부여.
2. 선생님은 받은 계정으로 로그인 → 아이 정보·레벨·놀잇감 선택 → 놀이계획 생성.
3. 치료사용/부모 숙제지 전환, 저장, PDF 출력.

## 확인 포인트
- `src/App.jsx`의 DEMO_MODE = **false** (실제 AI 생성).
- `vite.config.js`의 base = `/esdm/` (저장소 이름과 일치).
- 관리자 비밀번호는 배포 후 바꾸려면 관리자 화면의 비번변경 사용.

## 로컬 미리보기
```bash
npm install
npm run dev
```
