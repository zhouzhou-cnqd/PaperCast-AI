import { podcasts } from "./data/podcasts.ts";
import { evidence } from "./data/evidence.ts";
import { getUser } from "./auth.mjs";

const MAX_QUESTION_CHARS = 200;
const DEEP_LIMIT = 3;
const DEEP_COOKIE = "papercast_deep";

type PodcastSegment = {
  segment_id: string;
  speaker: "host" | "researcher";
  text: string;
  start_seconds: number;
  evidence_ids: readonly string[];
};

type PaperEvidence = {
  evidence_id: string;
  page: number | null;
  section: string | null;
  quote: string;
};

export type UsageStorage = {
  download: (path: string) => Promise<Response>;
  upload: (
    path: string,
    body: Uint8Array,
    options: { contentType: string; upsert: boolean },
  ) => Promise<unknown>;
};

const PODCASTS = podcasts as Record<string, { segments: readonly PodcastSegment[] }>;
const EVIDENCE = evidence as Record<string, readonly PaperEvidence[]>;

const PAPER_DATES: Record<string, { answer: string; evidence_id: string }> = {
  docling_tech_report: {
    answer: "当前这份 Docling 技术报告标注为 arXiv v5，版本日期是 2024 年 12 月 9 日。",
    evidence_id: "meta_docling_version_date",
  },
  diffusion_bridge_gda_fault_diagnosis: {
    answer: "论文标注的正式发表日期是 2026 年 6 月 1 日，当前版本日期是 2026 年 10 月 7 日。",
    evidence_id: "meta_dbda_publication_date",
  },
};

const TUTOR_SYSTEM_PROMPT = `你是科研论文导师。只依据给定论文证据回答。
输出 JSON：{"answer":"...","evidence_ids":["ev_..."]}。
answer 使用清晰中文，按“核心结论—方法机制—实验依据与局限”组织；证据充分时写 250-500 个汉字并分段；evidence_ids 只能从证据列表中选择。
证据不足时必须以“论文未提供”或“我不确定”开头，evidence_ids 为空。禁止编造。`;

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
  结果: ["result", "results", "performance", "benchmark"],
  对比: ["comparison", "baseline", "outperform"],
  消融: ["ablation"],
  结论: ["conclusion"],
  周期内: ["intraperiod"],
  周期间: ["interperiod"],
  多周期: ["multi-periodicity", "periodicity"],
  低资源: ["resource", "backend", "hardware", "memory"],
  代价: ["trade-off", "tradeoff", "performance", "accuracy"],
  未来计划: ["future", "planned", "roadmap"],
  增加: ["add", "additional", "future"],
};

const STOP_TERMS = new Set(["什么", "怎么", "哪些", "一个", "这个", "论文", "介绍", "一下", "请问", "是否"]);

function json(value: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...Object.fromEntries(new Headers(extraHeaders).entries()),
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

export function retrieveBundledEvidence(question: string, paperId: string, limit = 6): PaperEvidence[] {
  const terms = extractTerms(question);
  return [...(EVIDENCE[paperId] ?? [])]
    .map((item) => {
      const quote = item.quote.toLowerCase();
      const section = (item.section ?? "").toLowerCase();
      const score = terms.reduce((total, term) => {
        const needle = term.toLowerCase();
        return total + (quote.includes(needle) ? Math.min(needle.length, 8) : 0)
          + (section.includes(needle) ? 3 : 0);
      }, 0);
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ item }) => item);
}

function env(name: string): string {
  try {
    return Deno.env.get(name)?.trim() ?? "";
  } catch {
    return "";
  }
}

