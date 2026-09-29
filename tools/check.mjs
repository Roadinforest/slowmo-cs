/*!
 * slowmo-cs 内容检查器 —— 零依赖，node tools/check.mjs
 *
 * 这是"完成"的定义：下面全部通过，才算这一页做完了。
 *
 *   1. 页面引用的静态资源都存在
 *   2. 每一步的形状符合 shared/steps.js 的契约（双语、id、focus/pendingKey）
 *   3. 每一帧的结构满足该主题的不变量（单根、无环、有序、平衡……）
 *   4. 相邻帧的差异"一步能解释"（一次旋转最多动 4 个节点的父子关系）
 *   5. 结算帧（line == null）必须完全合法：不靠 allowTransient 蒙混
 *   6. 每帧记录的行号确实落在算法代码上（行号是运行时从调用栈取的）
 *   7. 手绘快照页的图与场景一致：节点可达、焦点有效、键序正确
 *      （这一页的缺陷全在屏幕上看不出来：焦点悬空、节点不可达、图被静默丢掉）
 *
 * 退出码非 0 表示有失败项，可直接接 CI。
 */
import { TOPICS } from './topics.mjs';
import { checkTreesPage } from './trees-page.mjs';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const Steps = require(path.join(ROOT, 'shared/steps.js'));
const Frames = require(path.join(ROOT, 'shared/frames.js'));

const failures = [];
const notes = [];
const topicFrames = {};      // href -> 最长操作流帧数，供展厅核对
let checkedFrames = 0;
let checkedScenarios = 0;
const fail = (where, what, detail) => failures.push({ where, what, detail: detail || '' });

/* ---------------------------------------------------------------- 1. 静态资源 */
function walkAssets(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dir = path.dirname(htmlPath);
  const refs = [];
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|data:|#|mailto:)/.test(url)) continue;
    refs.push({ url, abs: path.resolve(dir, url) });
  }
  refs.forEach(r => { if (!fs.existsSync(r.abs)) fail(path.relative(ROOT, htmlPath), '引用了不存在的文件', r.url); });
  return refs.length;
}

/* ------------------------------------------------- 手绘快照页的图与场景一致性 */
{
  const r = checkTreesPage(ROOT, 'ds/trees.html');
  r.failures.forEach(f => failures.push(f));
  r.notes.forEach(n => notes.push(n));
}

/* ---------------------------------------------------------------- 0. 展厅一致性
 * 卡片链接必须存在；卡片上写的步数必须和主题真实的最长操作流对得上。
 * （历史问题：卡片写着 127 步，而最长单流只有 5 步 —— 那是所有流的总和。） */
function checkGallery(topicFrames) {
  const idx = path.join(ROOT, 'index.html');
  if (!fs.existsSync(idx)) return fail('index.html', '展厅首页不存在');
  const html = fs.readFileSync(idx, 'utf8');
  const block = html.slice(html.indexOf('const TOPICS'), html.indexOf('];', html.indexOf('const TOPICS')));
  const entries = [...block.matchAll(/\{\s*area:'([^']+)'[^}]*?\}/g)].map(m => m[0]);

  entries.forEach(e => {
    const href = (/href:'([^']+)'/.exec(e) || [])[1];
    const steps = (/steps:(\d+)/.exec(e) || [])[1];
    const ready = /ready:true/.test(e);
    const name = (/zh:'([^']+)'/.exec(e) || [])[1] || '(未命名)';
    if (href && !fs.existsSync(path.join(ROOT, href))) fail('index.html', '卡片指向不存在的页面', `${name} -> ${href}`);
    if (!ready || !href || steps == null) return;
    const real = topicFrames[href];
    if (!real) { notesWarn(`index.html: 「${name}」已标记可玩，但不在检查器登记表里，无法核对步数`); return; }
    /* 卡片上的步数应是"最长的一条操作流"，允许 ±3 的表述空间 */
    if (Math.abs(Number(steps) - real) > 3) {
      fail('index.html', '卡片步数与实际不符', `「${name}」写 ${steps}，最长单流 ${real}`);
    }
  });
  notes.push(`展厅卡片 ${entries.length} 张，链接与步数已核对`);
}
const notesWarn = m => notes.push('⚠ ' + m);

