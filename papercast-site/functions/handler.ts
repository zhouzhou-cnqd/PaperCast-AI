import { podcasts } from "./data/podcasts.ts";

const MAX_QUESTION_CHARS = 200;

type PodcastSegment = {
  segment_id: string;
  speaker: "host" | "researcher";
  text: string;
  start_seconds: number;
  evidence_ids: readonly string[];
};

const PODCASTS = podcasts as Record<string, { segments: readonly PodcastSegment[] }>;

const ZH_EN_GLOSSARY: Record<string, string[]> = {
  表格: ["table", "tableformer"],
  布局: ["layout"],
  识别: ["recognition"],
  许可证: ["license", "mit"],
  输出: ["output", "json", "markdown"],
  性能: ["performance", "speed"],
  扫描: ["scanned"],
  开源: ["open-source"],
  流水线: ["pipeline"],
  扩展: ["extend"],
  转换: ["conversion"],
  文档: ["document"],
  元数据: ["metadata"],
  数据集: ["dataset", "benchmark"],
  训练: ["trained"],
  单元格: ["cell"],
  故障诊断: ["fault", "diagnosis"],
  扩散桥: ["diffusion", "bridge"],
  渐进域适应: ["gradual", "domain", "adaptation"],
  目标域: ["target", "domain"],
  源域: ["source", "domain"],
  知识保留: ["knowledge", "retention"],
  边界扩展: ["boundary", "extension"],
  语义漂移: ["semantic", "drift"],
  核心方法: ["method", "approach", "architecture", "model"],
  架构: ["architecture"],
  实验: ["experiment"],
  局限: ["limitation"],
  优势: ["advantage"],
  创新: ["novel", "contribution"],
  如何: ["利用", "通过", "逐步", "具体"],
  怎么: ["利用", "通过", "逐步", "具体"],
};

const STOP_TERMS = new Set(["什么", "怎么", "哪些", "一个", "这个", "论文", "介绍", "一下", "请问", "是否"]);

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function extractTerms(question: string): string[] {
  const terms = new Set<string>();
  for (const match of question.toLowerCase().matchAll(/[a-z][a-z0-9-]{1,}/g)) terms.add(match[0]);
  for (const [chinese, english] of Object.entries(ZH_EN_GLOSSARY)) {
    if (question.includes(chinese)) {
      terms.add(chinese);
      english.forEach((term) => terms.add(term));
    }
  }
  for (const match of question.matchAll(/[\u3400-\u9fff]{2,}/g)) {
    const phrase = match[0];
    if (!STOP_TERMS.has(phrase)) terms.add(phrase);
    for (let index = 0; index < phrase.length - 1; index += 1) {
      const pair = phrase.slice(index, index + 2);
      if (!STOP_TERMS.has(pair)) terms.add(pair);
    }
  }
  return [...terms];
}

function shortAnswer(text: string): string {
  const clean = text
    .replace(/^(?:感谢主持人|谢谢主持人|各位同学大家好)[，。！]?/, "")
    .trim();
  const sentences = clean.match(/[^。！？!?]+[。！？!?]?/gu) ?? [clean];
  let answer = "";
  for (const sentence of sentences) {
    if (answer && answer.length + sentence.length > 140) break;
    answer += sentence;
    if (answer.length >= 70) break;
  }
  return answer.slice(0, 140) || "论文未提供这方面的信息，我不确定，不能凭空回答你。";
}

async function answerQuestion(request: Request, url: URL): Promise<Response> {
  const startedAt = performance.now();
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 8192 || !request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "问题格式无效" }, 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "问题格式无效" }, 400);
  }
  const transcript = typeof (body as { transcript?: unknown })?.transcript === "string"
    ? (body as { transcript: string }).transcript.trim()
    : "";
  if (transcript.length < 2 || transcript.length > MAX_QUESTION_CHARS) {
    return json({ error: `问题长度需为 2-${MAX_QUESTION_CHARS} 个字符` }, 400);
  }

  const paperId = url.searchParams.get("paper_id") ?? "";
  const currentSegmentId = url.searchParams.get("segment_id");
  const resumePosition = Math.max(0, Number(url.searchParams.get("position") ?? "0") || 0);
  const paper = PODCASTS[paperId];
  if (!paper) return json({ error: "未知论文" }, 404);

  const terms = extractTerms(transcript);
  const ranked = paper.segments
    .map((segment) => {
      const text = segment.text.toLowerCase();
      const lexicalScore = terms.reduce(
        (score, term) => score + (text.includes(term.toLowerCase()) ? Math.min(term.length, 6) : 0),
        0,
      );
      const speakerBonus = segment.speaker === "researcher" ? 2 : 0;
      const introPenalty = segment.segment_id === "seg_001" ? 4 : 0;
      return {
        segment,
        lexicalScore,
        score: lexicalScore + speakerBonus + (segment.segment_id === currentSegmentId ? 1 : 0) - introPenalty,
      };
    })
    .sort((left, right) => right.score - left.score);
  let best = ranked[0];
  let usedContextFallback = false;
  if (best && best.lexicalScore === 0 && currentSegmentId && /核心|方法|原理|流程|作用|特点|优势|局限|它|这个/.test(transcript)) {
    const current = paper.segments.find((segment) => segment.segment_id === currentSegmentId);
    if (current) {
      best = { segment: current, lexicalScore: 0, score: 1 };
      usedContextFallback = true;
    }
  }
  const supported = best && (best.lexicalScore > 0 || usedContextFallback);
  const answer = supported
    ? shortAnswer(best.segment.text)
    : "论文未提供这方面的信息，我不确定，不能凭空回答你。";

  return json({
    transcript,
    answer,
    evidence_ids: supported ? [...best.segment.evidence_ids] : [],
    resume_segment_id: currentSegmentId,
    resume_position_seconds: resumePosition,
    asr_seconds: null,
    total_seconds: Math.round(performance.now() - startedAt) / 1000,
    report: {
      retrieval_method: "podcast_segment_lexical",
      keywords: terms.slice(0, 12),
      path: supported ? "extractive_answer" : "no_evidence_short_circuit",
      matched_segment_id: supported ? best.segment.segment_id : null,
    },
  });
}

export async function handler(request: Request): Promise<Response> {
  const rawUrl = new URL(request.url);
  const logicalPath = rawUrl.pathname.replace(/^\/functions\/v1\/app/, "") || "/";
  const route = logicalPath.split("/").filter(Boolean).at(-1) ?? "";

  if (request.method === "GET" && route === "probe") {
    return json({
      ok: true,
      route: "probe",
      service: "papercast-edge",
    });
  }

  if (request.method === "POST" && route === "ask") return await answerQuestion(request, rawUrl);

  return json({ error: "not_found", routes: ["probe", "ask"] }, 404);
}