async function signUsage(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  return btoa(String.fromCharCode(...signature)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function deepUsage(request: Request, secret: string): Promise<{ count: number; visitorId: string }> {
  if (!secret) return { count: 0, visitorId: "" };
  const raw = request.headers.get("cookie")?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DEEP_COOKIE}=`))
    ?.slice(DEEP_COOKIE.length + 1);
  const parts = raw?.split(".") ?? [];
  const [visitorId, countText, signature] = parts.length === 3
    ? parts
    : ["", parts[0], parts[1]];
  const count = Number(countText);
  if (
    !Number.isInteger(count) || count < 0 || count > DEEP_LIMIT || !signature
    || (visitorId && !/^[0-9a-f-]{36}$/.test(visitorId))
  ) return { count: 0, visitorId: "" };
  const signedValue = visitorId ? `${visitorId}:${countText}` : countText;
  return await signUsage(signedValue, secret) === signature ? { count, visitorId } : { count: 0, visitorId: "" };
}

async function deepUsageCookie(visitorId: string, count: number, secret: string): Promise<string> {
  const value = `${visitorId}:${count}`;
  return `${DEEP_COOKIE}=${visitorId}.${count}.${await signUsage(value, secret)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`;
}

async function visitorUsageKeys(request: Request, secret: string, visitorId: string): Promise<string[]> {
  const userAgent = request.headers.get("user-agent")?.slice(0, 200) ?? "";
  let userId = "";
  try {
    userId = getUser(request)?.user_id ?? "";
  } catch {
    throw new Error("usage_unavailable");
  }
  const candidates: Array<[string, string | undefined]> = [
    ["user", userId],
    ["visitor", visitorId],
    ["forwarded", request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()],
    ["cloud", request.headers.get("cf-connecting-ip")?.trim()],
    ["real", request.headers.get("x-real-ip")?.trim()],
  ].filter((candidate): candidate is [string, string] => Boolean(candidate[1]));
  if (!candidates.length) throw new Error("usage_unavailable");
  return await Promise.all(candidates.map(async ([source, value]) => {
    const bytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${secret}|${source}|${value}|${userAgent}`),
    );
    return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }));
}

async function reserveDeepUsage(
  request: Request,
  secret: string,
  visitorId: string,
  storage: UsageStorage,
): Promise<number> {
  const visitors = await visitorUsageKeys(request, secret, visitorId);
  const content = new TextEncoder().encode(JSON.stringify({ reserved_at: new Date().toISOString() }));
  let strictestRemaining = DEEP_LIMIT;
  for (const visitor of visitors) {
    strictestRemaining = Math.min(strictestRemaining, await reserveVisitorSlot(visitor, storage, content));
  }
  return strictestRemaining;
}

async function reserveVisitorSlot(
  visitor: string,
  storage: UsageStorage,
  content: Uint8Array,
): Promise<number> {
  for (let slot = 1; slot <= DEEP_LIMIT; slot += 1) {
    const path = `deep-usage/${visitor}/${slot}.json`;
    try {
      const existing = await storage.download(path);
      await existing.body?.cancel();
      continue;
    } catch {
      try {
        await storage.upload(path, content, { contentType: "application/json", upsert: false });
        return DEEP_LIMIT - slot;
      } catch {
        // A concurrent request may have reserved this slot; try the next one.
      }
    }
  }
  throw new Error("limit_reached");
}

