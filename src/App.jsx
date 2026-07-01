import React, { useState, useRef, useEffect } from "react";

// ============================================================
// 함께놀이 플래너 (ESDM JAR)
// Joint Activity Routine · 공동활동루틴 플래너
//
// 배포(GitHub Pages) 시 변경할 곳: generateJAR() 안의 fetch URL.
//  - Artifact(미리보기): https://api.anthropic.com/v1/messages  직접 호출
//  - 배포본: Supabase Edge Function 릴레이 URL 로 교체 + API 키는 함수 안에 보관
// ============================================================

const ACCESS_CODE = "esdm"; // 배포 시 원하는 코드로 변경

// 놀이계획 생성을 템플릿으로 (AI/크레딧 미사용). 로그인·계정·저장은 항상 Supabase 사용.
const DEMO_MODE = true;

// Supabase Edge Function URL (로그인·계정·저장에 사용. 놀이계획 생성에는 미사용)
const RELAY_URL =
  "https://vdubgrxwijydwfabwpnk.supabase.co/functions/v1/esdm-jar";

// Supabase anon key (공개 가능 키 — 함수 호출 인증용)
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkdWJncnh3aWp5ZHdmYWJ3cG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MDk1ODgsImV4cCI6MjA5NzE4NTU4OH0.nqNO3vany3M6fzmG5BG6QVdvi8BW2UbhTDhxNnwvA88";

const RELAY_HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  apikey: SUPABASE_ANON_KEY,
};

const LEVELS = [
  { id: 1, name: "레벨 1", age: "12–18개월" },
  { id: 2, name: "레벨 2", age: "19–24개월" },
  { id: 3, name: "레벨 3", age: "25–36개월" },
  { id: 4, name: "레벨 4", age: "37–48개월" },
];

const LEVEL_FOCUS = {
  1: "수용·표현언어, 사회기술, 모방, 인지, 놀이, 대근육, 자조기술",
  2: "어휘 확장, 2어절 조합, 공동주의, 상징놀이 시작, 차례 주고받기",
  3: "구문 확장, 가장놀이, 또래 관심, 규칙 있는 놀이, 자기조절",
  4: "대화 주고받기, 이야기 구성, 협동놀이, 감정 표현, 문제해결",
};

// 통합 시스템(aba-system)의 ESDM 매핑을 레벨×영역으로 정제.
// 레벨4는 레벨3 항목을 이어받고 인지(수학·읽기)를 추가.
// ESDM 덴버모델 발달 체크리스트(레벨1~4)를 참고해 영역별 대표 발달 키워드로 재구성.
// 원문 항목을 그대로 옮기지 않고, 회기 목표 표시에 맞게 짧은 키워드로 정리함.
const ESDM_CURRICULUM = {
  1: {
    // 12~18개월
    수용언어: ["소리 쪽 쳐다보기", "호명 반응", "간단한 지시 따르기"],
    표현언어: ["요청 몸짓", "의도적 발성", "다양한 옹알이"],
    공동주의: ["가리키면 쳐다보기", "눈 맞춤 시작"],
    모방: ["사물 동작 모방", "몸짓 모방", "소리 모방"],
    사회기술: ["짧은 사회적 놀이", "눈 맞춤", "인사 반응"],
    놀이: ["기능적 사물 놀이", "간단한 장난감 조작", "정리하기"],
    인지: ["같은 사물 짝짓기", "같은 그림 짝짓기"],
    소근육: ["끼우기·꽂기", "블록 쌓기", "끼적이기"],
    대근육: ["공 차기", "계단 오르내리기", "공 주고받기"],
    자조: ["컵·숟가락 쓰기", "손에 물 대기", "휴지 버리기"],
  },
  2: {
    // 19~24개월
    수용언어: ["멈춰·기다려 따르기", "여러 지시 따르기", "신체 부위 가리키기"],
    표현언어: ["몸짓+소리 표현", "단어로 요청·거절", "사물 이름 대기"],
    공동주의: ["보여주면 반응", "함께 주고받기", "자발적 가리키기"],
    모방: ["소리·단어 모방", "동작 모방", "두 동작 모방"],
    사회기술: ["눈맞춤 유지", "도움 요청", "또래와 주고받기"],
    놀이: ["연관 사물 놀이", "소리 흉내 놀이", "혼자 놀이 유지"],
    인지: ["모양·크기 분류", "기능별 분류", "1~3개 짝짓기"],
    소근육: ["모양 끼우기", "블록 쌓기·따라 만들기", "통 열고 닫기"],
    대근육: ["자세 바꿔 활동", "놀이터 기구 사용", "목표로 공 던지기"],
    자조: ["혼자 먹기", "옷 벗어 정리", "이 닦기·정리"],
  },
  3: {
    // 25~36개월
    수용언어: ["예·아니오 대답", "2개 지시 따르기", "크기·색 구분"],
    표현언어: ["2~3단어 조합", "위치어 사용", "무엇·어디 질문 답"],
    공동주의: ["관심 함께 나누기", "정서 알아차리기"],
    모방: ["새 노래·손동작 모방", "또래 동작 모방"],
    사회기술: ["물건 공유", "차례 지키기", "정중한 표현"],
    놀이: ["연관 행동 잇기", "인형·동물 놀이", "소품 배치"],
    인지: ["철자·숫자 짝짓기", "5까지 세기", "순서대로 이야기"],
    소근육: ["조각 퍼즐", "선·모양 따라 그리기", "가위질"],
    대근육: ["세발자전거", "공 던지고 차기", "점프"],
    자조: ["화장실 단계", "혼자 손 씻기", "옷 입고 벗기"],
  },
  4: {
    // 37~48개월
    수용언어: ["비교·부정 이해", "위치·시간 관계", "여러 지시 따르기"],
    표현언어: ["3~4단어 문장", "왜·어떻게 답", "경험 이야기하기"],
    공동주의: ["대화 주고받기", "관심 끌어 공유하기"],
    모방: ["복잡한 동작 모방", "그림·글자 모방"],
    사회기술: ["또래 초대", "감정 표현", "순서 지키기"],
    놀이: ["역할 놀이", "상징 놀이", "이야기 놀이"],
    인지: ["20까지 세기", "수 개념", "글자·숫자 알기"],
    소근육: ["그림·글자 그리기", "미술 3단계 활동", "정교한 가위질"],
    대근육: ["공 던지고 받기", "자전거 타기", "한 발 점프"],
    자조: ["화장실 독립", "식사 준비 돕기", "간단한 요리 돕기"],
  },
};

// 선택한 레벨들의 ESDM 영역·항목을 병합해 반환
// ---- 한글 조사 자동 처리 (통합본 방식) ----
function hasFinalConsonant(word) {
  if (!word) return false;
  const last = word.charAt(word.length - 1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}
// 단어 뒤에 알맞은 조사를 붙여 반환 (예: J("케이크","을","를") → "케이크를")
function J(word, withFinal, withoutFinal) {
  return (word || "") + (hasFinalConsonant(word) ? withFinal : withoutFinal);
}
function Jro(word) {
  // 으로/로: 받침 없거나 'ㄹ'이면 "로"
  if (!word) return word + "로";
  const last = word.charAt(word.length - 1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return word + "로";
  const jong = (code - 0xac00) % 28;
  return word + (jong === 0 || jong === 8 ? "로" : "으로");
}
// 텍스트 안의 "단어을(를)" 같은 패턴을 받침에 맞게 정리
function fixJosa(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/([가-힣A-Za-z0-9]+)을\(를\)/g, (_, w) => J(w, "을", "를"))
    .replace(/([가-힣A-Za-z0-9]+)를\(을\)/g, (_, w) => J(w, "을", "를"))
    .replace(/([가-힣A-Za-z0-9]+)은\(는\)/g, (_, w) => J(w, "은", "는"))
    .replace(/([가-힣A-Za-z0-9]+)는\(은\)/g, (_, w) => J(w, "은", "는"))
    .replace(/([가-힣A-Za-z0-9]+)이\(가\)/g, (_, w) => J(w, "이", "가"))
    .replace(/([가-힣A-Za-z0-9]+)가\(이\)/g, (_, w) => J(w, "이", "가"))
    .replace(/([가-힣A-Za-z0-9]+)와\(과\)/g, (_, w) => J(w, "과", "와"))
    .replace(/([가-힣A-Za-z0-9]+)과\(와\)/g, (_, w) => J(w, "과", "와"))
    .replace(/([가-힣A-Za-z0-9]+)으로\(로\)/g, (_, w) => Jro(w))
    .replace(/([가-힣A-Za-z0-9]+)로\(으로\)/g, (_, w) => Jro(w))
    // 잘못된 "이이다" 같은 중복도 정리
    .replace(/이이다/g, "이다");
}
// 객체 전체(문자열)에 조사 정리 적용
function deepFixJosa(obj) {
  if (typeof obj === "string") return fixJosa(obj);
  if (Array.isArray(obj)) return obj.map(deepFixJosa);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const k in obj) out[k] = deepFixJosa(obj[k]);
    return out;
  }
  return obj;
}

// 한국 이름에서 성을 떼어 부르는 이름만 반환 (3글자면 성 1자 제거)
// 예: "민다솔"→"다솔", "김서연"→"서연", "이안"→"안"(2자는 그대로), "다솔"→"다솔"
function givenName(full) {
  const n = (full || "").trim();
  if (!n) return "";
  // 한글 이름이고 3글자 이상이면 첫 글자(성)를 뗌
  const isHangul = /^[가-힣]+$/.test(n);
  if (isHangul && n.length >= 3) return n.slice(1);
  return n;
}
// 받침에 따라 "다솔이 / 서연이" 식 호칭 (받침 있으면 "이" 붙임)
function childCall(full) {
  const g = givenName(full);
  if (!g) return "OO이";
  return hasFinalConsonant(g) ? g + "이" : g;
}

function esdmForLevels(levelIds) {
  const merged = {};
  levelIds.forEach((id) => {
    const lv = ESDM_CURRICULUM[id] || {};
    Object.entries(lv).forEach(([domain, items]) => {
      if (!merged[domain]) merged[domain] = [];
      items.forEach((it) => {
        if (!merged[domain].includes(it)) merged[domain].push(it);
      });
    });
  });
  return merged;
}

