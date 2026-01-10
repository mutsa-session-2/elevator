import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import "./TeamJoin.css";

import {
  getTeams,
  joinTeam,
  getTeam,
  getTeamCharacters,
} from "../services/team.js";
import { leaveTeam } from "../services/api.js";
import { getStoreItems } from "../services/store.js";

function normalizeList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.badges)) return raw.badges;
  return [];
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
    obj?.imgUrl ??
    obj?.imageUrl ??
    obj?.img_url ??
    obj?.image_url ??
    obj?.url ??
    obj?.image ??
    null;
  return typeof v === "string" && v.trim() ? v.trim() : "";
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

function buildLayerStyle(raw, meta) {
  const x = toNum(
    pick(
      raw,
      "offsetX",
      "offset_x",
      "x",
      "left",
      "posX",
      meta?.offsetX,
      meta?.offset_x
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
      meta?.offsetY,
      meta?.offset_y
    )
  );
  const w = toNum(pick(raw, "width", "w", "itemWidth", meta?.width));
  const h = toNum(pick(raw, "height", "h", "itemHeight", meta?.height));

  const style = {};
  if (x != null) style.left = `${x}px`;
  if (y != null) style.top = `${y}px`;
  if (w != null && w > 3) style.width = `${w}px`;
  if (h != null && h > 3) style.height = `${h}px`;
  return style;
}

function MemberPreview({ member, accessoryMetaById }) {
  // 1) 서버가 합성 이미지를 주면 그게 최우선
  const merged =
    pick(
      member,
      "characterImageUrl",
      "characterImgUrl",
      "imageUrl",
      "characterUrl",
      "mergedImageUrl"
    ) ||
    pick(member?.data, "imageUrl") ||
    "";

  // 2) 없으면 equippedItems/badges를 레이어로
  const equippedItems = normalizeList(
    pick(member, "equippedItems", "items", "equipped_items")
  );
  const equippedBadges = normalizeList(
    pick(member, "equippedBadges", "badges", "equipped_badges")
  );

  const layers = [...equippedItems, ...equippedBadges]
    .map((it, idx) => {
      const isBadge =
        it?.badgeId != null || it?.badge_id != null || it?.type === "BADGE";
      const id = Number(it.itemId ?? it.id ?? it.badgeId ?? it.badge_id);
      const meta = !isBadge ? accessoryMetaById?.[id] : null;

      const url = pickImgUrl(it) || pickImgUrl(meta);
      if (!url) return null;

      return {
        key: `${member?.userId ?? member?.id ?? "m"}-${idx}`,
        url,
        style: buildLayerStyle(it, meta),
      };
    })
    .filter(Boolean);

  return (
    <div className="tj-charStage">
      {merged ? (
        <img className="tj-layer" src={merged} alt="merged" />
      ) : (
        <div className="tj-charFallback" />
      )}

      {layers.map((l) => (
        <img
          key={l.key}
          className="tj-layer"
          src={l.url}
          style={l.style}
          alt="layer"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ))}
    </div>
  );
}

