import { handler } from "./handler.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function ask(paperId: string, transcript: string) {
  const response = await handler(new Request(
    `https://example.test/functions/v1/app/ask?paper_id=${encodeURIComponent(paperId)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcript }),
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
