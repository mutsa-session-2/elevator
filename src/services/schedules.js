// src/services/schedules.js
import { http } from "./api.js";

function iso(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// 서버가 뻗거나(500) / 스펙 불일치(400) / 네트워크 오류 때도 UX가 멈추지 않게 임시 플랜 생성
export function buildFallbackPlan({
  goal,
  startDate,
  endDate,
  teamId = null,
  color,
}) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(
    1,
    Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
  );

  const steps = Math.min(10, Math.max(5, Math.round(days / 3)));
  const titles = [
    "목표 쪼개기 & 자료 정리",
    "핵심 개념 1회독",
    "핵심 개념 2회독",
    "실습/문제풀이 시작",
    "중간 점검 & 보완",
    "프로젝트/실전 적용",
    "취약 파트 보강",
    "최종 정리 & 회고",
    "모의 테스트/리허설",
    "마무리 산출물 정리",
  ].slice(0, steps);

  const floors = titles.map((t, i) => {
    const offset = Math.floor((i * (days - 1)) / Math.max(1, steps - 1));
    return {
      floorId: -(i + 1),
      title: t,
      scheduledDate: iso(addDays(start, offset)),
    };
  });

  return {
    scheduleId: null,
    title: (goal || "AI 일정").slice(0, 30),
    startDate,
    endDate,
    color: color || "#1E90FF",
    teamId,
    floors,
    warning: "서버 응답 문제로 임시 계획으로 표시 중입니다.",
  };
}

export async function createAiSchedule({
  goal,
  startDate,
  endDate,
  teamId,
  color,
}) {
  const body = { goal, startDate, endDate };
  if (teamId !== undefined && teamId !== null) body.teamId = teamId;
  if (color) body.color = color;

  try {
    return await http.post("/api/schedules/ai", body);
  } catch (err) {
    // 백엔드가 500을 던져도 서비스 중단 없이 화면은 흘러가게
    if (err?.status === 400 || err?.status === 500 || err?.status === 0) {
      return buildFallbackPlan({
        goal,
        startDate,
        endDate,
        teamId: teamId ?? null,
        color,
      });
    }
    throw err; // 401/403은 로그인 필요로 처리
  }
}

export async function patchSchedule(id, body) {
  return await http.patch(`/api/schedules/${id}`, body);
}
