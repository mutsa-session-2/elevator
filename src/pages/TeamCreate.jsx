import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import "./TeamCreate.css";

import { createTeam } from "../services/team.js";
import {
  getStoreItems,
  getMyEquippedItems,
  getMyItems, // ✅ [추가] store 403 대비용
} from "../services/store.js";
import { getMyCharacter } from "../services/character.js";
import { getMyEquippedBadges } from "../services/badge.js";

function pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
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

// ✅ [수정] imgUrl 키 다양화 + nested(item/badge) 대응
function pickImgUrl(obj, depth = 0) {
  if (!obj || depth > 2) return "";

  const v =
    obj?.imgUrl ?? // items swagger
    obj?.imageUrl ?? // badges swagger
    obj?.itemImgUrl ??
    obj?.itemImageUrl ??
    obj?.badgeImgUrl ??
    obj?.badgeImageUrl ??
    obj?.thumbnailUrl ??
    obj?.img_url ??
    obj?.image_url ??
    obj?.imagePath ??
    obj?.url ??
    obj?.image ??
    null;

  if (typeof v === "string" && v.trim()) return v.trim();

  // nested 흔한 케이스들
  const nested =
    obj?.item ?? obj?.itemDto ?? obj?.itemInfo ?? obj?.badge ?? obj?.badgeDto;
  if (nested) return pickImgUrl(nested, depth + 1);

  return "";
}

function buildLayerStyle(raw, meta) {
  const x = toNum(
    pick(
      raw,
      "offsetX",
      "offset_x",
      "x",
      "left",
      "posX",
      "positionX",
      meta?.offsetX,
      meta?.offset_x,
      meta?.x
    )
  );
  const y = toNum(
    pick(
      raw,
      "offsetY",
      "offset_y",
      "y",
      "top",
      "posY",
      "positionY",
      meta?.offsetY,
      meta?.offset_y,
      meta?.y
    )
  );
  const w = toNum(pick(raw, "width", "w", "itemWidth", meta?.width));
  const h = toNum(pick(raw, "height", "h", "itemHeight", meta?.height));
  const s = toNum(pick(raw, "scale", "size", "ratio", meta?.scale, meta?.size));
  const scale = s == null ? null : s > 10 ? s / 100 : s;

  const style = {};
  if (x != null) style.left = `${x}px`;
  if (y != null) style.top = `${y}px`;
  if (w != null && w > 3) style.width = `${w}px`;
  if (h != null && h > 3) style.height = `${h}px`;
  if ((w == null || h == null) && scale != null && scale !== 1) {
    style.transform = `scale(${scale})`;
    style.transformOrigin = "top left";
  }
  return style;
}

// ✅ [수정] equippedItems / equippedBadges 같은 키도 대응
function normalizeList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.badges)) return raw.badges;
  if (Array.isArray(raw?.equippedItems)) return raw.equippedItems;
  if (Array.isArray(raw?.equippedBadges)) return raw.equippedBadges;
  return [];
}