async function retrieveFromQdrant(question: string, paperId: string): Promise<PaperEvidence[]> {
  const url = env("QDRANT_URL").replace(/\/$/, "");
  const apiKey = env("QDRANT_API_KEY");
  const collection = env("QDRANT_COLLECTION") || "papercast_evidence";
  if (!url || !apiKey) return [];

  const queryText = `${question} ${extractTerms(question).join(" ")}`.trim();
  const paperFilter = {
    must: [{ key: "paper_id", match: { value: paperId } }],
    must_not: [
      { key: "is_appendix", match: { value: true } },
      { key: "is_reference", match: { value: true } },
    ],
  };
  const response = await fetch(`${url}/collections/${encodeURIComponent(collection)}/points/query`, {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      prefetch: [
        {
          query: { text: queryText, model: "intfloat/multilingual-e5-small" },
          using: "dense_vector",
          filter: paperFilter,
          limit: 10,
        },
        { query: { text: queryText }, using: "passage_text", filter: paperFilter, limit: 10 },
      ],
      query: { fusion: "rrf" },
      limit: 5,
      with_payload: true,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Qdrant HTTP ${response.status}`);
  const data = await response.json() as {
    result?: { points?: Array<{ payload?: Record<string, unknown> }> } | Array<{ payload?: Record<string, unknown> }>;
  };
  const points = Array.isArray(data.result) ? data.result : data.result?.points ?? [];
  return points.flatMap((point) => {
    const payload = point.payload ?? {};
    const quote = String(payload.quote ?? payload.passage_text ?? "").trim();
    const evidenceId = String(payload.evidence_id ?? "").trim();
    if (!quote || !evidenceId) return [];
    return [{
      evidence_id: evidenceId,
      page: typeof payload.page === "number" ? payload.page : null,
      section: typeof payload.section === "string" ? payload.section : null,
      quote,
    }];
  });
}

async function answerWithDeepSeek(question: string, evidences: PaperEvidence[]) {
  const apiKey = env("DEEPSEEK_API_KEY");
  if (!apiKey || !evidences.length) return null;
  const baseUrl = (env("DEEPSEEK_BASE_URL") || "https://api.deepseek.com").replace(/\/$/, "");
  const evidenceText = evidences.map((evidence) =>
    `${evidence.evidence_id} | p.${evidence.page ?? "?"} | ${evidence.section ?? ""} | ${evidence.quote.slice(0, 1400)}`
  ).join("\n");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: env("DEEPSEEK_MODEL") || "deepseek-chat",
      messages: [
        { role: "system", content: TUTOR_SYSTEM_PROMPT },
        { role: "user", content: `学生提问：${question}\n可用证据：\n${evidenceText}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 900,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  const parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, "")) as {
    answer?: unknown;
    evidence_ids?: unknown;
  };
  const allowed = new Set(evidences.map((evidence) => evidence.evidence_id));
  const answer = typeof parsed.answer === "string" ? parsed.answer.trim().slice(0, 140) : "";
  const evidenceIds = Array.isArray(parsed.evidence_ids)
    ? parsed.evidence_ids.filter((id): id is string => typeof id === "string" && allowed.has(id))
    : [];
  if (!answer) throw new Error("DeepSeek returned an empty answer");
  return {
    answer,
    evidence_ids: answer.startsWith("论文未提供") || answer.startsWith("我不确定") ? [] : evidenceIds,
  };
}

