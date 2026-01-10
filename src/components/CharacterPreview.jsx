import React, { useEffect, useMemo, useState } from "react";
import "./CharacterPreview.css";

/**
 * 기준 캔버스(좌표계) 크기
 * - 너희가 DB에서 offset/width/height 맞춘 기준이 114x126이면 그대로 두면 됨
 * - 기준이 다르면 여기만 바꾸면 됨
 */
const BASE_W = 114;
const BASE_H = 126;

function normalizeList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
}

function toNum(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    const n = parseFloat(t.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function pickImgUrl(obj) {
  const v =
    obj?.imageUrl ??
    obj?.imgUrl ??
    obj?.image_url ??
    obj?.img_url ??
    obj?.url ??
    obj?.image ??
    null;

  if (typeof v !== "string") return "";
  const u = v.trim();
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("/")) return u;
  return `/${u}`; // 상대경로면 same-origin 기준으로 붙임
}

function buildLayerStyle(raw) {
  const x = toNum(pick(raw, "offsetX", "offset_x", "x", "left", "posX"));
  const y = toNum(pick(raw, "offsetY", "offset_y", "y", "top", "posY"));
  const w = toNum(pick(raw, "width", "w", "itemWidth"));
  const h = toNum(pick(raw, "height", "h", "itemHeight"));

  const style = {};
  if (x != null) style.left = `${x}px`;
  if (y != null) style.top = `${y}px`;
  if (w != null && w > 0) style.width = `${w}px`;
  if (h != null && h > 0) style.height = `${h}px`;
  return style;
}

/**
 * ✅ 순수 렌더러: base + layers를 "같은 좌표계"에서 합성해서 보여줌
 * - scale을 바꿔도 좌표는 깨지지 않음(스테이지 내부를 transform으로 확대)
 */
export function CharacterCanvas({
  baseUrl,
  layers = [],
  scale = 1,
  className = "",
  title = "character",
}) {
  const wrapStyle = useMemo(
    () => ({
      width: `${BASE_W * scale}px`,
      height: `${BASE_H * scale}px`,
    }),
    [scale]
  );

  const stageStyle = useMemo(
    () => ({
      transform: `scale(${scale})`,
      transformOrigin: "top left",
      width: `${BASE_W}px`,
      height: `${BASE_H}px`,
    }),
    [scale]
  );

  return (
    <div className={`cp-wrap ${className}`} style={wrapStyle} title={title}>
      <div className="cp-stage" style={stageStyle}>
        {baseUrl ? (
          <img
            className="cp-layer cp-base"
            src={baseUrl}
            alt="base"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <div className="cp-fallback" />
        )}

        {layers.map((l) => (
          <img
            key={l.key}
            className="cp-layer cp-item"
            src={l.url}
            alt="layer"
            style={l.style}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * ✅ 멤버 1명(팀원) 프리뷰
 * member.equippedItems 안에 FACE/ACCESSORY가 섞여있으면:
 * - FACE를 base로 깔고
 * - 나머지를 layers로 올림
 * (Swagger 예시: equippedItems: [{ itemType, imageUrl, offsetX, offsetY, width, height }, ...])
 */
export function MemberCharacterPreview({
  member,
  scale = 0.42,
  showName = false,
  className = "",
}) {
  const equippedItems = normalizeList(
    pick(member, "equippedItems", "items", "equipped_items")
  );
  const equippedBadges = normalizeList(
    pick(member, "equippedBadges", "badges", "equipped_badges")
  );

  const faceItem = equippedItems.find((it) => {
    const t = String(pick(it, "itemType", "type")).toUpperCase();
    return t === "FACE";
  });

  // ✅ base 우선순위: FACE item imageUrl -> member.characterImageUrl(있으면 fallback)
  const baseUrl =
    pickImgUrl(faceItem) ||
    pickImgUrl(
      pick(
        member,
        "characterImageUrl",
        "characterImgUrl",
        "mergedImageUrl",
        "imageUrl"
      )
    );

  const layers = useMemo(() => {
    const accLayers = equippedItems
      .filter(
        (it) => String(pick(it, "itemType", "type")).toUpperCase() !== "FACE"
      )
      .map((it, idx) => {
        const url = pickImgUrl(it);
        if (!url) return null;
        return {
          key: `it-${member?.userId ?? member?.id ?? "m"}-${idx}`,
          url,
          style: buildLayerStyle(it),
        };
      })
      .filter(Boolean);

    const badgeLayers = equippedBadges
      .map((b, idx) => {
        const url = pickImgUrl(b);
        if (!url) return null;
        return {
          key: `bd-${member?.userId ?? member?.id ?? "m"}-${idx}`,
          url,
          style: buildLayerStyle(b),
        };
      })
      .filter(Boolean);

    return [...accLayers, ...badgeLayers];
  }, [equippedItems, equippedBadges, member]);

  return (
    <div className={`cp-member ${className}`}>
      <CharacterCanvas baseUrl={baseUrl} layers={layers} scale={scale} />
      {showName ? (
        <div className="cp-name">
          {member?.username ?? member?.name ?? `USER ${member?.userId ?? ""}`}
        </div>
      ) : null}
    </div>
  );
}

/**
 * ✅ 팀원들 프리뷰 Row/그리드 (팀 목록 카드/입장 확인 화면에서 그대로 재사용)
 *
 * fetcher는 기본적으로 getTeamCharacters(teamId)를 기대함:
 * - GET /api/items/{teamId}/characters
 */
export function TeamCharactersPreview({
  teamId,
  fetcher, // (teamId) => Promise<list>
  max = 4,
  scale = 0.38,
  showNames = false,
  excludeUserId = null,
  className = "",
}) {
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let ignore = false;

    const run = async () => {
      if (!teamId || !fetcher) return;

      setErr(null);
      try {
        const raw = await fetcher(teamId);
        const list = normalizeList(raw);

        const filtered = excludeUserId
          ? list.filter(
              (m) => Number(m.userId ?? m.id) !== Number(excludeUserId)
            )
          : list;

        if (!ignore) setMembers(filtered);
      } catch (e) {
        if (!ignore) {
          setMembers([]);
          setErr(e?.message ?? "멤버 프리뷰 로드 실패");
        }
      }
    };

    run();
    return () => {
      ignore = true;
    };
  }, [teamId, fetcher, excludeUserId]);

  const sliced = members.slice(0, Math.max(0, max));

  return (
    <div className={`cp-team ${className}`}>
      {sliced.length === 0 ? (
        <div className="cp-team-empty">{err ? "미리보기 없음" : ""}</div>
      ) : (
        <div className="cp-team-row">
          {sliced.map((m) => (
            <MemberCharacterPreview
              key={m.userId ?? m.id ?? m.username ?? Math.random()}
              member={m}
              scale={scale}
              showName={showNames}
            />
          ))}
        </div>
      )}
    </div>
  );
}
