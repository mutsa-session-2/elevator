import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import "../App.css";
import "./TeamBoardList.css";

import { HeartIcon, CommentIcon } from "../components/teamBoard/BoardIcons.jsx";
import { getTeamBoards, toggleTeamBoardLike } from "../services/teamBoard.js";

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatKDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd}. ${hh}:${mi}`;
}

export default function TeamBoardList() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [boards, setBoards] = useState([]);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (!Number.isFinite(teamId)) return;
      try {
        setLoading(true);
        setErr("");
        const data = await getTeamBoards(teamId); // ✅ Swagger: 배열
        if (ignore) return;

        // ✅ 좋아요 상태는 Swagger에 없을 수 있어서, 클라에서만 _liked로 관리
        const withLiked = Array.isArray(data)
          ? data.map((x) => ({ ...x, _liked: !!x._liked }))
          : [];
        setBoards(withLiked);
      } catch (e) {
        if (!ignore) setErr(e?.message ?? "게시글을 불러오지 못했어요.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [teamId]);

  const viewModels = useMemo(() => {
    return (Array.isArray(boards) ? boards : []).map((b) => ({
      boardId: toNum(b.boardId),
      author: b.username ?? "익명",
      createdAt: b.createdAt,
      content: b.content ?? "",
      likeCount: toNum(b.likeCount, 0),
      commentCount: toNum(b.commentCount, 0),
      liked: !!(b.liked ?? b.isLiked ?? b.myLike ?? b._liked), // 혹시 서버가 내려주면 자동 반영
    }));
  }, [boards]);

  const onToggleLike = async (e, vm) => {
    e.stopPropagation();

    // ✅ 낙관적 업데이트
    setBoards((prev) =>
      prev.map((b) => {
        if (toNum(b.boardId) !== vm.boardId) return b;

        const nowLiked = !!(b.liked ?? b.isLiked ?? b.myLike ?? b._liked);
        const nowCount = toNum(b.likeCount, 0);

        const nextLiked = !nowLiked;
        const nextCount = Math.max(0, nowCount + (nextLiked ? 1 : -1));

        return {
          ...b,
          _liked: nextLiked,
          liked: nextLiked,
          isLiked: nextLiked,
          myLike: nextLiked,
          likeCount: nextCount,
        };
      })
    );

    try {
      const res = await toggleTeamBoardLike(teamId, vm.boardId);

      // ✅ 서버가 likeCount를 반환하면 동기화 (Swagger엔 없어서 안전 처리)
      if (res && typeof res === "object" && res.likeCount != null) {
        setBoards((prev) =>
          prev.map((b) =>
            toNum(b.boardId) === vm.boardId
              ? { ...b, likeCount: toNum(res.likeCount, b.likeCount) }
              : b
          )
        );
      }
    } catch (_) {
      // ✅ 실패 롤백: 다시 토글
      setBoards((prev) =>
        prev.map((b) => {
          if (toNum(b.boardId) !== vm.boardId) return b;

          const nowLiked = !!(b.liked ?? b.isLiked ?? b.myLike ?? b._liked);
          const nowCount = toNum(b.likeCount, 0);

          const nextLiked = !nowLiked;
          const nextCount = Math.max(0, nowCount + (nextLiked ? 1 : -1));

          return {
            ...b,
            _liked: nextLiked,
            liked: nextLiked,
            isLiked: nextLiked,
            myLike: nextLiked,
            likeCount: nextCount,
          };
        })
      );
    }
  };

  return (
    <div className="tp-board-page">
      <div className="tp-board-header">
        <div className="tp-board-header-inner">
          <div className="tp-board-title-row">
            <button
              className="tp-back-btn"
              onClick={() => navigate(-1)}
              aria-label="뒤로"
            >
              ‹
            </button>

            <div className="tp-board-subtitle">
              <div className="tp-board-subtitle-title">팀 게시판</div>
              <div className="tp-board-subtitle-desc">
                팀원들과 소통해보세요.
              </div>
            </div>

            <button
              className="tp-write-btn"
              onClick={() => navigate(`/teamboard/${teamId}/write`)}
            >
              글 작성하기
            </button>
          </div>
        </div>
      </div>

      <div className="tp-board-content">
        {loading ? (
          <div className="tp-empty">불러오는 중...</div>
        ) : err ? (
          <div className="tp-error">{err}</div>
        ) : viewModels.length === 0 ? (
          <div className="tp-empty">아직 게시글이 없어요.</div>
        ) : (
          <div className="tp-board-list">
            {viewModels.map((vm) => (
              <div
                key={vm.boardId}
                className="tp-board-card"
                onClick={() => navigate(`/teamboard/${teamId}/${vm.boardId}`)}
                role="button"
                tabIndex={0}
              >
                <div className="tp-board-card-top">
                  <div className="tp-avatar" aria-hidden="true" />
                  <div className="tp-board-meta">
                    <div className="tp-board-author">{vm.author}</div>
                    <div className="tp-board-date">
                      {formatKDateTime(vm.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="tp-board-text">
                  {vm.content || "내용이 없어요."}
                </div>

                <div className="tp-board-card-bottom">
                  <button
                    className={`tp-react-btn ${vm.liked ? "is-liked" : ""}`}
                    onClick={(e) => onToggleLike(e, vm)}
                    aria-label="좋아요"
                    type="button"
                  >
                    <HeartIcon filled={vm.liked} className="tp-icon" />
                    <span className="tp-react-count">{vm.likeCount}</span>
                  </button>

                  <div
                    className="tp-react-btn tp-react-static"
                    aria-label="댓글 수"
                  >
                    <CommentIcon className="tp-icon" />
                    <span className="tp-react-count">{vm.commentCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
