// src/services/api.js
// ✅ Vercel 배포에서 /api가 프론트(버셀)로 가서 405 나는 문제 해결:
//    API_BASE_URL이 비어있거나 프록시가 없을 때도 항상 app.floorida.site로 붙도록 처리

import { API_BASE_URL, AUTH_TOKEN_KEY } from "../config.js";

const DEFAULT_API_BASE_URL = "https://app.floorida.site";

// ✅ config.js의 API_BASE_URL이 비어있을 수 있으니 env도 같이 fallback
const BASE_URL = (
  API_BASE_URL ||
  import.meta.env?.VITE_API_BASE_URL ||
  DEFAULT_API_BASE_URL
).replace(/\/$/, "");

function buildHeaders(extra, { skipAuth = false } = {}) {
  const headers = new Headers({ "Content-Type": "application/json", ...extra });

  if (!skipAuth) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    // ✅ "null"/"undefined" 문자열 꼬임 방지
    if (token && token !== "null" && token !== "undefined") {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return headers;
}

export async function request(
  path,
  { method = "GET", body, headers, signal, skipAuth = false } = {}
) {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: buildHeaders(headers, { skipAuth }),
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(
      (data && (data.message || data.error)) || `HTTP ${res.status}`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const http = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
  patch: (path, body, opts) =>
    request(path, { ...opts, method: "PATCH", body }),
  del: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};

export default http;

// =========================
// APIs
// =========================

// 캐릭터 API
export async function getMyCharacter() {
  return await http.get("/api/characters/me");
}

// 장착 아이템 조회 API
export async function getMyEquippedItems() {
  return await http.get("/api/items/my/equipped");
}

// 장착 뱃지 조회 API
export async function getMyEquippedBadges() {
  return await http.get("/api/me/badges/equipped");
}

// 뱃지 목록 조회 API
export async function getMyBadges() {
  return await http.get("/api/me/badges");
}

// 닉네임 조회 API
export async function getMyUsername() {
  return await http.get("/api/me/username");
}

// 닉네임 업데이트 API
export async function updateUsername(username) {
  const payload = { username };
  if (import.meta.env?.DEV) {
    console.log("[profile] updateUsername payload", payload);
  }
  return await http.patch("/api/me/username", payload);
}

// 캘린더 완료 통계 API
export async function getCalendarStats(start, end) {
  return await http.get(
    `/api/floors/calendar/weekly-rates?start=${start}&end=${end}`
  );
}

// 일정 단건 조회 API
export async function getSchedule(id) {
  return await http.get(`/api/schedules/${id}`);
}

// 월간 일정 목록 조회
export function getSchedules({ year, month }) {
  return http.get(
    `/api/floors/calendar/month?year=${encodeURIComponent(
      year
    )}&month=${encodeURIComponent(month)}`
  );
}

// 개인 플랜 미달성 일정 조회
export async function getMissedPersonalPlace() {
  return await http.get("/api/me/personal-place/missed");
}

// 특정 날짜의 Floor 상태 조회
export async function getFloorsStatusByDate(date) {
  return await http.get(`/api/floors/status/date/${date}`);
}

// 일정 삭제 API
export async function deleteSchedule(id) {
  return await http.del(`/api/schedules/${id}`);
}

// Floor 삭제 API
export async function deleteFloor(id) {
  return await http.del(`/api/floors/${id}`);
}

// 오늘 할 일
export async function getTodayFloors() {
  return await http.get("/api/floors/today");
}

// Floor 완료 처리
export async function completeFloor(floorId) {
  return await http.post(`/api/floors/${floorId}/complete`, {});
}

// Floor 완료 취소
export async function uncompleteFloor(floorId) {
  return await http.post(`/api/floors/${floorId}/uncomplete`, {});
}

// 사용자 프로필 조회
export async function getMyProfile() {
  return await http.get("/api/me/profile");
}

// (더미) 서버 미구현
export async function updateFloorCompletion(
  floorId,
  completed,
  scheduleId = null
) {
  console.warn(
    "updateFloorCompletion: 백엔드에 완료 상태를 저장하는 엔드포인트가 없어, 프론트엔드에서만 상태를 변경합니다.",
    { floorId, completed, scheduleId }
  );
  return;
}

// Floor 추가
export async function createFloor(data) {
  return await http.post(`/api/floors`, data);
}

// Schedule 수정
export async function updateSchedule(id, data) {
  return await http.patch(`/api/schedules/${id}`, data);
}

// Floor 수정
export async function updateFloor(id, data) {
  return await http.patch(`/api/floors/${id}`, data);
}

// 팀 목록 조회
export async function getTeams() {
  return await http.get("/api/teams");
}

// 팀 캐릭터 조회
export async function getTeamCharacters(teamId) {
  if (teamId == null) throw new Error("teamId is required");
  return await http.get(`/api/items/${teamId}/characters`);
}

// 팀 단건 조회
export async function getTeam(teamId) {
  if (teamId == null) throw new Error("teamId is required");
  return await http.get(`/api/teams/${teamId}`);
}

// 팀 멤버 목록
export async function getTeamMembers(teamId) {
  if (teamId == null) throw new Error("teamId is required");
  return await http.get(`/api/teams/${teamId}/members`);
}

// 팀 멤버 퇴출
export async function removeTeamMember(teamId, targetUserId) {
  if (teamId == null) throw new Error("teamId is required");
  if (targetUserId == null) throw new Error("targetUserId is required");
  return await http.del(`/api/teams/${teamId}/members/${targetUserId}`);
}

// 팀 나가기
export async function leaveTeam(teamId) {
  if (teamId == null) throw new Error("teamId is required");
  return await http.del(`/api/teams/${teamId}/leave`);
}

// 팀 폭파
export async function deleteTeam(teamId, password) {
  if (teamId == null) throw new Error("teamId is required");
  if (!password) throw new Error("password is required");

  // http.del은 body를 못 받으니까 request 직접 호출
  return await request(`/api/teams/${teamId}`, {
    method: "DELETE",
    body: { password },
  });
}

// 팀 할 일 목록
export async function getTeamFloors(teamId) {
  if (teamId == null) throw new Error("teamId is required");
  return await http.get(`/api/teams/${teamId}/floors`);
}

// 팀 할 일 완료
export async function completeTeamFloor(teamFloorId) {
  if (teamFloorId == null) throw new Error("teamFloorId is required");
  return await http.post(`/api/teams/floors/${teamFloorId}/complete`, {});
}

// 팀 할 일 완료 취소
export async function cancelTeamFloor(teamFloorId) {
  if (teamFloorId == null) throw new Error("teamFloorId is required");
  return await http.post(`/api/teams/floors/${teamFloorId}/cancel`, {});
}