export default function TeamJoin() {
  const navigate = useNavigate();

  // step: "code" | "confirm"
  const [step, setStep] = useState("code");
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [pendingTeamId, setPendingTeamId] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadErr, setLoadErr] = useState(null);

  // accessory meta
  const [accessoryMetaById, setAccessoryMetaById] = useState({});

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        const raw = await getStoreItems("ACCESSORY");
        const list = normalizeList(raw);
        const map = {};
        list.forEach((it) => {
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

  const findNewTeamIdByDiff = (beforeList, afterList) => {
    const beforeIds = new Set(beforeList.map((t) => Number(t.teamId ?? t.id)));
    const added = afterList.find(
      (t) => !beforeIds.has(Number(t.teamId ?? t.id))
    );
    return added ? Number(added.teamId ?? added.id) : null;
  };

  const submitJoin = useCallback(async () => {
    const code = joinCode.trim();
    if (!code) return alert("입장 코드를 입력해줘!");

    setJoining(true);
    setLoadErr(null);

    try {
      const beforeRaw = await getTeams().catch(() => []);
      const before = normalizeList(beforeRaw);

      const joinRes = await joinTeam(code);

      const directTeamId = toNum(
        pick(joinRes, "teamId", "id") ??
          pick(joinRes?.data, "teamId", "id") ??
          pick(joinRes?.result, "teamId", "id")
      );

      const afterRaw = await getTeams().catch(() => []);
      const after = normalizeList(afterRaw);

      const teamId =
        (directTeamId != null ? Number(directTeamId) : null) ||
        findNewTeamIdByDiff(before, after) ||
        (after.length === 1 ? Number(after[0].teamId ?? after[0].id) : null);

      if (!teamId) {
        alert("팀 가입은 됐는데 teamId를 확정할 수 없어요. 응답 확인 필요!");
        return;
      }

      setPendingTeamId(teamId);

      // ✅ 가입 후: 팀/팀원 정보 로드 → “이 팀이 맞나요?”
      const [infoRaw, charsRaw] = await Promise.all([
        getTeam(teamId),
        getTeamCharacters(teamId),
      ]);
      const info = infoRaw?.data ?? infoRaw?.result ?? infoRaw;
      const chars = normalizeList(charsRaw);

      setTeamInfo(info);
      setMembers(chars);
      setStep("confirm");
    } catch {
      alert("팀 참가 실패(코드 오류/이미 가입 등)!");
    } finally {
      setJoining(false);
    }
  }, [joinCode]);

  const cancelJoin = useCallback(async () => {
    // ✅ confirm에서 “아니요” = 롤백
    const tid = pendingTeamId;
    setStep("code");
    setJoinCode("");
    setTeamInfo(null);
    setMembers([]);
    setLoadErr(null);

    if (tid != null) {
      try {
        await leaveTeam(tid);
      } catch {
        // ignore
      }
    }
    setPendingTeamId(null);
  }, [pendingTeamId]);

  const confirmEnter = useCallback(() => {
    if (!pendingTeamId) return;
    navigate(`/teamplacehome/${pendingTeamId}`);
  }, [pendingTeamId, navigate]);

  return (
    <div className="tj-page">
      <TeamHeader />

      <main className="tj-main">
        <section className="tj-card">
          <button
            className="tj-backBtn"
            onClick={() => navigate(-1)}
            aria-label="back"
          >
            ‹
          </button>

          {step === "code" ? (
            <>
              <div className="tj-title">팀 입장하기</div>
              <div className="tj-desc">초대 코드를 입력해 팀에 참여해요.</div>

              <label className="tj-label">입장 코드</label>
              <input
                className="tj-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="예) 23572633"
              />

              <button
                className="tj-primaryBtn"
                onClick={submitJoin}
                disabled={joining}
              >
                {joining ? "처리 중..." : "입장하기"}
              </button>
            </>
          ) : (
            <>
              <div className="tj-title">이 팀이 맞나요?</div>
              <div className="tj-desc">
                맞으면 입장하고, 아니면 자동으로 되돌려요.
              </div>

              {loadErr ? <div className="tj-error">{loadErr}</div> : null}

              <div className="tj-teamInfo">
                <div className="tj-teamName">{teamInfo?.name ?? "팀 이름"}</div>
                <div className="tj-teamPeriod">
                  {teamInfo?.startDate ?? ""} ~ {teamInfo?.endDate ?? ""}
                </div>
              </div>

              <div className="tj-members">
                {members.length === 0 ? (
                  <div className="tj-muted">팀원 정보를 불러오지 못했어요.</div>
                ) : (
                  members.map((m) => (
                    <div
                      className="tj-memberCard"
                      key={m.userId ?? m.id ?? m.username ?? Math.random()}
                    >
                      <MemberPreview
                        member={m}
                        accessoryMetaById={accessoryMetaById}
                      />
                      <div className="tj-memberName">
                        {m.username ?? m.name ?? `USER ${m.userId ?? ""}`}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="tj-actions">
                <button className="tj-ghostBtn" onClick={cancelJoin}>
                  아니요
                </button>
                <button className="tj-primaryBtn" onClick={confirmEnter}>
                  네, 입장할래요
                </button>
              </div>

              <div className="tj-note">
                * “아니요”를 누르면 방금 참여한 기록을 자동으로 되돌려요(팀
                나가기 처리).
              </div>
            </>
          )}
        </section>
      </main>

      <Navbar />
    </div>
  );
}