// 놀잇감별 전용 장면 (주요 6종). {main}=주 놀잇감, {sub}=보조, {child}=아이호칭
// 놀잇감별 전용 스토리 (15종). {main}=주 놀잇감, {sub}=보조, {child}=아이호칭
// 각 놀잇감: theme(주제), materials(맞춤 준비물), tip(막힐 때), songs(추천 노래), closing(마무리), scenes(7장면 스토리)
const TOY_SCENES = {
  기차: {
    theme: "칙칙폭폭 기차여행",
    materials: "기차·기찻길(블록으로 대체 가능) 여러 칸, 작은 인형이나 피규어 2~3개, 담을 상자",
    tip: "기차에만 몰두하고 상호작용이 안 되면, 부모가 터널·역이 되어 기차가 부모를 꼭 거쳐 가도록 길을 막아 서로 마주 보게 만들어 주세요.",
    songs: [
      '"기차 노래" — "칙칙폭폭" 부분을 반복하며 손을 앞뒤로 흔들어 동작 모방 유도',
      '"기차가 어디로 가나" — 역 이름 자리에 아이가 아는 장소를 넣어 부르며 어휘 확장',
    ],
    closing: [
      '카운트다운: "역까지 세 번만 더 가고 도착~ 셋·둘·하나!" 하고 종료를 예고합니다.',
      '정리 노래: "기차 차고로 들어가요~" 부르며 기차를 상자에 하나씩 넣습니다.',
      '다음 활동 예고: "다음 역은 OO이에요" 하며 다음 활동을 알려 전환을 돕습니다.',
    ],
    scenes: [
      ["기차역 만들기", '블록이나 손으로 길을 만들며 "여기는 기차역~" 하고 {main}을(를) 길 위에 올립니다', '{child}에게 기차 한 칸을 건네며 "여기 놔" 하고 자리를 가리켜 지시 따르기를 유도'],
      ["출발 신호", '"준비~ 출발!" 하며 {main}을(를) 천천히 밀어 굴립니다', '"출발?" 하고 3~5초 기다려 {child}이(가) 소리나 동작으로 신호를 주면 바로 밀어주기'],
      ["칙칙폭폭 달리기", '"칙칙폭폭~ 칙칙폭폭~" 리듬을 타며 {main}을(를) 길게 굴립니다', '같은 의성어를 함께 내며 모방 유도. {child}이(가) 따라 하면 과장되게 "우와!" 반응'],
      ["터널 통과", '두 손으로 터널을 만들어 "터널 속으로 슈웅~" 하고 {main}을(를) 통과시킵니다', '{child} 차례에 "슈웅?" 하고 기다리기. 통과하면 눈 맞추며 "여기!" 공동주의'],
      ["승객 태우기", '{sub}을(를) 기차에 올리며 "친구 타세요~ 출발!" 합니다', '"태워", "내려" 짧은 지시 반복. {child}이(가) 올리면 즉시 "잘했어!" 강화'],
      ["기차 차례", '"엄마 기차~" 한 번, "{child} 기차~" 한 번 번갈아 굴립니다', '차례 개념을 짧은 대사로. {child}이(가) 기다리면 "잘 기다렸어!" 사회기술 강화'],
      ["기차 정리역", '"이제 차고로 쏙~ 들어간다!" 하며 {main}을(를) 통에 넣습니다', '통을 가리키며 "넣어" 지시. 넣으면 "다 했다!" 칭찬으로 마무리'],
    ],
  },
  자동차: {
    theme: "부릉부릉 자동차 놀이",
    materials: "다양한 크기·색 자동차 3~4대, 주차장/도로 매트(종이로 대체 가능), 담을 바구니",
    tip: "바퀴만 돌리며 혼자 놀면, 부모 손을 '주유소'나 '세차장'으로 만들어 자동차가 부모에게 오도록 유도해 상호작용을 늘려 주세요.",
    songs: [
      '"자동차 노래" — "빵빵" 경적 부분을 반복하며 아이의 발성·모방을 유도',
      '"빙글빙글 바퀴 노래" — 손을 굴리는 동작과 함께 부르며 동작 모방 연결',
    ],
    closing: [
      '카운트다운: "자동차 세 번만 더 부릉 하고 끝~ 셋·둘·하나!" 하고 예고합니다.',
      '정리 노래: "자동차 주차장에 쏙~" 부르며 정해진 자리(상자)에 넣습니다.',
      '다음 활동 예고: "다음엔 OO 하러 가요" 하며 전환을 돕습니다.',
    ],
    scenes: [
      ["자동차 등장", '{main}을(를) "부릉부릉~" 소리 내며 {child} 앞으로 천천히 굴려 보냅니다', '쳐다보면 3~5초 기다린 뒤 건네며 교대의 첫 경험. 손을 뻗으면 "줘?" 요청 유도'],
      ["부릉부릉 출발", '"출발! 빵빵!" 하며 {main}을(를) 밀고 {child}을(를) 쳐다보며 기다립니다', '"빵빵" 모방 유도 위해 과장된 입모양. 발성하면 즉시 자동차를 굴려 원인-결과 학습'],
      ["주고받기 경주", '"엄마 먼저~ 이제 {child} 차례!" 하며 번갈아 자동차를 굴립니다', '"줘"·"여기" 지시 반복. 차례를 기다리면 "잘 기다렸어!" 사회기술 강화'],
      ["어? 새 자동차", '{sub}을(를) 꺼내 "어? 이번엔 {sub}!" 하며 놀란 표정으로 관심을 모읍니다', '예측을 살짝 깨 주의 모으기. 가리키며 "여기 봐!" 공동주의 유도'],
      ["언덕 오르내리기", '쿠션으로 언덕을 만들어 "영차~ 올라간다! 슈웅 내려간다!" 굴립니다', '대근육·공간 경험. "위", "아래" 언어와 동작을 함께 매칭'],
      ["자동차 차례", '"엄마 차례~" "{child} 차례~" 번갈아 굴리거나 밀어줍니다', '차례 대사 반복. 기다리면 즉시 "최고야!" 강화'],
      ["주차장에 쏙", '"이제 주차장으로 쏙~" 하며 {main}을(를) 상자에 넣습니다', '상자를 가리키며 "넣어" 지시. 넣으면 "다 했다!" 마무리'],
    ],
  },
  블록: {
    theme: "쌓고 무너뜨리는 블록놀이",
    materials: "다양한 색·크기 블록 10개 이상, 담을 통, 넓은 바닥 공간",
    tip: "블록을 줄 세우기만 반복하면, 부모가 한 개를 살짝 얹어 '탑'을 제안하고 무너뜨리는 재미를 보여줘 새로운 놀이로 이끌어 주세요.",
    songs: [
      '"블록 쌓기 노래" — "하나 둘 셋" 세는 부분을 반복하며 수 세기와 함께 쌓기',
      '"와르르 노래" — 무너뜨리기 직전 "와르르!" 부분에서 함께 소리치며 기대감 형성',
    ],
    closing: [
      '카운트다운: "블록 세 개만 더 쌓고 끝~ 셋·둘·하나!" 하고 예고합니다.',
      '정리 노래: "블록 쏙쏙 통에 넣자~" 부르며 색깔별로 담습니다.',
      '다음 활동 예고: "이제 OO 할 거예요" 하며 다음 활동을 보여줍니다.',
    ],
    scenes: [
      ["블록 모으기", '{main}을(를) 가운데 모으며 "블록 모여라~" 하고 한 개를 {child}에게 건넵니다', '손을 뻗으면 "줘?" 하고 잠깐 기다려 요청을 유도한 뒤 건네기'],
      ["하나씩 쌓기", '"하나~ 둘~ 쌓자!" 하며 블록을 하나씩 올립니다', '{child}이(가) 올릴 때마다 "또!" 하고 같은 동작 모방. 두 손 사용 유도'],
      ["높이 더 높이", '"더 높이! 영차~" 하며 탑을 점점 높게 쌓습니다', '"더?" 하고 3초 기다려 {child}이(가) 블록을 집어 오면 자리를 가리켜 지시'],
      ["와르르 무너뜨리기", '"준비~ 와르르!" 하며 탑을 과장되게 무너뜨립니다', '예측을 깨 주의를 모읍니다. {child}이(가) 웃으면 "또 할까?" 자발적 요청 기다리기'],
      ["색깔 짝 맞추기", '같은 색 블록을 들어 "같은 거 어디?" 하고 {sub}와(과) 짝지어 봅니다', '같은 색을 가리키며 "여기!" 공동주의·매칭(인지) 유도'],
      ["블록 차례", '"엄마 차례~" "{child} 차례~" 번갈아 한 개씩 올립니다', '차례를 짧은 대사로 반복. 기다리면 즉시 칭찬으로 강화'],
      ["블록 정리", '"쏙쏙~ 통에 넣자!" 하며 블록을 통에 담습니다', '통을 가리키며 "넣어" 지시. 넣으면 "최고야!" 마무리 강화'],
    ],
  },
  공: {
    theme: "데굴데굴 공놀이",
    materials: "잘 굴러가는 공 1~2개(말랑한 것), 골대나 바구니, 넓은 바닥 공간",
    tip: "공을 던지기만 하면 다칠 수 있으니, 마주 앉아 '굴리기'부터 시작하고, 눈을 안 맞추면 공을 부모 얼굴 옆에 들어 시선을 모아 주세요.",
    songs: [
      '"데굴데굴 노래" — "데굴데굴" 부분을 반복하며 공 굴리는 동작과 연결',
      '"통통 공 노래" — 공을 튕기며 "통통" 리듬에 맞춰 발성·모방 유도',
    ],
    closing: [
      '카운트다운: "공 세 번만 더 굴리고 끝~ 셋·둘·하나!" 하고 예고합니다.',
      '정리 노래: "공아 쉬자~ 쏙!" 부르며 통에 넣습니다.',
      '다음 활동 예고: "다음엔 OO 해요" 하며 전환을 돕습니다.',
    ],
    scenes: [
      ["공 보여주기", '{main}을(를) 들고 "짠~ 공이다!" 하며 {child} 눈높이에서 흔듭니다', '쳐다보면 3~5초 기다린 뒤 건네며 교대의 첫 경험 만들기'],
      ["데굴데굴 굴리기", '마주 앉아 "데굴데굴~ 간다!" 하고 공을 {child}에게 굴립니다', '굴러오면 "줘~" 하고 손 내밀기. 다시 굴리면 과장되게 "우와!" 강화'],
      ["통통 튀기기", '"통통통!" 하며 공을 바닥에 튕깁니다', '리듬을 함께 내며 모방 유도. {child}이(가) 따라 손뼉 치면 즉시 반응'],
      ["굴러간다 잡기", '"잡아라~ 데굴!" 하며 공을 살짝 멀리 굴립니다', '{child}이(가) 따라가 잡으면 "잡았다!" 환호. 대근육·동작모방 유도'],
      ["바구니에 넣기", '"여기 쏙~ 골인!" 하며 공을 바구니에 넣습니다', '바구니를 가리키며 "넣어" 지시. 넣으면 "골인!" 즉각 강화'],
      ["공 차례", '"엄마 차례~" "{child} 차례~" 번갈아 굴리거나 던집니다', '차례 대사 반복. 기다리면 "잘 기다렸어!" 사회기술 강화'],
      ["공 정리", '"공아 쉬자~ 쏙!" 하며 공을 통에 넣습니다', '통 가리키며 "넣어" 지시. 넣으면 "다 했다!" 마무리'],
    ],
  },
  비눗방울: {
    theme: "뽀글뽀글 비눗방울놀이",
    materials: "비눗방울 용액과 막대, 바람막이 되는 조용한 공간, 닦을 수건",
    tip: "비눗방울을 못 잡아 답답해하면, 큰 방울을 천천히 만들어 아이 손 가까이 띄워 성공 경험을 먼저 주세요.",
    songs: [
      '"비눗방울 노래" — "뽀글뽀글" 부분을 반복하며 부는 동작과 발성 연결',
      '"팡팡 노래" — 방울 터뜨릴 때 "팡!" 부분에서 함께 소리치며 모방 유도',
    ],
    closing: [
      '카운트다운: "세 번만 더 불고 끝~ 셋·둘·하나!" 하고 예고합니다.',
      '정리 노래: "비눗방울 안녕~ 뚜껑 쏙!" 부르며 통을 닫습니다.',
      '다음 활동 예고: "이제 손 씻고 OO 해요" 하며 전환을 돕습니다.',
    ],
    scenes: [
      ["방울 등장", '{main}을(를) 후~ 불어 "뽀글뽀글~ 방울이다!" 하고 띄웁니다', '{child}이(가) 쳐다보면 "또?" 하고 기다려 소리나 손짓 요청을 유도'],
      ["방울 잡기", '"잡아라~ 팡!" 하며 방울을 함께 터뜨립니다', '손 뻗어 터뜨리기로 동작모방·대근육. 터뜨리면 "팡!" 함께 외치기'],
      ["불어 주세요", '불기를 멈추고 막대를 입에 대며 "불까?" 하고 기다립니다', '"불어" 지시로 수용언어. {child}이(가) 요청하면 바로 불어 강화'],
      ["높이 낮이", '"높이~" "낮게~" 방향을 바꿔가며 방울을 띄웁니다', '방울을 가리키며 "저기!" 눈맞춤·공동주의 유도'],
      ["방울 세기", '"하나~ 둘~ 셋!" 방울을 세며 터뜨립니다', '수 세기(인지) 자극. {child}이(가) 따라 소리내면 즉시 반응'],
      ["방울 차례", '"엄마가 불게~" "{child} 차례~" 번갈아 붑니다', '차례 대사 반복. 기다리면 칭찬으로 사회기술 강화'],
      ["뚜껑 닫기", '"이제 그만~ 뚜껑 쏙!" 하며 통을 닫습니다', '"닫아" 지시. 닫으면 "다 했다!" 마무리 강화'],
    ],
  },
  케이크: {
    theme: "생일 축하 케이크 놀이",
    materials: "조각으로 나뉘는 장난감 케이크, 초·접시·포크(장난감), 인형 1~2개",
    tip: "먹는 시늉을 어색해하면 인형에게 먼저 먹여 주는 것부터 보여줘 부담을 줄여 주세요.",
    songs: [
      '"생일 축하 노래" — 익숙한 축하 노래를 부르며 초 부는 동작을 함께 하기',
      '"냠냠 노래" — 먹는 시늉과 함께 "냠냠" 부분을 반복해 발성 유도',
    ],
    closing: [
      '카운트다운: "케이크 세 조각만 더 나누고 끝~ 셋·둘·하나!" 예고합니다.',
      '정리 노래: "그릇 정리 쏙쏙~" 부르며 조각을 통에 담습니다.',
      '다음 활동 예고: "이제 OO 할 거예요" 하며 전환을 돕습니다.',
    ],
    scenes: [
      ["케이크 등장", '{main}을(를) 보여주며 "우와~ 케이크다!" 하고 {child}의 관심을 끕니다', '쳐다보면 3~5초 기다린 뒤 "줄까?" 하고 요청을 유도'],
      ["초 불기", '"후~ 하고 불어 볼까?" 하며 촛불 끄는 시늉을 크게 보여줍니다', '"후~" 입모양 모방 유도. {child}이(가) 불면 과장되게 "우와 껐다!" 강화'],
      ["케이크 나누기", '"한 조각 줄게~ 여기!" 하며 조각을 건네고 "엄마도 줘~" 요청합니다', '"줘"·"여기" 지시 반복. 주고받으며 눈 맞추고 미소로 강화'],
      ["냠냠 먹기", '"아~ 냠냠! 맛있다~" 하며 먹는 흉내를 냅니다', '"아", "냠냠" 짧은 소리 모방 유도. 먹여주면 즉시 "고마워!" 반응'],
      ["인형에게 먹이기", '{sub}(인형)에게 "너도 먹어~" 하며 케이크를 먹이는 시늉을 합니다', '역할 확장. {child}이(가) 먹이면 "우와 잘한다!" 사회성 강화'],
      ["케이크 차례", '"엄마 차례~" "{child} 차례~" 번갈아 나누고 먹입니다', '차례 대사 반복. 기다리면 "잘 기다렸어!" 강화'],
      ["그릇 정리", '"다 먹었다~ 정리하자!" 하며 조각을 통에 담습니다', '"넣어" 지시. 넣으면 "다 했다!" 자조·마무리'],
    ],
  },
  소꿉놀이: {
    theme: "냠냠 소꿉놀이",
    materials: "소꿉 그릇·냄비·숟가락 세트, 장난감 음식/채소, 담을 바구니",
    tip: "역할을 어려워하면 '요리사-손님'처럼 역할을 단순하게 정하고, 부모가 먼저 시범을 보인 뒤 차례를 넘겨 주세요.",
    songs: [
      '"요리 노래" — "보글보글" 부분을 반복하며 젓는 동작과 발성 연결',
      '"냠냠 노래" — 먹는 시늉과 함께 "냠냠" 부분을 반복해 모방 유도',
    ],
    closing: [
      '카운트다운: "세 번만 더 요리하고 끝~ 셋·둘·하나!" 예고합니다.',
      '정리 노래: "그릇 설거지 쏙쏙~" 부르며 통에 담습니다.',
      '다음 활동 예고: "이제 OO 할 거예요" 하며 전환을 돕습니다.',
    ],
    scenes: [
      ["식탁 차리기", '그릇을 놓으며 "맛있는 거 만들자~" 하고 {child}에게 그릇을 건넵니다', '"여기 놔" 지시로 자리 가리키기. 놓으면 "잘했어!" 강화'],
      ["요리하기", '"보글보글~ 끓는다!" 하며 냄비를 젓는 흉내를 냅니다', '같은 동작 모방 유도. {child}이(가) 저으면 "보글보글!" 함께 언어 모델'],
      ["냠냠 먹기", '"아~ 냠냠! 맛있다~" 하며 먹는 흉내를 냅니다', '"줘", "아" 짧은 말 유도. {child}이(가) 먹여주면 과장되게 "냠냠!" 반응'],
      ["새 재료 등장", '{sub}을(를) 꺼내 "어? 이건 뭐지?" 하고 새 자극을 더합니다', '예측을 살짝 깨 주의 모으기. 가리키며 "여기 봐!" 공동주의'],
      ["나눠 주기", '"엄마도 주세요~" 하고 그릇을 내밀어 나눠 먹습니다', '주고받기로 교대 경험. 건네면 "고마워!" 즉각 강화'],
      ["소꿉 차례", '"엄마 차례~" "{child} 차례~" 번갈아 요리하고 먹입니다', '차례 대사 반복. 기다리면 "잘 기다렸어!" 강화'],
      ["설거지 정리", '"깨끗이 치우자~ 쏙!" 하며 그릇을 통에 담습니다', '"넣어" 지시. 넣으면 "다 했다!" 자조·마무리'],
    ],
  },
  의사놀이: {
    theme: "아픈 친구 치료하기",
    materials: "의사놀이 세트(청진기·주사기·반창고), 인형이나 동물 피규어 2~3개, 담을 가방",
    tip: "도구에만 관심 있고 놀이가 안 이어지면, 부모나 인형이 '아야!' 하며 아픈 상황을 만들어 아이가 도와주도록 이끌어 주세요.",
    songs: [
      '"병원 놀이 노래" — "아야 아야 어디가 아파" 부분을 반복하며 신체부위 가리키기',
      '"다 나았다 노래" — 치료 후 "다 나았다!" 부분에서 함께 박수치며 기쁨 공유',
    ],
    closing: [
      '카운트다운: "친구 세 명만 더 치료하고 끝~ 셋·둘·하나!" 예고합니다.',
      '정리 노래: "병원 문 닫아요~ 도구 쏙!" 부르며 가방에 담습니다.',
      '다음 활동 예고: "이제 OO 할 거예요" 하며 전환을 돕습니다.',
    ],
    scenes: [
      ["아픈 친구 발견", '{sub}(인형)의 배를 만지며 "어? 아야! 아프대~" 하고 걱정스런 표정을 짓습니다', '과장된 정서 표현으로 주의 집중. {child}이(가) 쳐다보면 "어디 아파?" 반응 유도'],
      ["청진기로 진찰", '청진기를 대며 "쿵쿵~ 어디 아픈지 보자" 하고 {child}에게 건넵니다', '"해봐" 지시로 동작 모방 유도. 하면 즉시 "와! 의사 선생님!" 칭찬'],
      ["주사와 약", '"따끔~ 주사 놓자!" 하며 주사 놓는 시늉을 크게 보여줍니다', '2단계 동작 모방(진찰→주사)을 천천히. {child}이(가) 따라 하면 강화'],
      ["반창고 붙이기", '"딱! 반창고 붙이자~" 하며 반창고를 붙입니다', '소근육 활동. "{child}도 붙여" 차례 넘기고 성공 시 하이파이브'],
      ["다 나았다 축하", '"다 나았다~ 우와!" 하며 인형을 활기차게 움직입니다', '과거-현재 대비("아팠는데 나았다"). 함께 박수치며 사회적 강화'],
      ["의사 차례 바꾸기", '"이번엔 엄마가 아파요! {child} 선생님 도와줘~" 하며 역할을 바꿉니다', '아이 주도 유도. 어떤 행동이든 "그렇게 치료하는구나!" 긍정 반응'],
      ["도구 정리", '"병원 문 닫아요~ 도구 쏙!" 하며 도구를 가방에 넣습니다', '"넣어" 지시. 넣으면 "다 했다!" 마무리'],
    ],
  },
  엘리베이터: {
    theme: "위로 아래로 엘리베이터",
    materials: "장난감 엘리베이터(또는 상자와 끈으로 만든 것), 작은 인형·자동차 2~3개, 숫자 스티커",
    tip: "버튼 누르기만 반복하면, 부모가 인형이 되어 '태워 주세요' 하고 요청해 아이가 태우고 내리는 상호작용을 만들어 주세요.",
    songs: [
      '"올라가요 노래" — "위로 위로" "아래로" 부분에서 몸을 위아래로 움직이며 방향어 학습',
      '"숫자 노래" — 층을 세며 "하나 둘 셋" 부분을 반복해 수 세기 연결',
    ],
    closing: [
      '카운트다운: "세 번만 더 타고 끝~ 셋·둘·하나!" 예고합니다.',
      '정리 노래: "친구들 다 내렸어요~ 쏙!" 부르며 정리합니다.',
      '다음 활동 예고: "이제 OO 할 거예요" 하며 전환을 돕습니다.',
    ],
    scenes: [
      ["엘리베이터 등장", '{main}을(를) 보여주며 "우와~ 올라가는 거다!" 하고 관심을 끕니다', '쳐다보면 3~5초 기다린 뒤 "탈까?" 하고 요청 유도'],
      ["친구 태우기", '{sub}을(를) 태우며 "친구 타세요~ 문 닫습니다" 합니다', '"태워" 지시로 수용언어. {child}이(가) 태우면 "잘했어!" 강화'],
      ["위로 올라가요", '"위로~ 위로~ 올라간다!" 하며 엘리베이터를 올립니다', '"위" 방향어와 몸짓을 함께. {child}이(가) 소리·동작 따라 하면 즉시 반응'],
      ["아래로 내려요", '"아래로~ 쿵! 도착!" 하며 내립니다', '"아래" 방향어 대비 학습. 도착하면 문 여는 시늉 함께'],
      ["층 세기", '"1층~ 2층~ 3층!" 하며 버튼을 누르고 층을 셉니다', '수 세기(인지) 자극. {child}이(가) 누르면 "여기!" 공동주의'],
      ["엘리베이터 차례", '"엄마 차례~" "{child} 차례~" 번갈아 버튼을 누릅니다', '차례 대사 반복. 기다리면 "잘 기다렸어!" 강화'],
      ["친구 내리고 정리", '"다 내렸어요~ 이제 쏙!" 하며 인형과 엘리베이터를 정리합니다', '"넣어" 지시. 넣으면 "다 했다!" 마무리'],
    ],
  },
  풍선: {
    theme: "풍선 퐁퐁 파티",
    materials: "다양한 색 풍선 3~4개(미리 불어둠), 담을 바구니, 부드러운 매트나 카펫",
    tip: "풍선을 무서워하면 반쯤만 불어 작게 시작하고, 터지는 소리에 놀라는 아이는 물풍선이나 헝겊풍선으로 바꿔 주세요.",
    songs: [
      '"풍선" 동요 — 익숙한 풍선 동요를 색깔 이름을 바꿔 부르고, 마지막 부분에서 함께 풍선을 위로 띄우기',
      '"퐁퐁 놀이 노래" — 풍선 칠 때 "퐁퐁" 부분을 반복하며 아이의 발성·모방 유도',
    ],
    closing: [
      '카운트다운: "풍선 다섯 번 더 치고 끝~ 다섯·넷·셋·둘·하나!" 하고 예측 가능하게 종료를 알립니다.',
      '정리 노래: "풍선아 안녕~" 부르며 손 흔들고, 바구니에 "쏙쏙" 넣으며 정리를 놀이처럼 진행합니다.',
      '다음 활동 예고: "이제 OO 할 거야" 하며 다음 활동을 사진·실물로 보여줘 전환을 돕습니다.',
    ],
    scenes: [
      ["풍선 등장", '{main}을(를) 살짝 흔들어 "바람 소리~" 내고, 머리 위에 올렸다 떨어뜨리며 "어? 어?" 하고 {child}의 흥미를 끕니다', '과장된 표정·소리로 시선을 모읍니다. {child}이(가) 쳐다보면 3~5초 기다려 소리·손짓 요청을 유도'],
      ["퐁퐁 두드리기", '"퐁퐁!" 하며 {main}을(를) 위로 톡톡 치고 "{child} 차례!" 하고 기다립니다', '동작과 "퐁퐁" 의성어를 함께 모델. {child}이(가) 치면 "{child} 퐁퐁!" 하고 명명하며 강화'],
      ["풍선 주고받기", '손바닥을 펴며 "줘~" 하고 요청하고, {child}이(가) 주면 "고마워!" 하며 다시 건넵니다', '"줘"·"여기" 지시를 반복. 주고받을 때마다 눈 맞추고 미소로 사회적 강화'],
      ["어디 갔지? 까꿍", '{main}을(를) 등 뒤에 숨기고 "어? 어디 갔지?" 하다 "짠!" 하고 꺼냅니다', '사라짐·나타남으로 기대감·눈맞춤 유도. {child}이(가) 숨기면 "봐봐!" 보여주기 격려'],
      ["둥실 날리기", '{main}을(를) 살짝 위로 띄우고 "우와~ 날아간다!" 하며 함께 쫓아갑니다', '대근육·교대 경험. "잡아!" 하고 {child}이(가) 잡으면 과장되게 환호'],
      ["풍선 차례", '"엄마 차례~" "{child} 차례~" 번갈아 치거나 던집니다', '차례를 짧은 대사로 반복. {child}이(가) 기다리면 "잘 기다렸어!" 사회기술 강화'],
      ["바구니에 쏙", '바구니를 가리키며 "여기 쏙~" 하고 {main}을(를) 함께 담습니다', '"여기" 공간 지시 반복. 두 손 사용 유도하고 넣으면 "다 했다!" 마무리'],
    ],
  },
  "미술/클레이": {
    theme: "조물조물 클레이놀이",
    materials: "부드러운 클레이나 점토 여러 색, 찍기 도구·모양틀, 작업 매트, 물티슈",
    tip: "손에 묻는 걸 싫어하면 지퍼백에 클레이를 넣어 만지게 하거나, 도구로만 눌러 보는 것부터 시작해 감각에 천천히 적응시켜 주세요.",
    songs: [
      '"조물조물 노래" — "조물조물" "꾹꾹" 부분을 반복하며 손동작 모방 유도',
      '"동글동글 노래" — 굴리는 동작과 함께 부르며 소근육 활동 연결',
    ],
    closing: [
      '카운트다운: "세 개만 더 만들고 끝~ 셋·둘·하나!" 예고합니다.',
      '정리 노래: "클레이 통에 쏙~" 부르며 색깔별로 담습니다.',
      '다음 활동 예고: "손 닦고 OO 할 거예요" 하며 전환을 돕습니다.',
    ],
    scenes: [
      ["클레이 만지기", '{main}을(를) 손에 쥐며 "말랑말랑~ 만져 보자!" 하고 한 덩이를 건넵니다', '"줘?" 하고 잠깐 기다려 요청 유도 후 건네기'],
      ["꾹꾹 누르기", '"꾹꾹꾹! 눌러~" 하며 클레이를 손가락으로 누릅니다', '같은 동작 모방 유도. {child}이(가) 누르면 "꾹꾹!" 함께 언어 모델'],
      ["동글동글 굴리기", '"동글동글~ 공 됐다!" 하며 클레이를 굴려 모양을 만듭니다', '두 손 사용 유도. {child}이(가) 굴리면 "동글동글!" 모방'],
      ["쭉 떼어내기", '"쭉~ 떼었다!" 하며 작은 조각을 떼어 접시에 넣습니다', '조각을 쥐어 주고 접시 가리키며 "여기" 지시. 넣으면 "우와!" 강화'],
      ["도장 찍기", '{sub}(으)로 클레이에 자국을 내며 "꾹! 자국이다~" 합니다', '시범 후 "{child} 꾹" 차례 넘기기. 찍으면 가리키며 "여기!" 공동주의'],
      ["클레이 차례", '"엄마 차례~" "{child} 차례~" 번갈아 모양을 만듭니다', '차례 대사 반복. 기다리면 칭찬으로 사회기술 강화'],
      ["클레이 정리", '"통에 쏙~ 넣자!" 하며 클레이를 통에 담습니다', '"넣어" 지시. 넣으면 "다 했다!" 마무리'],
    ],
  },
  그림책: {
    theme: "함께 보는 그림책 놀이",
    materials: "그림이 크고 단순한 그림책 1~2권, 편안히 앉을 자리",
    tip: "책장을 넘기기만 하고 그림을 안 보면, 소리 나는 부분이나 아이가 좋아하는 그림 한 장에만 머물러 짧게 상호작용해 주세요.",
    songs: [
      '"책 넘기는 노래" — "한 장 두 장" 부분을 반복하며 넘기는 동작과 연결',
      '"이게 뭐야 노래" — 그림을 가리키며 "이게 뭐야?" 부분을 반복해 이름대기 유도',
    ],
    closing: [
      '카운트다운: "세 장만 더 보고 끝~ 셋·둘·하나!" 예고합니다.',
      '정리 노래: "책 덮어요~ 쏙!" 부르며 제자리에 꽂습니다.',
      '다음 활동 예고: "이제 OO 할 거예요" 하며 전환을 돕습니다.',
    ],
    scenes: [
      ["책 고르기", '{main}을(를) 보여주며 "무슨 책 볼까? 이거?" 하고 {child}에게 고르게 합니다', '쳐다보거나 만지면 "이거 볼까?" 하고 선택을 언어로 확인·강화'],
      ["한 장 넘기기", '"한 장~ 넘겨 볼까?" 하며 함께 책장을 넘깁니다', '"넘겨" 지시로 소근육·수용언어. {child}이(가) 넘기면 "우와!" 즉시 반응'],
      ["그림 가리키기", '그림을 가리키며 "어? 이게 뭐야? 멍멍이다!" 하고 이름을 들려줍니다', '가리키기 모델. {child}이(가) 따라 가리키면 "여기!" 공동주의 강화'],
      ["소리 흉내", '"멍멍!" "빵빵!" 하며 그림 속 소리를 크게 흉내 냅니다', '의성어 모방 유도. {child}이(가) 소리 내면 즉시 "맞아 멍멍!" 확장'],
      ["어디 있지? 찾기", '"멍멍이 어디 있어?" 하고 {child}이(가) 찾도록 기다립니다', '수용언어(찾기). 찾으면 "찾았다!" 하며 눈 맞추고 강화'],
      ["책 차례", '"엄마가 넘길게~ 이번엔 {child} 차례~" 번갈아 넘깁니다', '차례 대사 반복. 기다리면 "잘 기다렸어!" 강화'],
      ["책 덮고 정리", '"다 봤다~ 책 덮어요~ 쏙!" 하며 책을 제자리에 둡니다', '"넣어" 지시. 넣으면 "다 했다!" 마무리'],
    ],
  },
  악기: {
    theme: "둥둥 딩동 악기놀이",
    materials: "북·탬버린·마라카스 등 간단한 악기 2~3개, 앉을 자리",
    tip: "소리에 예민해하면 부드러운 소리 악기부터 시작하고 볼륨을 작게, 귀를 막는 아이는 멀리서 천천히 다가가 주세요.",
    songs: [
      '"둥둥 노래" — 북 치는 "둥둥" 리듬을 반복하며 동작 모방 유도',
      '"멈춰 노래" — 노래 중간에 "멈춰!" 하고 소리를 뚝 멈춰 아이의 주의·기다리기 연습',
    ],
    closing: [
      '카운트다운: "세 번만 더 치고 끝~ 셋·둘·하나!" 예고합니다.',
      '정리 노래: "악기 자러 가요~ 쏙!" 부르며 통에 담습니다.',
      '다음 활동 예고: "이제 OO 할 거예요" 하며 전환을 돕습니다.',
    ],
    scenes: [
      ["악기 등장", '{main}을(를) 흔들며 "짠~ 무슨 소리 날까?" 하고 {child}의 관심을 끕니다', '쳐다보면 3~5초 기다린 뒤 "줄까?" 요청 유도'],
      ["둥둥 소리 내기", '"둥둥둥!" 하며 악기를 치고 "{child} 차례!" 기다립니다', '동작·소리 모방 유도. {child}이(가) 치면 "둥둥!" 함께 명명·강화'],
      ["따라 치기", '"엄마 따라 해봐~ 둥! 둥둥!" 하며 간단한 리듬을 보여줍니다', '리듬 모방(모방 영역). 따라 하면 과장되게 "우와 똑같다!" 강화'],
      ["멈춰! 놀이", '"신나게~ 그리고 멈춰!" 하며 소리를 뚝 멈춥니다', '기다리기·주의집중. {child}이(가) 멈추면 "잘 멈췄어!" 즉시 칭찬'],
      ["크게 작게", '"크게~ 둥둥! 작게~ 톡톡" 하며 세기를 바꿉니다', '"크게"·"작게" 개념(인지). 가리키며 함께 조절'],
      ["악기 차례", '"엄마 차례~" "{child} 차례~" 번갈아 연주합니다', '차례 대사 반복. 기다리면 "잘 기다렸어!" 강화'],
      ["악기 정리", '"악기 자러 가요~ 쏙!" 하며 악기를 통에 담습니다', '"넣어" 지시. 넣으면 "다 했다!" 마무리'],
    ],
  },
  퍼즐: {
    theme: "쏙쏙 맞추는 퍼즐놀이",
    materials: "꼭지 퍼즐이나 3~6조각 퍼즐, 넓은 판, 담을 통",
    tip: "잘 안 맞아 짜증 내면, 부모가 방향을 살짝 맞춰 주고 마지막 '누르기'만 아이가 하게 해 성공 경험을 자주 주세요.",
    songs: [
      '"쏙 노래" — 조각이 들어갈 때 "쏙!" 부분을 반복하며 성공을 강조',
      '"어디 있지 노래" — 자리를 찾으며 "어디 있지?" 부분을 반복해 탐색 유도',
    ],
    closing: [
      '카운트다운: "세 조각만 더 맞추고 끝~ 셋·둘·하나!" 예고합니다.',
      '정리 노래: "퍼즐 통에 쏙~" 부르며 조각을 담습니다.',
      '다음 활동 예고: "이제 OO 할 거예요" 하며 전환을 돕습니다.',
    ],
    scenes: [
      ["퍼즐 조각 보기", '{main} 조각을 들고 "이거 어디에 들어갈까?" 하고 {child}에게 건넵니다', '손 뻗으면 "줘?" 하고 잠깐 기다려 요청 유도 후 건네기'],
      ["자리 찾기", '"어디 있지~?" 하며 조각과 자리를 함께 살펴봅니다', '탐색 유도. {child}이(가) 자리를 보면 "여기?" 가리키며 공동주의'],
      ["쏙 맞추기", '"여기에 쏙!" 하며 조각을 끼워 넣는 시범을 보입니다', '마지막 누르기를 {child}이(가) 하게. 맞추면 "쏙! 잘했어!" 즉시 강화'],
      ["짝짝 칭찬", '조각이 들어가면 "우와 맞췄다!" 하고 함께 박수 칩니다', '성공-강화 연결. 눈 맞추며 기쁨 공유(사회성)'],
      ["그림 완성 보기", '"어? 멍멍이 나왔네!" 하며 완성된 그림을 가리켜 이름을 말합니다', '완성 그림 명명(어휘). 가리키며 "여기 봐!" 공동주의'],
      ["퍼즐 차례", '"엄마가 한 조각~ 이번엔 {child} 차례~" 번갈아 맞춥니다', '차례 대사 반복. 기다리면 "잘 기다렸어!" 강화'],
      ["퍼즐 정리", '"조각 통에 쏙~ 넣자!" 하며 조각을 담습니다', '"넣어" 지시. 넣으면 "다 했다!" 마무리'],
    ],
  },
  "그네/미끄럼틀": {
    theme: "신나는 몸놀이 (그네·미끄럼틀)",
    materials: "그네나 미끄럼틀(실내용/놀이터), 안전 매트, 편한 옷차림",
    tip: "무서워하면 부모가 안고 함께 타거나 낮은 높이부터 시작하고, 좋아하면 '밀어 주세요' 요청을 기다렸다 밀어 상호작용을 만들어 주세요.",
    songs: [
      '"흔들흔들 노래" — 그네 리듬에 맞춰 "흔들흔들" 부분을 반복하며 발성 유도',
      '"슝 내려가요 노래" — 미끄럼틀 내려갈 때 "슝~" 부분에서 함께 소리치기',
    ],
    closing: [
      '카운트다운: "세 번만 더 타고 끝~ 셋·둘·하나!" 예고합니다.',
      '정리 인사: "그네야 안녕~ 미끄럼틀아 안녕~" 하며 손 흔들기 인사합니다.',
      '다음 활동 예고: "이제 OO 하러 가요" 하며 전환을 돕습니다.',
    ],
    scenes: [
      ["타러 가기", '"우와~ 그네다! 탈까?" 하며 {child}의 관심과 기대를 끕니다', '쳐다보거나 다가오면 "탈까?" 하고 요청(발성·몸짓)을 기다려 유도'],
      ["밀어 주세요", '그네를 잡고 멈춘 채 "밀어 줄까?" 하고 3~5초 기다립니다', '"밀어" 요청 유도. {child}이(가) 소리·몸짓 내면 바로 밀어 강화'],
      ["흔들흔들", '"흔들흔들~ 앞으로 뒤로~" 하며 리듬을 붙여 밀어 줍니다', '리듬·의성어 모방 유도. 눈 맞출 때마다 "우와!" 반응'],
      ["멈춰! 또?", '그네를 살짝 멈추고 "또 할까?" 하고 기다립니다', '기다리기·자발 요청. {child}이(가) "또" 표현하면 즉시 다시 밀기'],
      ["슝 미끄럼틀", '미끄럼틀 위에서 "준비~ 슝!" 하며 내려가는 시범을 보입니다', '"슝" 의성어 모방·대근육. 내려오면 "도착!" 함께 환호'],
      ["차례 지키기", '"엄마 먼저~ 이번엔 {child} 차례~" 번갈아 탑니다', '차례 대사 반복. 기다리면 "잘 기다렸어!" 사회기술 강화'],
      ["다 탔어요 인사", '"이제 그만~ 그네야 안녕!" 하며 손 흔들어 인사합니다', '인사 몸짓 모방. 따라 하면 "잘했어!" 긍정적 마무리'],
    ],
  },
};

