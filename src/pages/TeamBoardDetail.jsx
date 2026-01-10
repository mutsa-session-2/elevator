import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import "../App.css";
import "./TeamBoardDetail.css";

import { HeartIcon } from "../components/teamBoard/BoardIcons.jsx";
import {
  createTeamBoardComment,
  getTeamBoard,
  getTeamBoardComments,
  toggleTeamBoardLike,
} from "../services/teamBoard.js";

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.comments)) return raw.comments;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
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

export default function TeamBoardDetail() {
  const navigate = useNavigate();
  const { teamId: teamIdParam, boardId: boardIdParam } = useParams();
  const teamId = Number(teamIdParam);
  const boardId = Number(boardIdParam);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [post, setPost] = useState(null);

  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsErr, setCommentsErr] = useState("");
  const [comments, setComments] = useState([]);

  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (!Number.isFinite(teamId) || !Number.isFinite(boardId)) return;

      try {
        setLoading(true);
        setErr("");
        const data = await getTeamBoard(teamId, boardId);
        if (ignore) return;

        // 좋아요 상태는 서버에 없을 수 있으니 _liked로만 관리
        setPost({
          ...data,
          _liked: !!(
            data?.liked ??
            data?.isLiked ??
            data?.myLike ??
            data?._liked
          ),
        });
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
  }, [teamId, boardId]);

  const loadComments = async () => {
    if (!Number.isFinite(teamId) || !Number.isFinite(boardId)) return;
    try {
      setCommentsLoading(true);
      setCommentsErr("");
      const raw = await getTeamBoardComments(teamId, boardId);
      setComments(normalizeList(raw));
    } catch (e) {
      setCommentsErr(e?.message ?? "댓글을 불러오지 못했어요.");
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, boardId]);

  const vm = useMemo(() => {
    const p = post || {};
    return {
      writerName: p.writerName ?? p.username ?? "익명",
      createdAt: p.createdAt,
      content: p.content ?? "",
      likeCount: toNum(p.likeCount, 0),
      liked: !!(p.liked ?? p.isLiked ?? p.myLike ?? p._liked),
    };
  }, [post]);

  const onToggleLike = async () => {
    if (!post) return;

    // 낙관적 업데이트
    setPost((prev) => {
      if (!prev) return prev;
      const nowLiked = !!(
        prev.liked ??
        prev.isLiked ??
        prev.myLike ??
        prev._liked
      );
      const nowCount = toNum(prev.likeCount, 0);
      const nextLiked = !nowLiked;
      const nextCount = Math.max(0, nowCount + (nextLiked ? 1 : -1));
      return {
        ...prev,
        _liked: nextLiked,
        liked: nextLiked,
        likeCount: nextCount,
      };
    });

    try {
      const res = await toggleTeamBoardLike(teamId, boardId);
      if (res && typeof res === "object" && res.likeCount != null) {
        setPost((prev) =>
          prev
            ? { ...prev, likeCount: toNum(res.likeCount, prev.likeCount) }
            : prev
        );
      }
    } catch (_) {
      // 실패 롤백 (다시 토글)
      setPost((prev) => {
        if (!prev) return prev;
        const nowLiked = !!(
          prev.liked ??
          prev.isLiked ??
          prev.myLike ??
          prev._liked
        );
        const nowCount = toNum(prev.likeCount, 0);
        const nextLiked = !nowLiked;
        const nextCount = Math.max(0, nowCount + (nextLiked ? 1 : -1));
        return {
          ...prev,
          _liked: nextLiked,
          liked: nextLiked,
          likeCount: nextCount,
        };
      });
    }
  };

  const onSendComment = async () => {
    const text = commentText.trim();
    if (!text || sending) return;

    try {
      setSending(true);
      setCommentsErr("");
      await createTeamBoardComment(teamId, boardId, { content: text });
      setCommentText("");
      await loadComments();
    } catch (e) {
      setCommentsErr(e?.message ?? "댓글 작성에 실패했어요.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="tp-board-detail-page">
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
            <div />
          </div>
        </div>
      </div>

      <div className="tp-board-content">
        {loading ? (
          <div className="tp-empty">불러오는 중...</div>
        ) : err ? (
          <div className="tp-error">{err}</div>
        ) : (
          <div className="tp-post-card">
            <div className="tp-post-top">
              <div className="tp-avatar" aria-hidden="true" />
              <div className="tp-post-meta">
                <div className="tp-post-author">{vm.writerName}</div>
                <div className="tp-post-date">
                  {formatKDateTime(vm.createdAt)}
                </div>
              </div>

              <button
                className={`tp-like-pill ${vm.liked ? "is-liked" : ""}`}
                onClick={onToggleLike}
                type="button"
                aria-label="좋아요"
              >
                <HeartIcon filled={vm.liked} className="tp-icon" />
                <span className="tp-like-count">{vm.likeCount}</span>
              </button>
            </div>

            <div className="tp-post-body">{vm.content || "내용이 없어요."}</div>

            <div className="tp-comment-box">
              <input
                className="tp-comment-input"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="댓글을 입력하세요"
                onKeyDown={(e) => e.key === "Enter" && onSendComment()}
              />
              <button
                className="tp-comment-send"
                onClick={onSendComment}
                disabled={sending}
              >
                {sending ? "..." : "댓글쓰기"}
              </button>
            </div>

            <div className="tp-comments">
              {commentsLoading ? (
                <div className="tp-empty-dark">댓글 불러오는 중...</div>
              ) : commentsErr ? (
                <div className="tp-error-dark">{commentsErr}</div>
              ) : comments.length === 0 ? (
                <div className="tp-empty-dark">첫 댓글을 남겨보세요.</div>
              ) : (
                comments.map((c, idx) => {
                  const cid = c.commentId ?? c.id ?? idx;
                  const author = c.writerName ?? c.username ?? "익명";
                  const createdAt = c.createdAt;
                  const content = c.content ?? "";
                  return (
                    <div className="tp-comment-item" key={cid}>
                      <div className="tp-avatar-sm" aria-hidden="true" />
                      <div className="tp-comment-main">
                        <div className="tp-comment-head">
                          <div className="tp-comment-author">{author}</div>
                          <div className="tp-comment-date">
                            {formatKDateTime(createdAt)}
                          </div>
                        </div>
                        <div className="tp-comment-text">{content}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
