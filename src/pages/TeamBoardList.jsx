import React, { useEffect, useMemo, useState, memo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import "../App.css";
import "./TeamBoardList.css";

import { HeartIcon, CommentIcon } from "../components/teamBoard/BoardIcons.jsx";
import { getTeamBoards, toggleTeamBoardLike } from "../services/teamBoard.js";
import { http } from "../services/api.js";

// ✅ (선택) 기본 바디가 필요하면 아래 파일이 프로젝트에 있어야 함
import baseChar from "../assets/ch/cha_1.png";

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getUserId(obj) {
  const v = obj?.userId ?? obj?.userid ?? obj?.writerId ?? obj?.authorId;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function normalizeList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.members)) return raw.members;
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

const BASE_W = 114;
const BASE_H = 126;

const LAYER_ORDER = {
  CHARACTER: 0,
  BASE: 0,
  FACE: 1,
  ACCESSORY: 2,
  BADGE: 3,
};

function layerRank(t) {
  const key = String(t ?? "").toUpperCase();
  return LAYER_ORDER[key] ?? 10;
}

function normalizeLayers(equippedItems, equippedBadges) {
  const items = Array.isArray(equippedItems) ? equippedItems : [];
  const badgesRaw = Array.isArray(equippedBadges) ? equippedBadges : [];
  const badges = badgesRaw
    .filter((b) => b?.equipped === true)
    .map((b) => ({ ...b, __layerType: "BADGE" }));

  const merged = [
    ...items.map((x) => ({ ...x, __layerType: x?.itemType })),
    ...badges,
  ];

  const cleaned = merged
    .map((l) => {
      const imageUrl = pick(l, "imageUrl", "imgUrl", "url");
      const offsetX = toNum(pick(l, "offsetX", "x", "left"), 0);
      const offsetY = toNum(pick(l, "offsetY", "y", "top"), 0);
      const width = toNum(pick(l, "width", "w"), 0);
      const height = toNum(pick(l, "height", "h"), 0);
      return { ...l, imageUrl, offsetX, offsetY, width, height };
    })
    .filter((l) => !!l.imageUrl);

  cleaned.sort((a, b) => layerRank(a.__layerType) - layerRank(b.__layerType));
  return cleaned;
}

// ✅ bbox는 "레이어 + 기본 캐릭터(0,0,114,126)"를 함께 포함
function computeBBox(layers) {
  const valid = (layers || []).filter(
    (l) =>
      Number.isFinite(l.offsetX) &&
      Number.isFinite(l.offsetY) &&
      Number.isFinite(l.width) &&
      Number.isFinite(l.height) &&
      l.width > 0 &&
      l.height > 0
  );

  let minX = 0;
  let minY = 0;
  let maxX = BASE_W;
  let maxY = BASE_H;

  for (const l of valid) {
    minX = Math.min(minX, l.offsetX);
    minY = Math.min(minY, l.offsetY);
    maxX = Math.max(maxX, l.offsetX + l.width);
    maxY = Math.max(maxY, l.offsetY + l.height);
  }

  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);

  return { minX, minY, w: Math.max(w, BASE_W), h: Math.max(h, BASE_H) };
}

// ✅ transform 없이 "좌표/크기 자체를 스케일링"해서 배치
const CharacterAvatar = memo(function CharacterAvatar({
  className,
  size = 44,
  member,
  badgeMember,
}) {
  const equippedItems = member?.equippedItems;
  const equippedBadges = badgeMember?.equippedBadges;

  const layers = useMemo(
    () => normalizeLayers(equippedItems, equippedBadges),
    [equippedItems, equippedBadges]
  );

  const bbox = useMemo(() => computeBBox(layers), [layers]);
  const scale = Math.min(size / bbox.w, size / bbox.h);

  const stageW = bbox.w * scale;
  const stageH = bbox.h * scale;
  const stageLeft = (size - stageW) / 2;
  const stageTop = (size - stageH) / 2;

  const baseLeft = stageLeft + (0 - bbox.minX) * scale;
  const baseTop = stageTop + (0 - bbox.minY) * scale;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        position: "relative",
        flex: "0 0 auto",
        background: "rgba(255,255,255,0.15)",
      }}
      aria-hidden="true"
    >
      {/* ✅ 기본 바디 */}
      <img
        src={baseChar}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: baseLeft,
          top: baseTop,
          width: BASE_W * scale,
          height: BASE_H * scale,
          objectFit: "contain",
          display: "block",
        }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />

      {/* ✅ 아이템/뱃지 레이어 */}
      {layers.map((l, idx) => (
        <img
          key={`${l.itemId ?? l.badgeId ?? idx}-${idx}`}
          src={l.imageUrl}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: stageLeft + (l.offsetX - bbox.minX) * scale,
            top: stageTop + (l.offsetY - bbox.minY) * scale,
            width: l.width * scale,
            height: l.height * scale,
            objectFit: "contain",
            display: "block",
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ))}
    </div>
  );
});

