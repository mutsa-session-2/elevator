// src/pages/Home.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import ElevatorDoor from "../components/ElevatorDoor.jsx";
import QuestList from "../components/QuestList.jsx";
import { floors } from "../constants/floors.js";
import BackButton from "../components/BackButton.jsx";
import Navbar from "../components/Navbar.jsx";
import WeeklyAchievementModal from "../components/WeeklyAchievementModal.jsx";

// ✅ 팝업
import CoinPopup from "../components/CoinPopup.jsx";
import BadgePopup from "../components/BadgePopup.jsx";

import MonthProjects from "../components/MonthProjects.jsx";

import {
  getMyCharacter,
  getCalendarStats,
  getFloorsStatusByDate,
  getSchedules,
  getSchedule,
  deleteSchedule,
  http,
} from "../services/api.js";
import { AUTH_TOKEN_KEY } from "../config.js";

import "../App.css";
import floorBoardImg from "../assets/img/board 1.png";
import backgroundImg from "../assets/img/image 20.png";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ISO(Z 포함) → 로컬 YYYY-MM-DD (KST면 KST 기준)
function toYmdLocal(isoString) {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const elevatorInsideImg = "/images/frame.png";

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [direction, setDirection] = useState("up"); // (미사용이어도 유지)
  const [characterImageUrl, setCharacterImageUrl] = useState(null);

  // 진행도 상태
  const [progressInfo, setProgressInfo] = useState({
    percent: 0,
    done: 0,
    total: 0,
  });
  const [todayProgress, setTodayProgress] = useState({
    percent: 0,
    done: 0,
    total: 0,
  });
  const [projectCount, setProjectCount] = useState(0);

  // ✅ 주간 모달은 팝업 큐 끝난 뒤에만 띄우기
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [undoneTasks, setUndoneTasks] = useState([]); // 미달성 퀘스트
  const [showUndoneQuests, setShowUndoneQuests] = useState(false); // (미사용이어도 유지)
  const [loading, setLoading] = useState(false);

  // ✅✅✅ 팝업 큐 (안정 버전)
  // item: { type: "coin"|"badge", coinAmount?, badge?, asOfDate?, seenKey? }
  const [popupQueue, setPopupQueue] = useState([]);
  const activePopup = popupQueue.length ? popupQueue[0] : null;

  // ✅ "큐 준비 완료" 플래그 (초기 빈 배열을 '큐 종료'로 오해하는 레이스 방지)
  const [popupBootstrapped, setPopupBootstrapped] = useState(false);

  // ✅ Home 진입 플래그 — sessionStorage fallback + (온보딩 후 보상 플래그)까지 흡수
  const [entryFlags] = useState(() => {
    let fromSession = {};
    try {
      const raw = sessionStorage.getItem("home_entry_flags");
      fromSession = raw ? JSON.parse(raw) : {};
    } catch {
      fromSession = {};
    }

    let fromPostOnboarding = {};
    try {
      const raw2 = sessionStorage.getItem("post_onboarding_flags");
      fromPostOnboarding = raw2 ? JSON.parse(raw2) : {};
    } catch {
      fromPostOnboarding = {};
    }

    const fromNav = location.state || {};

    // 우선순위: 기존 세션 -> 온보딩 후 보상 -> navigate state
    const merged = { ...fromSession, ...fromPostOnboarding, ...fromNav };
    sessionStorage.setItem("home_entry_flags", JSON.stringify(merged));

    // 온보딩 완료해서 needsOnboarding이 false로 들어오면, 온보딩 후 보상 플래그는 정리해도 됨
    if (merged?.needsOnboarding === false) {
      sessionStorage.removeItem("post_onboarding_flags");
    }

    return merged;
  });

  const goToFloor = (targetFloor) => {
    if (isMoving || !isOpen || currentFloor === targetFloor) return;
    setDirection(targetFloor > currentFloor ? "up" : "down");
    setIsOpen(false);
    setTimeout(() => setIsMoving(true), 1500);
    setTimeout(() => {
      setIsMoving(false);
      setCurrentFloor(targetFloor);
      setTimeout(() => setIsOpen(true), 500);
    }, 3500);
  };

  const floor = floors[currentFloor]; // (미사용이어도 유지)

  // ✅ 오늘 획득한 뱃지(earnedAt이 "오늘"인 것들) 조회
  const fetchTodayEarnedBadges = async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return { asOfDate: null, earnedBadges: [] };

    try {
      const summary = await http.get("/api/me/badges/summary");

      const asOfDateRaw =
        summary?.asOfDate ??
        summary?.data?.asOfDate ??
        summary?.result?.asOfDate ??
        null;

      const asOfDate =
        typeof asOfDateRaw === "string" && asOfDateRaw.length >= 10
          ? asOfDateRaw.slice(0, 10)
          : null;

      const badges =
        summary?.badges ??
        summary?.data?.badges ??
        summary?.result?.badges ??
        [];

      if (!Array.isArray(badges)) {
        return { asOfDate, earnedBadges: [] };
      }

      // ✅ "오늘" 기준으로 필터 (asOfDate는 참고값으로만 둠)
      const todayYmd = formatDate(new Date());

      const earnedToday = badges.filter((b) => {
        const earnedAt = b?.earnedAt;
        if (!earnedAt) return false;
        return toYmdLocal(earnedAt) === todayYmd;
      });

      // ✅ 이미 본 뱃지는 제외(여러개 대응) - 키도 "오늘" 기준으로 묶기
      const filtered = earnedToday.filter((b) => {
        const badgeId = b?.badgeId ?? b?.id ?? null;
        const badgeKey =
          badgeId != null
            ? String(badgeId)
            : `${b?.name ?? "badge"}:${b?.earnedAt ?? ""}`;

        const seenKey = `badge_popup_seen:${todayYmd}:${badgeKey}`;
        return localStorage.getItem(seenKey) !== "1";
      });

      return { asOfDate, earnedBadges: filtered };
    } catch {
      return { asOfDate: null, earnedBadges: [] };
    }
  };

  // ✅ 팝업 닫기(큐 pop) — 뱃지는 "닫을 때" seen 처리
  const closeActivePopup = () => {
    setPopupQueue((prev) => {
      if (!prev.length) return prev;
      const first = prev[0];

      if (first?.type === "badge" && first?.seenKey) {
        localStorage.setItem(first.seenKey, "1");
      }

      return prev.slice(1);
    });
  };

  // =========================================================
  // ✅✅✅ (안정) 온보딩은 "먼저"
  // - 최초 로그인(신규 유저)만 needsOnboarding=true로 들어온다는 전제
  // - 온보딩 필요하면 Home에서 팝업 구성/표시하지 않고 /tendency로 즉시 이동
  // - 대신 보상 플래그는 sessionStorage(post_onboarding_flags)에 저장해서
  //   온보딩 완료 후 Home 재진입 때 동일 팝업 로직으로 처리
  // =========================================================
  useEffect(() => {
    const needsOnboarding = Boolean(entryFlags?.needsOnboarding);
    if (!needsOnboarding) return;

    // ✅ 신규유저 보상 플래그 보존(온보딩 후 홈에서 팝업 띄우기 위해)
    const firstLoginBonusGiven = Boolean(
      entryFlags?.firstLoginBonusGiven || entryFlags?.isFirstLogin
    );
    const dailyRewardGiven = Boolean(entryFlags?.dailyRewardGiven);

    sessionStorage.setItem(
      "post_onboarding_flags",
      JSON.stringify({
        // 보상 판단에 필요한 최소 플래그만 보존
        firstLoginBonusGiven,
        isFirstLogin: Boolean(entryFlags?.isFirstLogin),
        dailyRewardGiven,
        // 온보딩 끝나면 needsOnboarding은 false로 들어오게(온보딩 페이지에서 그렇게 보내거나)
        // 혹은 여기서도 false로 박아두고, tendency에서 /home 재진입 시 needsOnboarding:false로 보내는게 제일 깔끔
      })
    );

    // 현재 Home 진입 플래그는 일단 정리(루프 방지)
    sessionStorage.removeItem("home_entry_flags");
    sessionStorage.removeItem("weekly_modal_pending");

    navigate("/tendency", { replace: true });
  }, [entryFlags, navigate]);

  // =========================================================
  // ✅✅✅ (안정) Home 진입 시 팝업 큐 구성
  // - 50 → 10 → 뱃지(들) 순서 보장
  // - 온보딩 필요하면 여기서 아무것도 하지 않음(위 useEffect가 먼저 이동)
  // =========================================================
  useEffect(() => {
    const needsOnboarding = Boolean(entryFlags?.needsOnboarding);
    if (needsOnboarding) return;

    const firstLoginBonusGiven = Boolean(
      entryFlags?.firstLoginBonusGiven || entryFlags?.isFirstLogin
    );
    const dailyRewardGiven = Boolean(entryFlags?.dailyRewardGiven);

    (async () => {
      const q = [];

      // 1) 첫 로그인 50코인
      if (firstLoginBonusGiven) {
        q.push({ type: "coin", coinAmount: 50 });
      }

      // 2) 출석 10코인 (첫 로그인 날도 같이 지급될 수 있어 방어)
      if (dailyRewardGiven || firstLoginBonusGiven) {
        q.push({ type: "coin", coinAmount: 10 });
      }

      const { earnedBadges } = await fetchTodayEarnedBadges();
      if (earnedBadges.length > 0) {
        const todayYmd = formatDate(new Date());
        earnedBadges.forEach((badge) => {
          const badgeId = badge?.badgeId ?? badge?.id ?? null;
          const badgeKey =
            badgeId != null
              ? String(badgeId)
              : `${badge?.name ?? "badge"}:${badge?.earnedAt ?? ""}`;
          const seenKey = `badge_popup_seen:${todayYmd}:${badgeKey}`;
          q.push({ type: "badge", badge, asOfDate: todayYmd, seenKey });
        });
      }

      setPopupQueue(q);

      // ✅ 주간모달은 기존 유저(온보딩 X, 첫로그인 X)만, 그리고 큐 끝난 뒤에만
      if (!firstLoginBonusGiven && !needsOnboarding) {
        sessionStorage.setItem("weekly_modal_pending", "1");
      } else {
        sessionStorage.removeItem("weekly_modal_pending");
      }
    })();
  }, [entryFlags]);

  // =========================================================
  // ✅✅✅ (안정) 큐 종료 후 후처리: 주간모달 + 플래그 정리
  // - "큐를 아직 만들기 전(초기 빈 배열)"을 큐 종료로 착각하지 않도록 popupBootstrapped 가드
  // =========================================================
  useEffect(() => {
    if (!popupBootstrapped) return;
    if (popupQueue.length !== 0) return;

    // 기존유저면 주간모달
    const pendingWeekly =
      sessionStorage.getItem("weekly_modal_pending") === "1";
    if (pendingWeekly) {
      setShowWeeklyModal(true);
      sessionStorage.removeItem("weekly_modal_pending");
    }

    // Home 진입 플래그 정리
    sessionStorage.removeItem("home_entry_flags");
    // 온보딩 후 보상 플래그도 처리 끝났으면 정리
    sessionStorage.removeItem("post_onboarding_flags");
  }, [popupQueue.length, popupBootstrapped]);

  // =========================================================
  // ✅✅✅ "할 일 하나 달성할 때마다 10코인 팝업" (안정 큐 방식으로)
  // - progressInfo.done이 증가하면 그 증가분만큼 10코인 팝업을 큐에 추가
  // - 초기 로드(이미 완료된 것 반영)는 팝업을 띄우지 않음
  // - 팝업이 떠 있는 중에도 큐 뒤에 안전하게 붙음
  // =========================================================
  const prevDoneRef = useRef(null);

  useEffect(() => {
    if (!popupBootstrapped) return;

    const doneNow = Number(progressInfo?.done ?? 0);

    // 최초 1회는 기준만 잡고 팝업 없음(재접속/새로고침 시 중복 방지)
    if (prevDoneRef.current === null) {
      prevDoneRef.current = doneNow;
      return;
    }

    const delta = doneNow - prevDoneRef.current;
    if (delta > 0) {
      const bonusPopups = Array.from({ length: delta }, () => ({
        type: "coin",
        coinAmount: 10,
      }));

      setPopupQueue((prev) => [...prev, ...bonusPopups]);
    }

    prevDoneRef.current = doneNow;
  }, [progressInfo?.done, popupBootstrapped]);

  // 오늘 진행도 로드
  useEffect(() => {
    const loadTodayProgress = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

      try {
        const today = new Date();
        const todayStr = formatDate(today);
        const data = await getCalendarStats(todayStr, todayStr);

        if (Array.isArray(data) && data.length > 0) {
          const todayData =
            data.find((item) => item.date === todayStr) || data[0];
          if (todayData) {
            const done = todayData.completedCount || 0;
            const total =
              projectCount > 0 ? projectCount : todayData.totalCount || 0;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
            setTodayProgress({ percent, done, total });
          }
        } else if (data && data.totalCount !== undefined) {
          const done = data.completedCount || 0;
          const total = projectCount > 0 ? projectCount : data.totalCount || 0;
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;
          setTodayProgress({ percent, done, total });
        }
      } catch (error) {
        if (error.status !== 403)
          console.error("오늘의 진행도 로드 실패:", error);
      }
    };

    loadTodayProgress();
  }, [projectCount]);

  useEffect(() => {
    if (projectCount > 0) {
      setTodayProgress((prev) => {
        const percent =
          projectCount > 0 ? Math.round((prev.done / projectCount) * 100) : 0;
        return { ...prev, total: projectCount, percent };
      });
    }
  }, [projectCount]);

  // 캐릭터 이미지 로드
  useEffect(() => {
    const loadCharacter = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;
      try {
        const data = await getMyCharacter();
        if (data && data.imageUrl) setCharacterImageUrl(data.imageUrl);
      } catch (error) {
        if (error.status !== 403) console.error("캐릭터 로드 실패:", error);
      }
    };
    loadCharacter();
  }, []);

  useEffect(() => {
    const maxFloor = Object.keys(floors).length;
    const desired = Math.max(
      1,
      Math.min(1 + (progressInfo?.done ?? 0), maxFloor)
    );
    if (desired !== currentFloor) {
      goToFloor(desired);
    }
  }, [progressInfo, currentFloor, isMoving, isOpen]);

  useEffect(() => {
    if (projectCount > 0) {
      setTodayProgress((prev) => {
        const done = progressInfo.done || 0;
        const percent =
          projectCount > 0 ? Math.round((done / projectCount) * 100) : 0;
        return { ...prev, done, total: projectCount, percent };
      });
    }
  }, [progressInfo.done, projectCount]);

  // 오늘 날짜의 작업 목록 불러오기
  const loadTasks = async () => {
    const today = new Date();
    const todayStr = formatDate(today);
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    setLoading(true);

    if (!token) {
      setTasks([]);
      setUndoneTasks([]);
      setLoading(false);
      return;
    }

    try {
      // 오늘 날짜의 floors 가져오기
      const todayFloors = await getFloorsStatusByDate(todayStr);

      // 모든 일정 가져오기 (미달성 퀘스트를 위해)
      const allSchedules = await getSchedules({ year, month });

      if (Array.isArray(todayFloors) && todayFloors.length > 0) {
        // floors를 scheduleId별로 그룹화
        const scheduleMap = new Map();

        todayFloors.forEach((floorItem) => {
          const scheduleId = floorItem.scheduleId;
          if (!scheduleMap.has(scheduleId)) {
            scheduleMap.set(scheduleId, {
              scheduleId,
              title: floorItem.scheduleTitle || "제목 없음",
              color: floorItem.scheduleColor || "#3a8284",
              floors: [],
            });
          }
          scheduleMap.get(scheduleId).floors.push(floorItem);
        });

        // 오늘 날짜의 tasks 변환
        const todayTasks = await Promise.all(
          Array.from(scheduleMap.values()).map(async (schedule) => {
            try {
              const detail = await getSchedule(schedule.scheduleId);
              const startDate = detail.startDate;

              // 오늘 날짜가 startDate로부터 몇 번째 날인지 계산
              const start = new Date(startDate);
              const target = new Date(todayStr);
              start.setHours(0, 0, 0, 0);
              target.setHours(0, 0, 0, 0);
              const daysDiff = Math.floor(
                (target - start) / (1000 * 60 * 60 * 24)
              );

              // 오늘 날짜에 해당하는 floor만 필터링
              const todayFloor =
                schedule.floors.find((f, index) => {
                  return (
                    index === daysDiff ||
                    (daysDiff >= 0 &&
                      daysDiff < schedule.floors.length &&
                      index === daysDiff)
                  );
                }) || schedule.floors[0];

              const subtasks = [
                {
                  id: todayFloor.floorId || `sub-${schedule.scheduleId}-0`,
                  floorId: todayFloor.floorId,
                  scheduleId: schedule.scheduleId,
                  text: todayFloor.title || todayFloor.floorTitle || `단계 1`,
                  done: todayFloor.completed || false,
                  dayNumber: daysDiff + 1,
                },
              ];

              return {
                id: schedule.scheduleId?.toString() || `task-${Date.now()}`,
                title: schedule.title,
                progress: `${subtasks.filter((s) => s.done).length}/${
                  subtasks.length
                }`,
                subtasks,
                color: schedule.color,
                startDate: detail.startDate,
                endDate: detail.endDate,
              };
            } catch (err) {
              console.warn(
                `Schedule ${schedule.scheduleId} 상세 정보 로드 실패:`,
                err
              );
              return null;
            }
          })
        );

        const validTodayTasks = todayTasks.filter((t) => t !== null);
        setTasks(validTodayTasks);

        // 미달성 퀘스트 찾기 (과거 날짜에 있지만 완료되지 않은 계획)
        const undoneQuestsList = [];
        if (Array.isArray(allSchedules) && allSchedules.length > 0) {
          for (const schedule of allSchedules) {
            try {
              const detail = await getSchedule(schedule.scheduleId);
              const startDate = new Date(detail.startDate);
              const endDate = new Date(detail.endDate);
              const todayDate = new Date(todayStr);

              // 과거 날짜에 있는 계획인지 확인
              if (endDate < todayDate) {
                const floorsList = detail.floors || [];
                const undoneFloors = floorsList.filter((f) => !f.completed);

                if (undoneFloors.length > 0) {
                  const undoneSubtasks = undoneFloors.map(
                    (floorItem, index) => {
                      const floorDate = new Date(startDate);
                      floorDate.setDate(startDate.getDate() + index);
                      const daysDiff = Math.floor(
                        (floorDate - startDate) / (1000 * 60 * 60 * 24)
                      );

                      return {
                        id:
                          floorItem.floorId ||
                          `sub-${schedule.scheduleId}-${index}`,
                        floorId: floorItem.floorId,
                        scheduleId: schedule.scheduleId,
                        text: floorItem.title || `단계 ${index + 1}`,
                        done: floorItem.completed || false,
                        dayNumber: daysDiff + 1,
                        scheduledDate: formatDate(floorDate),
                      };
                    }
                  );

                  const doneCount = undoneSubtasks.filter((s) => s.done).length;
                  undoneQuestsList.push({
                    id: schedule.scheduleId?.toString() || `task-${Date.now()}`,
                    title: schedule.title || "제목 없음",
                    progress: `${doneCount}/${undoneSubtasks.length}`,
                    subtasks: undoneSubtasks,
                    color: schedule.color || "#3a8284",
                  });
                }
              }
            } catch (err) {
              console.warn(
                `미달성 퀘스트 로드 실패 (${schedule.scheduleId}):`,
                err
              );
            }
          }
        }
        setUndoneTasks(undoneQuestsList);

        // 오늘 작업 목록의 총 subtask 개수로 todayProgress 업데이트
        const totalSubtasks = validTodayTasks.reduce(
          (sum, task) => sum + task.subtasks.length,
          0
        );
        const doneSubtasks = validTodayTasks.reduce(
          (sum, task) => sum + task.subtasks.filter((s) => s.done).length,
          0
        );

        setTodayProgress((prev) => ({
          ...prev,
          total: totalSubtasks,
          done: doneSubtasks,
          percent:
            totalSubtasks > 0
              ? Math.round((doneSubtasks / totalSubtasks) * 100)
              : 0,
        }));
      } else {
        setTasks([]);
        setUndoneTasks([]);
        setTodayProgress((prev) => ({
          ...prev,
          total: 0,
          done: 0,
          percent: 0,
        }));
      }
    } catch (error) {
      console.error("일정 로드 실패:", error);
      setTasks([]);
      setUndoneTasks([]);
      setTodayProgress((prev) => ({
        ...prev,
        total: 0,
        done: 0,
        percent: 0,
      }));
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 작업 목록 불러오기
  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 일정 삭제 핸들러
  const handleDeleteSchedule = async (scheduleId) => {
    if (
      !window.confirm(
        "정말로 이 일정을 삭제하시겠습니까? 삭제된 일정은 복구할 수 없습니다."
      )
    ) {
      return;
    }

    try {
      await deleteSchedule(scheduleId);
      alert("일정이 삭제되었습니다.");
      await loadTasks();
    } catch (error) {
      console.error("일정 삭제 실패:", error);
      alert("일정 삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <div className="app home-view">
      <BackButton />

      <div className="home-header">
        <img className="home-logo" src="/images/logo.png" alt="FLOORIDA" />
      </div>

      <div className="elevator-wrapper">
        <div className={`elevator ${isMoving ? "elevator-moving" : ""}`}>
          <div className="floor-indicator-box">
            <img
              src={floorBoardImg}
              alt="층수 표시판"
              className="floor-indicator-bg"
            />
            <span className="floor-indicator-number">{currentFloor}</span>
          </div>

          <div className="floor-scene">
            <img
              src={backgroundImg}
              alt="배경"
              className="floor-background-img"
            />
          </div>

          <div
            className="elevator-inside"
            style={{ backgroundImage: `url(${elevatorInsideImg})` }}
          >
            {characterImageUrl && (
              <img
                src={characterImageUrl}
                alt="캐릭터"
                className="elevator-character"
              />
            )}
          </div>

          <ElevatorDoor isOpen={isOpen} />
        </div>
      </div>

      <QuestList
        progress={todayProgress.percent}
        done={todayProgress.done}
        total={todayProgress.total}
      />

      <MonthProjects
        onProgressChange={setProgressInfo}
        onProjectCountChange={setProjectCount}
      />

      <Navbar
        onNavigate={(key) => {
          if (key === "home") navigate("/home");
        }}
      />

      {/* ✅ 팝업 큐 (안정): entry + task-complete + badge 모두 같은 큐로 처리 */}
      {activePopup?.type === "coin" && (
        <CoinPopup
          coinAmount={activePopup.coinAmount}
          onClose={closeActivePopup}
        />
      )}

      {activePopup?.type === "badge" && activePopup?.badge && (
        <BadgePopup badge={activePopup.badge} onClose={closeActivePopup} />
      )}

      {/* ✅ 큐 끝난 뒤에만 주간 모달 */}
      {popupBootstrapped && popupQueue.length === 0 && showWeeklyModal && (
        <WeeklyAchievementModal onClose={() => setShowWeeklyModal(false)} />
      )}
    </div>
  );
}
