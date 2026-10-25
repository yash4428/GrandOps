"use client";
import { useRef, useState } from "react";

export interface ReportStrings {
  reasons: string;
  options: Record<"cantPress" | "cantRead" | "wrongLanguage" | "slow" | "wrongTime" | "other", string>;
  textLabel: string;
  record: string;
  stop: string;
  recording: string;
  recorded: string;
  noMic: string;
  send: string;
  sending: string;
  thanks: string;
  thanksDetail: string;
  error: string;
  back: string;
  privacy: string;
}

type Phase = "idle" | "sending" | "sent" | "error";

export function ReportForm({ s, locale, from }: { s: ReportStrings; locale: string; from: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [reportId, setReportId] = useState("");
  const [recState, setRecState] = useState<"off" | "on" | "done" | "unavailable">("off");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audio = useRef<string>("");

  async function toggleRecording() {
    if (recState === "on") {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const buf = await new Blob(chunks.current).arrayBuffer();
        let bin = "";
        new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
        audio.current = btoa(bin);
        setRecState("done");
      };
      rec.start();
      recorder.current = rec;
      setRecState("on");
      setTimeout(() => rec.state === "recording" && rec.stop(), 60_000);
    } catch {
      setRecState("unavailable");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPhase("sending");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: data.get("reason"),
          text: data.get("text"),
          locale,
          route: from,
          audio: audio.current,
          device: `${navigator.userAgent.includes("Android") ? "Android" : navigator.userAgent.includes("iPhone") ? "iPhone" : "Desktop"} ${window.innerWidth}x${window.innerHeight}`,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setReportId(((await res.json()) as { id: string }).id);
      setPhase("sent");
    } catch {
      setPhase("error");
    }
  }

  if (phase === "sent") {
    return (
      <div className="notice notice-ok" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        <div>
          <p>{s.thanks}</p>
          <p>{s.thanksDetail.replace("{id}", reportId)}</p>
          <a className="btn btn-secondary" href="/">
            {s.back}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <fieldset className="field">
        <legend>{s.reasons}</legend>
        <div className="chips">
          {(Object.keys(s.options) as (keyof ReportStrings["options"])[]).map((k, i) => (
            <div className="chip" key={k}>
              <input type="radio" id={`r-${k}`} name="reason" value={k} defaultChecked={i === 0} />
              <label htmlFor={`r-${k}`}>{s.options[k]}</label>
            </div>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="text">{s.textLabel}</label>
        <textarea id="text" name="text" maxLength={1000} />
      </div>
      <div className="field">
        <button type="button" className="btn btn-secondary" onClick={toggleRecording} aria-pressed={recState === "on"} disabled={recState === "unavailable"}>
          {recState === "on" ? s.stop : s.record}
        </button>
        <p role="status">{recState === "on" ? s.recording : recState === "done" ? s.recorded : recState === "unavailable" ? s.noMic : ""}</p>
      </div>
      <p>{s.privacy}</p>
      {phase === "error" && (
        <p className="notice notice-error" role="alert">
          {s.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={phase === "sending"}>
        {phase === "sending" ? s.sending : s.send}
      </button>
    </form>
  );
}
