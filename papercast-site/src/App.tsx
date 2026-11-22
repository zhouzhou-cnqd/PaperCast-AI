import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";

/* ================= 类型 ================= */
type Segment = {
  segment_id: string;
  speaker: "host" | "researcher";
  voice: string;
  text: string;
  duration_seconds: number;
  start_seconds: number;
  evidence_ids: string[];
  claim_type: string;
};
type PodcastData = {
  paper_id: string;
  podcast_url: string;
  total_seconds: number;
  segments: Segment[];
};
type AskResult = {
  transcript: string;
  answer: string;
  evidence_ids: string[];
  resume_segment_id: string | null;
  resume_position_seconds: number;
  asr_seconds: number | null;
  total_seconds: number;
  report: { retrieval_method?: string; keywords?: string[]; path?: string; invalid_refs_removed?: string[] };
};
type PaperSummary = { paper_id: string; segments: number; total_seconds: number };
type AskState = "idle" | "recording" | "processing" | "answer";
type CheckResult = { name: string; status: "pass" | "warn" | "fail"; detail: string };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const API_BASE = import.meta.env.PROD ? "/functions/v1/app" : "/api";
const PAPERS_URL = import.meta.env.PROD ? "/data/papers.json" : `${API_BASE}/papers`;

function podcastUrl(paperId: string): string {
  return import.meta.env.PROD
    ? `/data/${encodeURIComponent(paperId)}/podcast.json`
    : `${API_BASE}/podcast?paper_id=${encodeURIComponent(paperId)}`;
}

/* ================= 工具 ================= */
function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function paperLabel(id: string): string {
  return id === "docling_tech_report"
    ? "Docling 技术报告"
    : id === "diffusion_bridge_gda_fault_diagnosis"
      ? "DBDA 故障诊断"
      : id;
}

const C = {
  host: "#a89cf0",
  researcher: "#85cdb6",
  hostDeep: "#6a5cd0",
  researcherDeep: "#2f8f7a",
  border: "rgba(255, 255, 255, 0.1)",
  muted: "#8d86a3",
  bg: "#0e0c14",
  danger: "#e06a7e",
};

let uiSoundContext: AudioContext | null = null;

function playUiChime() {
  try {
    uiSoundContext ??= new AudioContext();
    const context = uiSoundContext;
    const ring = () => {
      const now = context.currentTime;
      [523.25, 659.25].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = now + index * 0.045;
        oscillator.type = index ? "sine" : "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.018, start + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.17);
      });
    };
    if (context.state === "suspended") void context.resume().then(ring);
    else ring();
  } catch {
    // 浏览器不支持 Web Audio 时保持静默，不影响交互。
  }
}