function MyCharacterPreview({ accessoryMetaById }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [itemLayers, setItemLayers] = useState([]);
  const [badgeLayers, setBadgeLayers] = useState([]);

  useEffect(() => {
    let ignore = false;

    const run = async () => {
      try {
        // 베이스(얼굴 포함 합성/혹은 기본 캐릭터)
        const c = await getMyCharacter();
        const base =
          pick(c, "imageUrl", "characterImageUrl") ||
          pick(c?.data, "imageUrl", "characterImageUrl") ||
          pick(c?.result, "imageUrl", "characterImageUrl") ||
          "";
        if (!ignore) setBaseUrl(base);

        // ✅ 장착 아이템
        const eq = await getMyEquippedItems().catch(() => null);
        const eqList = normalizeList(eq);

        const layers = eqList
          .map((it) => {
            // ✅ nested(item)도 고려
            const inner = it?.item ?? it?.itemDto ?? it?.itemInfo ?? null;

            const id = Number(
              it.itemId ?? it.id ?? inner?.itemId ?? inner?.id ?? null
            );
            if (Number.isNaN(id)) return null;

            // ✅ FACE는 여기서 제외(베이스가 얼굴 포함이거나, 얼굴은 여기서 겹치면 이상해짐)
            const type = String(
              it.type ?? it.itemType ?? inner?.type ?? inner?.itemType ?? ""
            ).toUpperCase();
            if (type === "FACE") return null;

            const meta = accessoryMetaById?.[id] ?? inner ?? null;

            // ✅ url을 it / inner / meta 순서로 넓게 찾기
            const url = pickImgUrl(it) || pickImgUrl(inner) || pickImgUrl(meta);
            if (!url) return null;

            return {
              key: `it-${id}`,
              url,
              style: buildLayerStyle(it, meta),
            };
          })
          .filter(Boolean);

        if (!ignore) setItemLayers(layers);

        // ✅ 장착 뱃지
        const b = await getMyEquippedBadges().catch(() => null);
        const bList = normalizeList(b);

        const blayers = bList
          .map((badge) => {
            const inner = badge?.badge ?? badge?.badgeDto ?? null;

            const id = Number(
              badge.badgeId ?? badge.badge_id ?? badge.id ?? inner?.id ?? null
            );
            if (Number.isNaN(id)) return null;

            const url =
              pickImgUrl(badge) || pickImgUrl(inner) || pickImgUrl(badge);
            if (!url) return null;

            return {
              key: `bd-${id}`,
              url,
              style: buildLayerStyle(badge, inner ?? badge),
            };
          })
          .filter(Boolean);

        if (!ignore) setBadgeLayers(blayers);
      } catch {
        // ignore
      }
    };

    run();
    return () => {
      ignore = true;
    };
  }, [accessoryMetaById]);

  return (
    <div className="tc-charStage">
      {baseUrl ? (
        <img className="tc-layer" src={baseUrl} alt="base" />
      ) : (
        <div className="tc-charFallback" />
      )}

      {itemLayers.map((l) => (
        <img
          key={l.key}
          className="tc-layer"
          src={l.url}
          style={l.style}
          alt="item"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ))}

      {badgeLayers.map((l) => (
        <img
          key={l.key}
          className="tc-layer"
          src={l.url}
          style={l.style}
          alt="badge"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ))}
    </div>
  );
}

