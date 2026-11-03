#!/usr/bin/env node
/* ============================================================
   gen-pack.js —— 生成 APP 用的内容包 pack.json

   用法：
     node tools/gen-pack.js              # 从 pack-src/ 读素材生成
     node tools/gen-pack.js --demo       # 生成一个 2 题的小包，用来测试链路
     node tools/gen-pack.js --check      # 只校验不写文件

   约定：内容包是"补丁"，只放新增内容。APP 内置内容是底，
   这里重复的题号/题干 APP 端会自动跳过，但最好在源头就不重复。
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "pack-src");
const OUT = path.join(ROOT, "dist");

const MODS = new Set(["资料分析", "政治理论", "判断推理", "言语理解",
  "常识判断", "数量关系", "申论", "职测", "综应"]);
const EXAMS = new Set(["公务员", "事业单位", "通用"]);

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error("读取失败：" + file + " → " + e.message);
    process.exit(1);
  }
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function isYmd(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

/* ---------------- 校验（与 APP 端 SyncClient.checkQuestions 同一条底线） ---------------- */
function validate(pack) {
  const errs = [];
  if (pack.schema !== 1) errs.push("schema 必须是 1");
  if (!isYmd(pack.packDate)) errs.push("packDate 必须是 YYYY-MM-DD");

  const ids = new Set();
  const texts = new Set();
  (pack.questions || []).forEach((q, i) => {
    const at = `第 ${i + 1} 题`;
    if (!q || typeof q !== "object") return errs.push(at + " 不是对象");
    if (!Number.isInteger(q.id) || q.id <= 0) errs.push(at + " id 非法");
    else if (ids.has(q.id)) errs.push(at + " 题号重复 " + q.id);
    else ids.add(q.id);
    if (!MODS.has(q.mod)) errs.push(at + " 模块非法：" + q.mod);
    if (q.exam && !EXAMS.has(q.exam)) errs.push(at + " exam 非法：" + q.exam);
    if (typeof q.q !== "string" || q.q.trim().length < 6) errs.push(at + " 题干过短");
    const norm = String(q.q || "").replace(/\s+/g, "");
    if (texts.has(norm)) errs.push(at + " 题干重复");
    else texts.add(norm);
    if (!Array.isArray(q.opts) || q.opts.length !== 4) errs.push(at + " 选项必须 4 个");
    else {
      const set = new Set(q.opts.map((o) => String(o).trim()));
      if (set.size !== 4) errs.push(at + " 选项有重复");
      q.opts.forEach((o, k) => { if (!String(o || "").trim()) errs.push(at + ` 选项 ${k + 1} 为空`); });
    }
    if (!Number.isInteger(q.ans) || q.ans < 0 || q.ans > 3) errs.push(at + " ans 越界");
    else if (Array.isArray(q.opts) && !String(q.opts[q.ans] || "").trim()) errs.push(at + " 答案指向空选项");
    if (typeof q.exp !== "string" || q.exp.trim().length < 8) errs.push(at + " 解析过短");
    if (!Number.isInteger(q.diff) || q.diff < 1 || q.diff > 5) errs.push(at + " diff 应为 1-5");
    if (q.tier && ["简单", "中等", "难"].indexOf(q.tier) < 0) errs.push(at + " tier 只能是 简单/中等/难");
    if (q.alts !== undefined) {
      if (!Array.isArray(q.alts)) errs.push(at + " alts 必须是数组");
      else q.alts.forEach((a, k) => {
        if (!a || typeof a.d !== "string" || a.d.trim().length < 8) {
          errs.push(at + ` 解法 ${k + 2} 正文过短`);
        }
      });
    }
  });

  (pack.shizheng || []).forEach((s, i) => {
    if (!s || !s.title || !s.body) errs.push(`时政第 ${i + 1} 条缺 title/body`);
  });
  (pack.idioms || []).forEach((s, i) => {
    if (!s || !s.w || !s.m) errs.push(`成语第 ${i + 1} 条缺 w/m`);
  });
  if (pack.notify) {
    Object.keys(pack.notify).forEach((k) => {
      if (!isYmd(k)) errs.push("notify 日期非法：" + k);
    });
  }
  return errs;
}