async function answerQuestion(request: Request, url: URL, usageStorage?: UsageStorage): Promise<Response> {
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
  const answerMode = (body as { mode?: unknown })?.mode === "deep" ? "deep" : "quick";
  if (transcript.length < 2 || transcript.length > MAX_QUESTION_CHARS) {
    return json({ error: `问题长度需为 2-${MAX_QUESTION_CHARS} 个字符` }, 400);
  }

  const paperId = url.searchParams.get("paper_id") ?? "";
  const currentSegmentId = url.searchParams.get("segment_id");
  const resumePosition = Math.max(0, Number(url.searchParams.get("position") ?? "0") || 0);
  const paper = PODCASTS[paperId];
  if (!paper) return json({ error: "未知论文" }, 404);

  const asksPublicationDate = /什么时候发布|何时发布|哪年发布|发布日期|发表日期|什么时候发表|何时发表/.test(transcript);
  const dateFact = asksPublicationDate ? PAPER_DATES[paperId] : undefined;
  if (dateFact) {
    return json({
      transcript,
      answer: dateFact.answer,
      evidence_ids: [dateFact.evidence_id],
      resume_segment_id: currentSegmentId,
      resume_position_seconds: resumePosition,
      asr_seconds: null,
      total_seconds: Math.round(performance.now() - startedAt) / 1000,
      report: { retrieval_method: "structured_metadata", keywords: ["publication_date"], path: "fact_answer" },
    });
  }

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
  const usageSecret = env("USAGE_SIGNING_SECRET");
  const usage = await deepUsage(request, usageSecret);
  const visitorId = usage.visitorId || crypto.randomUUID();
  const usedDeep = usage.count;
  let deepRemaining = Math.max(0, DEEP_LIMIT - usedDeep);
  let reservedDeepUsage = false;
  let cloudError = answerMode !== "deep"
    ? "quick_mode"
    : usedDeep >= DEEP_LIMIT
    ? "limit_reached"
    : !usageSecret || !env("DEEPSEEK_API_KEY")
    ? "not_configured"
    : "";
  if (!cloudError && usageStorage) {
    try {
      const storedRemaining = await reserveDeepUsage(request, usageSecret, visitorId, usageStorage);
      deepRemaining = Math.min(storedRemaining, Math.max(0, DEEP_LIMIT - usedDeep - 1));
      reservedDeepUsage = true;
    } catch (error) {
      cloudError = error instanceof Error ? error.message : "usage_unavailable";
      deepRemaining = 0;
    }
  }
  if (!cloudError) {
    try {
      let evidences: PaperEvidence[] = [];
      let retrievalMethod = "bundled_fulltext";
      try {
        evidences = await retrieveFromQdrant(transcript, paperId);
        if (evidences.length) retrievalMethod = "qdrant_hybrid";
      } catch {
        // Qdrant is optional; the bundled paper evidence remains available.
      }
      if (!evidences.length) evidences = retrieveBundledEvidence(transcript, paperId);
      if (!evidences.length) {
        retrievalMethod = "podcast_segment_fallback";
        const seen = new Set<string>();
        evidences = ranked.slice(0, 6).flatMap(({ segment }) => {
          const evidenceId = segment.evidence_ids[0] ?? segment.segment_id;
          if (seen.has(evidenceId)) return [];
          seen.add(evidenceId);
          return [{ evidence_id: evidenceId, page: null, section: null, quote: segment.text }];
        });
      }
      const generated = await answerWithDeepSeek(transcript, evidences);
      if (generated) {
        const nextUsage = DEEP_LIMIT - deepRemaining;
        return json({
          transcript,
          answer: generated.answer,
          evidence_ids: generated.evidence_ids,
          resume_segment_id: currentSegmentId,
          resume_position_seconds: resumePosition,
          asr_seconds: null,
          total_seconds: Math.round(performance.now() - startedAt) / 1000,
          deep_remaining: deepRemaining,
          report: {
            retrieval_method: retrievalMethod,
            keywords: terms.slice(0, 12),
            path: "deepseek_grounded_answer",
          },
        }, 200, { "set-cookie": await deepUsageCookie(visitorId, nextUsage, usageSecret) });
      }
    } catch (error) {
      cloudError = error instanceof Error ? error.message.split(" ")[0] : "cloud_error";
    }
  }

  let best = ranked[0];
  let usedContextFallback = false;
  if (best && best.lexicalScore === 0 && currentSegmentId && /核心|方法|原理|流程|作用|特点|优势|局限|它|这个/.test(transcript)) {
    const current = paper.segments.find((segment) => segment.segment_id === currentSegmentId);
    if (current) {
      best = { segment: current, lexicalScore: 0, score: 1 };
      usedContextFallback = true;
    }
  }
  const supported = best && (best.lexicalScore >= 3 || usedContextFallback);
  const answer = supported
    ? shortAnswer(best.segment.text)
    : "论文未提供这方面的信息，我不确定，不能凭空回答你。";

  const fallbackHeaders = reservedDeepUsage
    ? { "set-cookie": await deepUsageCookie(visitorId, DEEP_LIMIT - deepRemaining, usageSecret) }
    : undefined;
  return json({
    transcript,
    answer,
    evidence_ids: supported ? [...best.segment.evidence_ids] : [],
    resume_segment_id: currentSegmentId,
    resume_position_seconds: resumePosition,
    asr_seconds: null,
    total_seconds: Math.round(performance.now() - startedAt) / 1000,
    deep_remaining: deepRemaining,
    report: {
      retrieval_method: "podcast_segment_lexical",
      keywords: terms.slice(0, 12),
      path: supported ? "extractive_answer" : "no_evidence_short_circuit",
      matched_segment_id: supported ? best.segment.segment_id : null,
      cloud_fallback: cloudError || undefined,
    },
  }, 200, fallbackHeaders);
}

export function createHandler(usageStorage?: UsageStorage) {
  return async (request: Request): Promise<Response> => {
    const rawUrl = new URL(request.url);
    const logicalPath = rawUrl.pathname.replace(/^\/functions\/v1\/app/, "") || "/";
    const route = logicalPath.split("/").filter(Boolean).at(-1) ?? "";

    if (request.method === "GET" && route === "probe") {
      return json({ ok: true, route: "probe", service: "papercast-edge" });
    }
    if (request.method === "POST" && route === "ask") {
      return await answerQuestion(request, rawUrl, usageStorage);
    }
    return json({ error: "not_found", routes: ["probe", "ask"] }, 404);
  };
}

export const handler = createHandler();