const TOYS = [
  { e: "🚂", n: "기차" }, { e: "🚗", n: "자동차" }, { e: "🧱", n: "블록" },
  { e: "⚽", n: "공" }, { e: "🫧", n: "비눗방울" }, { e: "🎂", n: "케이크" },
  { e: "🍳", n: "소꿉놀이" }, { e: "🩺", n: "의사놀이" }, { e: "🛗", n: "엘리베이터" },
  { e: "🎈", n: "풍선" }, { e: "🎨", n: "미술/클레이" }, { e: "📚", n: "그림책" },
  { e: "🎵", n: "악기" }, { e: "🧩", n: "퍼즐" }, { e: "🪁", n: "그네/미끄럼틀" },
];

const DOMAINS = [
  "표현언어", "수용언어", "공동주의", "모방",
  "사회기술", "놀이", "인지", "소근육",
  "대근육", "자조",
];

const C = {
  bg: "#FFF6F4",
  panel: "#FFFFFF",
  ink: "#2C2326",
  sub: "#8A7A7E",
  line: "#F1DEDF",
  brand: "#F0768B",
  brandDark: "#D85A72",
  brandSoft: "#FFEDEE",
  blue: "#E8859A",
  blueSoft: "#FFF0F2",
  green: "#F0768B",
  greenSoft: "#FFEDEE",
};

