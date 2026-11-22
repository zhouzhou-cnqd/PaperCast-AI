"""实验 B：由真实论文证据生成双角色中文播客脚本，代码校验证据引用存在性。"""
from __future__ import annotations

import json

from .evidence import validate_script_evidence
from .llm_adapter import DeepSeekLLM
from .schemas import Evidence, PodcastScript

SYSTEM_PROMPT = """你是科研播客编剧。根据给定的论文证据块，写一段 2-4 分钟的中文双人对话脚本。
角色：host（提问者，串联结构，面向学生听众）与 researcher（解释方法与证据）。
硬性规则：
1. 只输出 JSON，格式：{"segments":[{"segment_id":"seg_001","speaker":"host|researcher","text":"...","evidence_ids":["ev_001"],"claim_type":"paper_fact|explanation|inference"}]}
2. claim_type=paper_fact 的句子必须绑定所给证据列表中真实存在的 evidence_id，且内容必须被证据原文支持。
3. inference 必须在 text 中明确说明是"我们的分析/推测"，不得冒充作者结论。
4. 只能使用提供给你的 evidence_id，禁止编造 ID。
5. 12-20 个 segment，host 与 researcher 交替，开头引入论文主题，结尾总结。
6. 全部中文，口语化但术语准确。"""


def build_user_prompt(paper_id: str, evidences: list[Evidence], max_evidence: int = 40) -> str:
    picked = evidences[:max_evidence]
    lines = [
        f"paper_id: {paper_id}",
        "证据列表（evidence_id | 页码 | 章节 | 原文摘录）：",
    ]
    for e in picked:
        quote = e.quote[:400].replace("\n", " ")
        lines.append(f"{e.evidence_id} | p.{e.page} | {e.section or '-'} | {quote}")
    lines.append("\n请生成脚本 JSON，顶层还需包含 paper_id 字段。")
    return "\n".join(lines)


def generate_script(
    paper_id: str,
    evidences: list[Evidence],
    llm: DeepSeekLLM | None = None,
    max_retries: int = 1,
) -> tuple[PodcastScript, dict]:
    """生成并校验脚本。返回 (脚本, 运行报告)。校验失败会带着错误信息重试。"""
    llm = llm or DeepSeekLLM()
    user_prompt = build_user_prompt(paper_id, evidences)
    attempts: list[dict] = []
    last_err: Exception | None = None

    for attempt in range(max_retries + 1):
        prompt = user_prompt
        if attempts:
            prompt += "\n\n上次输出存在的问题（必须修复）：\n" + json.dumps(
                attempts[-1], ensure_ascii=False
            )
        try:
            data = llm.chat_json(SYSTEM_PROMPT, prompt)
            data.setdefault("paper_id", paper_id)
            script = PodcastScript.model_validate(data)
            report = validate_script_evidence(script, evidences)
            attempts.append({"attempt": attempt + 1, "validation": report})
            if report["ok"]:
                return script, {
                    "attempts": attempts,
                    "llm_usage": llm.usage_log,
                    "note": "引用存在性已由代码校验；语义支持度需人工抽检",
                }
        except Exception as e:  # noqa: BLE001
            last_err = e
            attempts.append({"attempt": attempt + 1, "error": str(e)})

    raise RuntimeError(f"脚本生成未通过校验，已重试 {max_retries} 次：{attempts}") from last_err