/* ================= 功能测试页 ================= */
function DemoPage() {
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [paperId, setPaperId] = useState("");
  const [data, setData] = useState<PodcastData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [currentSec, setCurrentSec] = useState(0);
  const [askState, setAskState] = useState<AskState>("idle");
  const [askResult, setAskResult] = useState<AskResult | null>(null);
  const [history, setHistory] = useState<AskResult[]>([]);
  const [askError, setAskError] = useState("");
  const [recSecs, setRecSecs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [typedQuestion, setTypedQuestion] = useState("");

  const audioRef = useRef<HTMLAudioElement>(null);
  const activeCardRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const resumeRef = useRef<{ position: number; segmentId: string | null }>({ position: 0, segmentId: null });
  const recStartRef = useRef(0);
  const recTimerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const playbackCanvasRef = useRef<HTMLCanvasElement>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const playbackAnimationRef = useRef<number | null>(null);
  const askStateRef = useRef<AskState>("idle");
  const speechRef = useRef<SpeechRecognitionLike | null>(null);
  const speechTextRef = useRef("");
  askStateRef.current = askState;

  /* 论文列表 */
  useEffect(() => {
    fetch(PAPERS_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: { papers: PaperSummary[] }) => {
        setPapers(json.papers);
        setPaperId(json.papers[0]?.paper_id ?? "");
      })
      .catch(() => setLoadError(import.meta.env.PROD
        ? "播客数据加载失败，请刷新页面重试。"
        : "无法连接本地服务。请先在 papercast-poc 下运行：uv run --no-sync python scripts/serve_local.py"));
  }, []);

  /* 当前论文数据 */
  useEffect(() => {
    if (!paperId) return;
    audioRef.current?.pause();
    setData(null);
    setCurrentSec(0);
    setAskResult(null);
    setHistory([]);
    setAskError("");
    fetch(podcastUrl(paperId))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch(() => setLoadError(`无法加载论文：${paperId}`));
  }, [paperId]);

  /* 当前段落 */
  let currentSeg: Segment | null = null;
  if (data) {
    for (const s of data.segments) {
      if (currentSec >= s.start_seconds) currentSeg = s;
    }
    currentSeg = currentSeg ?? data.segments[0];
  }

  /* 播放推进时，左栏自动滚动到当前段落卡片 */
  const activeSegmentId = currentSeg?.segment_id ?? null;
  useEffect(() => {
    activeCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeSegmentId]);

  const stopPlaybackVisualizer = useCallback(() => {
    setIsPlaying(false);
    if (playbackAnimationRef.current !== null) {
      window.cancelAnimationFrame(playbackAnimationRef.current);
      playbackAnimationRef.current = null;
    }
    const canvas = playbackCanvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startPlaybackVisualizer = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    let audioContext = playbackContextRef.current;
    let analyser = playbackAnalyserRef.current;
    if (!audioContext || !analyser) {
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      playbackContextRef.current = audioContext;
      playbackAnalyserRef.current = analyser;
      playbackSourceRef.current = source;
    }
    await audioContext.resume();
    setIsPlaying(true);
    const frequencies = new Uint8Array(analyser.frequencyBinCount);
    const colors = ["#9b8bd0", "#d78ea5", "#79a996", "#e1a58f"];

    const draw = () => {
      const canvas = playbackCanvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      const visual = canvas.getContext("2d");
      if (!visual) return;
      visual.setTransform(dpr, 0, 0, dpr, 0, 0);
      visual.clearRect(0, 0, width, height);
      analyser.getByteFrequencyData(frequencies);
      const centerX = width / 2;
      const centerY = height / 2;
      const bass = frequencies.slice(0, 18).reduce((sum, value) => sum + value, 0) / 18 / 255;
      const radius = Math.min(width, height) * (0.17 + bass * 0.03);
      const bars = 72;

      for (let i = 0; i < bars; i += 1) {
        const angle = i / bars * Math.PI * 2 - Math.PI / 2;
        const value = frequencies[Math.floor(i / bars * frequencies.length * 0.72)] / 255;
        const length = 7 + value * Math.min(48, height * 0.2);
        visual.beginPath();
        visual.moveTo(centerX + Math.cos(angle) * (radius + 7), centerY + Math.sin(angle) * (radius + 7));
        visual.lineTo(centerX + Math.cos(angle) * (radius + 7 + length), centerY + Math.sin(angle) * (radius + 7 + length));
        visual.strokeStyle = colors[Math.floor(i / (bars / colors.length)) % colors.length];
        visual.globalAlpha = 0.48 + value * 0.5;
        visual.lineWidth = 3;
        visual.lineCap = "round";
        visual.stroke();
      }

      visual.globalAlpha = 1;
      const glow = visual.createRadialGradient(centerX, centerY, radius * .15, centerX, centerY, radius);
      glow.addColorStop(0, `rgba(255,255,255,${0.94 - bass * .18})`);
      glow.addColorStop(.55, "rgba(210,190,226,.88)");
      glow.addColorStop(1, "rgba(215,142,165,.78)");
      visual.beginPath();
      visual.arc(centerX, centerY, radius, 0, Math.PI * 2);
      visual.fillStyle = glow;
      visual.shadowColor = "rgba(154,126,183,.34)";
      visual.shadowBlur = 24 + bass * 24;
      visual.fill();
      playbackAnimationRef.current = window.requestAnimationFrame(draw);
    };
    if (playbackAnimationRef.current !== null) window.cancelAnimationFrame(playbackAnimationRef.current);
    draw();
  }, []);

  useEffect(() => () => {
    if (playbackAnimationRef.current !== null) window.cancelAnimationFrame(playbackAnimationRef.current);
    void playbackContextRef.current?.close();
  }, []);

  const resumePodcast = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = resumeRef.current.position;
      audio.play().catch(() => undefined);
    }
    setAskState("idle");
  }, []);

  const startWaveform = (stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    audioContextRef.current = audioContext;
    const values = new Uint8Array(analyser.fftSize);

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      const visual = canvas.getContext("2d");
      if (!visual) return;
      visual.setTransform(dpr, 0, 0, dpr, 0, 0);
      visual.clearRect(0, 0, width, height);
      analyser.getByteTimeDomainData(values);
      const gradient = visual.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#9f91d9");
      gradient.addColorStop(0.5, "#dc8fa5");
      gradient.addColorStop(1, "#75aa9a");
      visual.strokeStyle = gradient;
      visual.lineWidth = 3;
      visual.beginPath();
      values.forEach((value, index) => {
        const x = index * width / (values.length - 1);
        const y = value / 255 * height;
        index ? visual.lineTo(x, y) : visual.moveTo(x, y);
      });
      visual.stroke();
      animationRef.current = window.requestAnimationFrame(draw);
    };
    draw();
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    if (recTimerRef.current !== null) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
  };

  /* 提交转写文本；本地开发仍保留原始音频后端链路。 */
  const submitQuestion = useCallback(async (transcript: string, blob?: Blob) => {
    setAskState("processing");
    const { position, segmentId } = resumeRef.current;
    try {
      const request = import.meta.env.PROD
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript }) }
        : { headers: { "Content-Type": blob?.type || "audio/webm" }, body: blob };
      if (!import.meta.env.PROD && !blob) throw new Error("本地模式需要录音数据");
      const resp = await fetch(
        `${API_BASE}/ask?paper_id=${encodeURIComponent(paperId)}&segment_id=${encodeURIComponent(segmentId ?? "")}&position=${position.toFixed(2)}`,
        { method: "POST", ...request }
      );
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || `HTTP ${resp.status}`);
      const result = json as AskResult;
      setAskResult(result);
      setHistory((items) => [result, ...items].slice(0, 10));
      setAskState("answer");
    } catch (e) {
      setAskError(String(e instanceof Error ? e.message : e));
      resumePodcast();
    }
  }, [paperId, resumePodcast]);

  /* 点击开始，再次点击结束 */
  const startRecording = useCallback(async () => {
    if (askStateRef.current !== "idle" || !data) return;
    setAskError("");
    setAskResult(null);
    try {
      const speechWindow = window as Window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      };
      const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
      if (import.meta.env.PROD && !SpeechRecognition) {
        setAskError("当前浏览器不支持语音转写，请在下方直接输入问题。");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startWaveform(stream);
      // 暂停播客并记录恢复点
      const audio = audioRef.current;
      const pos = audio ? audio.currentTime : 0;
      audio?.pause();
      let segId: string | null = null;
      for (const s of data.segments) if (pos >= s.start_seconds) segId = s.segment_id;
      resumeRef.current = { position: pos, segmentId: segId ?? data.segments[0]?.segment_id ?? null };

      speechTextRef.current = "";
      if (import.meta.env.PROD && SpeechRecognition) {
        const speech = new SpeechRecognition();
        speech.lang = "zh-CN";
        speech.continuous = true;
        speech.interimResults = true;
        speech.onresult = (event) => {
          let text = "";
          for (let index = 0; index < event.results.length; index += 1) {
            text += event.results[index][0].transcript;
          }
          speechTextRef.current = text.trim();
        };
        speech.onerror = () => setAskError("没有识别到清晰语音，你也可以直接输入问题。");
        speechRef.current = speech;
        speech.start();
      }

      const mr = (() => {
        const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
        const mimeType = typeof MediaRecorder.isTypeSupported === "function"
          ? candidates.find((t) => MediaRecorder.isTypeSupported(t))
          : undefined;
        return mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      })();
      recorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        stopTracks();
        const elapsed = (performance.now() - recStartRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (elapsed < 0.6 || blob.size < 1000) {
          setAskError("录音太短，请点击开始后说完问题，再点击结束。");
          resumePodcast();
          return;
        }
        if (import.meta.env.PROD) {
          window.setTimeout(() => {
            const transcript = speechTextRef.current.trim();
            if (!transcript) {
              setAskError("没有识别到问题，请重试或直接输入文字。");
              resumePodcast();
              return;
            }
            void submitQuestion(transcript);
          }, 350);
        } else {
          void submitQuestion("", blob);
        }
      };
      recStartRef.current = performance.now();
      setRecSecs(0);
      recTimerRef.current = window.setInterval(
        () => setRecSecs((performance.now() - recStartRef.current) / 1000),
        200
      );
      mr.start();
      setAskState("recording");
    } catch {
      stopTracks();
      setAskState("idle");
      setAskError("无法访问麦克风：请检查浏览器权限（地址栏左侧图标 → 允许麦克风）。");
    }
  }, [data, submitQuestion, resumePodcast]);

  const stopRecording = useCallback(() => {
    speechRef.current?.stop();
    speechRef.current = null;
    const mr = recorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  }, []);

  const toggleRecording = () => {
    if (askState === "recording") stopRecording();
    else void startRecording();
  };

  const skipAnswer = () => {
    resumePodcast();
  };

  const submitTypedQuestion = (event: FormEvent) => {
    event.preventDefault();
    const transcript = typedQuestion.trim();
    if (!transcript || !data || askState === "processing" || askState === "recording") return;
    const audio = audioRef.current;
    const position = audio?.currentTime ?? 0;
    audio?.pause();
    let segmentId: string | null = null;
    for (const segment of data.segments) if (position >= segment.start_seconds) segmentId = segment.segment_id;
    resumeRef.current = { position, segmentId: segmentId ?? data.segments[0]?.segment_id ?? null };
    setAskError("");
    setAskResult(null);
    setTypedQuestion("");
    void submitQuestion(transcript);
  };

  const seekTo = (sec: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = sec;
      audio.play().catch(() => undefined);
    }
  };

  /* ---------- 渲染 ---------- */
  if (loadError) {
    return (
      <div style={{ padding: 24, background: "rgba(225,90,110,.12)", border: `1px solid ${C.danger}`, borderRadius: 8 }}>
        <strong>服务未连接</strong>
        <p>{loadError}</p>
      </div>
    );
  }
  if (!data) return <p style={{ color: C.muted }}>正在加载播客数据…</p>;

  return (
    <div className="papercast-grid">
      <div className="segment-list">
        <div className="segment-header">
          <strong><span>章节</span></strong>
        </div>
        {data.segments.map((s) => {
          const active = currentSeg?.segment_id === s.segment_id;
          const color = s.speaker === "host" ? C.host : C.researcher;
          const deepColor = s.speaker === "host" ? C.hostDeep : C.researcherDeep;
          return (
            <div
              key={s.segment_id}
              ref={active ? activeCardRef : undefined}
              onClick={() => seekTo(s.start_seconds)}
              className={`segment-card ${active ? "active" : ""}`}
              style={{ "--seg-deep": deepColor } as CSSProperties}
            >
              <div className="segment-meta">
                <span
                  className="speaker-pill"
                  style={active ? { background: "rgba(255,255,255,.94)", color: deepColor } : { background: `${color}26`, color }}
                >
                  {s.speaker === "host" ? "主持人" : "研究员"}
                </span>
                <span style={{ color: active ? "rgba(255,255,255,.85)" : C.muted }}>{fmtTime(s.start_seconds)}</span>
              </div>
              <p>{s.text}</p>
            </div>
          );
        })}
      </div>

      <section className="center-column">
        <div className="player-card">
          <div className="card-heading">
            <h2><span>{paperLabel(data.paper_id)}</span></h2>
          </div>
          {papers.length > 1 && (
            <label className="paper-picker">
              <select
                className="paper-select"
                aria-label="选择论文"
                value={paperId}
                onChange={(e) => setPaperId(e.target.value)}
              >
                {papers.map((paper) => (
                  <option key={paper.paper_id} value={paper.paper_id}>
                    {paperLabel(paper.paper_id)} · {paper.segments} 段 · {fmtTime(paper.total_seconds)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className={`playback-visualizer ${isPlaying ? "playing" : ""}`} aria-label="播客实时音浪">
            <div className="idle-core" aria-hidden="true"><span /></div>
            <canvas ref={playbackCanvasRef} className="playback-canvas" />
          </div>
          <audio
            ref={audioRef}
            src={data.podcast_url}
            controls
            className="podcast-audio"
            onPlay={() => void startPlaybackVisualizer()}
            onPause={stopPlaybackVisualizer}
            onEnded={stopPlaybackVisualizer}
            onTimeUpdate={(e) => setCurrentSec(e.currentTarget.currentTime)}
          />
        </div>
        <aside className="tutor-panel">
          <div className="card-heading">
            <h2><span>论文问答</span></h2>
          </div>

          <div className={`recorder-stage ${askState}`}>
            <div className="waveform-shell">
              <canvas ref={canvasRef} className="waveform" aria-label="实时语音波形" />
              {askState !== "recording" && (
                <span className="waveform-label">
                  {askState === "processing" ? "处理中" : askState === "answer" ? "已完成" : "准备提问"}
                </span>
              )}
            </div>
            {(askState === "idle" || askState === "recording") && (
              <button onClick={toggleRecording} className={`record-button ${askState}`}>
                {askState === "recording" ? `结束录音 · ${recSecs.toFixed(1)}s` : "开始录音"}
              </button>
            )}
          </div>

          {import.meta.env.PROD && (
            <form className="question-form" onSubmit={submitTypedQuestion}>
              <input
                value={typedQuestion}
                onChange={(event) => setTypedQuestion(event.target.value)}
                placeholder="也可以直接输入问题"
                aria-label="输入论文问题"
                maxLength={200}
                disabled={askState === "processing" || askState === "recording"}
              />
              <button disabled={!typedQuestion.trim() || askState === "processing" || askState === "recording"}>提问</button>
            </form>
          )}

          {askError && <div className="ask-error">{askError}</div>}

          {askResult && (
            <div className="answer-card">
              <span className="answer-label">你的问题</span>
              <p className="question-text">“{askResult.transcript}”</p>
              <span className="answer-label">导师回答</span>
              <p className="answer-text">{askResult.answer}</p>
              <button className="resume-button" onClick={skipAnswer}>
                继续播放（{fmtTime(askResult.resume_position_seconds)}）
              </button>
            </div>
          )}
        </aside>
      </section>

      {/* 右：本次会话的问答历史 */}
      <aside className="history-panel">
        <h2><span>记录</span></h2>
        {!history.length && <div className="history-empty">暂无记录</div>}
        <div className="history-list">
          {history.map((item, index) => (
            <div className="history-item" key={`${item.resume_position_seconds}-${index}`}>
              <div className="history-question">{item.transcript}</div>
              <div className="history-answer">{item.answer}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

/* ================= S1 部署自检页 ================= */
function CheckPage() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  const runChecks = async () => {
    setRunning(true);
    const out: CheckResult[] = [];
    const add = (name: string, status: CheckResult["status"], detail: string) => out.push({ name, status, detail });
    const errText = (e: unknown) => String(e instanceof Error ? e.message : e);

    add("HTTPS 安全上下文", window.isSecureContext ? "pass" : "fail",
      `${location.protocol}//${location.host}（麦克风需要 HTTPS 或 localhost）`);
    const hasMic = typeof navigator.mediaDevices?.getUserMedia === "function";
    add("麦克风 API", hasMic ? "pass" : "fail",
      hasMic ? "getUserMedia 可用" : "不可用：检查浏览器权限");
    const mimes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
    const supported = typeof MediaRecorder !== "undefined" ? mimes.filter((t) => MediaRecorder.isTypeSupported(t)) : [];
    add("录音格式", supported.length ? "pass" : "fail",
      supported.length ? supported.join("、") : "MediaRecorder 不可用");
    add("Web Audio", typeof AudioContext !== "undefined" ? "pass" : "fail",
      typeof AudioContext !== "undefined" ? "AudioContext 可用（声效/可视化）" : "不可用");
    add("屏幕视口", "pass", `${window.innerWidth}×${window.innerHeight} · ${navigator.userAgent}`);

    if (import.meta.env.PROD) {
      try {
        const r = await fetch(`${API_BASE}/probe`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        add("边缘函数", "pass", "Qoder Function 可达");
      } catch (e) {
        add("边缘函数", "fail", `不可达：${errText(e)}`);
      }
    } else {
      try {
        const r = await fetch(`${API_BASE}/health`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        add("本地后端", "pass", "Python API 可达");
      } catch (e) {
        add("本地后端", "fail", `不可达：${errText(e)}`);
      }
    }

    let firstPaper = "";
    try {
      const r = await fetch(PAPERS_URL, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { papers: PaperSummary[] };
      firstPaper = j.papers?.[0]?.paper_id ?? "";
      add("论文数据", j.papers?.length ? "pass" : "warn",
        `${j.papers?.length ?? 0} 篇：${(j.papers ?? []).map((p) => p.paper_id).join("、")}`);
    } catch (e) {
      add("论文数据", "fail", errText(e));
    }

    let audioUrl = "";
    if (firstPaper) {
      try {
        const r = await fetch(podcastUrl(firstPaper), { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as PodcastData;
        audioUrl = j.podcast_url;
        const leak = /"quote"|"passage_text"/.test(JSON.stringify(j));
        add("播客数据", leak ? "fail" : "pass",
          `${j.segments.length} 段 · ${fmtTime(j.total_seconds)} · ${leak ? "检测到原文字段（异常！）" : "无原文字段"}`);
      } catch (e) {
        add("播客数据", "fail", errText(e));
      }
    }
    if (audioUrl) {
      try {
        const r = await fetch(audioUrl, { headers: { Range: "bytes=0-1023" } });
        add("音频 Range 请求", r.status === 206 ? "pass" : r.status === 200 ? "warn" : "fail",
          r.status === 206 ? "HTTP 206 分段加载正常"
            : r.status === 200 ? "HTTP 200：服务端未支持 Range，拖动进度可能受限"
              : `HTTP ${r.status}`);
      } catch (e) {
        add("音频 Range 请求", "fail", errText(e));
      }
    }
    if (import.meta.env.PROD && firstPaper) {
      try {
        const r = await fetch(`${API_BASE}/ask?paper_id=${encodeURIComponent(firstPaper)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: "Docling 如何转换 PDF？" }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as AskResult;
        add("论文问答", j.answer && j.transcript && j.evidence_ids.length ? "pass" : "fail",
          j.answer ? `已返回回答 · ${j.evidence_ids.length} 条节目证据` : "回答为空");
      } catch (e) {
        add("论文问答", "fail", errText(e));
      }
    }
    setResults(out);
    setRunning(false);
  };

  return (
    <div className="check-wrap">
      <section className="player-card">
        <div className="card-heading">
          <h2><span>S1 部署自检</span></h2>
          <button className="resume-button" onClick={() => void runChecks()} disabled={running}>
            {running ? "检测中…" : "运行客户端自检"}
          </button>
        </div>
        <p className="check-note">
          发布到 Qoder Sites 后，在公网链接上（桌面与手机各一次）运行本自检并截图留证。
          检测 HTTPS、麦克风、录音格式、边缘问答、原文保护与音频 Range 播放。
        </p>
        {!results.length && !running && <div className="history-empty">点击「运行客户端自检」开始</div>}
        <div className="check-list">
          {results.map((r) => (
            <div className="check-row" key={r.name}>
              <span className={`check-badge ${r.status}`}>
                {r.status === "pass" ? "通过" : r.status === "warn" ? "注意" : "失败"}
              </span>
              <span className="check-name">{r.name}</span>
              <span className="check-detail">{r.detail}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ================= 根组件 ================= */
export default function App() {
  const [tab, setTab] = useState<"demo" | "check">("demo");
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest("button:not(.record-button):not(:disabled), .segment-card, select");
      if (target) playUiChime();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1><span>PaperCast</span></h1>
        <nav className="tab-bar">
          <button className={`tab-button ${tab === "demo" ? "active" : ""}`} onClick={() => setTab("demo")}>功能演示</button>
          <button className={`tab-button ${tab === "check" ? "active" : ""}`} onClick={() => setTab("check")}>S1 部署自检</button>
        </nav>
      </header>
      <div className="tab-page" hidden={tab !== "demo"}><DemoPage /></div>
      <div className="tab-page" hidden={tab !== "check"}><CheckPage /></div>
    </main>
  );
}
