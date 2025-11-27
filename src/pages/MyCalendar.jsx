// src/pages/MyCalendar.jsx
import React from "react";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";

import AiPlanForm from "./mycalendar/AiPlanForm.jsx";
import AiPlanLoading from "./mycalendar/AiPlanLoading.jsx";
import AiPlanResult from "./mycalendar/AiPlanResult.jsx";

import {
  createAiSchedule,
  patchSchedule,
  buildFallbackPlan,
} from "../services/schedules.js";

export default function MyCalendar() {
  const [step, setStep] = React.useState("form"); // 'form' | 'loading' | 'result'
  const [input, setInput] = React.useState(null); // {goal,startDate,endDate}
  const [schedule, setSchedule] = React.useState(null); // response from server OR fallback
  const [errorText, setErrorText] = React.useState("");

  const handleGenerate = async (payload) => {
    setErrorText("");
    setInput(payload);
    setStep("loading");

    try {
      const data = await createAiSchedule(payload);
      setSchedule(data);
      setStep("result");
    } catch (err) {
      // 인증 문제는 fallback으로 덮지 말고 안내
      if (err?.status === 401 || err?.status === 403) {
        setErrorText(
          "로그인이 필요하거나 권한이 없어요. 다시 로그인 후 시도해 주세요."
        );
        setStep("form");
        return;
      }
      // 그 외는 UX 중단 방지: fallback으로 결과 화면은 보여주기
      const fallback = buildFallbackPlan(payload);
      setSchedule(fallback);
      setStep("result");
    }
  };

  const handleRestart = () => {
    setErrorText("");
    setSchedule(null);
    setStep("form");
  };

  const handlePatch = async (patchBody) => {
    // scheduleId가 없으면(=fallback) 서버 PATCH 불가 -> 로컬만 갱신
    if (!schedule?.scheduleId) {
      setSchedule((prev) => ({ ...prev, ...patchBody }));
      return;
    }

    const updated = await patchSchedule(schedule.scheduleId, patchBody);
    setSchedule(updated);
  };

  return (
    <div className="app home-view">
      <PersonalHeader />

      <main
        className="page-content"
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          padding: "28px 16px 110px", // bottom nav 고려
          boxSizing: "border-box",
        }}
      >
        {/* ✅ 흰 패널 틀 유지 */}
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "#ffffff",
            borderRadius: "28px",
            minHeight: "870px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
            margin: 0,
            overflow: "hidden",
          }}
        >
          {step === "form" && (
            <AiPlanForm
              initialGoal={input?.goal}
              initialStartDate={input?.startDate}
              initialEndDate={input?.endDate}
              errorText={errorText}
              onGenerate={handleGenerate}
            />
          )}

          {step === "loading" && <AiPlanLoading />}

          {step === "result" && schedule && (
            <AiPlanResult
              schedule={schedule}
              onRestart={handleRestart}
              onPatch={handlePatch}
              onConfirm={() => {
                // TODO: "어디로 결정하기" 동작은 팀 UX에 맞게 연결
                // 예: navigate("/home") 혹은 특정 상세 페이지로 이동 등
                alert("TODO: 결정하기 동작 연결");
              }}
            />
          )}
        </div>
      </main>

      <Navbar />
    </div>
  );
}