export default function TeamBoardList() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [boards, setBoards] = useState([]);

  // ✅ 팀원 캐릭터/뱃지 상태
  const [membersChars, setMembersChars] = useState([]);
  const [membersBadges, setMembersBadges] = useState([]);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (!Number.isFinite(teamId)) return;
      try {
        setLoading(true);
        setErr("");
        const data = await getTeamBoards(teamId); // ✅ Swagger: 배열
        if (ignore) return;

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

  useEffect(() => {
    let ignore = false;

    const loadVisuals = async () => {
      if (!Number.isFinite(teamId)) return;

      try {
        const [charsRes, badgesRes] = await Promise.allSettled([
          http.get(`/api/items/${teamId}/characters`),
          http.get(`/api/badges/team/${teamId}/members`),
        ]);

        if (ignore) return;

        const chars =
          charsRes.status === "fulfilled" ? normalizeList(charsRes.value) : [];
        const badges =
          badgesRes.status === "fulfilled"
            ? normalizeList(badgesRes.value)
            : [];

        setMembersChars(chars);
        setMembersBadges(badges);
      } catch (_) {
        if (!ignore) {
          setMembersChars([]);
          setMembersBadges([]);
        }
      }
    };

    loadVisuals();
    return () => {
      ignore = true;
    };
  }, [teamId]);

  const { charById, charByName, badgeById, badgeByName } = useMemo(() => {
    const cId = new Map();
    const cName = new Map();
    for (const m of Array.isArray(membersChars) ? membersChars : []) {
      const id = getUserId(m);
      const name = pick(m, "username", "userName", "name");
      if (id != null) cId.set(id, m);
      if (name) cName.set(String(name), m);
    }

    const bId = new Map();
    const bName = new Map();
    for (const m of Array.isArray(membersBadges) ? membersBadges : []) {
      const id = getUserId(m);
      const name = pick(m, "username", "userName", "name");
      if (id != null) bId.set(id, m);
      if (name) bName.set(String(name), m);
    }

    return {
      charById: cId,
      charByName: cName,
      badgeById: bId,
      badgeByName: bName,
    };
  }, [membersChars, membersBadges]);

  const resolveMember = (userId, username) => {
    if (userId != null)
      return charById.get(userId) ?? charByName.get(String(username));
    return charByName.get(String(username));
  };

  const resolveBadgeMember = (userId, username) => {
    if (userId != null)
      return badgeById.get(userId) ?? badgeByName.get(String(username));
    return badgeByName.get(String(username));
  };

  const viewModels = useMemo(() => {
    return (Array.isArray(boards) ? boards : []).map((b) => ({
      boardId: toNum(b.boardId),
      authorId: getUserId(b),
      author: b.username ?? b.writerName ?? "익명",
      createdAt: b.createdAt,
      content: b.content ?? "",
      likeCount: toNum(b.likeCount, 0),
      commentCount: toNum(b.commentCount, 0),
      liked: !!(b.liked ?? b.isLiked ?? b.myLike ?? b._liked),
    }));
  }, [boards]);

  const onToggleLike = async (e, vm) => {
    e.stopPropagation();

    // ✅ 낙관적 업데이트
    setBoards((prev) =>
      (Array.isArray(prev) ? prev : []).map((b) => {
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

      // ✅ 서버가 likeCount를 반환하면 동기화
      if (res && typeof res === "object" && res.likeCount != null) {
        setBoards((prev) =>
          (Array.isArray(prev) ? prev : []).map((b) =>
            toNum(b.boardId) === vm.boardId
              ? { ...b, likeCount: toNum(res.likeCount, b.likeCount) }
              : b
          )
        );
      }
    } catch (_) {
      // ✅ 실패 롤백: 다시 토글
      setBoards((prev) =>
        (Array.isArray(prev) ? prev : []).map((b) => {
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
            {viewModels.map((vm) => {
              const member = resolveMember(vm.authorId, vm.author);
              const badgeMember = resolveBadgeMember(vm.authorId, vm.author);

              return (
                <div
                  key={vm.boardId}
                  className="tp-board-card"
                  onClick={() => navigate(`/teamboard/${teamId}/${vm.boardId}`)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="tp-board-card-top">
                    {/* ✅ 작성자 캐릭터 프리뷰 */}
                    <CharacterAvatar
                      className="tp-avatar"
                      size={44}
                      member={member}
                      badgeMember={badgeMember}
                    />

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
              );
            })}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
