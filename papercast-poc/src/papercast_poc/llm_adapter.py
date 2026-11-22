"""LLM 适配器：DeepSeek（OpenAI 兼容接口）。未配置密钥时抛明确异常，绝不静默 Mock。"""
from __future__ import annotations

import json
import os


class LLMNotConfiguredError(RuntimeError):
    """未配置真实 LLM 服务。实验 B 在此情况下必须标记 BLOCKED，而非伪造结果。"""


class DeepSeekLLM:
    def __init__(self, model: str | None = None, base_url: str | None = None):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        if not self.api_key:
            raise LLMNotConfiguredError(
                "DEEPSEEK_API_KEY 未设置。请复制 .env.example 为 .env 并填写密钥（按量计费）。"
            )
        from openai import OpenAI  # 延迟导入，属于 optional extra: llm

        self.model = model or os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=base_url or os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
        )
        self.usage_log: list[dict] = []

    def chat_json(
        self,
        system: str,
        user: str,
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> dict:
        """要求模型输出 JSON 并解析；记录 token 用量供费用估算。"""
        kwargs = {
            "model": self.model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "response_format": {"type": "json_object"},
            "temperature": temperature,
        }
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        resp = self.client.chat.completions.create(
            **kwargs,
        )
        if resp.usage:
            self.usage_log.append(
                {
                    "prompt_tokens": resp.usage.prompt_tokens,
                    "completion_tokens": resp.usage.completion_tokens,
                }
            )
        return json.loads(resp.choices[0].message.content)

    def chat_text(self, system: str, user: str, temperature: float = 0.5) -> str:
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=temperature,
        )
        if resp.usage:
            self.usage_log.append(
                {
                    "prompt_tokens": resp.usage.prompt_tokens,
                    "completion_tokens": resp.usage.completion_tokens,
                }
            )
        return resp.choices[0].message.content