// 센터 로고 (aac-maker에서 가져옴)
const LOGO_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHsAAACACAYAAAArkhalAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAA630lEQVR42u19eXxdZbX2s9a79xkyp22apkM6j+k80AlISgsyi0JSQBEnyqBXvF69Xj+FkwjX+Q7qvV6pXkW8KCRMCoJKpSmlgEJHOhcKLS2dh0xn2Hu/a31/7JNQoLZJm2LB7t9vQ5qcs88++3nXetfwrLUI3XhoIsFUVyfXT5x6+6xho6uLNXLAqjHCVqlLFwIpQVOwbtLz+r30xrbf/eTFZXWquoeIwlecObp8UDdei4lIilQrfvWxW1+6cGQFpdJtcOFASU/oxqwqTCyGVbt24sqffe+y11Opx85VdZYAwRnoTgCg7rpQorKSVZWunXH+iOklQyl9uMVPpn1pTWWk7cgz+bafk0f/W3PKk7a0L8kDLcGE4gHy0RnnXauq1KgqZ2D7G4Nd29goAHRi336fLM6JoNnxOK5gYmJlvHmat/1sjv43A2ZiZibrWCTp4mFjrhneo88oZpZEN973GbBPYDtgYimOxcpHFfecF2gGpMSeAYQERtHlk8iCYGENIemlZFrfgXrTjHO/rKqora+nM9D9jcCur65mhdJlwyfeXFE6IJbxgyBiDZESWENr6kTOcKsnsGUTeIHOHTzy+srisrNRXS3VgDkD398A7Or6egWgl44af1axicBX6VbTj5jge2md0Kuvzq+cmyAira+vP4Peuw12AmAmkmH5+TMGl/ScHQS+KNTpdreByLR6ST1/5Nh5n5oy+3yeP9/WV1efke53E+yqRIIVwBVjz7psZM/SaFI8YXT/lqpM8H0fQ6P5uHjEuB+pKldXV3e3+3gG7GOCXVsrAHhexZSzcjgCK9LtD18BGAGYHT7kt9l5wyqG3TKj8t+ppsZqdf0Zy/zdALsaMEQkFw4bM6pvLG9e2ksriLr94ROAgAFWIFAxMWX5SMXMW0f16jXZPHC1TSBxBvBTDfYtiQRVAs7Zg0d8YkxhT7XWWmTjmadCun0D5AcGqVQbppYP0pvOOu+nohKtra+gM+r81IJNc++4I1gCBMOKe3+cjZKINafqiTsCGFGkDaAMTqWaZf6k6ZMuHjLiXqqpsZrQM2CfKrATSJCIUNWAofNnDhqa1xakhWEIp+iZK4V+txBARJBATLETtV+Yc/mVQ/LyzjZfN1J9xjo/NWDXaq0C0Gl9B3+lNDc/5llfwXTKdKlmAXezkXFmg9ZkkuYOGCFfOe9D/yMqxfWhdX5m/+5msNsxLbhizJQC17dQZZJ3QZEemT+LKfhA5rBeM2HG2M9Nr/oe1dRYPRNK7V6wE5WVhoj0uklT5w0s6TE47WesAZizara7AD1eYlSIIKomoIz93IwLPnl234HfopqaM8GW7gS79jOfUQC4cMi4y3rl5WpaRQ0YpPoOiDSrBij7YaxvDWoroWObp+y/nexrnSN+d7TDkkFEDCSZ5qGFxcG/XPChLw8sLJw4/4EHbCUqnTPwnjzYzPPn21ygd1lRjyuNJ4DCCEKpZn279IUBEVJCRhVtrkFgLdq1gM2uBAJ1GGCBFTS7jCAIM2bhguGj7CUWgMKwSweTTeaioaOCr1941ROqOnUpLw0qw/Vy5sgeXVZ3icpK0/jaa3L9+BmfvHbSrCvIWnvM6xBgQEiqgM+ZhsIPzkVrUxPMnoMgJ3ybYxVECusA1hPojIkouvJCNKfSwBt7ETEGx2MsMDF5mYxOKxtSMKioeMIjG1f/fgebw6pqcIbGdGKSnVXhdN7IsRf2cmPwxdLxPsCKBfUoRvHcGYj0643i82bBGgcEhdFQboUAtRaan4vCubMR6VuCXhfMBmJRQCR0vY5rNZJpS7XY+VNnTf/W+Vc8ZsXGDLM9I+EnBjbT/Pl2cH7+8P5FxRdmbEb1ONdgEAIROD0KobkurAicHgXgnDhEAhgFLDGEDFxPYHvkgfJjEBGYojg4L4pABULm+PJJgCgZL5kM/vGs8yf8x0VX/9GKlC5lDhZMmeKeAbtLKjzBUMWVE2dePr73AM4EvuXjhEcVCiaC39oK9gI4zPDb2pAO0jAw8IxCSUCqIDbQlhQ0E0CYoa0+bNqDIQqvRJ2w4gkwvnUyQdreNKPynLuu+MgTIlK1cPlyf3Ei4aALYdUEwInKSmdxIuFoIuEsTiScrKX/nnTvusbwVWUi0l9ce/OzHx0+YUZzsskSsTneB8QscBiAc9k5KJg6Hgd/+yTMC+sRd1ykjUVEAAsGkyLtWfAF56Dw7Mk4vOhZ6NIXEHcc+ERg7fzWK6pwQEEsN895cOPqph83Pv7pJbu3P8BEuO3cc526JUsEOKopQIlEgmpra0FEf9VU0Pp6U1NTgwbAvu/ATgBcB8icAcOG/vsHP7p+dF6hmxQPDKZjXTzgbIrSAhkHMPE4TFMSUTB8o7CsiAaEgAkgCyOKJDNsQS6c5jbEFAiIQMogdI1YqqogwObG88zafbvR8OKz//eNFxZ9CcBuIoLcf3+4UNdVayNquaqiQs3VV1uR8HPiPeL9vzD1/PN7wj230Im6uwOvJZ1jfnvHI/c/A6AFBCQ0wXWok/cV2IsTCWdOXV1w59zL6r4484Lbg0wq8Jmc41HC2yn97dx+FQGxA0saxrmzrpXJks44SzgUVTjE8BBmuxyhEzKqHVWkYTU3GhdRNk8f2Llh+Wub/+trv3/4DwBeOcpbcqcOG3beleUjvzpv3OQRgwt6FveEAxBDFDjkedjutb3euGX1n+58rP5XB4EnE4kE19Wd/oB3FmxSVRBR7MHqBeuvGDN+UHNbq8AYPi7YChApfCgiyhCHEABQBSIWYFX4JgSSNZRwYoA8CxEBuy4EClcFCsKJlRsILAIQsy108kyr+Fi5Z3uyKZP+Q+OOVzQvGlsWM26vGPHYPjl5Uyf0HVg2vEcJkPER+DbwSBCQwlXACLEbjTDHInhg7Sp894mGf1jZfPC/qqurTUNDg33Pg12JSmcJlgTT+vf/0C+vvPGh8ty49XxrhM0x99F2NQ5VcCwKTfvQVArsuHDZATEhYIUCYGEAPuBbpK1C+pQg2r83ZO0mcJYPQSfhLbdH8lRUHGaJua5jHAceBF4QwGUD1zggEXiepxkbiIT8OjryGkqAiiiDgqKiQvPE+pe8Lyx/qP/mTbsO3KbKdcBpK+GdssYb67Ph0RETqsuLe0F8UXSCo6DIqt9A4RXkIXb9B8HnzoJXVoK2CKHNevDTGQTpDLwgg5QxaBlUisjFs9Hrc9dAYnFQWsCErNV+8quamNhCnRYvo83JZJBJpgP4gfXTmaClrdUeTrZpygYEIvN2T4Paw73ERETu4YOH9PyRE6KfHTH3t6Iaq01ol43ed/PoTLCBzPz5FkD+1LLyeREraFE1obTpccE2CkSNC//1vfAPHELBledBUxn4Tc0IDjRB29JhqDQ3CreoCOhVgEg0gszL22GfX4tIPAJVixw/G1rtrlUeAunoES4bgbJuXucWT2CM8ZMt9pLho2f9buLEc6iOnqysrHSWLFkSvCfBrqysNEuWLLEfGDHhovFlA0usl7GBwyYeKMQceyEzAI8By4Icl5F5dAm8vqWIDSmHiZcAfUreomIlVORI7zuE5obfw2UPAENBgPLJ6fFuPhSAASMtHgYUFsi0Xv2/9gRWPdXY2CiniJl16tV4Yxge1XMHDf9Uv7wCpCUAI8sYOY5eDSVbEQsUagiutWi59zEkt+8IfWEoRAUqFpK9Gd29C4fveRCxvQcgUSc08EDwzekX3mZViBKTVR5d1HsMgIhjjJyuqtw5rraqrpYcoM+0AYMnU2A1gLIRgnRh9Qpl/+M4iBxuwaGfPIzM2ZORM3EEnJ6FUCL4+w7DX7EZmWXLEWttA6IROJ5CKXTUT0f6iZICaoBA0a9HLy+0/07fnItz7PBopSGi4Krh4z8yoWdZr7TvB4b4xJMKIoBr0CPlIfnEUhxe9gKc/Hw4SpDDLUBbCnHXRRCNwIo9RrjmtIIcUEXMcdsjOe9JsOnOpUsDAAWj+w34Qu9YTA8lW5j5JGSMCFAg7So46iKa8cGt+0Nyg8OQXBeeAkYEIZvtPZKZNITmdJLDr0jQ0xTwY4HNVtUWuu7wyiGj+2bEV+ombWosgyygxLAxA0EYOSMBTGiOvaswa3bHouxnQ9EpN48VYCUlZtp5+EAagFoRes8ZaInKSoIqPj2tctqk0v7wfE+Iu2fnVBIoCQCFsQI3UBirIFWonnqgqeM+2kGlDqvfEhCYzoFtmWBIxIpgS+uBxwF4jbW1py1Z4q+il+2kQFP7D7q6IBqFp/IOytHJSpMeGZWirsVvT16Ss4X/AhgVsPogCDj7+854eT6sRqIRWnF4ny5bt24hEfRHdXWn7d5zVLAT2WY4I0tLB1YU95khmYyiu8Q6+7BFFVZEVdWKqlVVa1VUVE+5WHSwXkQhUAsiy2yEjRMIYK2V496CqCKmFMQQM4te2fgfi3e+tlrurzenc8rzqABWJRIMgC4ePeGTw0tKor71rCtMcpJ7kVVRqNoIcZDjRlAUz6GieI4pzsk1RfEcUxiNU44TEYc4yC6CUwZ8NrGjObk5xrquacoIt1lxYrGYKYrHyQEHIiod96BvLlKxIlE2QbywyF24atmmrz7e8A1VZaqpOa0tyqOh157h0l9fe9PamhHjKlpbmoUpwp5p54wd26cOGaEhbVShCGARE7KxSMwg4mB/KomtB/dhb7r1oENmYyqdRlFuDnzSkb1jeT2HFvZAcSQO38toJuNp4DAHxiBiw32eFfD5TSOp60gLouToYZdo8avrn/vjSytXRXqV3rd3z45Z5YVFl04fNHr6+UNGOT2dKKzniaeB+CQUEwOHjOFYFHszbfjFC8+89C+LHrmYiXeICuM0ToIc1Rqvzqrwyf36nTeuZ9/RmYwnysxQ6lSCkbP7nWWCkML4VnKiUdiIa5a/vj21bPerf1q/f8/9v1u+bOPuIHgNwP4j3t5zRGHPiWcPGTZz1rCKWeNK+l40oXcfUj8ITNJ3gkiogo2En3MiiRFVhcPGHjZkvvbofc/975q/zDriz08D+Baee3r4taMnfu6SSWdVjenRZ2y/nDwGM1rFYkfzAbzcsv8vf9mz7Rs//NMf/khEqfcC0EeVbK2vN1RTY79y7oU/+/q5l38i6SWDgNUJ2STHB5uUISwgFUBE8nILeMOB/Vj06vofJhbd//3mzJuEASaCFenYSgyzHBmBGlHY84rrp86qvXbKrAkDIjnamkqDDFPAbwLe1QoUEdHc3EJ8a8mjbYnG341R1R0Lp051Fg0ZImP27qU7ly4NRLXdV3bHFxSfN7Kk75TSoh579qvf8qeNyzfvS/prAAgzQ0TeMwGBtz8qZmIRlaH3z//08zUjJvY8mGoDDJMrnXuwAgPhAFFPJFJYwE+8umn7t35X/73n9+36YVay+MapU01ZaghddnaxTikrU9TWChoaaPmiRfyLp57iHv362drPfEappsYCyLl06KjEZ6su+tK8fkMoaEpqOspkOSzj7cpTVihcdmxTIOaan//b3c8c3P2J+666ytS8k3TAicpKvnPp0sDKOwXWMOPXV15pahoaBO8hTvpb4FswZYq7cPny4Nyy8ht+du2Cu/pEcwLft057/U5n3BECI1Arhfn5snDFM3tueeTeiwC89OKCBe63Fy6U+upq0HEYHUwEe/vtXFNXR/WqQkTaPz//E9/58NX/M3/QRKelpYXVNcRd9MlFRfMicX1+3w7vkoXfmdgCbK4G+BgWNFUDPKaykgCgondvXdfQoHVveo3vqYPetp8xEckdcy597EtVF1+cam2R47FH334xa63m5ebTLze+iE/V//xsJl726cmT3IXLlwdMrBJ2o+z3pfPmXVSeU3TRyD49ORV4haymtTntbX56y4a1d6144T4AaU0oUx1hcWWC5yypC8YPGTL2B/OuXFlZ0p8P+BkK2yd2iXEqhbE4N+54dfvcn//7MCbyRZXwd1IxcqSBRswsAEon9R1cCWtJQ8p3p48Aingkhq1Nh1I/WvbH61X12YaaGlPT0GCJSEUl/sWzZ/1nTcWkayvKyvJyYlFALaACIMweXTZiGD42c9rXfvrM0nqqo//HRJizpE6zhMe1CxufuHP4lR+rjTnGOr6YLu3Z2XSphvvs310ddwfY9dXVXNPQYK+beNaMaX3K8/yMJ9TFrAcrrHGj5sfPPLR5+c6dDY4xsCKSleiye6/7+C/njxwx15AHm26ztrmtIy5tmeC5ok7EYFZZ/6HjP1jzlQn9B4/+/O9++1lN6C6qI81qnrrZa1Zce/PUqhGt6WZRh7qYHOvw3f/u6r86wMz2FMOMsqE39SjIg4SJj66oSMTdCK/YvU0e3rzy5vrqanO2iKOJBIlK3/+46JLl11aMn6vpjO+1+WphTMZxjOc6xhrHMIyJBcZxMuSkk2nJA7xbZ1Ze8W+XXV5LdST11dWorapiIsJTq1bc8UZLE0zUnCnYOwGwiefPt4ij76iyfmf71ofg+C2uwtrp9qC22kgkQsv37liyraXluer6em2srlaqq5MFYyd94+ZzZpfZtn2+VXUD1yElgqMK1yoYAoJ01HeTQ5zUTAS2zf/IuPGfrh41/Jr5WaNOROjBnZsfXLr7lZ3RSNSIyBnAuwJ2orLSqCrdNPHcC0f165sXZDxLndCOpNSRkDTM2uJlsPXQ/gYFqLaiwjEPPGABDLp86pQrorCSVnUcUJhwyLL8lMJrCBGEGEoEUoEBkPEyXJqXp/PGjb9dAae2sdE21tYaAlLr9ux8VqAwxyjROXMcBez2XuGzB4yo7mPi8LVzsXylkIelUBg2ZkfzIWzYtO4Fyu6HooqPjRs3fnq/PoWSaVMYQ+2V+8cTR1cUviMGfkrO6jNg5ODc3DlEpHfffbejALbv3/30IT8Dh42eEe1Ogh1muFhGFxUNHNWj7BzxMkphcUZnjNswigUgQi72plJ20e7XUwDQo7ycAGBUn74ze8WjKlaV1UC4c3EIIQaDgcDXYYXF9OGxU/IBAIMGAQA27t6hB1NJOGxOayrQaQV23wULDKB08dCJnxrZs3du0nrW6SRpVykkHEBJHBiKOdFXfGAdE2F2ebkAQGFObj7YkKoDRwwsS0hJOU7m2jMMxzrhuogYtHiZmUf+/fDB1qZUOgPi04lgfJqDfctPf+oDyB9Q1vszua4LCcQEBuBOjOJoz3AJKYmqtnipPgAGKoCthw6FHBCrWe+WYIk6pzIAhCV9hLDwy0cqnSoCgEG9ewsAjCkqe45BsGEbjTNHZ56pFaHxxSXjzx4yssjPZERNmLfulIOdNdAYIKsWOdFoQW/XLVBVrMu+JBOzL4jvq7KSUYGxoe19PFXOClgSgAylUgEOu3gQANovPGT0sIKCnDjEitKZzmedA5sArRwx5oaxhaXsB55aDqVPOwE3AbAcym1AgfTLzdez+g2eCAC7tm5VAGhYtXLZ5oOHxUQcZgnCyo7OXFsNoFYQiZkt+5p2P7pmzTOqSn3jxQqA2loPz++RkwtVtXSmR21ng14omlg28PIoMTwIRwSdspbb39yuBTLWR7/cAhpU2v9aAHzXl78sqsrPvvz69qd2vP48uzlkCRbUOcKBgBEhESXFk9s2PwKgFQ0NvODFuywAqigbdG4Bu/CPSJGeOY6D11l9+p0/ZdDQotYgrZKtahO0kw/QiTOsrgyghqA6o9+QeRFgKF99ta2pqHAA+L9btfq7Ow63wHEYAXfOrRNVGBM1K3e9ESz88zN3ERGmfvvbDCIdU1LS++yBI4aLH6hlUOfuMzzDhrd/nyYdzxk25ksj4gWinh+4Vq2KWFKxJrCWrViW7GmPODt+Zy1ba0nURixZP5P2zhk5iucOG/0hFUFxPK5MhMdf2fz4n3fs2M6uY1SsdGaLMGoDuHFatW/f4280JVfL/febF7/8ZSFAr5xW+ekBvXv2apW054pKx/3I0e7xzdOoWA1UDNoDMX9f6t8ZUj4wL55fwJpsY5iTM2ytWFMeL8LlFVO+/cTLGx746cqVW+3ttztcV+ev3fH6pg+PHVlu4HdKrhwy8H0fa7e9vhyA1jY0mK8/8IDXp6hoYGXpkNpeJh/iUpSipgv3J8bk5uGAobw3IwV/R2A/svzZO3cf3LdwxoDhz0P1pPrMKoD9B1eNkUhkLYA2EUHt+vVh4YQxmwl0PgMadEKm2CEkfR/spTcCoPXr1kFV0aekpGjFrm1Ne5r3H+pVWLgVRER0bFdbVQlE6gdBZHfTwWHLXtnycwC+vf12prq6v5twq/PEpvW/emLT+mUAtnXTNfMAtLb/o2rMGPk6kZTk58dgAUsWlgnucYzAQAJEI3EcCnAeE9XfUlIiDQBWbdmyetWWLUMApAFkTuD+cgG0AQCdxoT+UwI2EYGIttn77jON69ad9CY27447WoPbLFMdYcGUKeb8O+/0VbW8vGfhhyE+AsAcz9pXAGIDjkQjmDps+AU/W7MiWtXY6FUSOUtCol8TAQjuu69r+051tTrGtAW33fZ3JdEd7mwikeA777ij2754cNttDmprxRgj2X5iBZ+bNn3Fd664YqhkDqsjEQqzXccWKkuKqGU57Lj8Tw833Hv3mjUfDQMDWUZqbS0DQCOAxsZGrF+yRBtCR6ITTS9P/WadSCS4qgtsmH3r12vNKe621C7J0az6PWmsATRlfx4+pbDwIx+fe96FH58weXo8sALrsZKB7xAc0eNIN0HVR8wYu8cn87MXlv/hN+tf/uc/79z8Bt7KNX/TgmfG1845x6lbssT+ja2vE1pQqnpc++OkbmpG3z7fv3r6zEvyYUpCSTxxTe6wyQwvKVmd8YNok5ecPrmsT2Rgj2IEqZSKgowSAhaACJ3pnwYSiAqiHBVE4rxx7wHdtG93SyQWeSnwbLKgKG9TKpN69ZG/vMgPrV/77L4geBYADDE+fNWVf5O+ZO2AXVY5e8Z5Iytm2cCDttfwyhHBw46fWVj93LXbdm7/+Z/+dE97J8lTAva/X3Kp/uPc84FkM2DoiIZhb5N9PYo+0KOtYwmTF0KA2CCTTjOY2RWDNlfhqEUk277yWMtKWOFYghLDpwARtdYxjkHUBeAA1mRDfYpkWrD24EFs2LFt/ZPrN9537+b1/wYgmSUpvptSTqqKigEDin/61a9snjl6TE+0tmW7sdNft1CYsa8tg+/df9+V377vvocbamr4VKh0Z2a/AUulrWV2Op3ulmL79uauqspM5LQzkQMWRC0AcDaefhzXSyhblCBwlCFgkw5U1ffA5It29FAixJhxVkmRc1b/3mMuHz/26zWv7qx+bMO6f5hTV7fEMLdXnZxygyyRSBgiCr798QXnzxhQ3lNaD2YQsIGVY2p81iAoKeoVrRg45AYieki1o/9n90bQbEjZZCYiw3zSJ4fN4oxh7vYOBO33SESGiQ0RO0rk+KpO2veRammRYgTB5SOHjfvqnHmNd1542X9akd5ZivQpT4XW1tYqAEwfNeqjFI2r9azjsTiiOMapTiCIIp3WmeMrpk4bOLAPM9vEKaA68ymbuvYuW0NMBIccTkvMafKaZGAuyVfOnXXrNy+5sFFEKpjZnsoB69WAAZHMGzVqxpDS4ouRSSspm84UQxIZQialQ3r37DV73Ljv3q7Ktacgfv++yhgpKZh8ROFyKhDmdJv3L+fOHf2diy55UET61avKqfrO9YsXEwF69XlzPzOgvJT9wBMYDiflHC+MywRPAjakmD1hwofrgCJzCvqpve/Sg6wSts4gg7RQxLa2+l+oPGfk52fOeJCISDWB7n6ICYD5vPOCGf0LesycXHEZfKsQMW9au8c+jChgiJBKytwpk+M3fvCSGSKC+upqPgP2sax44uzGpGACAhHXpFP+Fy/4wPSL+w/899padPtDrK2vJ1Xlj17+0X8ePWhwoZ/KiIPQYe6MMqbQsIUNRIsLe1DVhEm3AEB1fX33WuPv+xAhMVK+Z/rlxPTm86quvayu7vPZxEi3RNISiQSjuloGDepTPmP4qC+Tr0JWWbswb9hmJ9UpwEgldfrQEWdfWjmlFxHt786I3/uf5UECdRyWVErmjR5evOCcc24jIu0u6a6trSUi0s9f9ME7powbrTaVVHLCuaRdqR4kMMCGrJ+yg/v0Lpw7ZsYtlHVhz6jxYxhpRzbeYhU4QvCVKQZ1qvr3+zyAXtX19SdtAFVXVxvDbC+YMOWsD06bfZ14SQ0Ipj2K0/nAJ2WrawAPyiDFxGEDP6lApDvjA+8/A01CwqTJ/l+IoVAQGZZAglnlfXuc06ekkoi0srLyZFwxqq+vh6jGP3/1Vd8aVN5XbdpTk+Xktc8Q7dyenR13BYVDzMik7aShgwcuuPiyS4kIicrumSv6/jPQwPCJkTEMjxmWQ33KADTjo39BDz1//KTJAFBbVXXCn3PXggUOEdmvXnXVP5w3fvQcP33YnjTVJ7tIgiDQwrwe+PDZldUAtLax8cyeDbT3JhMRFUuKIEpi4wY2xmpz1Fo3sIGIiEXYKtOQQ+N79x0GACcKdSKR4Jt/+hP/I5WV/Rdc+sF/iTKEMr7pLgK7gAxSSR1d3vviC86ZOoCJuiWi9p4GW1TEAdlYNMaxnDzjxiJOE8js8QOz37OmTYxxYnlOPCeXoxFXA1KxYjUGHgfARW2t7eq+nQC4trYWItrzuvPnLSov71PsJX2QiRC6qaCUiSiwaSkv7VVw/uDxX9ase/d35XopBEYNAghcqI1E4yZjBev2Hdi5Yf/+VTsPHViW9LyVr+/bBReOlpX2jZDhqkE9elSN7V06eVxJcYQijEIj+QDIsNEugk21YQrT/u8Xv7DwAzNnjPSbmwLDxpH2jsbddPhK5FhC5ZRJH8A9AKqr5e8KbCIgEA+RaI5NOxGz9OWtrz2y4aV7f/zcc9/Fm6SJI441APAoAIzq0eP8m2fMrq4aMvrafcZxAagV25VkDWc7P9rvXHvdrz523rwP27aWgJQcpe4FmhShoZZOy+iB5UM+f03NZUT0WH11tTmZ1Od7CGyCBKqxeI7uPNxmvv/ckw9899mlnwLQTCBI/f2moaHB5PXpQ3uamwkAmgsKtGz3br3mwQe9jQcPPnnr448+WYhHvzVt6NCpAHzqZGAlkUjwnXfeKUSE79908w9vueTya5wgGfjWOkSnJrfCSvDIk7ycns6cEeNu/k/UP1pdX39Sqc/3DNgiVmPxfF25dx9//6k/fOwX69b9sp2GhKoqOFdfHViRo656XbzYqfnMZ/iW6mqZU1e3ddErr2w9wr475gpbnEiYOXVfDwDt99+f/ex3Pn3RRdc6Nh2kRR1iB84paKarbzJ5HPhtOmHgwDlTyssnE9GKkxkFSctuuPHpWQPLz0mnU8JE3B0SGDajC2dtdrZZ3tFUmXBYFxZAEHeidlNbi/nkL+753rN79nwp23ZTs6pVAEQ/PnXq+DETJkwe0Ld/T6tW/WTLhnsfeXTFoq1btwMhR23Rbbc5v37sMVq4fHnwV8CmRCJBVQDP/fodgahg0pihwz5/Wc3vPza3aihSLYEv1gHiYNhsk/zutk1CsBkBLCNwY8XOTx/77Tdu+OEPv7p48WJnzpw5wd8M7CPBFArBJigstbfiOBE1JvCMAzcQqLHiOTH++K/vXfbghk1nv7hggTt14ULLRCKqqPvo9VfOmFBx25i+fSb0LyoCHBcgIPAyeP3A4date/c9dM/jjz54z+Kn/4iQbw5mhrXWoLHxLXrRzJ0byJstLAu/cf31//yhynNvGjWgvIdta7aiat7NsRBWRKK5ebxu+/a1Y2+48SxVTVP7FNu/hRo/kv5AZLPzNQmOhPncEykzsRx2QbawEosW0N2rX9jy4IZNF2V7odmsROc9fOedd15QUXFrTjwOBFaCwFP4vmbVIQ0uKcob3L/0Y+MG9P9YTdUF6xpXrly2cse2H//pxRfXEZF3tHVWfdZZoz48r/KSsYOHf3JsWfkoQJBpPizGsHm3538wESOTskN6l42tu/pjFxLRw4lEwqmrqwvedbBJjxj7QISIBzhsOuZsdNmRPWIzJVHEolF5vanJ+d8lz/yAiFqmTp3q1tfXCxHZ//2HW39yxexZVyN1wPPaDjjEccYRljGJIuNZpUxSeufk4JLZUyounjmu4pXdBz61c+++HZkgePHAwUN7Lpl57vPPrlk+0s2JDo5FopPKinqMGFJaakCATbcFnooxDnO3b85Ex+0HQ0TwrCCeF9fpFSNvBPCb2tparaur+xsaaAQENkCyuADclkFOICC2sKSgoyRuQkUUMiuPNhqJQFArirhjfvvKusN/2bPnIVWlhTfeiJqaGvuVmqtuvGZe5dVobfGSliLGicOIviVrwKFVSwoY3waQZl+MYRlW2MMZ1qfPQDAPzAaxb7lw5uxsE3MBMh6CdCqwoRZxImpAqsfXUJpdaBS2/DoekBoEoM5FWA28NhlWVvaByuFjxhPRqmqgyyMq+ORVOIEZ8DwfmDQNhTffDPfCDyCZbZRj5J3ryQjgC5CKRBBYe9Sm9SyAMWIlUNq67+DdBLyx8MYbnQV33RUAGHjB5CmJeG5c0l7GjagJp/nSW7WIEiAksCxQAhxymK1xPLGaaWsTr7Ul8JtbAr+1OfCSzUGmtSXItLSJ7wWqIMcBsyMhSy+go333sIEQKUPIgR+NwXNdWB+gtJ8dMqPhiMlsB2VLgLGAZRden74QdnA8zJgIXpCRoeUDcNWcOTcAQP0JcNT45FS4ImAFBRYcy0Os8hxwXgHi06aAywZAfIu3CzURIfAD2EnjkXPTAvgjRkB8H2/fC1UBN2Kwu6UFz6zesFMBenbTJkNEesvFF4+eNGxkGVJpNcYQsqOj9ChbQegdhJkoJQthH0wgQ8wMdojYIbDDIMeAHMPExKAwE6UQzqZK/6rdnP0gY2D69YM5ayrMnFmQcWORdooQtHcW6djOCGkoaORQ5M6aDYwZCSvAcW0BIYZaTBo18ioAPRAyWendAxvZL2IVbiwHNi+OwAbwDSFa0AsIGPbtnRZU4cUcOLPOApeUwp0+DZbeWTAgpAC5Zltzk/9S04FGADp5/HgFgPHDRpxbmJev4gcnQI3tPgOrPQcNUiDwYV/dhmD1JqT37Af16Y3o7KmQ0p6wIkC2s5QrCnJdmL6lCABoWV8YJw6VY7twjjJLJh1MHjq49z9ecvmlVFcniUTCvItqPBv7Z0LgpWG8AGwMHCX4qWYQC/jtoq0KkAGTASvgOBGADd4emlCoAIasyI4UsIKJMXvsWAGAicNGRJFtr/G3PFjDll9KYf9VhyyclgOIrt0E/0/PwFu7Bm7EZPfl9s1K4VgBBeHDd6xCIR1r8K/WjTBDfJ/jeVGdNn7MFwD0rK2t7RIB44TBVgBWBQYMGIZNtcJ7YUUYBNm4Bf7OV4Eoh5GRI99nGE7aA298BQqBv2Ez2Ld4R3pQFVBGyrPt21bHUVSYLyBFcDrk7LJ6XCmci+IQgaNhlZKzdx/szl1hHCJr4AkzrPUQ7NoDVkWw+w1kJA2joXYL6OhkpqA9LZ9u0xmjRk+4YMyEoUQk1V2gV3XJGpfs5B0C4LkEiuYgaGoFOy6izMg8vQQHX3kZvO8AcjMB4BhYCmCOVLaicBxC6pmlkC0bobt2Iy/iQN/RXDh8j+u4grBvfcex++B+M7Ksz9+8jaXNkiJYwsiRUDgjpaOnueuGo7FU35xIqAo2BplXtkD27gFamhCFE7aRgoahb5F3yCurwHcVlMno4LL+Oq9q5k1/XL/6xfr6enTW9++ybCgBygSkMqBxoxCZPh2pjAeCIKqEnFe3ISfVAnZCi9o9SucqIiCWTiP66g7kBUe3xpVBQICI6xQB6CWq2PrGGwQAqze/3AZRuKdBOj4gwLoMEQb5BOEwikggsDDebo2oKhiKiATggwcQCQI4SvBcA58YbjIAO+8shjPCMOLAAzE0oHEDBnwcQCkz287iyF3WWFkV7jAjtWEn3AsugFtzBVKxOExbMyIOAEPwWOAbwB5l1QUGgFFEHALIhlPv3/Y6AhHgS0ks2nNMPH+WQtHQ0AAAeHXv7t/sa2kWww7r37AM21EKw7oOIMMHI9mrByiVhut5cMQDkx8ab/SWECPCXuuAy2G7zoA8RJJtYMvwR41EqqQfxL4tbUoEVgYZh+Al7Xljx+p3brhhlqqGdOZuB1uPCB64LuK7dyH51GLEp0xHfMENaDtrOppVYdM+XGFwB2H/7T60AZQRkELIwKgDBG+N/hklWOvLoIJCnT2mYpQCVByPq6ryfz744Ko1219Zj9w4i5UuZyK6a3SPT4ADgpv0kDnYgtxJU6DTp6Otdx+kKILAtxDfD7+bSNYOCTM85FtY30daBEGsCMHw0XAuqASK8+C8sQuG3qrvLAkIFo4QMoEgkpPDQ0rLvgbA1HaScWM+NWXqJwYUFQ4MgkC7VHapBBMR2O07YPv3R7S8HJHRFTDl/aBJH9h3GMikALIgE1pYRARlwIBgDcNYgDIZpEkQlJTASaWzLEuGUYM0icaiORwQDoxZs+qBF7//fUJDA77+9NM214nsnzF6bHV+LBqkJW2YGEbMW/xtgoYLCwZ+2ApKHII4CjLENhBSKLidDdrVsHfYQI/gEENb2+C3tSEyugLRIYNBvXpD84qgkQhgDIQZygRxDCSaCykuhpT1gzN8ONyKsXD79UPwxhvwV66Eyz6ONsiBSLNTvsEGavNikb7PrV3zzA23fv6V6upqs379ej01YCMcdk6qsC9vBw8rBxUUgHv2gkyqgI4YBInlwPMCmGQagWdhgwCBtbBWwJ6PwCXYfoMQveACaGsLnN17oW74FEkJlsARiG0JgvF/WL1qRX9rt3zmRz/iV+vr6dJvfGNDaWFRz2njJ8yIqgbw0uo5REaZGOFeSUrwKFBlKzGOsBvPY2biVhFyHJed3Fw27NmM9cghp8uZ2PbR20qAMQTT3AR/x3ZoQS5MSSlMr57g/v1BAwaCygfBDBoMHjwEzuDBwKCBcPr0hVNQCA0EbS+9BLtpPXKgIJh3aMT2gIxSNqQe+FJcUsKeOP7jf37+t+vWreO643R/OqnYOFuCOAynZS/8X9TDua4abr8BiPgGUj4UVD4UOZk0goN7kNl7AOZQMyJpH9YlSH4h3H594PQbgPTTz8Fu2AzjuoDYkDHKFnFRBH4KU/r3w3XTZny1pqHhUYcZVFPTPhz2nyI5OU2XT5/2/8p7lyDuJyGeFdaw8bEa48TdGIGMefX1Hd6abTueOphpe/D15qZXekaj/Qsi0esvnDh+bklhETKZDMxJTI1WBch14CZbESx7AVq+FzSkHKaoGMYxgPPW+IcA0FQbvB274L+2DW7zYUQ5BNR2gkATqBoTWJ3Qf8C1AG5j5jdwnFKhk5Jsy+GgcY0QKJlCeu0mBHkuIv1KYShsGqmOA5NfhEifMjiDBkGGDYU7ZAjcfv0gBYUIHnsSePL3iEaccDVn/c2wLM7AAmw00KHlA0uXb93ivdbcsipRWSlzPvEJZebg8eefe+pApvWPERMpcdXtG4/GYq4bYwXzvpYWrHttx/4n/rLy3m8+8tB13/z1r37wm2XPrmh8cflrjz//lzUPL3v2nuZDqR1TJk+eXZDjxvwgwMm1ECCAIzAQ4NA+0PbtSB/YB7+1GdrWDG1tgRw+BPvGLgSvvgy7aQPM9u2IemkYh97sGduJzhRETCbwbVlprwiTWd+4Zs2qRCJhlixZIqeEvEAQCAlI3NDUEx+BL/CHj0BkxgxEhpSD4rngI25dAGjaQ2brJmDxYjiv7oDmxUESNsNzLHXEnH124IjARwo5OT3kifXrufr/fnldG9H//cPQodEfvvyyp/X1nJ3ZiTElJX2uqJo7ZcSQYcUHDh3G6pfXb77nqadeAXAg6/ZwY20tNzY2AlVVqK2tBREF3/7Edf/0j9XV36MgCFTUMXpiOfjQ+JPsNCOGhQMOAqgGCBgdtYSiBFfDRj/W5VArZHu3EwAjAuHjlPEroLDWLcg3jz+78i+X3Pb/ph+v29LJgZ2lDtGRjXRIgVQAz7jIlPaAU9YHkeKe0KgDBAIcbIXueA12325EFeBIBLA4Zl80BUA2kEhBgTy4fsvrH73nZx9JA885zJgt4vSurtb6+nqlo0wCIiKICNfW1mL9+vVUX18vzKzZtGqWY1aXs/pH/7Nx/JABZZlUWhwwK51oKZh27K/t/jZ1NCXScI8/IsWrfy3n0BkfH6IximG/n2q74Wf/ddYjjz+94VgctW7noAkpiEKGivoWsD5UvY6vwUSwbgRwI+E6ttJRF3W86J2I1ZxYMT204SX57lN/+Obzu/bUAggcZjx5zjlOI4Bdra1UNmRIeLW9e2VXaytdc2mezrvjLRNzCwA0Z6WdmFkfvu32xg/OmVWZbmqxESETZrtO3w4k1J4sEg7cvHzn54se/59Pfvs/bjkWR63b2aWuhHO2PRY4EQUhAsu5Ya9SAtIMGLFht4FwOGanljErQGzIT+6VD1eMwpj+/b/6m5fWT/rZM0vu2dx86OE5S5Z0UIxoxYqOaBUALFwe/n5uxej511dM/hefjXzqvnumE1GwfOFCR1WD0pKSP0NQ+Raqy2l+GAEyJOz6GZ05bMwlAHKrqqqSf005dDvYNssmdTQMqAgAx3oQCof+xGy7oqM3w6+dfbhKsG6Mg2QbRsXjdtTZsy++ZOjgi1fs2PGX1Qf3PvyXnTufe+bll3cewXzRswcPnjy5rPSyy0eNHzG0d8/pg0pL8cLGjbvCXN2bV24+cFgglCUZKE5vuQ6fKxEQUbAN2oKhfcvKE9ddfx0R3ZXdmoJTDnY2JwCTZXhodipf+w5ojqAVdNU+ICg8MGJgeH7GBLZVxpYU6Ni+U87yfHvWtpYm7G5pkdZ0mhjQglgO+hXmc3l+LkAGSKcCaW3hQ+mUbd/PO+6bj1A02bJb7ZbnkV3aStnvEPr/4QSG9ljeiS0rzTJ5PVWKRSM6Z8K4j9b9Ej+uqq0VHIWj1u1gt9OGbQd/WN/y+xO2crPvi4iEbSmI4CDKac8CmRZxmWV4TtwMz8/jbCiMoApYsTblqUfCCqIccrg5adsAaGAtLV+4MDR2OobLUXY4nXZL07D2ZIjizdEVIAl54YqO0VddfS7tDJkwE+kapJI6prz/1FvnXzGaiDZUV1e/o53ne66K8+0UByYCM3MAOGlrKe15mspkNJXJaNrzNGMDIwTHELMDKAyhDcFKAH5jba2ZMmLEKc2kKCl8WA04sArfsmQsW9+S9ZVEIJTtqXIyxhoBQRDYkuJe0ekDhn8JAOqP0nznfdNAh95Uy3RU100BYoIvPra1NS9/NxalikiECW5OhOE4BmrQUSYT+ICX1jQCAdg4J2khWFXjBGmdMGTYZaW5ub0B7Hu7oebQCe6h7y1dENoMUcfQ9qbD+szKlWsA4Ed1dVpVVdXtdpiI1YgTEeTlm2RLEq9t3XnAN7z81Z1v+ApCQY+CwmInOmZon9IehUWFBsmkeJ5PbMwJ34thQ4GftCMH9uv11fmf+CAR/fTthprDElEgAMHi/dcpi0DkQzUKD9CoQ+aF1/cmn9y1ayUToSE027sF7HbjyxOrsbw4tbRmzO8WLVm7ruXAV+787x8vxTtLiovqFiyYNLxn79vPmzSmqrSwGEFrUsQhDkdjUpcXta9APBLRUcPKbwLwk6raWou6ug7p5p1Nh02YdKT3p1SrAwUjrp6FNVi5f8+vAOyz999v0I2diJQAK4HE8nNpw679B7/3+GNXX/Otf51553//+DECmrS+3qhq+0lEdDixcOHia79555zb7/3lh1a/un2nk5fLFr4YObFpsq6wkUxKxw0fPGHB3LkziQhHctR4TdOeVtH38XwrdaBi1Yk4ZtO+A5k/vLbxm0RAbU1Nt+5dVlXc/Dysfe3V/V/6wQ8v+Pr/3n2/Y0yrJhKsAFFNjSWi9lNVleqrq42q8sLfPPHI/C99ce6ytS/tiEcLOaNyQmOYGAzr+9KnZ5H5wKyZnwCg9bfc0nElbm5u/b/D6bQaNu/TnVtg4FtE8vDIK1sWvbhl+1a5v950R7d+zvrlVlVNxMHOAwf5m7+879O/W7FieX0iEQmspezgmaM9Wq1paLBEJInq6simlpZNX73rJ9ds2v5GEMuNib6TgXn8WDkRSGCQSergfmXXDIgWDEVVlc3eJvjXf35x+eq9+8CRCJNYWGIoEYy+d4fjhD59dowzfHVzc7H8tdfpx4uf+oGqUk1NTTdtEmFND5OKE8nhP73w4s9/tXTpb1686y63pq7O66zlW9fQ4L14113uks2bn3lq89rbhIxxQF1GW0mhRgnptB07cEje1z93yywi0sZsMQHvhrf1mZdf20SOqwH7ErEEVYK8RzW7OSKo45MgAmN9n53/en7pPa8lk39EbS11tSDuWPu0QOE6Du/c8YZ395Kl/6qq9O1Fi7osKVNvvDFQVar7470/3Lpzxz6OxYxK1/A2KhAGAlVyOaJDBva/GYCpCosJwARkntm48SuvHjxMUSemqgEcAXym96jSJvisMCKIBDbgnCLnnuUvLLt79eobtL7edOfgNgIgCkE8Tiu2vfza4uXLtwFAQ0ODnJCiAGjPmj1tK7ZuXYlIBEdL2R4TbDEw1kHAxiDTqqN69Zz5uUsvnExEUl9dbVjq680fd2175FdrXlpkIoUmFdFACXDtexNsy6Ef5Hhqnfxezn3rVu3/9G8fvt4we1mjrNvAVgBELFCDQ+nkYgUsGhvNiX5GYzirjCJ5hQ/BWnAXxz4JKxgEAwPf+tq7Z0+dNmb8PwFhO2uuqamBqtL3fv+7f/rtxpda86P5JoWgg9pPOJ2zP9oxHjmcZqNgEZhAAi4qNg9uXLfvi/X3z2OiVz4sYrp7hJICIGbAs4jHc9cQoI2NjSd8vX0VFQpAX3n51eYgnQExdwltSwKhAI4QVMkg8LWif/lVA3JzK5jZcgNga2trqYlozX8u+sP1K3bv9gvieZqxVgCGkGSbzZ1+oBMkzBypAQvB14xGHPiRnGLnF6tX7r/1gV/O2xkEq88591ynu/bpt4RnET4bAOhbWtJ8stdclx2PuW3H68OzFV9dkuwwqUIQlpAfnUnLhJFDzFdu+tRsaLbsuK6uTm6YPNldvHP3Q//y6ENfenHXLpOTXwSy1sICQgYZdkLK5mm1P7uAuiDxVSA2Hu9BLYi5P1j2zNKP3/erqp3JYE3luec6S5YsCbpfp4T2PlSBqIPNr7x2nqpS1Uk0v21/Z0nPnn1MLAYrcsItSgDAE2E2BkNL+t2qQKwjurJw+XJ/wZQp7pNbt//g8w/dP/8361YFbkGOiboGru9btp6eLjH0sDmtwoqIgQ3cmKFoTtw0vvyqt+Dee39+6+O//QARratWNZ0FWk9kLKISxIqBBuiRk3MBEblm7tzOTIw+OthhZUd02IA+k2BM+zyyk/BBiZFq0wnlA8d8ZM6cc99ysYXLl/uaSPCyN/bUX3Hvr6Z/7U9PLd3ckoHJKzSx3CgZIiXAqoiIKERUVUVOySlH+beIQFWiTDYWiSAnP86IxJw/v3Gote7JRXfP+fnCKfdt2fBJw5xSVe6K6mZVgzCSIaIq2olTACFiRSoZnD18dEl1ZeUYEUH1CUwpSCQSTETap0fekHHl5TOQSobErU7ey9FOqIrvZ6S0uFDmjB//zXdkPqiuTqqrq03DAw+s+tcnF81d+dq2issmT/r8xF5lHxhemN+nOBYzriFk+yBRWNJ5isUY4UeBCBII9ns+Nu/djd2H9//5qS1bF//3iy/+F4CdIEL9VVeZmtD16ZQx1m5OtahtQ04OuzaIgEOD+vg5qOwLrM89hwzCjZdf+s8NS5Zc25Uy2g6prqriuro6+bfPfuGmseMnAc2HOJqbd/LOgwRAThzl/fsPOWqaK8twYMPsP75ly6rHt2z5OIDSf66qmjigZ8/zjR/MiaqOKC0o3FWYk7f7VEyHFT4SLUJTWzNea2vF1td3YVdzy9N/3Ly+sQl4qh1Ura83tTU1XR5LXDVnjlWAapYsu1sy/jmjS3tHk1aUlLOldXS0lZf1azUbpoTE4zv58KEmr8Oc6KoKb2wUAGhKpXjJ88+vdYgOMht651DUd97H0V6jKgQibWprK25qaSvYuH/XP/5/P3FhtEfnBaIAAAAASUVORK5CYII=";

