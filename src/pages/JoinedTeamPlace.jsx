// src/pages/JoinedTeamPlace.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import { getTeams } from "../services/api.js";
import { getTeamMembersBadges } from "../services/badge.js";

// ✅ 팀원 캐릭터 프리뷰 컴포넌트
import { TeamCharactersPreview } from "../components/CharacterPreview.jsx";
// ✅ 팀원 캐릭터 조회 API (GET /api/items/{teamId}/characters)
import { getTeamCharacters } from "../services/team.js";

// ✅ 여기만 너네 라우트에 맞게 필요시 수정
const JOIN_ROUTE = "/teamplace/join";
const CREATE_ROUTE = "/teamplace/create";

export default function JoinedTeamPlace() {
  const navigate = useNavigate();
  const location = useLocation();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getTeams();
      const list = Array.isArray(data) ? data : [];
      setTeams(list);
    } catch (err) {
      if (err?.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (err?.status === 403) {
        setTeams([]);
        return;
      }
      setError(err?.message ?? "팀 조회 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // ✅ JoinedTeamPlace로 “들어올 때마다” 다시 불러오기
  useEffect(() => {
    let ignore = false;

    const run = async () => {
      if (ignore) return;
      await fetchTeams();
    };

    run();
    return () => {
      ignore = true;
    };
  }, [location.key, fetchTeams]);

  return (
    <div className="app home-view joined-teamplace">
      <TeamHeader />

      <style>{`
        /* ===== JoinedTeamPlace only (scoped) ===== */
        .joined-teamplace .teamplace-actions{
          display:flex;
          gap:20px;
          margin: 10px 0 16px;
        }
        .joined-teamplace .teamplace-btn{
          width:180px;
          height:60px;
          border-radius:10px;
          border:2px solid rgba(255,255,255,0.75);
          background: rgba(255,255,255,0.12);
          color:#fff;
          font-size:18px;
          font-weight:700;
          cursor:pointer;
        }
        .joined-teamplace .teamplace-btn:active{
          transform: translateY(1px);
        }

        .joined-teamplace .teamplace-section{
          margin-top: 6px;
        }
        .joined-teamplace .teamplace-section-title{
          margin: 0 0 10px;
          font-size: 18px;
          font-weight: 900;
          color: #111;
        }
        .joined-teamplace .teamplace-card-wrap{
          background: rgb(255, 255, 255);
          border-radius: 18px;
          padding: 16px;
          min-height: 600px;
          box-shadow: 0 10px 18px rgba(0,0,0,0.25);
        }
        .joined-teamplace .teamplace-empty{
          margin: 10px 0;
          font-size: 16px;
          color: rgba(0,0,0,0.6);
        }
        .joined-teamplace .teamplace-error{
          margin: 10px 0;
          font-size: 14px;
          color: rgba(220, 38, 38, 0.9);
          font-weight: 800;
        }

        .joined-teamplace .teamplace-teamcard{
          height: 160px;
          background: rgba(142, 142, 142, 0.08);
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          border: 0;
          width: 100%;
          text-align: left;
        }
        .joined-teamplace .teamplace-teamcard:active{
          transform: translateY(1px);
        }
        .joined-teamplace .teamplace-teamcard-top{
          padding: 10px 14px;
          background: rgba(0,0,0,0.07);
          display:flex;
          align-items: center;
          gap: 10px;
        }
        .joined-teamplace .teamplace-teamname{
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 18px;
          font-weight: 900;
          color: #111;
        }

        /* ✅ 연한 회색 본문 영역(미리보기 자리) */
        .joined-teamplace .teamplace-teamcard-mid{
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          margin-left:10px;
          padding-top:15px;
          min-height:0;
        }

        .joined-teamplace .teamplace-teamcard-bottom{
          display:flex;
          align-items:flex-end;
          justify-content: space-between;
          padding: 8px 14px 14px;
          gap: 10px;
        }
        .joined-teamplace .teamplace-period{
          font-size: 10px;
          color: rgba(0,0,0,0.55);
        }

        /* ✅ 카드 안 우측 버튼 영역 */
        .joined-teamplace .teamplace-card-actions{
          display: flex;
          gap: 8px;
          align-items: center;
        }

        /* ✅ (기존) 미니 버튼 */
        .joined-teamplace .teamplace-mini-btn{
          height: 34px;
          padding: 0 12px;
          border-radius: 10px;
          border: 0;
          background: rgba(0,0,0,0.08);
          color: #111;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }
        .joined-teamplace .teamplace-mini-btn:active{
          transform: translateY(1px);
        }

        /* ✅ (추가) 스크린샷처럼 "초록색 입장 버튼(→)" */
        .joined-teamplace .teamplace-enter-btn{
          width: 56px;
          padding: 0;
          border-radius: 12px;
          background: #1f9a95;   /* 너네 brand-teal 느낌 */
          color: #fff;
          font-size: 18px;
          font-weight: 900;
        }

        /* ✅✅✅ 팀원 캐릭터 프리뷰: 스와이프(가로 스크롤) 가능하게 */
        .joined-teamplace .teamplace-preview-wrap{
          display:flex;
          align-items: center;
          justify-content: flex-end;

          /* 중요: 여기만 스크롤 켜면 됨 */
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x;

          /* 카드 레이아웃 유지용 */
          min-width: 0;
          max-width: 240px; /* 필요하면 200~280 사이에서 조절 */

          padding: 2px 0;
          scrollbar-width: none; /* firefox */
        }
        .joined-teamplace .teamplace-preview-wrap::-webkit-scrollbar{
          display:none; 
          
        }

        /* ✅ TeamCharactersPreview(컴포넌트 하나)가 내용만큼 넓어지게 */
        .joined-teamplace .teamplace-preview-wrap > *{
          flex: 0 0 auto;
          width: max-content;
          
        }
      `}</style>

      <main className="page-content">
        <section className="teamplace-actions">
          <button
            className="teamplace-btn primary"
            type="button"
            onClick={() => navigate(JOIN_ROUTE)}
          >
            팀 입장하기
          </button>
          <button
            className="teamplace-btn"
            type="button"
            onClick={() => navigate(CREATE_ROUTE)}
          >
            팀 만들기
          </button>
        </section>

        <section className="teamplace-section">
          <div className="teamplace-card-wrap">
            <h2 className="teamplace-section-title">현재 들어가 있는 팀</h2>

            {loading ? (
              <p className="teamplace-empty">불러오는 중...</p>
            ) : error ? (
              <p className="teamplace-error">{error}</p>
            ) : teams.length === 0 ? (
              <p className="teamplace-empty">아직 입장한 팀이 없어요.</p>
            ) : (
              teams.map((team) => (
                <article
                  className="teamplace-teamcard"
                  key={team.teamId}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/teamplacehome/${team.teamId}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      navigate(`/teamplacehome/${team.teamId}`);
                    }
                  }}
                >
                  <div className="teamplace-teamcard-top">
                    <div className="teamplace-teamname">{team.name}</div>
                  </div>

                  {/* ✅✅✅ 연한 회색 본문에 팀원 미리보기 (스와이프 영역) */}
                  <div
                    className="teamplace-teamcard-mid"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    <div className="teamplace-preview-wrap">
                      <TeamCharactersPreview
                        teamId={team.teamId}
                        fetcher={getTeamCharacters}
                        badgesFetcher={getTeamMembersBadges}
                        max={999} // ✅ 4명 고정 제거 → 많아지면 가로로 길어짐(=스와이프 가능)
                        scale={0.5} // ✅ 스케일링 절대 유지
                        showNames={false}
                      />
                    </div>
                  </div>

                  <div className="teamplace-teamcard-bottom">
                    <div className="teamplace-period">
                      {team.startDate} ~ {team.endDate}
                    </div>

                    {/* ✅✅✅ "초록 버튼(→)" = 엘베 로직(TeamPlaceHome)로 이동 */}
                    <div className="teamplace-card-actions">
                      <button
                        type="button"
                        className="teamplace-mini-btn teamplace-enter-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/teamplacehome/${team.teamId}`);
                        }}
                        aria-label="팀플레이스 입장"
                      >
                        →
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <Navbar />
    </div>
  );
}
