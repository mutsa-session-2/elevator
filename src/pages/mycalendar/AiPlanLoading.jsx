import React from "react";
import "./AiPlanLoading.css";

export default function AiPlanLoading() {
  return (
    <div className="aiLoading">
      <div className="aiSpinner" aria-label="loading" />
      <p className="aiLoadingTitle">계획 일정을 생성중입니다.</p>
      <p className="aiLoadingSub">조금만 기다려주세요.</p>
    </div>
  );
}