export default function App() {
  // 로그인/계정
  const [me, setMe] = useState(null); // {id, name, role} | null
  const [token, setToken] = useState("");
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [adminView, setAdminView] = useState(false); // 관리자: 계정관리 화면 토글

  const [levels, setLevels] = useState([1]);
  const [toys, setToys] = useState([]);
  const [customToy, setCustomToy] = useState("");
  const [domains, setDomains] = useState([]);
  const [childName, setChildName] = useState("");
  const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD
  // 생년월일 → 월령(개월) 자동 계산
  const childAge = (() => {
    if (!birthDate) return "";
    const b = new Date(birthDate);
    if (isNaN(b)) return "";
    const now = new Date();
    let m =
      (now.getFullYear() - b.getFullYear()) * 12 +
      (now.getMonth() - b.getMonth());
    if (now.getDate() < b.getDate()) m -= 1;
    return m >= 0 ? String(m) : "";
  })();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [myPlans, setMyPlans] = useState([]);
  const outRef = useRef(null);

  // 좁은 화면(폰)에서는 좌우 2단 → 위아래 1단으로
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 820 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 820);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 저장된 토큰으로 자동 로그인 복원
  useEffect(() => {
    try {
      const t = localStorage.getItem("esdm_token");
      const u = localStorage.getItem("esdm_user");
      if (t && u) {
        setToken(t);
        setMe(JSON.parse(u));
      }
    } catch {}
  }, []);

  // ---- 백엔드 호출 ----
  async function api(action, payload = {}) {
    const res = await fetch(RELAY_URL, {
      method: "POST",
      headers: RELAY_HEADERS,
      body: JSON.stringify({ action, token, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "요청 실패");
    return data;
  }

  async function doLogin() {
    if (!loginId.trim() || !loginPw) {
      setLoginErr("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    setLoginErr("");
    setLoggingIn(true);

    try {
      const res = await fetch(RELAY_URL, {
        method: "POST",
        headers: RELAY_HEADERS,
        body: JSON.stringify({
          action: "login",
          username: loginId.trim(),
          password: loginPw,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginErr(data.error || "로그인 실패");
        return;
      }
      setToken(data.token);
      setMe(data.user);
      try {
        localStorage.setItem("esdm_token", data.token);
        localStorage.setItem("esdm_user", JSON.stringify(data.user));
      } catch {}
      setLoginPw("");
    } catch {
      setLoginErr("서버에 연결할 수 없습니다.");
    } finally {
      setLoggingIn(false);
    }
  }

  function logout() {
    setMe(null);
    setToken("");
    setResult(null);
    setMyPlans([]);
    setAdminView(false);
    try {
      localStorage.removeItem("esdm_token");
      localStorage.removeItem("esdm_user");
    } catch {}
  }

  function toggleLevel(id) {
    setLevels((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // 최대 2개, 오래된 것 밀어냄
      return [...prev, id];
    });
  }

  function toggleToy(n) {
    setToys((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  }

  function addCustomToy() {
    const t = customToy.trim();
    if (t && !toys.includes(t)) setToys((prev) => [...prev, t]);
    setCustomToy("");
  }

  function toggleDomain(d) {
    setDomains((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  function buildPrompt() {
    const lv = levels
      .slice()
      .sort((a, b) => a - b)
      .map((id) => {
        const L = LEVELS.find((x) => x.id === id);
        if (!L) return "레벨 " + id;
        return `${L.name}(${L.age}, 핵심: ${LEVEL_FOCUS[id] || ""})`;
      })
      .join(" + ");
    const toyStr = toys.join(", ");
    const domStr = domains.length ? domains.join(", ") : "전 영역 균형";

    // 선택 레벨의 ESDM 커리큘럼 영역·항목
    const esdm = esdmForLevels(levels);
    const esdmStr = Object.entries(esdm)
      .map(([d, items]) => `${d}(${items.join("·")})`)
      .join(", ");

    const childLine = childName
      ? `- 아이 이름: ${childName}${childAge ? ` (${childAge}개월)` : ""}\n  → 장면·전략의 "OO이" 자리에 실제 이름 "${childName}"을(를) 자연스럽게 넣는다.`
      : "";

    return `당신은 ESDM(Early Start Denver Model) 인증 치료사입니다. 아래 조건으로 가정에서 부모가 아이와 진행할 수 있는 JAR(Joint Activity Routine, 공동활동루틴) 계획을 한국어로 작성하세요.

[조건]
${childLine ? childLine + "\n" : ""}- ESDM 레벨: ${lv}
- 선호 놀잇감: ${toyStr}
- 목표 발달 영역: ${domStr}

[해당 레벨 ESDM 커리큘럼 — 이 영역과 항목을 목표·장면에 반드시 반영]
${esdmStr}

[작성 원칙]
- ESDM의 공동활동루틴 구조(Setup → Theme → Variation)를 따른다.
- 선택한 놀잇감을 자연스럽게 하나의 통합 루틴으로 엮는다.
- 위 ESDM 커리큘럼 영역을 빠짐없이 다루되, 각 영역의 항목을 루틴 속 구체적 행동으로 녹인다.
- 레벨에 맞는 언어 수준(1어절/2어절 등)과 발달 단계를 반영한다.

[말투 — 아래를 반드시 지킨다]
1. 부모 대사에는 실제 입으로 내는 의성어·감탄을 넣는다: "부릉~ 슈웅!", "꾹꾹꾹! 산이다~", "쭉~ 떼었다!", "닦닦~ 깨끗!", "와~!" 처럼 소리와 억양이 살아 있게.
2. 각 장면은 [부모 행동/대사] 와 [전략]이 짝을 이룬다. parent에는 부모가 그대로 따라 할 동작과 대사를, strategy에는 그 행동의 ABA 임상 의도를 쓴다.
3. strategy에는 구체적 임상 기법을 자연스럽게 녹인다: "3~5초 기다리기", "교대 경험 제공", "언어 모델 제공", "즉각(즉시) 반응", "공동주의 유도", "과장된 표정", "차례 넘기기" 등.
4. 아이를 "OO이"로 지칭한다(예: "OO이 꾹!", "OO이 차례").
5. "~할 수 있습니다" 같은 격식체·AI 말투를 쓰지 않는다. 현장 치료사가 부모에게 시연하듯 쓴다.

[참고 예시 — 이 톤과 밀도를 그대로]
· parent 예: "출발! 슈웅~" 하며 자동차를 언덕에서 굴리고, 과장된 표정으로 "와~!" 박수칩니다
· strategy 예: 아이가 관심 보이면 다시 건네며 "빵빵? 해봐" 하고 3~5초 기다리기. 아이가 굴리면 같은 동작 함께 모방하며 "부릉부릉!" 언어 모델
· variation 예: 클레이 대신 비눗방울을 불어 자동차 위로 떨어뜨리며 "뽀글뽀글 세차!" 놀이. "불어" 지시로 수용언어 연습, 손 흔들어 방울 터뜨리기로 동작모방 유도

[출력 형식 — 반드시 아래 JSON만 출력. 마크다운/설명/코드펜스 금지]
{
  "title": "루틴 이름 (놀잇감 기반, 짧게)",
  "setup": {
    "materials": "준비물 한 문장",
    "arrangement": ["환경 배치 항목", "..."],
    "approach": ["초기 접근 행동 1", "초기 접근 행동 2"]
  },
  "goals": [
    {"domain": "표현언어", "detail": "구체적 목표행동"},
    {"domain": "수용언어", "detail": "..."}
  ],
  "theme": {
    "name": "주제 이름",
    "scenes": [
      {"label": "장면 1: 제목", "parent": "의성어가 살아있는 부모 행동/대사", "strategy": "ABA 기법이 녹은 전략"}
    ]
  },
  "variations": [
    {"title": "변형1] 제목", "detail": "설명"},
    {"title": "변형2] 제목", "detail": "설명"}
  ],
  "home": {
    "summary": "오늘 루틴에서 집중한 핵심을 부모 언어로 1~2문장",
    "tips": ["집에서 이어가는 구체적 방법 1", "방법 2", "방법 3"],
    "watch": "이런 반응이 보이면 좋다는 관찰 포인트 1문장"
  }
}

goals에는 위 ESDM 커리큘럼 영역(${
      Object.keys(esdm).join(", ")
    })을 우선 포함하되, 사용자가 고른 목표 영역(${domStr})을 앞쪽에 배치한다. 영역 수만큼 goals를 구성한다(최대 8개). theme.scenes는 정확히 5개로, 도입→전개→핵심→변화→마무리 흐름이 자연스럽게 이어지게 구성한다. variations는 2개로, 서로 다른 놀잇감·감각·난이도로 변주한다. home은 부모가 집에서 그대로 실천할 수 있게 따뜻하고 쉬운 말로 쓴다(전문용어 최소화). JSON만 출력한다.`;
  }

  // 미리보기(아티팩트)에서 API 호출이 막혔을 때 쓰는 데모 생성기.
  // 선택한 놀잇감/레벨/영역으로 형식이 동일한 샘플 JAR을 구성한다.
  function buildDemoJAR() {
    const main = toys[0] || "놀잇감";
    // 보조 놀잇감: 두 번째 선택이 있으면 사용, 없으면 main과 겹치지 않는 기본값
    const FALLBACK_SUBS = ["블록", "공", "컵", "인형", "자동차"];
    const sub =
      toys[1] && toys[1] !== main
        ? toys[1]
        : FALLBACK_SUBS.find((x) => x !== main) || "블록";
    // 유효한 레벨만 사용 (1~4). 잘못된 값이 오면 가장 가까운 유효 레벨로 보정
    const validLevels = levels.filter((n) => ESDM_CURRICULUM[n]);
    const safeLevels = validLevels.length ? validLevels : [1];
    const lvId = safeLevels.slice().sort((a, b) => a - b)[0] || 1;
    const lvObj = LEVELS.find((x) => x.id === lvId);
    const lvName = lvObj ? lvObj.name : "레벨 " + lvId;
    // 어절: L1 1어절 / L2 1~2어절 / L3 2~3어절 / L4 3~4어절 문장
    const wordLevel =
      lvId <= 1 ? "1어절" : lvId === 2 ? "1~2어절" : lvId === 3 ? "2~3어절" : "3~4어절";
    // 레벨별 언어 자극 수준 (4단계): 소리·몸짓 → 낱말 → 짧은 문장 → 확장 문장·대화
    const langCue =
      lvId <= 1
        ? "소리·몸짓 따라 하기"
        : lvId === 2
        ? "짧은 낱말 들려주기"
        : lvId === 3
        ? "짧은 문장으로 말 걸기"
        : "설명·질문을 덧붙여 대화 주고받기";
    // "언어 모델"을 레벨에 맞게 (4단계)
    const modelWord =
      lvId <= 1
        ? "소리·의성어를 함께 내기"
        : lvId === 2
        ? "낱말을 또렷이 들려주기"
        : lvId === 3
        ? "짧은 문장으로 말해 주기"
        : "왜·어떻게를 묻는 질문으로 대화 잇기";

    // 선택 레벨의 ESDM 커리큘럼(영역→항목)
    const esdm = esdmForLevels(safeLevels);
    // 사용자가 고른 영역을 앞으로, 나머지 ESDM 영역을 뒤로 정렬
    const esdmDomains = Object.keys(esdm);
    const ordered = [
      ...domains.filter((d) => esdmDomains.includes(d)),
      ...esdmDomains.filter((d) => !domains.includes(d)),
    ];

    // 영역별 목표행동: ESDM 항목을 일반 놀이 맥락으로 (놀잇감 이름은 넣지 않아 어떤 놀잇감에도 자연스럽게)
    const goalTpl = {
      수용언어: (items) =>
        `${items.join("·")} — "줘", "여기" 등 ${wordLevel} 지시 듣고 따르기`,
      표현언어: (items) =>
        `${items.join("·")} — 의성어·${wordLevel}로 요청하고 이름대기`,
      공동주의: (items) =>
        `${items.join("·")} — 함께 보며 눈 맞추기, 가까운 곳 가리키기`,
      모방: (items) =>
        `${items.join("·")} — 부모의 동작·소리 따라 하기`,
      사회기술: (items) =>
        `${items.join("·")} — 번갈아 주고받기, 차례 지키며 함께 웃기`,
      놀이: (items) =>
        `${items.join("·")} — 같은 공간에서 함께·번갈아 놀기`,
      인지: (items) =>
        `${items.join("·")} — 같은 것끼리 짝짓기, 개수·순서 다루기`,
      소근육: (items) =>
        `${items.join("·")} — 손으로 집고 조작하기, 작은 부분 다루기`,
      대근육: (items) =>
        `${items.join("·")} — 앉았다 일어나고 팔 뻗어 주고받기`,
      자조: (items) =>
        `${items.join("·")} — 활동 전후 정리·손 씻기 등 스스로 하기`,
    };
    const goals = ordered.map((d) => ({
      domain: d,
      detail: goalTpl[d]
        ? goalTpl[d](esdm[d])
        : `${esdm[d].join("·")} — 놀이 중 ${d} 기회 만들기`,
    }));

    const presetForMain = TOY_SCENES[main];
    const demo = {
      title: `${toys.slice(0, 3).join(", ")} JAR 루틴`,
      setup: {
        materials:
          // 놀잇감 1개이고 전용 준비물이 있으면 맞춤 준비물 사용
          toys.length <= 1 && presetForMain && presetForMain.materials
            ? presetForMain.materials
            : `${
                toys.length > 1 ? toys.join(", ") : `${main}, ${sub}`
              }, 넓은 쟁반이나 책상, 아이와 마주 앉을 공간`,
        arrangement: [
          "아이와 마주 보거나 옆에 앉아 쟁반을 가운데 둡니다",
          `${main}을(를) 아이 손이 닿는 곳에 두어 시선을 끕니다`,
          `${sub}은(는) 부모 가까이 두고 하나씩 꺼내 줍니다`,
        ],
        approach: [
          `${main}을(를) 아이 앞에서 움직이며 "우와, 뭐야?" 하고 관심을 유도합니다`,
          `아이가 쳐다보면 즉시 "${main}!" 하고 이름을 들려주며 건넵니다`,
        ],
        tip: presetForMain && presetForMain.tip ? presetForMain.tip : null,
      },
      goals,
      theme: (() => {
        const childTok = childCall(childName);
        // 주 놀잇감 전용 장면이 있으면 사용
        const preset = TOY_SCENES[main];
        if (preset) {
          // 스토리 흐름을 살려 전체 7장면 사용 (도입~마무리)
          const pick = preset.scenes.map((_, i) => i);
          // 레벨별 코칭 한 줄 (같은 스토리라도 레벨마다 지도가 확 달라지게)
          const levelCoach =
            lvId <= 1
              ? `지금은 눈맞춤·소리 모방이 목표예요. "${main}" 이름을 또렷이 들려주고, 말이 안 나와도 소리·몸짓만 보이면 바로 칭찬해 주세요.`
              : lvId === 2
              ? `"${main} 줘"처럼 두 낱말을 붙여 들려주고, 아이가 한 낱말이라도 말하거나 몸짓하면 즉시 반응해 주세요.`
              : lvId === 3
              ? `"큰 ${main} 줘"처럼 색·크기 말을 넣어 말하고, "이게 뭐야?" 같은 짧은 질문에 아이가 답하도록 기다려 주세요.`
              : `"왜 ${main}이(가) 멈췄을까?"처럼 이유를 묻고, 지난 일·다음 일을 문장으로 이야기하도록 이끌어 주세요.`;
          return {
            name: preset.theme,
            scenes: pick.map((idx, i) => {
              const s = preset.scenes[idx];
              // 레벨에 맞게 "언어 모델" 표현 조정
              const adjust = (t) => {
                if (lvId <= 1)
                  return t
                    .split("함께 언어 모델").join("소리·의성어 함께 내기")
                    .split("언어 모델").join("소리·의성어 함께 내기");
                if (lvId === 2)
                  return t
                    .split("함께 언어 모델").join("낱말 함께 말하기")
                    .split("언어 모델").join("낱말 들려주기");
                if (lvId >= 4)
                  return t
                    .split("함께 언어 모델").join('"왜?", "어떻게?" 물으며 대화 잇기')
                    .split("언어 모델").join("문장으로 설명 덧붙이기");
                return t
                  .split("함께 언어 모델").join("짧은 문장으로 말해 주기")
                  .split("언어 모델").join("짧은 문장으로 말해 주기"); // L3
              };
              const fill = (t) =>
                t.split("{main}").join(main).split("{sub}").join(sub).split("{child}").join(childTok);
              return {
                label: `장면 ${i + 1}: ${s[0]}`,
                parent: fill(s[1]),
                strategy: fill(adjust(s[2])),
                // 첫 장면에만 레벨 코칭을 붙여 반복을 줄이고, 레벨별 차이를 뚜렷하게
                coach: i === 0 ? fill(levelCoach) : null,
              };
            }),
            songs: preset.songs || null,
            closing: preset.closing || null,
          };
        }
        // 전용 장면이 없는 놀잇감: 기본 주고받기 틀
        return {
          name: `${main} 주고받기 놀이`,
          scenes: [
            { label: "장면 1: 관심 끌기", parent: `${main}을(를) 손에 들고 "짠~! ${main} 나왔다~" 하며 ${childTok} 눈높이에서 흔들어 보여줍니다`, strategy: `쳐다보면 3~5초 기다린 뒤 건네며 교대의 첫 경험을 만듭니다. 손을 뻗으면 즉시 ${modelWord}`, coach: lvId <= 1 ? `지금은 눈맞춤·소리 모방이 목표예요. "${main}" 이름을 또렷이 들려주고, 소리·몸짓만 보여도 바로 칭찬해 주세요.` : lvId === 2 ? `"${main} 줘"처럼 두 낱말을 붙여 들려주고, 한 낱말이라도 말하거나 몸짓하면 즉시 반응해 주세요.` : lvId === 3 ? `"큰 ${main} 줘"처럼 색·크기 말을 넣고, 짧은 질문에 아이가 답하도록 기다려 주세요.` : `"왜 ${main}이(가) 멈췄을까?"처럼 이유를 묻고, 지난 일·다음 일을 문장으로 이야기하도록 이끌어 주세요.` },
            { label: "장면 2: 함께 다루기", parent: `${childTok}와(과) 같이 ${main}을(를) 만지며 "${main} 만져 보자!" 하고 동작을 크게 보여줍니다`, strategy: `${childTok}의 동작을 똑같이 모방해 주며 ${langCue}. 같은 동작 모방으로 사회적 연결 강화` },
            { label: "장면 3: 주고받기", parent: `"엄마 줘~" 하고 손을 내밀고, 받으면 "고마워!" 하며 "이번엔 ${childTok} 줄게~" 다시 건넵니다`, strategy: `건넬 때마다 "줘", "여기" ${wordLevel} 지시를 반복. 건네면 과장된 표정으로 "우와!" 즉각 강화` },
            { label: "장면 4: 변화 주기", parent: `${sub}을(를) 쓱 꺼내 "어? 이번엔 ${J(sub, "이다", "다")}!" 하며 놀란 표정으로 새 자극을 더합니다`, strategy: `예측을 살짝 깨뜨려 주의를 다시 모읍니다. 반응하면 ${sub}을(를) 가리키며 "여기 봐!" 공동주의 유도` },
            { label: "장면 5: 마무리 정리", parent: `"이제 쏙~ 넣자!" 하며 ${main}을(를) 통이나 상자에 넣는 동작을 보여줍니다`, strategy: '손에 쥐어 주고 통을 가리키며 "넣어" 지시. 넣으면 "다 했다!" 즉각 칭찬으로 자조·마무리' },
          ],
        };
      })(),
      variations: (() => {
        const vs = [];
        // 고른 보조 놀잇감마다 "주인공 바꾸기" 변형 (첫 번째 main 제외)
        const others = toys.slice(1).filter((t) => t && t !== main);
        const subsForVar = others.length > 0 ? others : [sub];
        subsForVar.forEach((t, i) => {
          vs.push({
            title: `변형${i + 1}] ${t} 주인공 바꾸기`,
            detail: `${main} 대신 ${t}을(를) 주인공으로 같은 주고받기 루틴 반복. 새 사물 이름을 또렷이 들려주며 어휘 확장, "또 줘" 요청 기회 늘리기`,
          });
        });
        // 마지막에 노래 리듬 변형 추가
        vs.push({
          title: `변형${vs.length + 1}] 노래로 리듬 만들기`,
          detail: `같은 동작에 짧은 노래("주세요~ 주세요~")를 붙여 리듬으로 만듭니다. 노래를 중간에 뚝 멈추고 기다려 아이가 소리·동작으로 "더!"를 요청하게 유도`,
        });
        return vs;
      })(),
      home: {
        summary: `오늘은 ${main}을(를) 주고받으며 "줘", "더" 같은 말과 차례 지키기를 연습했어요. 집에서도 짧게, 자주 반복하면 아이가 더 편하게 표현해요.`,
        tips: [
          `밥 먹기 전이나 목욕 후처럼 정해진 시간에 ${main} 놀이를 5분씩 꾸준히 해보세요.`,
          `아이가 손을 뻗으면 바로 주지 말고 "줘?" 하고 1~2초 기다려 말이나 소리를 기다려 주세요.`,
          `잘했을 때 "우와!" 하고 크게 반응해 주면 아이가 그 행동을 더 하려고 해요.`,
        ],
        watch: `아이가 먼저 ${main}을(를) 건네거나 눈을 맞추며 소리를 내면 아주 좋은 신호예요.`,
      },
    };

    // 아이 이름이 있으면 "OO이" 자리에 실제 이름 반영
    if (childName && childName.trim()) {
      const nm = childName.trim();
      const swap = (s) => (typeof s === "string" ? s.split("OO이").join(nm) : s);
      demo.theme.scenes = demo.theme.scenes.map((sc) => ({
        ...sc,
        parent: swap(sc.parent),
        strategy: swap(sc.strategy),
      }));
      if (demo.home) {
        demo.home.summary = swap(demo.home.summary);
        demo.home.tips = demo.home.tips.map(swap);
        demo.home.watch = swap(demo.home.watch);
      }
    }
    return deepFixJosa(demo);
  }

  async function generateJAR() {
    if (levels.length === 0) {
      setError("ESDM 레벨을 1개 이상 선택해 주세요.");
      return;
    }
    if (toys.length === 0) {
      setError("선호 놀잇감을 1개 이상 선택해 주세요.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    setSaved(false);

    // 미리보기(아티팩트)에서는 API 호출이 막히므로 곧장 데모로.
    // 배포(GitHub) 시 DEMO_MODE 를 false 로 바꾸면 실제 AI 생성을 사용.
    if (DEMO_MODE) {
      setTimeout(() => {
        setResult(buildDemoJAR());
        setLoading(false);
      }, 500);
      return;
    }

    try {
      const data = await api("generate", { prompt: buildPrompt() });
      let text = (data.text || "").trim();
      text = text.replace(/```json|```/g, "").trim();
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
      const parsed = JSON.parse(text);
      setResult(parsed);
    } catch (e) {
      // 생성 실패 시 데모 JAR로 대체(빈 화면 방지)
      setResult(buildDemoJAR());
    } finally {
      setLoading(false);
    }
  }

  // JAR 저장 / 내 목록 불러오기 / 삭제
  async function savePlan() {
    if (!result) return;
    try {
      await api("savePlan", {
        title: result.title,
        levels,
        toys,
        domains,
        plan: { ...result, _child: { name: childName, birthDate } },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      loadPlans();
    } catch (e) {
      setError("저장에 실패했습니다.");
    }
  }
  async function loadPlans() {
    try {
      const data = await api("listPlans");
      setMyPlans(data.plans || []);
    } catch {}
  }
  async function deletePlan(planId) {
    try {
      await api("deletePlan", { planId });
      setMyPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch {}
  }
  function openSavedPlan(p) {
    setResult(p.plan);
    setLevels(p.levels || [1]);
    setToys(p.toys || []);
    setDomains(p.domains || []);
    if (p.plan && p.plan._child) {
      setChildName(p.plan._child.name || "");
      setBirthDate(p.plan._child.birthDate || "");
    }
    setSaved(true);
  }

  // 로그인 직후 내 저장목록 자동 로드
  useEffect(() => {
    if (me) loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  function resultToText(r) {
    const lines = [];
    lines.push(`ESDM JAR 공동활동루틴 계획`);
    lines.push(r.title);
    if (childName) lines.push(`아이: ${childName}${childAge ? ` (${childAge}개월)` : ""}`);
    lines.push("");
    lines.push("① 오늘의 목표");
    r.goals.forEach((g) => lines.push(` · ${g.domain}: ${g.detail}`));
    lines.push("");
    lines.push("② 놀이 준비");
    lines.push(`준비물: ${r.setup.materials}`);
    lines.push("환경 배치:");
    r.setup.arrangement.forEach((a) => lines.push(` - ${a}`));
    lines.push("시작하기:");
    r.setup.approach.forEach((a, i) => lines.push(` ${i + 1}. ${a}`));
    if (r.setup.tip) lines.push(`💡 이럴 땐: ${r.setup.tip}`);
    lines.push("");
    lines.push(`③ 함께 놀기 — ${r.theme.name}`);
    r.theme.scenes.forEach((s) => {
      lines.push(s.label);
      lines.push(`  → 부모: ${s.parent}`);
      lines.push(`  → 전략: ${s.strategy}`);
      if (s.coach) lines.push(`  → 레벨 지도: ${s.coach}`);
    });
    lines.push("");
    lines.push("④ 다르게 놀기");
    r.variations.forEach((v) => {
      lines.push(v.title);
      lines.push(`  ${v.detail}`);
    });
    if (r.home) {
      lines.push("");
      lines.push("⑤ 집에서 이어가기");
      if (r.home.summary) lines.push(r.home.summary);
      (r.home.tips || []).forEach((t) => lines.push(` - ${t}`));
      if (r.home.watch) lines.push(r.home.watch);
    }
    if (r.theme && r.theme.songs && r.theme.songs.length) {
      lines.push("");
      lines.push("⑥ 추천 노래");
      r.theme.songs.forEach((s) => lines.push(` - ${s}`));
    }
    if (r.theme && r.theme.closing && r.theme.closing.length) {
      lines.push("");
      lines.push("⑦ 마무리 루틴");
      r.theme.closing.forEach((c, i) => lines.push(` ${i + 1}. ${c}`));
    }
    lines.push("");
    lines.push("© 검단ABA언어행동연구소 | 민다혜 (BCBA)");
    lines.push("본 자료는 검단ABA언어행동연구소의 지적재산입니다.");
    return lines.join("\n");
  }

  async function copyDoc() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(resultToText(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("복사에 실패했습니다.");
    }
  }

  function printPDF() {
    if (!result) return;
    if (!outRef.current) return;
    const html = outRef.current.innerHTML;
    const w = window.open("", "_blank");
    if (!w) {
      setError("팝업이 차단되어 있어요. 팝업을 허용한 뒤 다시 시도해 주세요.");
      return;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>ESDM JAR 계획</title>
<style>
  body{font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:${C.ink};padding:32px;line-height:1.6;}
  .step{border-radius:12px;padding:18px 20px;margin:14px 0;border:1px solid ${C.line};}
  .step-orange{background:${C.brandSoft};}
  .step-blue{background:${C.blueSoft};}
  .step-green{background:${C.greenSoft};}
  h3{margin:0 0 10px;font-size:16px;}
  ul{margin:6px 0;padding-left:20px;}
  .scene{margin:10px 0;}
  .scene b{display:block;}
  .arrow{margin:2px 0 2px 8px;color:${C.sub};}
  .foot{margin-top:24px;font-size:12px;color:${C.sub};text-align:center;}
  body > div > div { break-inside: avoid; page-break-inside: avoid; }
  @media print { body > div > div { break-inside: avoid; page-break-inside: avoid; } }
</style></head><body>${html}
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  // ---------- 로그인 게이트 ----------
  if (!me) {
    return (
      <div style={{ ...styles.gate, background: C.bg }}>
        <div style={styles.gateCard}>
          <img src={LOGO_DATA_URL} alt="검단ABA" style={styles.logoBadge} />
          <h1 style={styles.gateTitle}>함께놀이 플래너</h1>
          <p style={styles.gateSub}>ESDM 공동활동루틴 · 우리 아이 놀이계획</p>

          <button
            style={styles.guideToggle}
            onClick={() => setShowGuide((v) => !v)}
          >
            <span>📖 사용법 안내</span>
            <span>{showGuide ? "▲" : "▼"}</span>
          </button>

          {showGuide && (
            <div style={styles.guideBox}>
              <div style={styles.guideStep}>
                <span style={styles.guideNum}>1</span>
                <div>
                  <div style={styles.guideStepTitle}>아이 정보 입력</div>
                  <div style={styles.guideStepText}>
                    아이 이름과 월령을 적으면 놀이계획에 이름이 그대로 들어가요.
                  </div>
                </div>
              </div>
              <div style={styles.guideStep}>
                <span style={styles.guideNum}>2</span>
                <div>
                  <div style={styles.guideStepTitle}>레벨·놀잇감 선택</div>
                  <div style={styles.guideStepText}>
                    ESDM 레벨(최대 2개)과 아이가 좋아하는 놀잇감을 고르세요.
                    목표 발달 영역도 선택할 수 있어요.
                  </div>
                </div>
              </div>
              <div style={styles.guideStep}>
                <span style={styles.guideNum}>3</span>
                <div>
                  <div style={styles.guideStepTitle}>놀이계획 생성</div>
                  <div style={styles.guideStepText}>
                    버튼을 누르면 레벨에 맞는 ESDM 커리큘럼이 반영된 놀이계획이
                    자동으로 만들어져요.
                  </div>
                </div>
              </div>
              <div style={styles.guideStep}>
                <span style={styles.guideNum}>4</span>
                <div>
                  <div style={styles.guideStepTitle}>결과 확인 · 가정 배부</div>
                  <div style={styles.guideStepText}>
                    부모 행동과 치료 전략이 함께 담긴 놀이계획이 나와요.
                    그대로 출력해 가정 과제로 보내면 돼요.
                  </div>
                </div>
              </div>
              <div style={styles.guideStep}>
                <span style={styles.guideNum}>5</span>
                <div>
                  <div style={styles.guideStepTitle}>저장 · 복사 · PDF 출력</div>
                  <div style={styles.guideStepText}>
                    저장하면 내 목록에 쌓여 다시 볼 수 있어요. PDF로 출력해
                    가정에 보내거나 문서로 복사할 수 있어요.
                  </div>
                </div>
              </div>
              <div style={styles.guideNote}>
                💡 계정(아이디·비밀번호)은 관리자(원장님)에게 문의해 주세요.
              </div>
            </div>
          )}
          <input
            style={styles.gateInput}
            value={loginId}
            placeholder="아이디"
            autoCapitalize="none"
            onChange={(e) => setLoginId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doLogin()}
          />
          <input
            style={styles.gateInput}
            type="password"
            value={loginPw}
            placeholder="비밀번호"
            onChange={(e) => setLoginPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doLogin()}
          />
          {loginErr && <div style={styles.gateErr}>{loginErr}</div>}
          <button
            style={styles.gateBtn}
            onClick={doLogin}
            disabled={loggingIn}
          >
            {loggingIn ? "로그인 중…" : "로그인 →"}
          </button>
          <div style={styles.gateFoot}>
            © 검단ABA언어행동연구소 | 민다혜 (BCBA)
            <br />
            <span style={styles.gateFootSmall}>
              본 자료는 검단ABA언어행동연구소의 지적재산입니다.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ---------- 관리자: 계정 관리 화면 ----------
  if (me.role === "admin" && adminView) {
    return (
      <AdminPanel
        api={api}
        isMobile={isMobile}
        onClose={() => setAdminView(false)}
        onLogout={logout}
        me={me}
      />
    );
  }

  // ---------- 메인 ----------
  return (
    <div style={{ ...styles.app, background: C.bg, padding: isMobile ? 10 : 20 }}>
      <div
        style={{
          ...styles.shell,
          gridTemplateColumns: isMobile ? "1fr" : "360px 1fr",
        }}
      >
        {/* 좌측 패널 */}
        <aside style={styles.left}>
          <div style={styles.brandRow}>
            <img src={LOGO_DATA_URL} alt="검단ABA" style={styles.logoBadgeSm} />
            <div>
              <div style={styles.brandTitle}>함께놀이 플래너</div>
              <div style={styles.brandSub}>
                ESDM 공동활동루틴 · 우리 아이 놀이계획
              </div>
            </div>
          </div>

          <div style={styles.userBar}>
            <span style={styles.userName}>
              {me.name}
              {me.role === "admin" && <span style={styles.adminTag}>관리자</span>}
            </span>
            <span style={{ display: "flex", gap: 6 }}>
              {me.role === "admin" && (
                <button
                  style={styles.miniBtn}
                  onClick={() => setAdminView(true)}
                >
                  계정 관리
                </button>
              )}
              <button style={styles.miniBtn} onClick={logout}>
                로그아웃
              </button>
            </span>
          </div>

          <div style={styles.sectionTitle}>루틴 설정</div>

          <Label>아이 정보</Label>
          <div style={styles.childRow}>
            <input
              style={{ ...styles.addInput, flex: 1 }}
              value={childName}
              placeholder="이름"
              onChange={(e) => setChildName(e.target.value)}
            />
          </div>
          <div style={styles.childRow}>
            <input
              style={{ ...styles.addInput, flex: 1 }}
              type="date"
              value={birthDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirthDate(e.target.value)}
            />
            <span style={styles.ageBadge}>
              {childAge ? `${childAge}개월` : "생년월일"}
            </span>
          </div>

          <Label req>ESDM 레벨 (최대 2개)</Label>
          <div style={styles.grid2}>
            {LEVELS.map((L) => {
              const on = levels.includes(L.id);
              return (
                <button
                  key={L.id}
                  onClick={() => toggleLevel(L.id)}
                  style={{
                    ...styles.levelCard,
                    ...(on ? styles.levelCardOn : {}),
                  }}
                >
                  <div style={styles.levelName}>{L.name}</div>
                  <div style={styles.levelAge}>{L.age}</div>
                </button>
              );
            })}
          </div>
          {levels.length > 0 && (
            <div style={styles.levelHint}>
              <b>ESDM 커리큘럼 영역:</b>{" "}
              {Object.keys(esdmForLevels(levels)).join(" · ")}
            </div>
          )}

          <Label req>선호 놀잇감 (1개 이상)</Label>
          <div style={styles.chips}>
            {TOYS.map((t) => {
              const on = toys.includes(t.n);
              return (
                <button
                  key={t.n}
                  onClick={() => toggleToy(t.n)}
                  style={{ ...styles.chip, ...(on ? styles.chipOn : {}) }}
                >
                  <span style={{ marginRight: 4 }}>{t.e}</span>
                  {t.n}
                </button>
              );
            })}
          </div>
          <div style={styles.addRow}>
            <input
              style={styles.addInput}
              value={customToy}
              placeholder="직접 입력 후 Enter…"
              onChange={(e) => setCustomToy(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomToy()}
            />
            <button style={styles.addBtn} onClick={addCustomToy}>
              추가
            </button>
          </div>
          {toys.filter((t) => !TOYS.some((x) => x.n === t)).length > 0 && (
            <div style={styles.customList}>
              {toys
                .filter((t) => !TOYS.some((x) => x.n === t))
                .map((t) => (
                  <button
                    key={t}
                    style={styles.customChip}
                    onClick={() => toggleToy(t)}
                  >
                    {t} ✕
                  </button>
                ))}
            </div>
          )}

          <Label>목표 발달 영역 (선택)</Label>
          <div style={styles.grid2}>
            {DOMAINS.map((d) => {
              const on = domains.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => toggleDomain(d)}
                  style={{ ...styles.domain, ...(on ? styles.domainOn : {}) }}
                >
                  <span style={{ marginRight: 6, color: on ? C.green : C.line }}>
                    ●
                  </span>
                  {d}
                </button>
              );
            })}
          </div>

          <button
            style={{ ...styles.generate, ...(loading ? styles.generateOff : {}) }}
            onClick={generateJAR}
            disabled={loading}
          >
            {loading ? "생성 중…" : "JAR 계획 생성하기 →"}
          </button>
          {error && <div style={styles.errBox}>{error}</div>}
        </aside>

        {/* 우측 출력 */}
        <main style={styles.right}>
          <div style={styles.outHead}>
            <div style={styles.outTag}>놀이계획</div>
            <div style={styles.outTitle}>
              {result ? result.title : "생성 결과"}
              {result && childName && (
                <span style={styles.childMeta}>
                  {" "}
                  · {childName}
                  {childAge ? ` (${childAge}개월)` : ""}
                </span>
              )}
            </div>
            <div style={styles.outActions}>
              <button
                style={styles.actBtn}
                onClick={savePlan}
                disabled={!result}
              >
                💾 저장
              </button>
              <button
                style={styles.actBtn}
                onClick={copyDoc}
                disabled={!result}
              >
                📋 문서로 복사
              </button>
              <button
                style={{ ...styles.actBtn, ...styles.actBtnDark }}
                onClick={printPDF}
                disabled={!result}
              >
                🖨 PDF 출력
              </button>
            </div>
          </div>

          {copied && (
            <div style={styles.toast}>클립보드에 복사됐습니다 ✓</div>
          )}
          {saved && (
            <div style={styles.toast}>저장됐습니다 ✓</div>
          )}

          {/* 저장 목록 (결과 없을 때만 노출) */}
          {!result && !loading && myPlans.length > 0 && (
            <div style={styles.savedWrap}>
              <div style={styles.savedHead}>
                {me.role === "admin"
                  ? `전체 저장 목록 (${myPlans.length})`
                  : "내가 저장한 놀이계획"}
              </div>
              {myPlans.map((p) => (
                <div key={p.id} style={styles.savedRow}>
                  <button
                    style={styles.savedOpen}
                    onClick={() => openSavedPlan(p)}
                  >
                    <span style={styles.savedTitle}>
                      {p.title}
                      {me.role === "admin" && p.author && (
                        <span style={styles.savedAuthor}>· {p.author}</span>
                      )}
                    </span>
                    <span style={styles.savedDate}>
                      {new Date(p.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </button>
                  <button
                    style={styles.savedDel}
                    onClick={() => deletePlan(p.id)}
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {!result && !loading && (
            <div style={styles.empty}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
              레벨과 놀잇감을 선택하고
              <br />
              JAR 계획을 생성해 보세요.
            </div>
          )}

          {loading && (
            <div style={styles.empty}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✏️</div>
              루틴을 구성하는 중입니다…
            </div>
          )}

          {result && (
            <div ref={outRef} style={styles.outBody}>
              {/* 가정 과제 헤더 */}
              <div style={styles.sheetHeader}>
                <div style={styles.sheetTitle}>
                  {givenName(childName)
                    ? `${childCall(childName)}의 가정 놀이 과제`
                    : "가정 놀이 과제"}
                </div>
              </div>

              {/* ① 오늘의 목표 */}
              <div style={styles.stepCard}>
                <div style={styles.stepHead}>
                  <span style={styles.stepLabel}>
                    <span style={styles.stepDot}>1</span> 오늘의 목표
                  </span>
                </div>
                <ul style={styles.ul}>
                  {(result.goals || []).map((g, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <b>{g.domain}:</b> {g.detail}
                    </li>
                  ))}
                </ul>
              </div>

              {/* ② 놀이 준비 */}
              <div style={styles.stepCard}>
                <div style={styles.stepHead}>
                  <span style={styles.stepLabel}>
                    <span style={styles.stepDot}>2</span> 놀이 준비
                  </span>
                </div>
                <p style={styles.kv}>
                  <b>준비물:</b> {result.setup?.materials}
                </p>
                <p style={styles.kvLabel}>환경 배치:</p>
                <ul style={styles.ul}>
                  {(result.setup?.arrangement || []).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
                <p style={styles.kvLabel}>시작하기:</p>
                <ol style={styles.ul}>
                  {(result.setup?.approach || []).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ol>
                {result.setup?.tip && (
                  <p style={styles.tipBox}>💡 이럴 땐: {result.setup.tip}</p>
                )}
              </div>

              {/* ③ 함께 놀기 */}
              <div style={styles.stepCard}>
                <div style={styles.stepHead}>
                  <span style={styles.stepLabel}>
                    <span style={styles.stepDot}>3</span> 함께 놀기
                  </span>
                </div>
                <p style={styles.themeName}>"{result.theme?.name}"</p>
                {(result.theme?.scenes || []).map((s, i) => (
                  <div key={i} style={styles.scene}>
                    <div style={styles.sceneLabel}>{s.label}</div>
                    <div style={styles.arrow}>→ 부모: {s.parent}</div>
                    <div style={styles.arrow}>→ 전략: {s.strategy}</div>
                    {s.coach && (
                      <div style={styles.coachLine}>레벨 지도: {s.coach}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* ④ 다르게 놀기 */}
              <div style={styles.stepCard}>
                <div style={styles.stepHead}>
                  <span style={styles.stepLabel}>
                    <span style={styles.stepDot}>4</span> 다르게 놀기
                  </span>
                </div>
                {(result.variations || []).map((v, i) => (
                  <div key={i} style={styles.variation}>
                    <b>{v.title}</b>
                    <div style={{ marginTop: 2 }}>— {v.detail}</div>
                  </div>
                ))}
              </div>

              {/* ⑤ 집에서 이어가기 */}
              {result.home && (
                <div style={{ ...styles.stepCard, ...styles.stepHome }}>
                  <div style={styles.stepHead}>
                    <span style={styles.stepLabel}>
                      <span style={{ ...styles.stepDot, ...styles.stepDotHome }}>
                        5
                      </span>{" "}
                      집에서 이어가기
                    </span>
                  </div>
                  {result.home.summary && (
                    <p style={styles.homeSummary}>{result.home.summary}</p>
                  )}
                  {result.home.tips && result.home.tips.length > 0 && (
                    <ul style={styles.ul}>
                      {result.home.tips.map((t, i) => (
                        <li key={i} style={{ marginBottom: 4 }}>
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                  {result.home.watch && (
                    <p style={styles.homeWatch}>{result.home.watch}</p>
                  )}
                </div>
              )}

              {/* ⑥ 추천 노래 */}
              {result.theme && result.theme.songs && result.theme.songs.length > 0 && (
                <div style={styles.stepCard}>
                  <div style={styles.stepHead}>
                    <span style={styles.stepLabel}>
                      <span style={styles.stepDot}>6</span> 추천 노래
                    </span>
                  </div>
                  <ul style={styles.ul}>
                    {result.theme.songs.map((s, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ⑦ 마무리 루틴 */}
              {result.theme && result.theme.closing && result.theme.closing.length > 0 && (
                <div style={styles.stepCard}>
                  <div style={styles.stepHead}>
                    <span style={styles.stepLabel}>
                      <span style={styles.stepDot}>7</span> 마무리 루틴
                    </span>
                  </div>
                  <ol style={styles.ul}>
                    {result.theme.closing.map((c, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>
                        {c}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* 부모님 메모칸 */}
              <div style={styles.memoSection}>
                <div style={styles.memoTitle}>가정 관찰 메모</div>
                <div style={styles.memoBox}>
                  <div style={styles.memoLine} />
                  <div style={styles.memoLine} />
                  <div style={styles.memoLine} />
                </div>
              </div>

              <div style={styles.copyFoot}>
                © 검단ABA언어행동연구소 | 민다혜 (BCBA)
                <br />
                <span style={styles.copyFootSmall}>
                  본 자료는 검단ABA언어행동연구소의 지적재산입니다.
                </span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}


function Label({ children, req }) {
  return (
    <div style={styles.fieldLabel}>
      {children}
      {req && <span style={{ color: C.brand, marginLeft: 3 }}>*</span>}
    </div>
  );
}

// ---------- 관리자 계정 관리 패널 ----------
function AdminPanel({ api, isMobile, onClose, onLogout, me }) {
  const [users, setUsers] = useState([]);
  const [nId, setNId] = useState("");
  const [nPw, setNPw] = useState("");
  const [nName, setNName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const d = await api("listUsers");
      setUsers(d.users || []);
    } catch (e) {
      setMsg("목록을 불러오지 못했습니다.");
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addUser() {
    if (!nId.trim() || !nPw || !nName.trim()) {
      setMsg("아이디·비밀번호·이름을 모두 입력해 주세요.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await api("createUser", {
        username: nId.trim(),
        password: nPw,
        name: nName.trim(),
      });
      setNId("");
      setNPw("");
      setNName("");
      setMsg("선생님 계정을 추가했습니다.");
      load();
    } catch (e) {
      setMsg(String(e.message || e).includes("duplicate")
        ? "이미 있는 아이디입니다."
        : "추가에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u) {
    try {
      await api("setActive", { userId: u.id, active: !u.active });
      load();
    } catch {}
  }

  async function resetPw(u) {
    const np = window.prompt(`${u.name} 선생님의 새 비밀번호를 입력하세요`);
    if (!np) return;
    try {
      await api("resetPw", { userId: u.id, password: np });
      setMsg(`${u.name} 비밀번호를 변경했습니다.`);
    } catch {
      setMsg("비밀번호 변경에 실패했습니다.");
    }
  }

  return (
    <div style={{ ...styles.app, background: C.bg, padding: isMobile ? 10 : 20 }}>
      <div style={styles.adminShell}>
        <div style={styles.adminHead}>
          <div style={styles.brandRow}>
            <img src={LOGO_DATA_URL} alt="검단ABA" style={styles.logoBadgeSm} />
            <div>
              <div style={styles.brandTitle}>선생님 계정 관리</div>
              <div style={styles.brandSub}>관리자: {me.name}</div>
            </div>
          </div>
          <span style={{ display: "flex", gap: 6 }}>
            <button style={styles.miniBtn} onClick={onClose}>
              ← 생성기로
            </button>
            <button style={styles.miniBtn} onClick={onLogout}>
              로그아웃
            </button>
          </span>
        </div>

        {/* 계정 추가 */}
        <div style={styles.adminCard}>
          <div style={styles.adminCardTitle}>새 선생님 계정 부여</div>
          <div style={styles.adminForm}>
            <input
              style={styles.adminInput}
              placeholder="이름"
              value={nName}
              onChange={(e) => setNName(e.target.value)}
            />
            <input
              style={styles.adminInput}
              placeholder="아이디"
              autoCapitalize="none"
              value={nId}
              onChange={(e) => setNId(e.target.value)}
            />
            <input
              style={styles.adminInput}
              placeholder="비밀번호"
              value={nPw}
              onChange={(e) => setNPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUser()}
            />
            <button
              style={styles.adminAdd}
              onClick={addUser}
              disabled={busy}
            >
              {busy ? "추가 중…" : "계정 추가"}
            </button>
          </div>
          {msg && <div style={styles.adminMsg}>{msg}</div>}
        </div>

        {/* 계정 목록 */}
        <div style={styles.adminCard}>
          <div style={styles.adminCardTitle}>계정 목록 ({users.length})</div>
          {users.map((u) => (
            <div key={u.id} style={styles.adminRow}>
              <div style={{ flex: 1 }}>
                <span style={styles.adminName}>{u.name}</span>
                <span style={styles.adminId}>@{u.username}</span>
                {u.role === "admin" && (
                  <span style={styles.adminTag}>관리자</span>
                )}
                {!u.active && <span style={styles.inactiveTag}>비활성</span>}
              </div>
              {u.role !== "admin" && (
                <span style={{ display: "flex", gap: 6 }}>
                  <button
                    style={styles.miniBtn}
                    onClick={() => resetPw(u)}
                  >
                    비번변경
                  </button>
                  <button
                    style={styles.miniBtn}
                    onClick={() => toggleActive(u)}
                  >
                    {u.active ? "비활성화" : "활성화"}
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  // gate
  gate: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily:
      "'Apple SD Gothic Neo','Malgun Gothic',-apple-system,sans-serif",
  },
  gateCard: {
    width: 340,
    background: C.panel,
    borderRadius: 18,
    padding: "36px 28px",
    boxShadow: "0 12px 40px rgba(0,0,0,.08)",
    textAlign: "center",
    border: `1px solid ${C.line}`,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    objectFit: "contain",
    display: "block",
    margin: "0 auto 16px",
  },
  gateTitle: { fontSize: 20, fontWeight: 800, color: C.ink, margin: "0 0 6px" },
  gateSub: { fontSize: 13, color: C.sub, margin: "0 0 20px" },
  gateInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${C.line}`,
    fontSize: 15,
    outline: "none",
    marginBottom: 12,
  },
  gateErr: { color: "#C0392B", fontSize: 12.5, marginBottom: 10 },
  gateBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: 10,
    border: "none",
    background: C.brand,
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },
  gateFoot: { marginTop: 22, fontSize: 11.5, color: C.brandDark, fontWeight: 600, lineHeight: 1.6 },
  gateFootSmall: { fontSize: 10.5, color: C.sub, fontWeight: 400 },
  guideToggle: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1.5px solid ${C.brand}`,
    background: "#fff",
    color: C.brandDark,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 12,
  },
  guideBox: {
    textAlign: "left",
    background: C.brandSoft,
    borderRadius: 12,
    padding: "14px 14px 12px",
    margin: "0 0 16px",
  },
  guideStep: {
    display: "flex",
    gap: 10,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  guideNum: {
    width: 22,
    height: 22,
    flexShrink: 0,
    borderRadius: "50%",
    background: C.brand,
    color: "#fff",
    fontSize: 12,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  guideStepTitle: {
    fontSize: 12.5,
    fontWeight: 800,
    color: C.ink,
    marginBottom: 2,
  },
  guideStepText: { fontSize: 11.5, lineHeight: 1.55, color: C.sub },
  guideNote: {
    fontSize: 11.5,
    lineHeight: 1.5,
    color: C.brandDark,
    background: "#fff",
    borderRadius: 8,
    padding: "9px 11px",
    marginTop: 4,
  },

  // layout
  app: {
    minHeight: "100vh",
    padding: 20,
    fontFamily:
      "'Apple SD Gothic Neo','Malgun Gothic',-apple-system,sans-serif",
    color: C.ink,
  },
  shell: {
    maxWidth: 1180,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 20,
    alignItems: "start",
  },

  // left
  left: {
    background: C.panel,
    borderRadius: 16,
    padding: 20,
    border: `1px solid ${C.line}`,
    boxShadow: "0 6px 24px rgba(0,0,0,.04)",
  },
  brandRow: { display: "flex", gap: 10, alignItems: "center", marginBottom: 18 },
  logoBadgeSm: {
    width: 40,
    height: 40,
    borderRadius: 10,
    objectFit: "contain",
    display: "block",
    flexShrink: 0,
  },
  brandTitle: { fontSize: 15, fontWeight: 800 },
  brandSub: { fontSize: 11, color: C.sub, marginTop: 2 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: C.ink,
    paddingBottom: 8,
    borderBottom: `2px solid ${C.line}`,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: C.ink,
    margin: "16px 0 8px",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  levelCard: {
    padding: "10px 8px",
    borderRadius: 10,
    border: `1.5px solid ${C.line}`,
    background: "#fff",
    cursor: "pointer",
    textAlign: "center",
  },
  levelCardOn: {
    border: `1.5px solid ${C.brand}`,
    background: C.brandSoft,
  },
  levelName: { fontSize: 13.5, fontWeight: 700, color: C.brandDark },
  levelAge: { fontSize: 11, color: C.sub, marginTop: 2 },
  levelHint: {
    marginTop: 8,
    fontSize: 11.5,
    color: C.sub,
    background: C.brandSoft,
    borderRadius: 8,
    padding: "8px 10px",
    lineHeight: 1.5,
  },
  chips: { display: "flex", flexWrap: "wrap", gap: 7 },
  chip: {
    padding: "7px 11px",
    borderRadius: 20,
    border: `1.5px solid ${C.line}`,
    background: "#fff",
    cursor: "pointer",
    fontSize: 12.5,
    color: C.ink,
  },
  chipOn: { border: `1.5px solid ${C.brand}`, background: C.brandSoft, color: C.brandDark, fontWeight: 700 },
  addRow: { display: "flex", gap: 7, marginTop: 9 },
  addInput: {
    flex: 1,
    padding: "9px 11px",
    borderRadius: 9,
    border: `1.5px solid ${C.line}`,
    fontSize: 12.5,
    outline: "none",
  },
  addBtn: {
    padding: "0 16px",
    borderRadius: 9,
    border: "none",
    background: C.blue,
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  customList: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 },
  customChip: {
    padding: "6px 10px",
    borderRadius: 16,
    border: `1.5px solid ${C.brand}`,
    background: C.brandSoft,
    color: C.brandDark,
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 600,
  },
  domain: {
    padding: "9px 10px",
    borderRadius: 9,
    border: `1.5px solid ${C.line}`,
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
    textAlign: "left",
    color: C.ink,
  },
  domainOn: { border: `1.5px solid ${C.green}`, background: C.greenSoft, fontWeight: 700 },
  generate: {
    width: "100%",
    marginTop: 22,
    padding: "15px",
    borderRadius: 12,
    border: "none",
    background: C.brand,
    color: "#fff",
    fontWeight: 800,
    fontSize: 15.5,
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(217,118,66,.3)",
  },
  generateOff: { background: "#C9BCAD", boxShadow: "none", cursor: "default" },
  errBox: {
    marginTop: 12,
    fontSize: 12.5,
    color: "#C0392B",
    background: "#FBEAE7",
    borderRadius: 8,
    padding: "9px 12px",
  },

  // right
  right: {
    background: C.panel,
    borderRadius: 16,
    border: `1px solid ${C.line}`,
    boxShadow: "0 6px 24px rgba(0,0,0,.04)",
    minHeight: 560,
    overflow: "hidden",
  },
  outHead: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
    borderBottom: `1px solid ${C.line}`,
    flexWrap: "wrap",
  },
  outTag: {
    background: C.ink,
    color: "#fff",
    fontWeight: 800,
    fontSize: 11,
    padding: "5px 11px",
    borderRadius: 20,
    letterSpacing: 0.5,
  },
  outTitle: { fontSize: 14, fontWeight: 700, color: C.ink, flex: 1, minWidth: 100 },
  outActions: { display: "flex", gap: 8 },
  actBtn: {
    padding: "8px 13px",
    borderRadius: 9,
    border: `1px solid ${C.line}`,
    background: "#fff",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    color: C.ink,
  },
  actBtnDark: { background: C.green, color: "#fff", border: "none" },
  toast: {
    margin: "12px 20px 0",
    background: C.greenSoft,
    color: C.green,
    fontWeight: 700,
    fontSize: 13,
    padding: "10px 14px",
    borderRadius: 9,
    textAlign: "center",
  },
  empty: {
    textAlign: "center",
    color: C.sub,
    fontSize: 14.5,
    padding: "120px 20px",
    lineHeight: 1.7,
  },
  outBody: { padding: 20 },
  stepCard: {
    borderRadius: 14,
    padding: "16px 18px",
    marginBottom: 14,
    border: `1px solid ${C.line}`,
    background: "#fff",
    borderLeft: `4px solid ${C.brand}`,
  },
  stepOrange: {},
  stepBlue: {},
  stepGreen: {},
  stepHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: 800,
    color: C.ink,
    display: "flex",
    alignItems: "center",
  },
  stepDot: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: C.brand,
    color: "#fff",
    fontSize: 13,
    fontWeight: 800,
    marginRight: 8,
  },
  stepDotHome: { background: "#D4728A" },
  stepNo: {
    fontSize: 10.5,
    fontWeight: 800,
    color: "#fff",
    background: C.sub,
    padding: "3px 9px",
    borderRadius: 12,
    letterSpacing: 0.5,
  },
  kv: { fontSize: 13.5, margin: "4px 0", lineHeight: 1.6 },
  kvLabel: { fontSize: 13.5, fontWeight: 700, margin: "10px 0 2px" },
  tipBox: {
    fontSize: 13,
    color: C.brandDark,
    background: C.brandSoft,
    borderRadius: 10,
    padding: "10px 12px",
    marginTop: 10,
    lineHeight: 1.5,
  },
  ul: { margin: "4px 0", paddingLeft: 20, fontSize: 13.5, lineHeight: 1.7 },
  themeName: { fontSize: 14.5, fontWeight: 800, margin: "2px 0 12px" },
  scene: { marginBottom: 12 },
  sceneLabel: { fontSize: 13.5, fontWeight: 700, marginBottom: 3 },
  coachLine: {
    fontSize: 12.5,
    color: C.brandDark,
    background: C.brandSoft,
    borderRadius: 8,
    padding: "7px 10px",
    marginTop: 6,
    lineHeight: 1.5,
  },
  arrow: { fontSize: 13, color: "#4A4543", marginLeft: 6, lineHeight: 1.6, marginTop: 2 },
  variation: { marginBottom: 12, fontSize: 13.5, lineHeight: 1.65 },
  copyFoot: {
    marginTop: 18,
    fontSize: 11.5,
    color: C.brandDark,
    fontWeight: 600,
    textAlign: "center",
    paddingTop: 14,
    borderTop: `1px solid ${C.line}`,
    lineHeight: 1.6,
  },
  copyFootSmall: { fontSize: 10.5, color: C.sub, fontWeight: 400 },

  // user bar
  userBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: C.brandSoft,
    borderRadius: 10,
    padding: "8px 10px",
    marginBottom: 14,
  },
  userName: { fontSize: 13, fontWeight: 700, color: C.brandDark },
  adminTag: {
    fontSize: 10,
    fontWeight: 800,
    color: "#fff",
    background: C.brand,
    padding: "2px 7px",
    borderRadius: 10,
    marginLeft: 6,
  },
  inactiveTag: {
    fontSize: 10,
    fontWeight: 700,
    color: "#fff",
    background: "#B0A89C",
    padding: "2px 7px",
    borderRadius: 10,
    marginLeft: 6,
  },
  miniBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: `1px solid ${C.line}`,
    background: "#fff",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    color: C.ink,
  },

  // saved list
  savedWrap: { padding: "16px 20px" },
  savedHead: { fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 10 },
  savedAuthor: { fontSize: 12, color: C.brandDark, fontWeight: 600, marginLeft: 6 },
  savedRow: { display: "flex", gap: 8, marginBottom: 8, alignItems: "stretch" },
  savedOpen: {
    flex: 1,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "11px 13px",
    borderRadius: 10,
    border: `1px solid ${C.line}`,
    background: "#fff",
    cursor: "pointer",
    textAlign: "left",
  },
  savedTitle: { fontSize: 13.5, fontWeight: 600, color: C.ink },
  savedDate: { fontSize: 11.5, color: C.sub },
  savedDel: {
    width: 38,
    borderRadius: 10,
    border: `1px solid ${C.line}`,
    background: "#fff",
    color: C.sub,
    cursor: "pointer",
    fontSize: 13,
  },

  // admin panel
  adminShell: { maxWidth: 720, margin: "0 auto" },
  adminHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: C.panel,
    borderRadius: 16,
    padding: 18,
    border: `1px solid ${C.line}`,
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 10,
  },
  adminCard: {
    background: C.panel,
    borderRadius: 16,
    padding: 18,
    border: `1px solid ${C.line}`,
    marginBottom: 16,
  },
  adminCardTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: C.ink,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: `2px solid ${C.line}`,
  },
  adminForm: { display: "flex", flexWrap: "wrap", gap: 8 },
  adminInput: {
    flex: "1 1 140px",
    padding: "10px 12px",
    borderRadius: 9,
    border: `1.5px solid ${C.line}`,
    fontSize: 13.5,
    outline: "none",
  },
  adminAdd: {
    padding: "10px 18px",
    borderRadius: 9,
    border: "none",
    background: C.brand,
    color: "#fff",
    fontWeight: 700,
    fontSize: 13.5,
    cursor: "pointer",
  },
  adminMsg: { marginTop: 10, fontSize: 12.5, color: C.brandDark },
  adminRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 4px",
    borderBottom: `1px solid ${C.line}`,
    flexWrap: "wrap",
  },
  adminName: { fontSize: 14, fontWeight: 700, color: C.ink },
  adminId: { fontSize: 12.5, color: C.sub, marginLeft: 8 },
  childRow: { display: "flex", gap: 8, marginBottom: 8, alignItems: "center" },
  ageBadge: {
    flexShrink: 0,
    minWidth: 70,
    textAlign: "center",
    padding: "9px 12px",
    borderRadius: 9,
    background: C.brandSoft,
    color: C.brandDark,
    fontSize: 12.5,
    fontWeight: 700,
  },
  childMeta: { fontSize: 12.5, fontWeight: 600, color: C.brandDark },
  stepHome: { background: "#FFF4F6", borderLeftColor: "#D4728A" },
  homeSummary: {
    fontSize: 13.5,
    lineHeight: 1.65,
    margin: "2px 0 8px",
    fontWeight: 600,
    color: "#9B4257",
  },
  homeWatch: {
    fontSize: 13,
    lineHeight: 1.6,
    marginTop: 8,
    background: "#fff",
    borderRadius: 8,
    padding: "9px 11px",
    color: "#7A4350",
  },

  // view toggle
  modeRow: {
    display: "flex",
    gap: 8,
    padding: "12px 20px 0",
  },
  modeBtn: {
    flex: 1,
    padding: "9px 12px",
    borderRadius: 9,
    border: `1.5px solid ${C.line}`,
    background: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    color: C.sub,
  },
  modeBtnOn: {
    border: `1.5px solid ${C.brand}`,
    background: C.brandSoft,
    color: C.brandDark,
  },

  // parent homework sheet
  sheetBody: { padding: 20 },
  sheetHeader: {
    textAlign: "center",
    background: C.brand,
    borderRadius: 14,
    padding: "20px 16px",
    marginBottom: 16,
  },
  sheetBadge: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 800,
    color: "#fff",
    background: "#D4728A",
    padding: "4px 12px",
    borderRadius: 20,
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 20, fontWeight: 800, color: "#fff" },
  sheetDate: { fontSize: 12, color: "#B07A86", marginTop: 4 },
  sheetSec: { marginBottom: 18 },
  sheetSecTitle: {
    fontSize: 14.5,
    fontWeight: 800,
    color: C.ink,
    marginBottom: 8,
  },
  sheetLead: {
    fontSize: 14,
    lineHeight: 1.65,
    fontWeight: 600,
    color: "#9B4257",
    background: "#FFF6F8",
    borderRadius: 10,
    padding: "12px 14px",
    margin: 0,
  },
  sheetText: { fontSize: 13.5, lineHeight: 1.6, color: C.ink, margin: 0 },
  sheetUl: {
    margin: "6px 0 0",
    paddingLeft: 20,
    fontSize: 13.5,
    lineHeight: 1.7,
    color: C.ink,
  },
  sheetHint: { fontSize: 12.5, color: C.sub, margin: "0 0 10px" },
  playCard: {
    padding: "13px 14px",
    border: `1px solid ${C.line}`,
    borderRadius: 12,
    marginBottom: 10,
    background: "#fff",
  },
  playHead: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    marginBottom: 7,
  },
  playLabel: { fontSize: 13.5, fontWeight: 800, color: C.brandDark },
  playNum: {
    width: 24,
    height: 24,
    flexShrink: 0,
    borderRadius: "50%",
    background: C.brand,
    color: "#fff",
    fontWeight: 800,
    fontSize: 12.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  playText: { fontSize: 13.5, lineHeight: 1.65, color: C.ink, marginBottom: 10 },
  varCard: {
    fontSize: 13,
    lineHeight: 1.6,
    color: C.ink,
    padding: "10px 12px",
    background: "#FFF6F8",
    borderRadius: 10,
    marginBottom: 8,
  },
  dayRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  dayBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
  },
  dayLabel: { fontSize: 11, color: C.sub },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: `1.5px solid ${C.brand}`,
    display: "block",
  },
  memoBox: {
    border: `1px solid ${C.line}`,
    borderRadius: 12,
    padding: "14px 14px 4px",
    background: "#fff",
  },
  memoLine: {
    height: 28,
    borderBottom: `1px dashed ${C.line}`,
    marginBottom: 8,
  },
  memoSection: {
    borderRadius: 14,
    padding: "16px 18px",
    marginBottom: 14,
    border: `1px solid ${C.line}`,
    background: "#fff",
    borderLeft: `4px solid ${C.brand}`,
  },
  memoTitle: { fontSize: 15, fontWeight: 800, color: C.ink, marginBottom: 10 },
  memoSub: { fontSize: 12, color: C.sub, margin: "3px 0 10px" },
};
