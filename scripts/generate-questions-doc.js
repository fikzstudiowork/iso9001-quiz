const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

function extract(name, next) {
  const re = new RegExp(`const ${name}=\\[([\\s\\S]*?)\\];\\r?\\n\\r?\\nconst ${next}`);
  const m = html.match(re);
  if (!m) throw new Error("Could not extract " + name);
  return eval("[" + m[1] + "]");
}

const L1 = extract("L1", "L2");
const L2 = extract("L2", "L3");
const L3 = html.match(/const L3=\[([\s\S]*?)\];\r?\n\r?\nlet db/);
if (!L3) throw new Error("L3");
const L3arr = eval("[" + L3[1] + "]");

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderQ(q, i) {
  let h = `<div class="q"><div class="qhead"><span class="badge">${esc(q.s)}</span> <span class="type">${q.t === "cs" ? "Case study" : "Multiple choice"}</span></div>`;
  if (q.case) h += `<p class="case"><strong>Case:</strong> ${esc(q.case)}</p>`;
  h += `<p class="qt"><strong>Q${i + 1}.</strong> ${esc(q.q)}</p><ol type="A">`;
  q.o.forEach((o, j) => {
    h += `<li>${esc(o)}${j === q.a ? " <strong>(Correct)</strong>" : ""}</li>`;
  });
  h += `<p class="expl"><strong>Discussion note:</strong> ${esc(q.e)}</p></div>`;
  return h;
}

function section(title, arr) {
  return `<section><h2>${title}</h2><p class="meta">${arr.length} questions · Use for classroom discussion before or after the live quiz.</p>${arr.map(renderQ).join("")}</section>`;
}

const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>ISO 9001:2015 Question Bank — YHY Consultancy</title>
<style>
body{font-family:Calibri,Arial,sans-serif;max-width:800px;margin:0 auto;padding:32px 24px;color:#111;line-height:1.5}
h1{font-size:24px;margin-bottom:4px}
h2{font-size:18px;margin:28px 0 8px;border-bottom:2px solid #1B4FD8;padding-bottom:6px}
.sub{color:#555;font-size:13px;margin-bottom:12px}
.meta{color:#666;font-size:12px;margin-bottom:16px}
.q{border:1px solid #ddd;border-radius:8px;padding:14px;margin-bottom:14px;page-break-inside:avoid}
.qhead{margin-bottom:8px}
.badge{background:#EEF2FB;color:#1B4FD8;font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px}
.type{font-size:11px;color:#666;margin-left:6px}
.case{background:#f8f9fa;border-left:3px solid #7C3AED;padding:10px;font-size:13px;font-style:italic;margin:8px 0}
.qt{font-size:14px;margin:8px 0}
ol{margin:8px 0 8px 20px}
li{margin-bottom:4px;font-size:13px}
.expl{font-size:12px;color:#334155;background:#f0fdf4;border-left:3px solid #059669;padding:10px;margin-top:10px}
.foot{margin-top:32px;font-size:11px;color:#999;text-align:center}
@media print{body{padding:16px}.q{break-inside:avoid}}
</style>
</head>
<body>
<h1>ISO 9001:2015 Quiz — Question Bank</h1>
<p class="sub">YHY Consultancy · Trainer discussion guide</p>
<p class="sub"><strong>How to use:</strong> Open in Microsoft Word (File → Open → select this file) and Save As .docx, or print to PDF for handouts. Present one session at a time and use the discussion notes to guide conversation.</p>
${section("Level 1 — Awareness", L1)}
${section("Level 2 — Practitioner", L2)}
${section("Level 3 — Professional (Case Studies)", L3arr)}
<p class="foot">Developed by Fikz Dev · YHY Consultancy ISO 9001:2015 Quiz Arena</p>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, "../questions-discussion.html"), doc);
console.log("Generated questions-discussion.html with", L1.length + L2.length + L3arr.length, "questions");
