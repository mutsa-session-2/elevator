import React from "react";
import "./AiPlanResult.css";

function buildMonthMatrix(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  // 월요일 시작으로 보이게(월=0 ... 일=6)
  const firstWeekday = (first.getDay() + 6) % 7;
  const totalDays = last.getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function fmtRange(startDate, endDate) {
  return `${startDate} ~ ${endDate}`;
}

function inRange(dateObj, startISO, endISO) {
  if (!dateObj) return false;
  const d = dateObj.toISOString().slice(0, 10);
  return d >= startISO && d <= endISO;
}

/**
 * schedule shape (서버/폴백 공통)
 * {
 *  scheduleId: number|null,
 *  title: string,
 *  startDate: "YYYY-MM-DD",
 *  endDate: "YYYY-MM-DD",
 *  color: "#RRGGBB" (optional),
 *  teamId: number|null,
 *  floors: [{ floorId, title, scheduledDate }]
 *  warning?: string
 * }
 */
export default function AiPlanResult({
  schedule,
  onRestart,
  onPatch,
  onConfirm,
}) {
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [isEditingDates, setIsEditingDates] = React.useState(false);

  const [titleDraft, setTitleDraft] = React.useState(schedule?.title ?? "");
  const [startDraft, setStartDraft] = React.useState(schedule?.startDate ?? "");
  const [endDraft, setEndDraft] = React.useState(schedule?.endDate ?? "");

  React.useEffect(() => {
    setTitleDraft(schedule?.title ?? "");
    setStartDraft(schedule?.startDate ?? "");
    setEndDraft(schedule?.endDate ?? "");
  }, [schedule]);

  const baseMonth = React.useMemo(
    () => new Date(schedule.startDate),
    [schedule.startDate]
  );
  const cells = React.useMemo(() => buildMonthMatrix(baseMonth), [baseMonth]);

  const saveTitle = async () => {
    setIsEditingTitle(false);
    const next = titleDraft.trim() || schedule.title;
    if (next === schedule.title) return;
    await onPatch?.({ title: next });
  };

  const saveDates = async () => {
    if (startDraft > endDraft) return;
    setIsEditingDates(false);
    if (startDraft === schedule.startDate && endDraft === schedule.endDate)
      return;
    await onPatch?.({ startDate: startDraft, endDate: endDraft });
  };

  const floors = Array.isArray(schedule.floors) ? schedule.floors : [];

  return (
    <div className="aiResult">
      <div className="aiResultHeader">
        <h2>계획이 완성되었어요!</h2>
        <p>수정할 부분이 있는지 확인해주세요.</p>
      </div>

      {schedule?.warning ? (
        <div className="aiWarning">{schedule.warning}</div>
      ) : null}

      {/* 프로젝트 이름 */}
      <div className="aiRow">
        <div className="aiRowLabel">프로젝트 이름</div>
        <div className="aiRowValue">
          {isEditingTitle ? (
            <>
              <input
                className="aiInlineInput"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
              />
              <button className="aiMiniBtn" onClick={saveTitle} type="button">
                저장
              </button>
            </>
          ) : (
            <>
              <span className="aiTextStrong" title={schedule.title}>
                {schedule.title}
              </span>
              <button
                className="aiIconBtn"
                type="button"
                onClick={() => setIsEditingTitle(true)}
              >
                ✎
              </button>
            </>
          )}
        </div>
      </div>

      {/* 기간 */}
      <div className="aiRow">
        <div className="aiRowLabel">프로젝트 기간</div>
        <div className="aiRowValue">
          {isEditingDates ? (
            <>
              <input
                className="aiInlineInput"
                type="date"
                value={startDraft}
                onChange={(e) => setStartDraft(e.target.value)}
              />
              <span className="aiTilde">~</span>
              <input
                className="aiInlineInput"
                type="date"
                value={endDraft}
                onChange={(e) => setEndDraft(e.target.value)}
              />
              <button
                className="aiMiniBtn"
                type="button"
                onClick={saveDates}
                disabled={startDraft > endDraft}
              >
                저장
              </button>
            </>
          ) : (
            <>
              <span className="aiText">
                {fmtRange(schedule.startDate, schedule.endDate)}
              </span>
              <button
                className="aiIconBtn"
                type="button"
                onClick={() => setIsEditingDates(true)}
              >
                ✎
              </button>
            </>
          )}
        </div>
      </div>

      {/* AI 설명 */}
      <div className="aiRowBlock">
        <div className="aiRowLabel">AI 계획 설명</div>
        <div className="aiExplain">
          입력하신 목표와 기간을 바탕으로 단계별 계획을 생성했어요. (결과는
          필요하면 수정할 수 있어요!)
        </div>
      </div>

      {/* 캘린더 */}
      <div className="aiCalendarCard">
        <div className="aiCalendarTitle">캘린더로 확인해 보기</div>
        <div className="aiCalendarMonth">
          {baseMonth.getFullYear()}년 {baseMonth.getMonth() + 1}월
        </div>

        <div className="aiWeekHeader">
          {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => (
            <div key={d} className="aiWeekDay">
              {d}
            </div>
          ))}
        </div>

        <div className="aiGrid">
          {cells.map((dateObj, idx) => {
            const highlighted = inRange(
              dateObj,
              schedule.startDate,
              schedule.endDate
            );
            const dayNum = dateObj ? dateObj.getDate() : "";
            return (
              <div
                key={idx}
                className={`aiCell ${dateObj ? "isDay" : "isEmpty"} ${
                  highlighted ? "isOn" : ""
                }`}
                style={
                  highlighted
                    ? {
                        background: "rgba(58, 130, 132, 0.25)",
                        borderColor: "rgba(58, 130, 132, 0.45)",
                      }
                    : undefined
                }
              >
                <span className="aiCellNum">{dayNum}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* floors 목록 */}
      <div className="aiFloors">
        <div className="aiFloorsTitle">단계별 계획</div>
        {floors.length === 0 ? (
          <div className="aiEmpty">표시할 단계가 없어요.</div>
        ) : (
          <ul className="aiList">
            {floors.map((f) => (
              <li
                key={`${f.floorId}-${f.scheduledDate}`}
                className="aiListItem"
              >
                <span className="aiDate">{f.scheduledDate}</span>
                <span className="aiFloorTitle">{f.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button className="aiPrimaryBtn" type="button" onClick={onConfirm}>
        이대로 결정하기
      </button>
      <div className="noticementresult">나의 개인 캘린더에 추가됩니다.</div>

      <button className="aiSecondaryBtn" type="button" onClick={onRestart}>
        처음부터 다시 입력하기
      </button>
      <div className="noticementresult">프롬프트 입력 창으로 돌아갑니다.</div>
    </div>
  );
}
