export const podcasts = {
  "docling_tech_report": {
    "paper_id": "docling_tech_report",
    "title": "Docling 技术报告",
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
    "title": "DBDA 渐进域适应故障诊断",
    "podcast_url": "/audio/diffusion_bridge_gda_fault_diagnosis/podcast.mp3",
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
  },
  "xlstm_scaling_laws": {
    "paper_id": "xlstm_scaling_laws",
    "title": "xLSTM Scaling Laws",
    "podcast_url": "/audio/xlstm_scaling_laws/podcast.mp3",
    "total_seconds": 81.7,
    "segments": [
      {
        "segment_id": "seg_001",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "大家好，欢迎来到科研播客。今天我们要讨论的论文是《xLSTM Scaling Laws: Competitive Performance with Linear Time-Complexity》。这篇论文比较了xLSTM和Transformer在缩放定律上的表现。我们请到了研究员来为我们解读。",
        "duration_seconds": 20.52,
        "start_seconds": 0,
        "evidence_ids": [
          "ev_001",
          "ev_003"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_002",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "谢谢。这篇论文的核心是研究xLSTM架构与Transformer在缩放定律上的对比。xLSTM具有线性复杂度，而Transformer是二次复杂度，这在长上下文时影响很大。",
        "duration_seconds": 15.02,
        "start_seconds": 20.52,
        "evidence_ids": [
          "ev_003",
          "ev_011"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_003",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "那么，缩放定律具体是指什么？在这项研究中，他们是如何定义和使用的？",
        "duration_seconds": 7.22,
        "start_seconds": 35.54,
        "evidence_ids": [
          "ev_015",
          "ev_016"
        ],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_004",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "缩放定律描述的是模型损失与计算量、模型大小和训练数据量之间的关系。通常用幂律来拟合。论文中采用了参数拟合和IsoFLOP两种方法，并考虑了计算最优训练和过度训练两种机制。",
        "duration_seconds": 17.78,
        "start_seconds": 42.76,
        "evidence_ids": [
          "ev_015",
          "ev_020",
          "ev_016",
          "ev_018"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_005",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "我注意到论文标题提到“线性时间复杂度”，这与缩放定律有什么关系？",
        "duration_seconds": 6.36,
        "start_seconds": 60.54,
        "evidence_ids": [
          "ev_003",
          "ev_011"
        ],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_006",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "xLSTM的线性复杂度意味着在处理长上下文时，计算成本随上下文长度线性增长，而Transformer是二次增长。论文专门研究了这种差异对缩放定律和推理性能的影响。",
        "duration_seconds": 14.78,
        "start_seconds": 66.9,
        "evidence_ids": [
          "ev_011",
          "ev_012"
        ],
        "claim_type": "paper_fact"
      }
    ]
  },
  "swinlstm_spatiotemporal_prediction": {
    "paper_id": "swinlstm_spatiotemporal_prediction",
    "title": "SwinLSTM 时空预测",
    "podcast_url": "/audio/swinlstm_spatiotemporal_prediction/podcast.mp3",
    "total_seconds": 88.18,
    "segments": [
      {
        "segment_id": "seg_001",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "大家好，欢迎来到科研播客。今天我们要聊的论文是《SwinLSTM: Improving Spatiotemporal Prediction Accuracy using Swin Transformer and LSTM》，发表于ICCV。我们请到了 researcher 来为我们解读。",
        "duration_seconds": 17.76,
        "start_seconds": 0,
        "evidence_ids": [
          "ev_002",
          "ev_001"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_002",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "谢谢 host。这篇论文关注的是时空预测任务，比如降水预报、自动驾驶和交通流量预测等。传统方法通常结合CNN和RNN来捕捉时空依赖，但CNN在捕捉长距离空间依赖上效率不高，限制了预测精度。",
        "duration_seconds": 19.01,
        "start_seconds": 17.76,
        "evidence_ids": [
          "ev_005",
          "ev_004"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_003",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "所以作者提出了SwinLSTM，能简单介绍一下这个模型的核心思想吗？",
        "duration_seconds": 7.08,
        "start_seconds": 36.77,
        "evidence_ids": [
          "ev_009"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_004",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "SwinLSTM是一种新的循环单元，它整合了Swin Transformer块和简化的LSTM模块来提取时空表示。具体来说，它用自注意力机制处理二维矩阵，替代了ConvLSTM中的卷积操作，从而更好地捕捉全局空间依赖。",
        "duration_seconds": 18.31,
        "start_seconds": 43.85,
        "evidence_ids": [
          "ev_009",
          "ev_007",
          "ev_024"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_005",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "我注意到论文里提到了SwinLSTM-B和SwinLSTM-D两种架构，它们有什么区别？",
        "duration_seconds": 7.32,
        "start_seconds": 62.16,
        "evidence_ids": [
          "ev_016"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_006",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "是的，SwinLSTM-B是基础模型，只包含一个SwinLSTM单元；而SwinLSTM-D是更深层的模型，堆叠了多个SwinLSTM单元。两者都先将输入图像分割成不重叠的图块，然后通过SwinLSTM单元进行时空建模。",
        "duration_seconds": 18.7,
        "start_seconds": 69.48,
        "evidence_ids": [
          "ev_016",
          "ev_017"
        ],
        "claim_type": "paper_fact"
      }
    ]
  },
  "hypersphere_memory_fault_diagnosis": {
    "paper_id": "hypersphere_memory_fault_diagnosis",
    "title": "超球记忆增量故障诊断",
    "podcast_url": "/audio/hypersphere_memory_fault_diagnosis/podcast.mp3",
    "total_seconds": 85.22,
    "segments": [
      {
        "segment_id": "seg_001",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "大家好，欢迎来到今天的论文分享。我们今天聊的是一篇关于电力变换器开路故障诊断的工作，标题是《Hypersphere Memory Preservation Network: A Domain-Incremental Learning Method for Open-Circuit Fault Diagnosis in Power Converters》。先请研究者帮我们说说，这篇论文要解决什么问题？",
        "duration_seconds": 23.11,
        "start_seconds": 0,
        "evidence_ids": [
          "ev_001"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_002",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "好的。简单说，电力变换器的工作条件会随实际需求不断调整，于是新的故障诊断任务会持续出现。现有方法通常要拿全部原始历史数据重新训练，这带来很大的存储压力。",
        "duration_seconds": 17.14,
        "start_seconds": 23.11,
        "evidence_ids": [
          "ev_002"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_003",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "那源无关域适应不是能缓解这个问题吗？为什么还不够？",
        "duration_seconds": 5.4,
        "start_seconds": 40.25,
        "evidence_ids": [
          "ev_017"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_004",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "对，源无关域适应确实能在不访问原始历史数据的情况下，把初始训练的模型适配到测试任务，一定程度上减轻数据分布差异和存储负担。但论文指出，这类方法的模型性能仍然有限，所以作者转向了域增量学习这条路线。",
        "duration_seconds": 20.26,
        "start_seconds": 45.65,
        "evidence_ids": [
          "ev_017",
          "ev_018"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_005",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "域增量学习具体是怎么做的？能不能用一句话概括它的核心思路？",
        "duration_seconds": 6.5,
        "start_seconds": 65.91,
        "evidence_ids": [
          "ev_018"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_006",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "按论文图1的描述，域增量学习可以持续适配新诊断任务，并通过记忆保持机制积累旧任务知识，而且不增加存储需求，从而克服灾难性遗忘。",
        "duration_seconds": 12.82,
        "start_seconds": 72.41,
        "evidence_ids": [
          "ev_018",
          "ev_011"
        ],
        "claim_type": "paper_fact"
      }
    ]
  },
  "satellite_momentum_wheel_patchtst": {
    "paper_id": "satellite_momentum_wheel_patchtst",
    "title": "卫星动量轮故障诊断",
    "podcast_url": "/audio/satellite_momentum_wheel_patchtst/podcast.mp3",
    "total_seconds": 74.28,
    "segments": [
      {
        "segment_id": "seg_001",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "大家好！今天我们来聊一篇关于卫星动量轮故障诊断的论文，题目是《基于改进自监督PatchTST框架的卫星动量轮故障诊断》。我们请到了论文作者之一来为我们解读。",
        "duration_seconds": 15.91,
        "start_seconds": 0,
        "evidence_ids": [
          "ev_001"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_002",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "谢谢主持人。这篇论文来自西北工业大学自动化学院，主要解决在故障样本极少的情况下，如何准确诊断卫星动量轮的故障。",
        "duration_seconds": 11.28,
        "start_seconds": 15.91,
        "evidence_ids": [
          "ev_002",
          "ev_003"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_003",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "为什么动量轮的故障诊断这么难呢？",
        "duration_seconds": 3.46,
        "start_seconds": 27.19,
        "evidence_ids": [
          "ev_005",
          "ev_006"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_004",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "动量轮是卫星姿态控制的核心执行机构，长期在真空、辐射和热应力下高速运转，轴承、电机绕组等部件容易退化。但故障数据极其有限，而且故障类别呈现长尾分布，少数常见故障占主导，很多罕见但重要的故障只有少量样本。",
        "duration_seconds": 21.26,
        "start_seconds": 30.65,
        "evidence_ids": [
          "ev_005",
          "ev_006"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_005",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "那传统方法有哪些不足呢？",
        "duration_seconds": 3,
        "start_seconds": 51.91,
        "evidence_ids": [
          "ev_007",
          "ev_009"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_006",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "早期基于模型的方法虽然物理可解释性强，但需要精确的数学模型，在轨参数漂移时效果下降。数据驱动方法如LSTM、TCN和Transformer等监督学习模型，依赖大量标注数据，在样本不平衡时性能会显著降低。",
        "duration_seconds": 19.37,
        "start_seconds": 54.91,
        "evidence_ids": [
          "ev_007",
          "ev_009"
        ],
        "claim_type": "paper_fact"
      }
    ]
  },
  "focal_loss_dense_detection": {
    "paper_id": "focal_loss_dense_detection",
    "title": "Focal Loss 密集目标检测",
    "podcast_url": "/audio/focal_loss_dense_detection/podcast.mp3",
    "total_seconds": 111.31,
    "segments": [
      {
        "segment_id": "seg_001",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "大家好，欢迎来到科研播客。今天我们要聊的是计算机视觉领域一篇非常经典的论文——Focal Loss for Dense Object Detection，也就是 focal loss 用于密集目标检测。这篇论文发表在 ICCV 2017 上，由 Facebook AI Research 的 Tsung-Yi Lin 等人完成。",
        "duration_seconds": 22.46,
        "start_seconds": 0,
        "evidence_ids": [
          "ev_001",
          "ev_002"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_002",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "是的，这篇论文提出了一种新的损失函数 focal loss，目的是解决单阶段目标检测器在训练时面临的极端类别不平衡问题。作者指出，当时最高精度的检测器都是基于两阶段方法的，比如 R-CNN 系列，而单阶段检测器虽然更快更简单，但精度一直落后。",
        "duration_seconds": 21.98,
        "start_seconds": 22.46,
        "evidence_ids": [
          "ev_004"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_003",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "那为什么单阶段检测器的精度会落后呢？论文里是怎么解释这个问题的？",
        "duration_seconds": 6.7,
        "start_seconds": 44.44,
        "evidence_ids": [
          "ev_008"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_004",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "论文明确指出，单阶段检测器精度落后的主要障碍是训练时的类别不平衡。单阶段检测器需要在图像上密集采样大约10万个候选位置，但其中只有极少数包含物体，绝大多数都是容易分类的背景样本。这些容易分类的负样本虽然每个损失很小，但数量巨大，加起来就会淹没稀有类别的损失，主导梯度方向。",
        "duration_seconds": 26.69,
        "start_seconds": 51.14,
        "evidence_ids": [
          "ev_011",
          "ev_027"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_005",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "原来如此。那两阶段检测器是怎么处理这个问题的？它们为什么没有受到这么大影响？",
        "duration_seconds": 8.28,
        "start_seconds": 77.83,
        "evidence_ids": [
          "ev_010",
          "ev_035"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_006",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "两阶段检测器通过两个机制来应对类别不平衡：第一是两阶段级联，第一阶段的候选区域生成网络会快速把候选位置从几乎无限缩小到一两千个，过滤掉大部分背景；第二是偏向性的小批量采样，比如固定正负样本比例。而单阶段检测器必须处理所有密集采样的位置，所以这个问题更严重。",
        "duration_seconds": 25.2,
        "start_seconds": 86.11,
        "evidence_ids": [
          "ev_010",
          "ev_035"
        ],
        "claim_type": "paper_fact"
      }
    ]
  },
  "timesnet": {
    "paper_id": "timesnet",
    "title": "TimesNet 时间序列分析",
    "podcast_url": "/audio/timesnet/podcast.mp3",
    "total_seconds": 96.29,
    "segments": [
      {
        "segment_id": "seg_001",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "大家好，欢迎来到科研播客。今天我们要聊的是时间序列分析领域的一篇重要论文——TimesNet，它提出了一种新的通用时间序列模型。我们请到了研究员来为我们解读。",
        "duration_seconds": 15.43,
        "start_seconds": 0,
        "evidence_ids": [
          "ev_001",
          "ev_002"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_002",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "谢谢主持人。时间序列分析在天气预报、异常检测、动作识别等应用中非常重要。这篇论文关注的是时间变化建模，这是许多分析任务的共同关键问题。",
        "duration_seconds": 14.28,
        "start_seconds": 15.43,
        "evidence_ids": [
          "ev_002",
          "ev_003"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_003",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "那么，传统方法在处理时间序列时面临哪些挑战呢？",
        "duration_seconds": 5.28,
        "start_seconds": 29.71,
        "evidence_ids": [
          "ev_004",
          "ev_005"
        ],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_004",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "时间序列与其他序列数据不同，每个时间点只记录一些标量，单个时间点通常无法提供足够的语义信息。因此，许多工作关注时间变化，因为它更能反映时间序列的固有属性，比如连续性等。",
        "duration_seconds": 16.68,
        "start_seconds": 34.99,
        "evidence_ids": [
          "ev_004"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_005",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "以往的方法尝试直接从一维时间序列中建模时间变化，但由于时间模式复杂，这非常具有挑战性。例如，RNN基于马尔可夫假设建模连续时间点，而一维卷积核只能建模相邻时间点的变化，无法处理长期依赖。",
        "duration_seconds": 18.79,
        "start_seconds": 51.67,
        "evidence_ids": [
          "ev_002",
          "ev_005",
          "ev_007"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_006",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "看来一维建模确实有局限。那么TimesNet是如何解决这个问题的呢？",
        "duration_seconds": 6.6,
        "start_seconds": 70.46,
        "evidence_ids": [
          "ev_008",
          "ev_010"
        ],
        "claim_type": "explanation"
      },
      {
        "segment_id": "seg_007",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "TimesNet从多周期性的新维度来分析时间序列。现实世界的时间序列通常呈现多周期性，比如天气观测的日变化和年变化，电力消耗的周变化和季度变化。这些周期相互重叠和交互，使得时间模式变得复杂。",
        "duration_seconds": 19.22,
        "start_seconds": 77.06,
        "evidence_ids": [
          "ev_008"
        ],
        "claim_type": "paper_fact"
      }
    ]
  },
  "patchtst": {
    "paper_id": "patchtst",
    "title": "PatchTST 长期预测",
    "podcast_url": "/audio/patchtst/podcast.mp3",
    "total_seconds": 105.22,
    "segments": [
      {
        "segment_id": "seg_001",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "各位同学大家好，欢迎收听本期科研播客。今天我们要聊的论文是《A Time Series is Worth 64 Words: Long-term Forecasting with Transformers》，作者是Yuqi Nie等人。这篇论文提出了一种叫PatchTST的模型，在长期时间序列预测上表现很亮眼。我们先请研究员来介绍一下论文的核心思想。",
        "duration_seconds": 26.09,
        "start_seconds": 0,
        "evidence_ids": [
          "ev_001"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_002",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "好的，这篇论文的核心其实就两点：第一，把时间序列切分成子序列级别的“patch”，每个patch作为一个输入token；第二，采用通道独立（channel-independence）的设计，也就是每个单变量序列独立地输入到Transformer中，但共享同一个骨干网络。",
        "duration_seconds": 19.56,
        "start_seconds": 26.09,
        "evidence_ids": [
          "ev_003"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_003",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "听起来和NLP里把句子切成词有点像？为什么一定要做patch呢？直接用每个时间点作为token不行吗？",
        "duration_seconds": 10.37,
        "start_seconds": 45.65,
        "evidence_ids": [
          "ev_006"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_004",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "没错，论文里就提到，单个时间步并不像句子中的单词那样具有语义信息。所以提取局部语义信息很关键。之前很多工作只用点级别的输入token，或者手工特征，而patch能聚合时间步，增强局部性并捕获更全面的语义信息。",
        "duration_seconds": 20.59,
        "start_seconds": 56.02,
        "evidence_ids": [
          "ev_006",
          "ev_008"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_005",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "那通道独立具体是怎么实现的呢？和通道混合有什么区别？",
        "duration_seconds": 6,
        "start_seconds": 76.61,
        "evidence_ids": [
          "ev_009"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_006",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "在多变量时间序列中，每个输入token可以来自单个通道或多个通道。通道混合就是把所有序列的特征向量拼在一起作为token，而通道独立则是每个通道单独处理。PatchTST把输入拆成M个单变量序列，每个独立送入Transformer骨干，但共享权重。",
        "duration_seconds": 22.61,
        "start_seconds": 82.61,
        "evidence_ids": [
          "ev_009",
          "ev_020"
        ],
        "claim_type": "paper_fact"
      }
    ]
  },
  "itransformer": {
    "paper_id": "itransformer",
    "title": "iTransformer 时间序列预测",
    "podcast_url": "/audio/itransformer/podcast.mp3",
    "total_seconds": 82.25,
    "segments": [
      {
        "segment_id": "seg_001",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "大家好，欢迎回到我们的论文播客。今天我们要聊的是一篇关于时间序列预测的论文——iTransformer，它提出了一种“倒置”的Transformer结构。我们先请研究员来介绍一下这篇论文的基本信息。",
        "duration_seconds": 16.82,
        "start_seconds": 0,
        "evidence_ids": [
          "ev_001",
          "ev_002"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_002",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "好的，这篇论文来自清华大学和蚂蚁集团，标题是《iTransformer: Inverted Transformers Are Effective for Time Series Forecasting》，作者包括Yong Liu、Tengge Hu等。",
        "duration_seconds": 13.51,
        "start_seconds": 16.82,
        "evidence_ids": [
          "ev_001",
          "ev_002",
          "ev_003"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_003",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "论文的摘要提到，最近线性预测模型的兴起让人们对Transformer结构的修改产生了疑问。那么，传统的Transformer预测器存在什么问题呢？",
        "duration_seconds": 12.58,
        "start_seconds": 30.33,
        "evidence_ids": [
          "ev_004"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_004",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "传统Transformer将同一时间戳的多个变量嵌入为一个时间令牌，并在这些令牌上应用注意力机制来捕捉时间依赖。但作者指出，这种结构可能并不适合多变量时间序列预测。",
        "duration_seconds": 15.19,
        "start_seconds": 42.91,
        "evidence_ids": [
          "ev_004",
          "ev_010"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_005",
        "speaker": "host",
        "voice": "zh-CN-XiaoxiaoNeural",
        "text": "为什么不适合呢？论文里有没有具体的解释？",
        "duration_seconds": 4.61,
        "start_seconds": 58.1,
        "evidence_ids": [
          "ev_010"
        ],
        "claim_type": "paper_fact"
      },
      {
        "segment_id": "seg_006",
        "speaker": "researcher",
        "voice": "zh-CN-YunxiNeural",
        "text": "论文中提到，时间点之间的数值关系缺乏语义，而且同一时间戳的多个变量可能并不代表同一个事件，因此将它们嵌入为一个令牌可能会引入噪声。此外，简单的线性层在性能和效率上已经超过了复杂的Transformer。",
        "duration_seconds": 19.54,
        "start_seconds": 62.71,
        "evidence_ids": [
          "ev_006",
          "ev_008",
          "ev_010"
        ],
        "claim_type": "paper_fact"
      }
    ]
  }
} as const;