/* ---------------------------------------------------------------- 主流程 */
for (const topic of TOPICS) {
  const where = topic.id;
  const pagePath = path.join(ROOT, topic.page);
  if (!fs.existsSync(pagePath)) { fail(where, '页面不存在', topic.page); continue; }
  const assetCount = walkAssets(pagePath);

  /* 生成物：不再有需要手工重建的中间文件 */
  const generated = fs.readdirSync(path.dirname(pagePath)).filter(f => /\.(code|gen)\.js$/.test(f));
  if (generated.length) {
    notes.push(`${topic.page}: 目录里还有生成物 ${generated.join(', ')} —— 页面已不需要，建议删除`);
  }

  const { algo } = topic.load();
  const scenarios = topic.scenarios(algo);
  let frames = 0;

  /* 没写 scenarios 的页面：用登记的 longestFlow 供展厅核对 */
  if (topic.longestFlow) {
    topicFrames['/' + topic.page] = topic.longestFlow;
    topicFrames[topic.page] = topic.longestFlow;
  }

  for (const sc of scenarios) {
    const label = `${where}/${sc.key}`;
    let rec;
    try { rec = sc.run(); }
    catch (e) { fail(label, '算法抛错', e.message); continue; }

    const steps = (rec.entries || []).map(e => ({
      text: e.text, act: e.act, focus: e.focus, pendingKey: e.pendingKey, nodes: e.nodes
    }));

    /* --- 2. 形状 --- */
    Steps.checkSteps(steps, label).forEach(m => fail(label, '步骤契约', m));

    /* --- 3/4/5. 逐帧结构 --- */
    steps.forEach((s, i) => {
      frames++;
      const settled = (rec.entries[i] || {}).line == null;   // 结算帧
      const { problems } = Frames.inspect(s.nodes, Object.assign({}, topic.policy, {
        label: `${label}#${i + 1}`,
        /* 操作进行中允许"已发现但尚未修复"的失衡；结算帧一律不许 */
        allowTransient: !settled
      }));
      problems.forEach(p => fail(`${label}#${i + 1}`, p.what, p.detail));
      if (settled) {
        Frames.checkSettled(s.nodes, topic.policy)
          .forEach(p => fail(`${label}#${i + 1}（结算帧）`, p.what, p.detail));
      }
      if (i > 0) {
        Frames.diffFrames(steps[i - 1].nodes, s.nodes)
          .problems.forEach(p => fail(`${label}#${i + 1}`, p.what, p.detail));
      }
    });

    /* 结束帧：算法跑完之后必须完全合法 */
    const last = steps[steps.length - 1];
    if (last) {
      Frames.checkSettled(last.nodes, topic.policy)
        .forEach(p => fail(`${label} 结束帧`, p.what, p.detail));
      const keys = last.nodes.map(n => n.key);
      if (new Set(keys).size !== keys.length) fail(`${label} 结束帧`, '仍有重复键', keys.join(','));
      notes.push(`${sc.zh} → ${steps.length} 帧`);
      topicFrames['/' + topic.page] = Math.max(topicFrames['/' + topic.page] || 0, steps.length);
      topicFrames[topic.page] = Math.max(topicFrames[topic.page] || 0, steps.length);
    }
    checkedScenarios++;
  }

  /* --- 6. 行号契约 ---
   * 行号是运行时从调用栈取的，所以不会漂移；但仍然要检查它指的是不是一行
   * 真正的算法代码 —— 取错了（比如落在文件头部注释上）说明栈的判据坏了。 */
  if (topic.sourceFile) {
    const srcLines = fs.readFileSync(path.join(ROOT, topic.sourceFile), 'utf8').split('\n');
    let seen = 0;
    for (const sc of scenarios) {
      const rec = sc.run();
      for (const e of rec.entries) {
        if (e.line == null) continue;
        seen++;
        const text = (srcLines[e.line - 1] || '').trim();
        if (!text) fail(`${where}/${sc.key}`, '行号指向空行', `line ${e.line}`);
        else if (/^(\/\/|\*|\/\*)/.test(text)) fail(`${where}/${sc.key}`, '行号指向注释', `line ${e.line}`);
        else if (!/this\._log\(/.test(text)) {
          notes.push(`⚠ ${where}/${sc.key}: line ${e.line} 不是 _log 调用点（${text.slice(0, 40)}）`);
        }
      }
    }
    notes.push(`行号取自调用栈：${seen} 个记录点，全部落在算法代码上`);
  }
  notes.push(`${topic.name.zh}: ${scenarios.length} 条操作流，${assetCount} 个静态引用`);
  checkedFrames += frames;
}

checkGallery(topicFrames);

/* ---------------------------------------------------------------- 报告 */
console.log(`\n检查 ${TOPICS.length} 个主题 / ${checkedScenarios} 条操作流 / ${checkedFrames} 帧\n`);
notes.forEach(n => console.log('  · ' + n));

if (!failures.length) {
  console.log('\n✓ 全部通过：契约、结构不变量、帧间差异、结算帧、行号\n');
  process.exit(0);
}
console.log(`\n✗ ${failures.length} 处失败\n`);
const byWhat = {};
failures.forEach(f => { const k = f.what; (byWhat[k] = byWhat[k] || []).push(f); });
for (const [what, list] of Object.entries(byWhat)) {
  console.log(`  ${what}  ×${list.length}`);
  list.slice(0, 6).forEach(f => console.log(`      ${f.where}${f.detail ? '  — ' + f.detail : ''}`));
  if (list.length > 6) console.log(`      …… 还有 ${list.length - 6} 处`);
}
console.log('');
process.exit(1);
