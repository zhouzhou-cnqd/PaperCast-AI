import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pocRoot = resolve(siteRoot, "..", "papercast-poc");

const sources = [
  {
    title: "Docling 技术报告",
    manifest: resolve(pocRoot, "outputs", "pipeline", "audio", "manifest.json"),
    audio: resolve(pocRoot, "outputs", "pipeline", "audio", "podcast.mp3"),
  },
  {
    title: "DBDA 渐进域适应故障诊断",
    manifest: resolve(
      pocRoot,
      "outputs",
      "papers",
      "diffusion_bridge_gda_fault_diagnosis",
      "tts",
      "manifest.json",
    ),
    audio: resolve(
      pocRoot,
      "outputs",
      "papers",
      "diffusion_bridge_gda_fault_diagnosis",
      "tts",
      "podcast.mp3",
    ),
  },
  ...[
    ["xlstm_scaling_laws", "xLSTM Scaling Laws"],
    ["swinlstm_spatiotemporal_prediction", "SwinLSTM 时空预测"],
    ["hypersphere_memory_fault_diagnosis", "超球记忆增量故障诊断"],
    ["satellite_momentum_wheel_patchtst", "卫星动量轮故障诊断"],
    ["focal_loss_dense_detection", "Focal Loss 密集目标检测"],
    ["timesnet", "TimesNet 时间序列分析"],
    ["patchtst", "PatchTST 长期预测"],
    ["itransformer", "iTransformer 时间序列预测"],
  ].map(([paperId, title]) => ({
    title,
    manifest: resolve(pocRoot, "outputs", "papers", paperId, "tts", "manifest.json"),
    audio: resolve(pocRoot, "outputs", "papers", paperId, "tts", "podcast.mp3"),
  })),
];

const papers = [];
const functionPodcasts = {};

for (const source of sources) {
  const manifest = JSON.parse(await readFile(source.manifest, "utf8"));
  const paperId = manifest.paper_id;
  const audioName = source.audio.split(/[\\/]/).at(-1);
  let cursor = 0;
  const segments = manifest.segments.map((segment) => {
    const startSeconds = segment.start_seconds ?? cursor;
    cursor = startSeconds + segment.duration_seconds;
    return {
      segment_id: segment.segment_id,
      speaker: segment.speaker,
      voice: segment.voice ?? "",
      text: segment.text,
      duration_seconds: segment.duration_seconds,
      start_seconds: Math.round(startSeconds * 100) / 100,
      evidence_ids: segment.evidence_ids ?? [],
      claim_type: segment.claim_type ?? "",
    };
  });
  const totalSeconds = manifest.total_seconds ?? Math.round(cursor * 100) / 100;
  const dataDir = resolve(siteRoot, "public", "data", paperId);
  const audioDir = resolve(siteRoot, "public", "audio", paperId);
  await mkdir(dataDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });
  const podcast = {
    paper_id: paperId,
    title: source.title,
    podcast_url: `/audio/${paperId}/${audioName}`,
    total_seconds: totalSeconds,
    segments,
  };
  await writeFile(
    resolve(dataDir, "podcast.json"),
    JSON.stringify(podcast, null, 2) + "\n",
  );
  await copyFile(source.audio, resolve(audioDir, audioName));
  papers.push({ paper_id: paperId, title: source.title, segments: segments.length, total_seconds: totalSeconds });
  functionPodcasts[paperId] = podcast;
}

await mkdir(resolve(siteRoot, "public", "data"), { recursive: true });
await writeFile(
  resolve(siteRoot, "public", "data", "papers.json"),
  JSON.stringify({ papers }, null, 2) + "\n",
);

await mkdir(resolve(siteRoot, "functions", "data"), { recursive: true });
await writeFile(
  resolve(siteRoot, "functions", "data", "podcasts.ts"),
  `export const podcasts = ${JSON.stringify(functionPodcasts, null, 2)} as const;\n`,
);

console.log(`Prepared ${papers.length} papers in public/data and public/audio.`);
