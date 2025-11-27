import React from "react";
import "./AiPlanForm.css";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysISO(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AiPlanForm({
  initialGoal = "",
  initialStartDate,
  initialEndDate,
  errorText = "",
  onGenerate,
}) {
  const [goal, setGoal] = React.useState(initialGoal);
  const [startDate, setStartDate] = React.useState(
    initialStartDate || todayISO()
  );
  const [endDate, setEndDate] = React.useState(initialEndDate || addDaysISO(7));
  const [localError, setLocalError] = React.useState("");

  const validate = () => {
    if (!goal.trim()) return "목표를 입력해 주세요.";
    if (!startDate || !endDate) return "시작일/종료일을 입력해 주세요.";
    if (startDate > endDate) return "시작일은 종료일보다 늦을 수 없어요.";
    return "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = validate();
    setLocalError(msg);
    if (msg) return;

    onGenerate?.({
      goal: goal.trim(),
      startDate,
      endDate,
      teamId: null,
    });
  };

  const msg = localError || errorText;

  return (
    <div className="aiForm">
      <div className="aiFormTop">
        <button
          type="button"
          className="aiBackBtn"
          aria-label="뒤로"
          onClick={() => window.history.back()}
        >
          ‹
        </button>

        <div className="aiFormTitle">
          <h2>안녕하세요, AI 플래너입니다!</h2>
          <p>목표와 기간을 입력하세요.</p>
          <p>매일매일의 실천 계획을 세워드립니다.</p>
        </div>
      </div>

      <form className="aiFormBody" onSubmit={handleSubmit}>
        <label className="aiLabel">
          어떤 목표인가요?
          <textarea
            className="aiTextarea"
            placeholder="달성하고 싶은 계획을 입력해주세요!"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
          />
        </label>

        <label className="aiLabel">
          언제부터인가요?
          <input
            className="aiInput"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label className="aiLabel">
          언제까지인가요?
          <input
            className="aiInput"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>

        {msg ? <div className="aiError">{msg}</div> : null}

        <button className="aiPrimaryBtn" type="submit">
          AI로 계획 생성하기!
        </button>
      </form>
    </div>
  );
}