/* ---------------- 主流程 ---------------- */
function build() {
  const demo = process.argv.includes("--demo");
  let pack;

  if (demo) {
    pack = {
      schema: 1,
      packDate: today(),
      note: "演示包：2 题 + 1 条时政 + 1 个成语，用来验证同步链路是否通",
      questions: [
        {
          id: 990001, mod: "资料分析", diff: 1, exam: "公务员",
          q: "【演示题】某地 2025 年粮食产量 1.2 亿吨，比 2024 年增长 20%。2024 年产量约为？",
          opts: ["1.0 亿吨", "0.96 亿吨", "1.1 亿吨", "0.9 亿吨"],
          ans: 0,
          exp: "基期 = 现期 ÷（1 + 增长率）= 1.2 ÷ 1.2 = 1.0 亿吨。看到 20% 这种能整除的增长率，直接用倍数关系反推。"
        },
        {
          id: 990002, mod: "常识判断", diff: 1, exam: "通用",
          q: "【演示题】我国现行宪法规定，中华人民共和国的最高国家权力机关是？",
          opts: ["国务院", "全国人民代表大会", "中央军事委员会", "最高人民法院"],
          ans: 1,
          exp: "全国人民代表大会是最高国家权力机关，国务院是最高国家行政机关，最高人民法院是最高审判机关——四个“最高”要分清主体。"
        }
      ],
      shizheng: [
        { title: "【演示时政】2026 年中央经济工作会议", body: "会议提出坚持稳中求进工作总基调，实施更加积极有为的宏观政策，扩大内需、优化供给，推动经济持续回升向好。" }
      ],
      idioms: [
        { w: "举一反三", m: "从一件事类推而知道许多事情", t: "侧重类推能力，非“反复练习”" }
      ],
      notify: {}
    };
  } else {
    const q = readJson(path.join(SRC, "questions.json"), []);
    const sz = readJson(path.join(SRC, "shizheng.json"), []);
    const id = readJson(path.join(SRC, "idioms.json"), []);
    const nt = readJson(path.join(SRC, "notify.json"), {});
    const meta = readJson(path.join(SRC, "meta.json"), {});
    pack = {
      schema: 1,
      packDate: meta.packDate || today(),
      note: meta.note || "",
      questions: Array.isArray(q) ? q : [],
      shizheng: Array.isArray(sz) ? sz : [],
      idioms: Array.isArray(id) ? id : [],
      notify: nt && typeof nt === "object" ? nt : {}
    };
  }

  const errs = validate(pack);
  if (errs.length) {
    console.error("✗ 内容包校验没过，共 " + errs.length + " 处：");
    errs.slice(0, 20).forEach((e) => console.error("  · " + e));
    if (errs.length > 20) console.error("  …还有 " + (errs.length - 20) + " 处");
    process.exit(1);
  }

  const empty = !pack.questions.length && !pack.shizheng.length && !pack.idioms.length && !Object.keys(pack.notify).length;
  if (empty) {
    console.log("内容包是空的，跳过生成（APP 端遇到空包也不会报错）。");
    return;
  }

  const json = JSON.stringify(pack);
  const kb = (Buffer.byteLength(json, "utf8") / 1024).toFixed(1);
  if (Buffer.byteLength(json, "utf8") > 800 * 1024) {
    console.error(`✗ 内容包 ${kb}KB 超过 800KB 上限，APP 会拒绝`);
    process.exit(1);
  }

  if (process.argv.includes("--check")) {
    console.log(`✓ 校验通过（未写文件）：${pack.questions.length} 题 / ${pack.shizheng.length} 条时政 / ${pack.idioms.length} 个成语，${kb}KB`);
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "pack.json"), json, "utf8");
  console.log(`✓ 已生成 dist/pack.json`);
  console.log(`  packDate ${pack.packDate} · ${pack.questions.length} 题 · ${pack.shizheng.length} 条时政 · ${pack.idioms.length} 个成语 · ${kb}KB`);
}

build();
