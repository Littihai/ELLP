import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/app/providers/I18nProvider";
import { Button, Icon } from "@/components/ui/kit";
import { api, type ActivityResult } from "@/services";
import { dueCheckpoint, replayAllowed, seekAllowed, type ProfileRules } from "@/lib/integrity";
import type { Checkpoint, IntegrityPolicy, Lesson, LessonProgress, ViolationType } from "@/types";

/**
 * The platform's own player (1.2, decision 0006) over a plain <video>. The profile says which rules are on:
 *  - no seeking past the furthest second watched (the bar snaps back)
 *  - playback speed locked to 1× (the menu is hidden and a change is undone)
 *  - in-video questions: the video pauses at the checkpoint and resumes once answered or when the time runs out (scored 0)
 *  - fullscreen required (strict): play asks for it, leaving it is an attention event
 *  - replay limit, watermark (the learner's name and the time, moving), no download / picture-in-picture
 *  - attention events (tab switch, window blur, fullscreen exit) are reported to the ladder by the parent through onViolation
 *  - the real position and played seconds are reported every 15 s and on pause / end
 */
export function VideoPlayer({ lesson, src, rules, policy, progress, watermark, onResult, onViolation }: {
  lesson: Lesson;
  src: string;
  rules: ProfileRules;
  policy: IntegrityPolicy;
  progress: LessonProgress | undefined;
  watermark: string;
  onResult: (r: ActivityResult) => void;
  onViolation: (type: ViolationType, detail: string) => Promise<void>;
}) {
  const { t, pick } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const furthest = useRef(progress?.lastPositionSec ?? 0);
  const watched = useRef(progress?.watchedSec ?? 0);
  const lastTick = useRef<number | null>(null);
  const lastReport = useRef(0);
  const answered = useRef<string[]>(Object.keys(progress?.checkpointResults ?? {}));
  const pauseTimes = useRef<number[]>([]);
  const [cp, setCp] = useState<Checkpoint | null>(null);
  const [cpPick, setCpPick] = useState<number | null>(null);
  const [cpLeft, setCpLeft] = useState(0);
  const [cpResult, setCpResult] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [wmPos, setWmPos] = useState({ x: 8, y: 8 });
  const [playing, setPlaying] = useState(false);

  const say = useCallback((m: string) => { setNotice(m); window.setTimeout(() => setNotice((n) => (n === m ? null : n)), 3500); }, []);

  const report = useCallback((final = false) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const now = Date.now();
    if (!final && now - lastReport.current < 15000) return;
    lastReport.current = now;
    // the position is the real one; only a finished video counts as its full length
    api.recordPosition(lesson.id, v.ended ? v.duration : v.currentTime, watched.current, v.duration).then(onResult).catch(() => undefined);
  }, [lesson.id, onResult]);

  // resume where the learner left off
  const onLoaded = () => { const v = videoRef.current; if (v && furthest.current > 0 && furthest.current < v.duration - 1) v.currentTime = furthest.current; };

  const onTime = () => {
    const v = videoRef.current;
    if (!v || v.paused || v.seeking) return;
    const now = performance.now();
    if (lastTick.current !== null) watched.current += Math.min(1.5, (now - lastTick.current) / 1000);
    lastTick.current = now;
    furthest.current = Math.max(furthest.current, v.currentTime);
    if (rules.checkpoints && !cp) {
      const due = dueCheckpoint(lesson, v.currentTime, answered.current);
      if (due) { v.pause(); setCp(due); setCpPick(null); setCpResult(null); setCpLeft(policy.checkpointTimeLimitSec); return; }
    }
    report();
  };

  const onSeeking = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!seekAllowed(v.currentTime, furthest.current, rules.blockSeek)) {
      v.currentTime = furthest.current;
      say(t("integ.seekBlocked"));
      onViolation("seek_attempt", `to ${Math.round(v.currentTime)}s`).catch(() => undefined);
    }
  };
  const onRate = () => {
    const v = videoRef.current;
    if (v && rules.lockSpeed && v.playbackRate !== 1) { v.playbackRate = 1; say(t("integ.speedLocked")); onViolation("speed_attempt", "").catch(() => undefined); }
  };
  const onPlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (!replayAllowed(progress, policy, rules.replayLimit)) { v.pause(); setBlocked(t("integ.replayBlocked", { n: policy.maxReplays })); onViolation("replay_limit", "").catch(() => undefined); return; }
    if (rules.requireFullscreen && boxRef.current && !document.fullscreenElement) { try { await boxRef.current.requestFullscreen(); } catch { /* the browser refused: the player still plays */ } }
    lastTick.current = performance.now();
    setPlaying(true);
  };
  const onPause = () => {
    lastTick.current = null;
    setPlaying(false);
    // unusually frequent pauses: more than five in a minute
    const now = Date.now();
    pauseTimes.current = [...pauseTimes.current.filter((x) => now - x < 60000), now];
    if (pauseTimes.current.length === 6) onViolation("pause_spam", "6 pauses in a minute").catch(() => undefined);
    report(true);
  };
  const onEnded = () => { lastTick.current = null; setPlaying(false); report(true); api.recordReplay(lesson.id).catch(() => undefined); };

  // attention events (the parent runs the ladder)
  useEffect(() => {
    if (!rules.trackAttention) return;
    const pauseVideo = () => videoRef.current?.pause();
    const onVis = () => { if (document.hidden) { pauseVideo(); onViolation("tab_switch", "").catch(() => undefined); } };
    const onBlur = () => { if (!document.hidden && playing) { pauseVideo(); onViolation("window_blur", "").catch(() => undefined); } };
    const onFs = () => { if (!document.fullscreenElement && rules.requireFullscreen && playing) { pauseVideo(); onViolation("fullscreen_exit", "").catch(() => undefined); } };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFs);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("blur", onBlur); document.removeEventListener("fullscreenchange", onFs); };
  }, [rules.trackAttention, rules.requireFullscreen, playing, onViolation]);

  // the checkpoint clock
  useEffect(() => {
    if (!cp || cpResult) return;
    if (cpLeft <= 0) { finishCheckpoint(null); return; }
    const id = window.setTimeout(() => setCpLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cp, cpLeft, cpResult]);

  const finishCheckpoint = async (choice: number | null) => {
    if (!cp) return;
    const correct = choice !== null && choice === cp.answer;
    answered.current = [...answered.current, cp.id];
    setCpResult(choice === null ? t("integ.cpTimeout") : correct ? t("integ.cpRight", { xp: policy.checkpointXp }) : t("integ.cpWrong", { a: cp.choices[cp.answer] }));
    if (choice === null) onViolation("checkpoint_timeout", cp.id).catch(() => undefined);
    try { onResult(await api.recordCheckpoint(lesson.id, cp.id, correct)); } catch { /* the page shows the state it has */ }
    window.setTimeout(() => { setCp(null); videoRef.current?.play().catch(() => undefined); }, 1800);
  };

  // the watermark drifts so a still frame always carries it somewhere
  useEffect(() => {
    if (!rules.watermark) return;
    const id = window.setInterval(() => setWmPos({ x: 5 + Math.random() * 60, y: 5 + Math.random() * 75 }), 10000);
    return () => window.clearInterval(id);
  }, [rules.watermark]);

  return (
    <div ref={boxRef} className="player" onContextMenu={(e) => { if (rules.noCopy) e.preventDefault(); }} style={{ background: "#000" }}>
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        preload="metadata"
        controlsList={`nodownload${rules.lockSpeed ? " noplaybackrate" : ""}${rules.blockSeek ? "" : ""}`}
        disablePictureInPicture
        onLoadedMetadata={onLoaded}
        onTimeUpdate={onTime}
        onSeeking={onSeeking}
        onRateChange={onRate}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      {rules.watermark && (
        <div aria-hidden style={{ position: "absolute", left: `${wmPos.x}%`, top: `${wmPos.y}%`, pointerEvents: "none", color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 600, textShadow: "0 0 4px #000", transition: "left 1s ease, top 1s ease" }}>
          {watermark} · {new Date().toLocaleString()}
        </div>
      )}
      {notice && <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", background: "rgba(24,36,51,0.9)", color: "#fff", padding: "6px 14px", borderRadius: 999, fontSize: 13 }}>{notice}</div>}
      {blocked && (
        <div className="player-locked"><div><Icon name="lock" size={36} /><h2>{blocked}</h2></div></div>
      )}
      {cp && (
        <div className="player-locked" style={{ background: "rgba(15,23,34,0.96)", textAlign: "left", alignItems: "stretch" }}>
          <div style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <b><Icon name="checklist" size={14} /> {t("integ.cpTitle")}</b>
              {!cpResult && <span style={{ fontWeight: 700, color: cpLeft <= 10 ? "#ff8a8a" : "#fff" }}><Icon name="clock" size={13} /> {t("integ.cpTime", { s: cpLeft })}</span>}
            </div>
            <h2 style={{ fontSize: 18, margin: "8px 0 10px", textAlign: "left" }}>{pick(cp.prompt)}</h2>
            <div className="stack" style={{ gap: 8 }}>
              {cp.choices.map((c, i) => (
                <button key={i} type="button" disabled={!!cpResult} onClick={() => setCpPick(i)}
                  style={{ textAlign: "left", padding: "10px 14px", borderRadius: 10, border: `2px solid ${cpPick === i ? "#4299e1" : "rgba(255,255,255,0.25)"}`, background: cpResult && i === cp.answer ? "rgba(47,179,68,0.35)" : cpPick === i ? "rgba(66,153,225,0.25)" : "transparent", color: "#fff", font: "inherit", cursor: "pointer" }}>
                  {c}
                </button>
              ))}
            </div>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
              <span style={{ fontSize: 14 }}>{cpResult}</span>
              {!cpResult && <Button size="sm" disabled={cpPick === null} onClick={() => finishCheckpoint(cpPick)}>{t("integ.cpAnswer")}</Button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
