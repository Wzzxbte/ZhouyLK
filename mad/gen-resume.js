const docx = require("docx");
const fs = require("fs");

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle,
  convertInchesToTwip
} = docx;

// ── helpers ──
const border = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function cell(text, opts = {}) {
  return new TableCell({
    borders: { ...cellBorders },
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text, size: opts.size || 22, font: "宋体", bold: opts.bold, color: opts.color })]
      })
    ]
  });
}

function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text, size: 26, font: "黑体", bold: true, color: "1a5276" })]
  });
}

function body(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { firstLine: convertInchesToTwip(0.28) },
    children: [new TextRun({ text, size: 22, font: "宋体", color: "333333" })]
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { before: 30, after: 30 },
    bullet: { level: 0 },
    children: [new TextRun({ text, size: 21, font: "宋体", color: "444444" })]
  });
}

function bulletCell(texts) {
  return new TableCell({
    borders: { ...cellBorders },
    width: { size: 80, type: WidthType.PERCENTAGE },
    children: texts.map(b => bullet(b))
  });
}

function sepLine() {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "1a5276" } },
    children: []
  });
}

// ── 个人信息表格 ──
const infoTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({
      children: [
        cell("高鑫", { width: 20, bold: true, size: 30 }),
        cell("电话：13038208795", { width: 40 }),
        cell("邮箱：13038208795@163.com", { width: 40 }),
      ]
    }),
    new TableRow({
      children: [
        cell("男 | 22岁 | 汉族 | 群众", { width: 50 }),
        cell("现居：成都", { width: 25 }),
        cell("最高学历：本科", { width: 25 }),
      ]
    }),
  ]
});

// ── 求职意向表格 ──
const intentTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({
      children: [
        cell("意向岗位", { width: 15, bold: true }),
        cell("车险查勘定损", { width: 35 }),
        cell("意向城市", { width: 15, bold: true }),
        cell("成都", { width: 35 }),
      ]
    }),
    new TableRow({
      children: [
        cell("求职类型", { width: 15, bold: true }),
        cell("校招", { width: 35 }),
        cell("期望行业", { width: 15, bold: true }),
        cell("保险", { width: 35 }),
      ]
    }),
    new TableRow({
      children: [
        cell("当前状态", { width: 15, bold: true }),
        cell("随时到岗", { width: 85 }),
      ]
    }),
  ]
});

// ── 教育经历表格 ──
function eduRow(years, school, courses) {
  return [
    new TableRow({
      children: [
        cell(years, { width: 20 }),
        cell(school, { width: 80, bold: true }),
      ]
    }),
    new TableRow({
      children: [
        cell("", { width: 20 }),
        cell(courses, { width: 80, color: "666666", size: 20 }),
      ]
    }),
  ];
}

const eduTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    ...eduRow("2024.9 — 2026.6", "成都锦城学院 | 汽车服务工程 | 本科",
      "核心课程：汽车故障诊断、新能源汽车技术、汽车电器与电子控制、电动汽车电机与控制技术、二手车鉴定与评估"),
    ...eduRow("2021.9 — 2024.6", "四川化工职业技术学院 | 汽车检测与维修技术 | 大专",
      "核心课程：汽车检测与维修、汽车故障诊断、汽车保险与理赔、汽车发动机构造及其原理、汽车营销学"),
  ]
});

// ── 实习经历 ──
function internBlock(period, company, bullets) {
  return [
    new TableRow({
      children: [
        cell(period, { width: 20 }),
        cell(company, { width: 80, bold: true }),
      ]
    }),
    new TableRow({
      children: [
        cell("", { width: 20 }),
        bulletCell(bullets)
      ]
    }),
  ];
}

const internTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    ...internBlock("2025.7 — 2025.9", "深圳鑫顺达汽车服务有限公司 | 服务顾问助理", [
      "负责进厂车辆登记、基本信息录入及车辆外观拍照留档",
      "协助服务顾问制作工单，整理维修项目与配件明细，跟踪车辆维修进度",
      "在维修车间实地观察钣金修复、覆盖件更换等常见事故修复工艺，建立对维修流程与工时标准的直观认知",
      "协助前台与客户沟通维修方案及费用明细，累计接待客户 60+ 人次，零投诉",
    ]),
    ...internBlock("2023.6 — 2023.9", "深圳市鑫盛力电源有限公司 | 生产部质检实习生", [
      "负责锂电池充电器外观、装配、功能全流程检验，日均检测 200+ 件",
      "拦截焊点虚焊、壳体缝隙超标等质量缺陷，确保不合规品零流出",
      "养成逐项核验、不放过任何瑕疵的质量意识",
    ]),
  ]
});

// ── 项目经历 ──
const projTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({
      children: [
        cell("2023.4 — 2023.6", { width: 20 }),
        cell("SYB 创业培训项目 | 优秀成员", { width: 80, bold: true }),
      ]
    }),
    new TableRow({
      children: [
        cell("", { width: 20 }),
        bulletCell([
          "运用 SWOT 分析法完成竞品定位，制定产品定价与促销方案，完成 20 万元创业项目的成本核算与盈利预测",
          "作为团队代表参与路演答辩，在压力下清晰阐述项目优势与商业逻辑，获优秀成员称号",
        ])
      ]
    }),
  ]
});

// ── 技能 ──
const skillSection = [
  new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: "掌握汽车构造与损伤识别基础，熟悉钣金修复、覆盖件更换等常见维修工艺及工时标准。了解新能源汽车三电系统基本结构。持 C1 驾照，3 年实际驾龄，熟练驾驶手动/自动挡车辆。熟练使用 Office 办公软件，能用 Excel 进行维修项目费用汇总与比对。", size: 22, font: "宋体", color: "333333" })]
  }),
];

// ── 文档组装 ──
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "宋体", size: 22 },
      }
    }
  },
  sections: [{
    properties: {
      page: {
        margin: { top: convertInchesToTwip(0.6), bottom: convertInchesToTwip(0.6), left: convertInchesToTwip(1), right: convertInchesToTwip(1) },
      }
    },
    children: [
      // 姓名大标题
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [new TextRun({ text: "高  鑫", size: 44, font: "黑体", bold: true, color: "1a3c5e" })]
      }),
      infoTable,
      sepLine(),
      sectionTitle("求职意向"),
      intentTable,
      sepLine(),
      sectionTitle("自我评价"),
      body("汽车服务工程本科应届生，具备从车辆构造到损伤评估的完整专业知识链。大专阶段主修汽车检测与维修及汽车保险理赔，能识别常见事故损伤类型、区分事故损伤与机械故障，熟悉钣金修复、覆盖件更换、机电维修等常见工艺及配件更换判断标准。"),
      body(`曾在电子厂担任质检实习生3个月，养成“一切以标准说话、对品质零妥协”的职业素养——这符合定损工作“精准定损、公正核价”的要求。通过SYB创业培训，独立完成成本核算与盈利预测，具备维修费用估算的数据敏感度。持C1驾照，3年实际驾龄，能独立驾车出现场。沟通表达清晰、抗压能力强，希望将汽车专业背景转化为精准定损与客户认可的实战能力。`),
      sepLine(),
      sectionTitle("教育经历"),
      eduTable,
      sepLine(),
      sectionTitle("实习经历"),
      internTable,
      sepLine(),
      sectionTitle("项目经历"),
      projTable,
      sepLine(),
      sectionTitle("相关技能"),
      ...skillSection,
      sepLine(),
      sectionTitle("荣誉证书"),
      new Paragraph({
        spacing: { before: 60, after: 60 },
        children: [new TextRun({ text: "二等校级奖学金", size: 22, font: "宋体", color: "333333" })]
      }),
    ]
  }]
});

const outPath = "C:/Users/xwzz/Desktop/简历-改后.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("✅ 简历已生成：" + outPath);
}).catch(err => {
  console.error("❌ 生成失败：", err.message);
});
