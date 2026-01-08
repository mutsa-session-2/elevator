// pages/Mypage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";
import { logout } from "../services/auth.js";
import { AUTH_USER_KEY, AUTH_TOKEN_KEY } from "../config.js";
import {
  getCalendarStats,
  getMyCharacter,
  getMyBadges,
} from "../services/api.js";

const WEEKDAY_LABELS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// 이번 주의 날짜 계산 (월요일부터 일요일까지)
function getCurrentWeekDates() {
  const today = new Date();
  const day = today.getDay(); // 0 = 일요일, 1 = 월요일, ...
  const mondayOffset = day === 0 ? -6 : 1 - day; // 일요일이면 -6, 아니면 1-day

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const weekDates = [];
  const weekDateObjects = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    weekDates.push(date.getDate());
    weekDateObjects.push(date);
  }

  return { weekDates, weekDateObjects, monday };
}

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 완료율에 따른 색상 결정
function getColorByCompletionRate(rate) {
  if (rate === 0) return "#FF6A6A"; // 빨강
  if (rate >= 1 && rate <= 79) return "#E9DD3B"; // 노랑
  if (rate >= 80 && rate <= 100) return "#67D856"; // 초록
  return "transparent"; // 기본값
}

export default function Mypage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { weekDates, weekDateObjects, monday } = getCurrentWeekDates();
  const today = new Date().getDate();
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [characterImageUrl, setCharacterImageUrl] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    // localStorage에서 사용자 정보 가져오기
    const userData = localStorage.getItem(AUTH_USER_KEY);
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error("사용자 정보 파싱 실패:", e);
      }
    }
  }, []);

  // 캐릭터 이미지 로드
  useEffect(() => {
    const loadCharacter = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        return;
      }

      try {
        const data = await getMyCharacter();
        if (data && data.imageUrl) {
          setCharacterImageUrl(data.imageUrl);
        }
      } catch (error) {
        console.error("캐릭터 이미지 로드 실패:", error);
      }
    };

    loadCharacter();
  }, []);

  // 이번 주 달성률 데이터 로드
  useEffect(() => {
    const loadCalendarData = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const startDate = formatDate(monday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const endDate = formatDate(sunday);

        const data = await getCalendarStats(startDate, endDate);
        setCalendarData(data);
      } catch (error) {
        console.error("캘린더 데이터 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCalendarData();
  }, [monday]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    logout();
    navigate("/login");
  };

  // 날짜별 완료율 가져오기
  const getCompletionRate = (dateObj) => {
    if (!calendarData || !Array.isArray(calendarData)) return null;
    const dateStr = formatDate(dateObj);
    const dayData = calendarData.find((item) => item.date === dateStr);
    return dayData ? dayData.completionRate : null;
  };

  // 날짜별 상태 및 색상 결정
  const getDateStatus = (date, dateObj) => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const compareDate = new Date(dateObj);
    compareDate.setHours(0, 0, 0, 0);

    // 미래 날짜는 색상 없이 표시
    if (compareDate > todayDate) {
      return { status: "normal", color: null };
    }

    const completionRate = getCompletionRate(dateObj);

    if (date === today) {
      return {
        status: "current",
        color:
          completionRate !== null
            ? getColorByCompletionRate(completionRate)
            : null,
      };
    }

    if (completionRate === null) {
      return { status: "normal", color: null };
    }

    if (completionRate === 0) {
      return { status: "red", color: "#FF6A6A" };
    }

    if (completionRate >= 1 && completionRate <= 79) {
      return { status: "yellow", color: "#E9DD3B" };
    }

    if (completionRate >= 80 && completionRate <= 100) {
      return { status: "green", color: "#67D856" };
    }

    return { status: "normal", color: null };
  };

  const getCircleStyle = (status, color, date, dateObj) => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const compareDate = new Date(dateObj);
    compareDate.setHours(0, 0, 0, 0);
    const isToday =
      date === today && compareDate.getTime() === todayDate.getTime();

    if (status === "current" || isToday) {
      return {
        background: color || "transparent",
        color: color ? "#fff" : "#111827",
        border: "3px solid #111827",
        boxSizing: "border-box",
      };
    }
    if (status === "red") {
      return { background: "#FF6A6A", color: "#fff", border: "none" };
    }
    if (status === "yellow") {
      return { background: "#E9DD3B", color: "#111827", border: "none" };
    }
    if (status === "green") {
      return { background: "#67D856", color: "#fff", border: "none" };
    }
    return { background: "transparent", color: "#111827", border: "none" };
  };

  return (
    <div
      className="app home-view"
      style={{ background: "#DFDFDF", minHeight: "100vh" }}
    >
      <PersonalHeader />

      <main
        className="page-content"
        style={{
          width: "100%",
          maxWidth: "var(--panel-width)",
          margin: "0 auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          background: "#DFDFDF",
        }}
      >
        {/* 프로필 및 설정 패널 */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "18px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          {/* 프로필 헤더 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  background: characterImageUrl ? "transparent" : "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                }}
              >
                {characterImageUrl && (
                  <img
                    src={characterImageUrl}
                    alt="캐릭터"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#111827",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {user?.username || user?.name || "홍길동"}
              </span>
            </div>
            <div
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
                color: "#0A7C88",
                fontSize: "14px",
                fontFamily: "var(--font-sans)",
              }}
            >
              <span>로그아웃</span>
              <span style={{ fontSize: "12px" }}>›</span>
            </div>
          </div>

          {/* 구분선 */}
          <div
            style={{
              borderTop: "1px dashed #d1d5db",
              marginBottom: "16px",
            }}
          />

          {/* 메뉴 항목 */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {[
              {
                label: "프로필 관리",
                onClick: () => navigate("/profile-manage"),
              },
              {
                label: "성향 정보 수정",
                onClick: () => navigate("/tendency-edit"),
              },
              { label: "회원 탈퇴", onClick: () => navigate("/withdraw") },
            ].map((item, index) => (
              <div
                key={index}
                onClick={item.onClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  padding: "8px 0",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    color: "#111827",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {item.label}
                </span>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>›</span>
              </div>
            ))}
          </div>
        </div>

        {/* 획득한 뱃지 패널 */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "18px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <span
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#111827",
                fontFamily: "var(--font-sans)",
              }}
            >
              획득한 뱃지
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer",
                color: "#6b7280",
                fontSize: "14px",
                fontFamily: "var(--font-sans)",
              }}
            >
              <span>전체 보기</span>
              <span style={{ fontSize: "12px" }}>›</span>
            </div>
          </div>

          {/* 구분선 */}
          <div
            style={{
              borderTop: "1px dashed #d1d5db",
              marginBottom: "16px",
            }}
          />

          {/* 뱃지 목록 */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {[
              { emoji: "🏆", number: "50", color: "#fbbf24" },
              { emoji: "⭐", number: null, color: "#fbbf24" },
              { emoji: "💜", number: "30", color: "#a855f7" },
              { emoji: "❤️", number: "10", color: "#ef4444" },
              { emoji: "💙", number: "1", color: "#3b82f6" },
            ].map((badge, index) => (
              <div
                key={index}
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "12px",
                  background: badge.color,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  position: "relative",
                }}
              >
                <span>{badge.emoji}</span>
                {badge.number && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "4px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {badge.number}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 이번주 달성률 패널 */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "18px",
            padding: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <span
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#111827",
              fontFamily: "var(--font-sans)",
              display: "block",
              marginBottom: "16px",
            }}
          >
            이번주 달성률
          </span>

          {/* 구분선 */}
          <div
            style={{
              borderTop: "1px dashed #d1d5db",
              marginBottom: "16px",
            }}
          />

          {/* 요일별 달성률 */}
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                color: "#6b7280",
                fontFamily: "var(--font-sans)",
              }}
            >
              로딩 중...
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "8px",
                textAlign: "center",
                justifyItems: "center",
              }}
            >
              {weekDates.map((date, idx) => {
                const dateObj = weekDateObjects[idx];
                const { status, color } = getDateStatus(date, dateObj);
                const circleStyle = getCircleStyle(
                  status,
                  color,
                  date,
                  dateObj
                );
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {WEEKDAY_LABELS[idx]}
                    </span>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontFamily: "var(--font-sans)",
                        ...circleStyle,
                      }}
                    >
                      {date}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 로그아웃 모달 */}
      {showLogoutModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "24px",
              width: "90%",
              maxWidth: "320px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 16px 0",
                fontFamily: "var(--font-sans)",
                textAlign: "center",
              }}
            >
              로그아웃
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: "0 0 24px 0",
                fontFamily: "var(--font-sans)",
                textAlign: "center",
              }}
            >
              정말 로그아웃 하시겠습니까?
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{
                  background: "#f3f4f6",
                  color: "#111827",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  flex: 1,
                  maxWidth: "120px",
                }}
              >
                취소
              </button>
              <button
                onClick={confirmLogout}
                style={{
                  background: "#0A7C88",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  flex: 1,
                  maxWidth: "120px",
                }}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
