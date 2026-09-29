/*!
 * AVL 源码解析（node 侧工具用）
 *
 * 从 ds/avl.js 里读出 `class AVL { ... }` 的真实源码，用于：
 *   · 校验每个 _log(行号) 指向的确实是一行可执行代码
 *   · 需要时把类体打印出来看
 * 页面不需要这些 —— 运行时不显示源码。
 */
const fs = require('fs');
const path = require('path');

const AVL_PATH = path.join(__dirname, 'avl.js');
const SRC = fs.readFileSync(AVL_PATH, 'utf8');

/* -------------------------------------------------------------------------
 * 源码暴露：代码面板直接渲染下面这些函数的真实函数体，不手抄。
 * _log 的第一个参数是"该函数内第几行"（1 起），因为每个函数第一行就是
 * 它的声明行；移动函数体不会让面板高亮错位。check-avl.js 会校验这件事。
 * ---------------------------------------------------------------------- */
/* 源码从哪来：
 *   node            → 直接读本文件（自测、生成 bundle 用）
 *   浏览器          → 读 ds/avl.code.js 里固化的类体（file:// 下也能用，不依赖 XHR）
 *   浏览器 + 注入   → 若页面提供了 window.__AVL_SRC__（完整源码），优先用它，更"活" */

/* 浏览器里没有整份源码时，就用 bundle 的类体（已经去掉外层缩进） */

function dedent(text, extra) {
  const pad = extra || '';
  const lines = text.replace(/\t/g, '  ').split('\n');
  let min = Infinity;
  lines.forEach(l => { if (l.trim()) min = Math.min(min, l.match(/^ */)[0].length); });
  if (!isFinite(min)) min = 0;
  return lines.map(l => (l.trim() ? pad + l.slice(min) : '')).join('\n').replace(/\s+$/, '');
}

/* 扫描前先把注释和字符串清成空格（保留换行），避免匹配到注释里的示例代码 */
function blankOutComments(text) {
  let out = '', i = 0;
  while (i < text.length) {   // 面板行 219
    const c = text[i], n = text[i + 1];
    if (c === '/' && n === '*') { const e = text.indexOf('*/', i + 2); const stop = e === -1 ? text.length : e + 2; out += text.slice(i, stop).replace(/[^\n]/g, ' '); i = stop; }
    else if (c === '/' && n === '/') { const e = text.indexOf('\n', i); const stop = e === -1 ? text.length : e; out += ' '.repeat(stop - i); i = stop; }
    else if (c === '"' || c === "'" || c === '`') { let j = i + 1; while (j < text.length && text[j] !== c) { if (text[j] === '\\') j++; j++; } out += text.slice(i, j + 1).replace(/[^\n]/g, ' '); i = j + 1; }
    else { out += c; i++; }
  }
  return out;
}

/* 抽出 `class AVL { ... }` 整块（真实源码，保持原有注释与相对行距） */
const CLEAN = blankOutComments(SRC);
const SOURCE_BLOCKS = {};
(function parseClasses() {
  const re = /class\s+([A-Za-z_$][\w$]*)\s*\{/g;
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(CLEAN))) {
    const braceAt = m.index + m[0].length - 1;
    let depth = 0, end = braceAt;
    for (let i = braceAt; i < SRC.length; i++) {
      const c = CLEAN[i];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (!depth) { end = i; break; } }
    }
    const startLine = SRC.slice(0, m.index).split('\n').length;      // class 关键字所在行
    SOURCE_BLOCKS[m[1]] = { name: m[1], startLine, src: SRC.slice(m.index, end + 1) };
  }
})();

/* 方法名下移到类体里的相对行号 */
function memberLines(className) {
  const block = SOURCE_BLOCKS[className];
  if (!block) throw new Error('avl.js: 找不到 class ' + className);
  const out = {};
  block.src.split('\n').forEach((l, i) => {
    const m = l.match(/^ {4}(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/);
    if (m) out[m[1]] = i + 1;                                          // 1 起，相对 class 行
  });
  return out;
}

/* 代码面板用：把类体打印出来（去掉最外层缩进），并给出成员名的显示行号 */
function classCode(className) {
  const block = SOURCE_BLOCKS[className];
  if (!block) throw new Error('avl.js: 找不到 class ' + className);
  return { text: dedent(block.src), members: memberLines(className), sourceLine: block.startLine };
}

/* 自检：每个 _log(行号) 的高亮目标必须存在，且不是注释/空行。
 * 页面加载和 check-avl.js 都会调用它。 */
function auditLogTargets(className) {
  const printed = classCode(className).text.split('\n');
  const problems = [];
  let count = 0;
  printed.forEach((line, i) => {
    const m = line.match(/this\._log\((\d+),/);
    if (!m) return;
    count++;
    const t = Number(m[1]);
    const target = printed[t - 1] || '';
    if (t < 1 || t > printed.length) problems.push({ from: i + 1, to: t, why: 'out of range' });
    else if (!target.trim()) problems.push({ from: i + 1, to: t, why: 'blank line' });
    else if (/^\s*(\/\/|\*|\/\*)/.test(target)) problems.push({ from: i + 1, to: t, why: 'comment line' });
  });
  return { count, problems };
}

/* 代码面板所需的全部东西，一次打包给出（页面与生成脚本共用同一份口径） */
function sourceBundle(className) {
  const cc = classCode(className);
  const block = SOURCE_BLOCKS[className];
  return {
    cls: className,
    line: block.startLine,          // class 关键字在源文件里的行号
    src: block.src,                 // 类体原始源码（页面用它与 node 走同一条管线）
    members: cc.members,            // 成员名 → 打印行号
    audit: auditLogTargets(className),
    checksum: checksum(cc.text)
  };
}

/* 极简稳定校验和：只用来发现"页面里的代码和算法对不上" */
function checksum(text) {
  let hnum = 2166136261;
  for (let i = 0; i < text.length; i++) { hnum ^= text.charCodeAt(i); hnum = Math.imul(hnum, 16777619); }
  return (hnum >>> 0).toString(16);
}


module.exports = { classCode, memberLines, auditLogTargets, source: SRC };
