# 实验 A 抽检报告（机器交叉校验 + 待人工复核）

- PDF: `F:\qoder_test\papercast-poc\inputs\2408.09869.pdf`（9 页）
- 抽检块数: 13 / 总块数 798
- 页码文本命中: 11/13
- 说明：PASS=块文本前缀确实出现在所标页的 PyMuPDF 原文中；表格/公式因结构重构可能 NOT_FOUND，需人工对照 PDF。

| block_id | kind | 标注页 | 实际命中页 | 结果 | 章节 | 文本预览 |
|---|---|---|---|---|---|---|
| blk_0001 | text | 1 | [1] | PASS | - | arXiv:2408.09869v5 [cs.CL] 9 Dec 2024 |
| blk_0067 | heading | 4 | [4] | PASS | 4 Performance | 4 Performance |
| blk_0133 | text | 7 | [7] | PASS | DocLayNet: A Large Human-Annotated Datas | ahn@zurich.ibm.com |
| blk_0199 | text | 7 | [7] | PASS | CCS CONCEPTS | 4. Open the window in the base plate and |
| blk_0265 | text | 7 | [7] | PASS | CCS CONCEPTS | microscope designed for biological studies such as specimen |
| blk_0331 | text | 7 | [] | NOT_FOUND(需人工看，可能是公式/表格重构) | CCS CONCEPTS | DLUSRUW¶V XVDEOH UXQZD\V PHDVXUHG LQ IHHW IURP PHDQ VHD OHYHO� 7KH 7'=( LV WKH KLJKHVW HOH |
| blk_0397 | text | 7 | [7] | PASS | CCS CONCEPTS | ahead |
| blk_0463 | text | 8 | [5, 8, 9] | PASS | 5 EXPERIMENTS | 60 |
| blk_0529 | text | 9 | [8, 9] | PASS | Baselines for Object Detection | 0.5-0.95 |
| blk_0595 | text | 9 | [9] | PASS | Baselines for Object Detection | 95-96 |
| blk_0661 | text | 9 | [7, 9] | PASS | Baselines for Object Detection | 0.30 |
| blk_0727 | text | 9 | [] | NOT_FOUND(需人工看，可能是公式/表格重构) | Baselines for Object Detection | include publication repositories such as arXiv 3 , government offices, |
| blk_0796 | table | 5 | [1, 2, 3] | PASS | Baselines for Object Detection | Table 1: Runtime characteristics of Docling with the standard model pipeline and settings, |

## 人工复核结论（由实验执行者填写）

- 阅读顺序：待填写
- 章节归属：待填写
- 公式/表格保真：待填写