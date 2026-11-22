# 许可证审计（license_audit）— 初版，持续更新

> 原则：README 声明 ≠ 已核验 LICENSE 原文；第三方博客结论一律标「待官方核验」。

| 组件 | 类型 | 许可（当前认知） | 核验状态 | 义务/风险 |
|---|---|---|---|---|
| document-to-podcast | 代码 | Apache-2.0（README 声明） | 待克隆后核对 LICENSE | 保留声明 |
| Docling | 代码 | MIT（README 声明） | 待核对 LICENSE | 保留声明 |
| Docling 布局/表格模型 | 权重 | 各异（README 明示需查原包） | **待核验** | 下载前逐项确认 |
| Qwen3-TTS 0.6B/1.7B | 权重 | Apache-2.0（第三方博客称） | **待官方模型卡核验** | 保留 NOTICE；不得用 Qwen 商标 |
| Qwen3-TTS 预设音色 | 声音 | 官方预设 9 音色，随权重许可 | 待核验 | 不克隆真人声音 |
| CosyVoice | 代码+权重 | 未核验 | **待核验** | 部分权重可能非商用，需查 |
| faster-whisper | 代码 | 未核验（预期 MIT） | **待核验** | — |
| Whisper 权重 | 权重 | 未核验（预期 MIT） | **待核验** | — |
| 测试论文 1706.03762 | 内容 | arXiv 非独占许可，作者持有版权 | 未采用（用户选方案②） | — |
| 测试论文 2408.09869（Docling Technical Report, v5） | 内容 | **CC BY 4.0** | ✅ 已核验 arXiv abs 页 view license 链接（creativecommons.org/licenses/by/4.0） | 引用需署名作者与出处；本地文件 sha256=82dd4707…b4d22 |
| 生成播客音频 | 产物 | 依赖所用 TTS 权重许可 | 随 TTS 核验 | 引用论文需注明出处 |

## 未确认项清单（阻塞相关结论）
1. Qwen3-TTS 官方模型卡许可原文（下载权重前必须核验）
2. Docling 默认下载的具体模型清单及其各自许可
3. CosyVoice / faster-whisper 全部信息