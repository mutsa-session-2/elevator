// src/pages/JoinedTeamPlace.jsx
import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import "./JoinedTeamPlace.css";

// ✅ 여기만 바꿈: services/team.js 말고, 원래 되던 곳으로 고정
import { getTeams } from "../services/api.js";

function normalizeList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.teams)) return raw.teams;
  return [];
}

export default function JoinedTeamPlace() {
  const navigate = useNavigate();
  const location = useLocation();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await getTeams();
      setTeams(normalizeList(res));
    } catch (e) {
      // ✅ 401이면 로그인으로 보내고 싶으면 여기서 처리 가능
      if (e?.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setErr(e?.message ?? "팀 목록을 불러오지 못했어요.");
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams, location.key]);

  return (
    <div className="tp-page">
      <TeamHeader />

      <main className="tp-main">
        <div className="tp-actions">
          <button
            type="button"
            className="tp-actionBtn"
            onClick={() => navigate("/teamplace/join")}
          >
            팀 입장하기
          </button>
          <button
            type="button"
            className="tp-actionBtn"
            onClick={() => navigate("/teamplace/create")}
          >
            팀 만들기
          </button>
        </div>

        <section className="tp-card">
          <div className="tp-cardTitle">현재 들어가있는 팀</div>

          {loading ? (
            <div className="tp-muted">불러오는 중...</div>
          ) : err ? (
            <div className="tp-error">{err}</div>
          ) : teams.length === 0 ? (
            <div className="tp-muted">아직 입장한 팀이 없어요.</div>
          ) : (
            <div className="tp-list">
              {teams.map((t) => {
                const teamId = Number(t.teamId ?? t.id);
                return (
                  <button
                    key={teamId}
                    type="button"
                    className="tp-teamRow"
                    onClick={() => navigate(`/teamplacehome/${teamId}`)}
                  >
                    <div className="tp-teamRowTop">
                      <div className="tp-teamName">{t.name ?? "팀"}</div>
                      <div className="tp-goBtn">→</div>
                    </div>
                    <div className="tp-teamBody">
                      <div className="tp-teamDates">
                        {t.startDate ?? ""} ~ {t.endDate ?? ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Navbar />
    </div>
  );
}
