export const podcasts = {
  "docling_tech_report": {
    "paper_id": "docling_tech_report",
    "podcast_url": "/audio/docling_tech_report/podcast.mp3",
    "total_seconds": 422.32,
    "segments": [
      {
        "segment_id": "seg_001",
        "speaker": "host",
        "voice": "Vivian",
        "text": "各位同学大家好，欢迎收听本期科研播客。今天我们要聊的是 IBM Research 最近发布的一个开源工具 Docling，它专门用于 PDF 文档转换。我们请到了研究员来为我们解读这篇技术报告。",
        "duration_seconds": 19.28,
        "start_seconds": 0,
        "evidence_ids": [
          "ev_002",
          "ev_003"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_002",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "谢谢主持人。Docling 是一个易于使用、自包含、MIT 许可的开源包，用于 PDF 文档转换。它由最先进的专用 AI 模型驱动，包括用于布局分析的 DocLayNet 和用于表格结构识别的 TableFormer，并且能在普通硬件上以很小的资源预算高效运行。",
        "duration_seconds": 25.2,
        "start_seconds": 19.28,
        "evidence_ids": [
          "ev_003"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_003",
        "speaker": "host",
        "voice": "Vivian",
        "text": "那为什么我们需要这样一个工具呢？PDF 转换不是已经有很多方案了吗？",
        "duration_seconds": 7.2,
        "start_seconds": 44.48,
        "evidence_ids": [],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_004",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "论文指出，将 PDF 文档转换回机器可处理的格式几十年来一直是个重大挑战，因为 PDF 格式变化巨大、标准化程度弱，而且为打印优化，丢弃了大部分结构特征和元数据。随着大语言模型和检索增强生成等应用模式的出现，利用 PDF 中丰富内容的需求变得更加迫切。",
        "duration_seconds": 33.44,
        "start_seconds": 51.68,
        "evidence_ids": [
          "ev_004"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_005",
        "speaker": "host",
        "voice": "Vivian",
        "text": "所以 Docling 就是为了解决这个问题而生的。它具体能做什么呢？",
        "duration_seconds": 6.72,
        "start_seconds": 85.12,
        "evidence_ids": [],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_006",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "根据论文，Docling 可以将 PDF 文档转换为 JSON 或 Markdown 格式，稳定且非常快速。它能理解详细的页面布局、阅读顺序，定位图表并恢复表格结构。还能提取文档元数据，如标题、作者、参考文献和语言。可选地应用 OCR，例如对扫描版 PDF。并且可以配置为批处理模式或交互模式，还能利用不同的加速器，如 GPU、MPS 等。",
        "duration_seconds": 40.96,
        "start_seconds": 91.84,
        "evidence_ids": [
          "ev_006",
          "ev_007",
          "ev_008",
          "ev_009",
          "ev_010",
          "ev_011"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_007",
        "speaker": "host",
        "voice": "Vivian",
        "text": "听起来功能很全面。那么它的处理流程是怎样的？",
        "duration_seconds": 4.8,
        "start_seconds": 132.8,
        "evidence_ids": [],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_008",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "Docling 实现了一个线性操作流水线，对每个文档顺序执行。首先，PDF 后端解析文档，获取程序化文本标记（包括字符串内容及其页面坐标），并渲染每页的位图图像以支持下游操作。然后，标准模型流水线应用一系列 AI 模型。",
        "duration_seconds": 32.32,
        "start_seconds": 137.6,
        "evidence_ids": [
          "ev_016"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_009",
        "speaker": "host",
        "voice": "Vivian",
        "text": "提到了 PDF 后端，能具体说说有哪些后端吗？",
        "duration_seconds": 4.72,
        "start_seconds": 169.92,
        "evidence_ids": [],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_010",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "论文提到，他们提供了多个后端选择，并开源了一个基于 qpdf 库的自定义 PDF 解析器，名为 docling-parse，作为默认后端。另一种选择是依赖 pypdfium 的后端，在某些情况下可能是更安全的备份选择。",
        "duration_seconds": 28.32,
        "start_seconds": 174.64,
        "evidence_ids": [
          "ev_020"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_011",
        "speaker": "host",
        "voice": "Vivian",
        "text": "接下来是 AI 模型部分，布局分析模型和 TableFormer 具体是怎么工作的？",
        "duration_seconds": 8.24,
        "start_seconds": 202.96,
        "evidence_ids": [],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_012",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "布局分析模型是一个对象检测器，预测页面图像上各种元素的边界框和类别。其架构源自 RT-DETR，并在 DocLayNet 等数据集上重新训练。推理时依赖 onnxruntime。流水线以 72 dpi 分辨率输入页面图像，在单 CPU 上可实现亚秒级延迟。预测的边界框经过后处理去除重叠，然后与 PDF 中的文本标记相交，分组为段落、章节标题等有意义的单元。",
        "duration_seconds": 45.52,
        "start_seconds": 211.2,
        "evidence_ids": [
          "ev_022",
          "ev_023"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_013",
        "speaker": "host",
        "voice": "Vivian",
        "text": "那表格识别呢？TableFormer 有什么特点？",
        "duration_seconds": 5.2,
        "start_seconds": 256.72,
        "evidence_ids": [],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_014",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "TableFormer 是一个视觉变换器模型，用于表格结构恢复。它基于输入图像预测表格的逻辑行和列结构，并确定哪些单元格属于列标题、行标题或表格主体。Docling 将布局分析中检测到的所有表格对象提供给 TableFormer，提供表格的图像裁剪和包含的文本单元格。结构预测在后处理中匹配回 PDF 单元格，以避免昂贵的重新转录。典型表格在标准 CPU 上需要 2 到 6 秒处理。",
        "duration_seconds": 48.32,
        "start_seconds": 261.92,
        "evidence_ids": [
          "ev_024",
          "ev_025"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_015",
        "speaker": "host",
        "voice": "Vivian",
        "text": "性能方面，论文给出了哪些参考数据？",
        "duration_seconds": 4.16,
        "start_seconds": 310.24,
        "evidence_ids": [],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_016",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "论文在 225 页的测试集上评估了处理速度和资源预算，测试集包括三篇 arXiv 论文和两本 IBM Redbooks。表 1 展示了在两种不同系统上使用默认流水线的运行时间特性，包括时间到解决方案、吞吐量和峰值内存。如果需要在极低资源环境中运行，可以考虑配置 pypdfium 后端，它更快且内存效率更高，但代价是结果质量较差，尤其是在表格结构恢复方面。",
        "duration_seconds": 47.52,
        "start_seconds": 314.4,
        "evidence_ids": [
          "ev_031",
          "ev_032",
          "ev_034"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_017",
        "speaker": "host",
        "voice": "Vivian",
        "text": "最后，Docling 有哪些应用场景和未来计划？",
        "duration_seconds": 4.64,
        "start_seconds": 361.92,
        "evidence_ids": [],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_018",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "论文提到，Docling 的高质量、结构化文档转换输出适用于许多下游应用，例如企业文档搜索、段落检索或分类用例，或支持知识提取流水线。未来计划扩展更多模型，如图像分类器、公式识别、代码识别等，并鼓励社区贡献。我们的分析是，Docling 作为一个开源工具，有望降低文档处理的门槛，促进相关研究和应用的发展。",
        "duration_seconds": 36,
        "start_seconds": 366.56,
        "evidence_ids": [
          "ev_035",
          "ev_036",
          "ev_037"
        ],
        "claim_type": "inference"
      },
      {
        "segment_id": "seg_019",
        "speaker": "host",
        "voice": "Vivian",
        "text": "感谢研究员的解读。总结一下，Docling 是一个功能强大、易于使用的开源 PDF 转换工具，基于先进的 AI 模型，能在普通硬件上高效运行，适用于多种下游任务。本期播客就到这里，我们下期再见。",
        "duration_seconds": 19.76,
        "start_seconds": 402.56,
        "evidence_ids": [
          "ev_003",
          "ev_005"
        ],
        "claim_type": "paper_fact"
      }
    ]
  },
  "diffusion_bridge_gda_fault_diagnosis": {
    "paper_id": "diffusion_bridge_gda_fault_diagnosis",
    "podcast_url": "/audio/diffusion_bridge_gda_fault_diagnosis/podcast.wav",
    "total_seconds": 272.02,
    "segments": [
      {
        "segment_id": "seg_001",
        "speaker": "host",
        "voice": "Vivian",
        "text": "各位同学大家好，欢迎收听本期科研播客。今天我们聚焦一篇关于故障诊断的论文，题目是《基于扩散桥的渐进域自适应：概念、算法与应用》。论文作者包括Chuang Wang、Zidong Wang和Hongli Dong。我们请到了研究员来为我们解读。",
        "duration_seconds": 29.84,
        "start_seconds": 0,
        "evidence_ids": [
          "ev_001"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_002",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "谢谢主持人。这篇论文主要解决的是渐进域自适应（GDA）在故障诊断中的两个挑战：中间域构建困难以及知识保留不足。作者提出了一种基于扩散桥的数据自适应模型，简称DBDA。",
        "duration_seconds": 23.04,
        "start_seconds": 30.14,
        "evidence_ids": [
          "ev_002",
          "ev_019"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_003",
        "speaker": "host",
        "voice": "Vivian",
        "text": "能不能先简单解释一下什么是渐进域自适应？它和传统的一步域自适应有什么区别？",
        "duration_seconds": 9.36,
        "start_seconds": 53.48,
        "evidence_ids": [
          "ev_018",
          "ev_031"
        ],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_004",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "GDA的核心思想是通过构造一系列中间域，把大的分布差异分解成多个小的渐进步骤，从而让源域分类器平滑地适应目标域。论文中提到，与一步对齐相比，GDA能避免决策边界的不稳定。",
        "duration_seconds": 23.68,
        "start_seconds": 63.14,
        "evidence_ids": [
          "ev_002",
          "ev_016"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_005",
        "speaker": "host",
        "voice": "Vivian",
        "text": "那么这篇论文提出的DBDA具体是怎么工作的？",
        "duration_seconds": 4.96,
        "start_seconds": 87.12,
        "evidence_ids": [
          "ev_019"
        ],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_006",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "DBDA利用扩散桥模型，逐步将目标域的数据分布变换到源域，同时让决策边界在中间域中平滑演化。它通过解耦和重组两个独立训练的扩散模型，建立从目标域到源域的变换通道，而且无需重新训练。",
        "duration_seconds": 24.24,
        "start_seconds": 92.38,
        "evidence_ids": [
          "ev_019",
          "ev_022"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_007",
        "speaker": "host",
        "voice": "Vivian",
        "text": "听起来很巧妙。论文中提到了DBDA具有三个特性：可扩展、灵活和简单，能分别解释一下吗？",
        "duration_seconds": 10.88,
        "start_seconds": 116.92,
        "evidence_ids": [
          "ev_021",
          "ev_022",
          "ev_023"
        ],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_008",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "可扩展是指它能处理时间序列和图像等多种数据模态，并且适用于无源域和标准数据自适应设置。灵活是指它通过解耦和重组两个独立训练的扩散模型，允许域特定的反向桥被重用而无需重新训练。简单是指它直接在数据层面缓解域差距，避免过度依赖复杂的域特定匹配模块。",
        "duration_seconds": 31.04,
        "start_seconds": 128.1,
        "evidence_ids": [
          "ev_021",
          "ev_022",
          "ev_023"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_009",
        "speaker": "host",
        "voice": "Vivian",
        "text": "论文中提到了TSDB模型，它和DBDA是什么关系？",
        "duration_seconds": 6,
        "start_seconds": 159.44,
        "evidence_ids": [
          "ev_008",
          "ev_026"
        ],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_010",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "TSDB是DBDA框架中的一个关键组件，它通过一系列自然演化的中间分布连接源域和目标域，在训练过程中扩展决策边界，从而逐步最小化诊断错误，实现平滑连续的知识迁移。",
        "duration_seconds": 21.6,
        "start_seconds": 165.74,
        "evidence_ids": [
          "ev_026"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_011",
        "speaker": "host",
        "voice": "Vivian",
        "text": "实验部分验证了DBDA的有效性吗？",
        "duration_seconds": 4.4,
        "start_seconds": 187.64,
        "evidence_ids": [
          "ev_027"
        ],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_012",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "是的，论文在管道数据集和其他真实世界数据集上进行了大量实验，结果表明DBDA框架在故障诊断中相比现有GDA算法具有更好的有效性和实用性。",
        "duration_seconds": 21.68,
        "start_seconds": 192.34,
        "evidence_ids": [
          "ev_027"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_013",
        "speaker": "host",
        "voice": "Vivian",
        "text": "从我们的分析来看，这种基于扩散桥的方法可能为工业故障诊断提供一种新的数据自适应思路，尤其在数据分布差异较大的场景下。",
        "duration_seconds": 12.32,
        "start_seconds": 214.32,
        "evidence_ids": [
          "ev_019",
          "ev_027"
        ],
        "claim_type": "inference"
      },
      {
        "segment_id": "seg_014",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "同意。我们的推测是，DBDA的可扩展性和灵活性可能使其更容易部署到不同的工业场景中，但实际应用还需要考虑计算成本和实时性要求。",
        "duration_seconds": 17.28,
        "start_seconds": 226.94,
        "evidence_ids": [
          "ev_021",
          "ev_022"
        ],
        "claim_type": "inference"
      },
      {
        "segment_id": "seg_015",
        "speaker": "host",
        "voice": "Vivian",
        "text": "好的，最后请研究员总结一下这篇论文的核心贡献。",
        "duration_seconds": 4.72,
        "start_seconds": 244.52,
        "evidence_ids": [
          "ev_025",
          "ev_026",
          "ev_027"
        ],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_016",
        "speaker": "researcher",
        "voice": "Uncle_Fu",
        "text": "论文提出了DBDA框架，统一了域变换、知识保留和决策边界扩展；开发了TSDB模型实现渐进知识迁移；并通过实验证明了其有效性。这为基于扩散模型的数据自适应提供了新视角。",
        "duration_seconds": 22.48,
        "start_seconds": 249.54,
        "evidence_ids": [
          "ev_025",
          "ev_026",
          "ev_027"
        ],
        "claim_type": "paper_fact"
      }
    ]
  }
} as const;