export default function TeamCreate() {
  const navigate = useNavigate();

  // step: "form" | "result"
  const [step, setStep] = useState("form");

  const [teamName, setTeamName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);

  // ACCESSORY 카탈로그 메타(아이템 imgUrl/좌표 보정용)
  const [accessoryMetaById, setAccessoryMetaById] = useState({});

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        // ✅ [핵심 수정] store catalog(ACCESSORY) 403 나도, 내 보유 아이템(myItems)에서 meta 만들기
        const [storeRes, myRes] = await Promise.allSettled([
          getStoreItems("ACCESSORY"),
          getMyItems(),
        ]);

        const storeList =
          storeRes.status === "fulfilled" ? normalizeList(storeRes.value) : [];
        const myList =
          myRes.status === "fulfilled" ? normalizeList(myRes.value) : [];

        const merged = [...storeList, ...myList];

        const map = {};
        merged.forEach((it) => {
          const id = Number(it.itemId ?? it.id);
          if (!Number.isNaN(id)) map[id] = it;
        });

        if (!ignore) setAccessoryMetaById(map);
      } catch {
        if (!ignore) setAccessoryMetaById({});
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, []);

  const canSubmit = useMemo(() => {
    const name = teamName.trim();
    if (!name) return false;
    if (!startDate || !endDate) return false;
    if (startDate > endDate) return false;
    return true;
  }, [teamName, startDate, endDate]);

  const onCreate = async () => {
    if (!canSubmit) {
      if (!teamName.trim()) return alert("팀 프로젝트 이름을 입력해줘!");
      if (!startDate) return alert("시작일을 선택해줘!");
      if (!endDate) return alert("종료일을 선택해줘!");
      if (startDate > endDate) return alert("종료일은 시작일 이후여야 해!");
      return;
    }

    setCreating(true);
    try {
      const res = await createTeam({
        name: teamName.trim(),
        startDate,
        endDate,
      });

      const teamId =
        pick(res, "teamId", "id") ??
        pick(res?.data, "teamId", "id") ??
        pick(res?.result, "teamId", "id");

      const joinCode =
        pick(res, "joinCode") ??
        pick(res?.data, "joinCode") ??
        pick(res?.result, "joinCode");

      if (!teamId || !joinCode) {
        alert(
          "팀 생성 응답에 teamId/joinCode가 없어요. 백엔드 응답 키 확인 필요!"
        );
        return;
      }

      setResult({
        teamId: Number(teamId),
        joinCode: String(joinCode),
        name: teamName.trim(),
        startDate,
        endDate,
      });

      setStep("result");
    } catch (e) {
      // ✅ 상태 보여주면 디버깅 쉬움
      if (e?.status === 401) alert("로그인이 만료됐어요. 다시 로그인해줘!");
      else if (e?.status === 403)
        alert("권한이 없어요(403). 토큰/권한 확인 필요!");
      else alert("팀 생성 실패!");
    } finally {
      setCreating(false);
    }
  };

  const onCopy = async () => {
    if (!result?.joinCode) return;
    try {
      await navigator.clipboard.writeText(result.joinCode);
      alert("초대코드를 복사했어요!");
    } catch {
      alert("복사 실패! 직접 선택해서 복사해줘.");
    }
  };

  return (
    <div className="tc-page">
      <TeamHeader />

      <main className="tc-main">
        <section className="tc-card">
          <button
            className="tc-backBtn"
            onClick={() => navigate(-1)}
            aria-label="back"
          >
            ‹
          </button>

          {step === "form" ? (
            <>
              <div className="tc-title">팀을 직접 만들어보세요</div>
              <div className="tc-desc">
                기본 정보를 입력하세요.
                <br />그 후에 입장 코드가 생성됩니다.
              </div>

              <label className="tc-label">팀 프로젝트 이름</label>
              <textarea
                className="tc-textarea"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="달성하고 싶은 계획을 설정해주세요!"
              />

              <label className="tc-label">언제부터인가요?</label>
              <input
                className="tc-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <label className="tc-label">언제까지인가요?</label>
              <input
                className="tc-input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

              <button
                className="tc-primaryBtn"
                onClick={onCreate}
                disabled={creating}
              >
                {creating ? "생성 중..." : "팀 만들기"}
              </button>
            </>
          ) : (
            <>
              <div className="tc-title">팀 입장 코드가 생성되었습니다.</div>
              <div className="tc-desc">내용을 확인해주세요.</div>

              <div className="tc-summary">
                <div className="tc-summaryTop">
                  <div className="tc-summaryName">{result?.name}</div>
                  <div className="tc-summaryPeriod">
                    {result?.startDate} ~ {result?.endDate}
                  </div>
                </div>

                <div className="tc-summaryBody">
                  <MyCharacterPreview accessoryMetaById={accessoryMetaById} />
                </div>
              </div>

              <div className="tc-joinBox">
                <div className="tc-joinLabel">입장 코드</div>
                <div className="tc-joinRow">
                  <input
                    className="tc-joinInput"
                    value={result?.joinCode ?? ""}
                    readOnly
                  />
                  <button className="tc-copyBtn" onClick={onCopy}>
                    복사하기
                  </button>
                </div>
              </div>

              <button
                className="tc-primaryBtn"
                onClick={() => navigate(`/teamplacehome/${result.teamId}`)}
              >
                완료하기
              </button>
            </>
          )}
        </section>
      </main>

      <Navbar />
    </div>
  );
}
