import { createHandler, handler, retrieveBundledEvidence, type UsageStorage } from "./handler.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function ask(
  paperId: string,
  transcript: string,
  mode = "quick",
  cookie = "",
  target = handler,
  networkSuffix = 7,
) {
  const response = await target(new Request(
    `https://example.test/functions/v1/app/ask?paper_id=${encodeURIComponent(paperId)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "papercast-test",
        "cf-connecting-ip": `203.0.113.${networkSuffix}`,
        "x-forwarded-for": `198.51.100.${networkSuffix}, 192.0.2.1`,
        "x-real-ip": `192.0.2.${networkSuffix}`,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({ transcript, mode }),
    },
  ));
  return { response, body: await response.json() };
}

Deno.test("probe exposes only a minimal health response", async () => {
  const response = await handler(new Request("https://example.test/functions/v1/app/probe"));
  const body = await response.json();
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(body.ok === true && body.service === "papercast-edge", "unexpected probe body");
  assert(Object.keys(body).sort().join(",") === "ok,route,service", "probe leaks diagnostic fields");
});

Deno.test("bundled retrieval searches the full parsed paper text", () => {
  const results = retrieveBundledEvidence("TimesNet 如何建模周期内和周期间变化？", "timesnet");
  const context = results.map((item) => item.quote).join(" ").toLowerCase();
  assert(results.length > 0, "expected full-text evidence");
  assert(context.includes("intraperiod") && context.includes("interperiod"), "missed parsed method text");
});

Deno.test("deep mode keeps a strict three-call limit while proxy addresses rotate", async () => {
  const originalFetch = globalThis.fetch;
  let deepCalls = 0;
  const deepAnswer = "核心结论：TimesNet 将复杂的一维时间变化转换到二维空间。方法机制：模型同时表示周期内与周期间变化，并使用 TimesBlock 提取多周期模式。实验依据与局限：论文在预测、插补、分类和异常检测任务上验证了方法，但效果仍依赖周期发现与数据质量。".repeat(2);
  Deno.env.set("DEEPSEEK_API_KEY", "test-key");
  Deno.env.set("USAGE_SIGNING_SECRET", "test-signing-secret");
  globalThis.fetch = (() => {
    deepCalls += 1;
    return Promise.resolve(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ answer: deepAnswer, evidence_ids: [] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }));
  }) as typeof fetch;
  try {
    const slots = new Set<string>();
    const storage: UsageStorage = {
      async download(path) {
        if (!slots.has(path)) throw new Error("not_found");
        return new Response("reserved");
      },
      async upload(path) {
        if (slots.has(path)) throw new Error("exists");
        slots.add(path);
        return {};
      },
    };
    const persistentHandler = createHandler(storage);
    let cookie = "";
    for (const [index, expectedRemaining] of [2, 1, 0].entries()) {
      const { response, body } = await ask(
        "timesnet",
        "TimesNet 的核心方法是什么？",
        "deep",
        cookie,
        persistentHandler,
        index + 1,
      );
      assert(body.report.path === "deepseek_grounded_answer", "deep answer did not use DeepSeek");
      assert(body.answer.length > 140, "deep answer was truncated to the quick-answer limit");
      assert(body.deep_remaining === expectedRemaining, `expected ${expectedRemaining} remaining`);
      cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
      assert(cookie.startsWith("papercast_deep="), "missing usage cookie");
    }
    const fourth = await ask("timesnet", "TimesNet 的核心方法是什么？", "deep", cookie, persistentHandler, 4);
    assert(fourth.body.report.cloud_fallback === "limit_reached", "fourth deep answer was not limited");
    assert(fourth.body.deep_remaining === 0, "remaining count should stay at zero");
    assert(deepCalls === 3, `expected 3 DeepSeek calls, got ${deepCalls}`);
  } finally {
    globalThis.fetch = originalFetch;
    Deno.env.delete("DEEPSEEK_API_KEY");
    Deno.env.delete("USAGE_SIGNING_SECRET");
  }
});

Deno.test("Docling question returns grounded programme evidence", async () => {
  const { response, body } = await ask("docling_tech_report", "Docling 如何转换 PDF？");
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(body.answer.includes("JSON") || body.answer.includes("Markdown"), "answer missed conversion output");
  assert(body.evidence_ids.length > 0, "expected evidence ids");
});

Deno.test("DBDA question stays inside the selected paper", async () => {
  const { response, body } = await ask("diffusion_bridge_gda_fault_diagnosis", "扩散桥如何用于故障诊断？");
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(body.answer.includes("DBDA") || body.answer.includes("渐进域自适应"), "answer missed DBDA content");
  assert(body.evidence_ids.length > 0, "expected evidence ids");
});

Deno.test("all showcase papers answer a grounded method question", async () => {
  const paperIds = [
    "xlstm_scaling_laws",
    "swinlstm_spatiotemporal_prediction",
    "hypersphere_memory_fault_diagnosis",
    "satellite_momentum_wheel_patchtst",
    "focal_loss_dense_detection",
    "timesnet",
    "patchtst",
    "itransformer",
  ];
  for (const paperId of paperIds) {
    const { response, body } = await ask(paperId, "这篇论文的核心方法是什么？");
    assert(response.status === 200, `${paperId}: expected 200, got ${response.status}`);
    assert(body.answer.length > 10, `${paperId}: answer is too short`);
    assert(body.evidence_ids.length > 0, `${paperId}: expected evidence ids`);
  }
});

Deno.test("off-topic question is refused without evidence", async () => {
  const { response, body } = await ask("docling_tech_report", "论文有没有讨论火星农业？");
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(body.answer.startsWith("论文未提供"), "off-topic question was not refused");
  assert(body.evidence_ids.length === 0, "refusal must not include evidence ids");
});

Deno.test("publication date question uses structured metadata, not the intro", async () => {
  const { response, body } = await ask("docling_tech_report", "这个论文是什么时候发布的？");
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(body.answer.includes("2024 年 12 月 9 日"), "answer missed the version date");
  assert(!body.answer.includes("欢迎收听"), "answer incorrectly returned the programme intro");
  assert(body.report.path === "fact_answer", "date question did not use structured metadata");
});

Deno.test("invalid questions and retired debug routes are rejected", async () => {
  const invalid = await ask("docling_tech_report", "x");
  assert(invalid.response.status === 400, `expected 400, got ${invalid.response.status}`);
  for (const route of ["echo", "sleep", "egress"]) {
    const response = await handler(new Request(`https://example.test/functions/v1/app/${route}`));
    assert(response.status === 404, `${route} should be retired`);
  }
});
