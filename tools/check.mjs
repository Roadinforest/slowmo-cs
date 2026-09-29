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
import { buildAll } from './build-pages.mjs';
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

/* ------------------------------------------------- 0. 生成物一致性
 * 六个可操作的树页是"模板 + 页配置"生成的。手改生成物会在闸门里失败，
 * 而不是悄悄漂移成一页跟别人不一样的东西。 */
{
  for (const page of buildAll()) {
    const rel = path.relative(ROOT, page.file);
    if (!fs.existsSync(page.file)) { fail(rel, '页面还没生成', '跑 node tools/build-pages.mjs'); continue; }
    if (fs.readFileSync(page.file, 'utf8') !== page.html) {
      fail(rel, '页面与模板/页配置不一致', '跑 node tools/build-pages.mjs 重新生成');
    }
  }
  notes.push(`页面生成物：${buildAll().length} 页与模板一致`);
}

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
        Frames.diffFrames(steps[i - 1].nodes, s.nodes, {
          bulkDelete: !!(topic.policy && topic.policy.bulkDelete),
          multiChildDiff: !!(topic.policy && topic.policy.multiChildDiff)
        })
          .problems.forEach(p => fail(`${label}#${i + 1}`, p.what, p.detail));
      }
    });

    /* 结束帧：算法跑完之后必须完全合法 */
    const last = steps[steps.length - 1];
    if (last) {
      Frames.checkSettled(last.nodes, topic.policy)
        .forEach(p => fail(`${label} 结束帧`, p.what, p.detail));
      /* B+ 树的分隔键本来就是叶子键的副本，所以那条"键必须唯一"对它是错的。
       * 多键节点（B 树 / B+ 树）用 keys 数组表达，取第一个键做代表。 */
      if (!(topic.policy && topic.policy.separatorsMayRepeat)) {
        const keys = last.nodes.map(n => (n.key != null ? n.key : (n.keys || [])[0]));
        if (keys.some(k => k == null)) fail(`${label} 结束帧`, '有节点没有键值', JSON.stringify(keys));
        else if (new Set(keys).size !== keys.length) fail(`${label} 结束帧`, '仍有重复键', keys.join(','));
      }
      notes.push(`${sc.zh} → ${steps.length} 帧`);
      topicFrames['/' + topic.page] = Math.max(topicFrames['/' + topic.page] || 0, steps.length);
      topicFrames[topic.page] = Math.max(topicFrames[topic.page] || 0, steps.length);
    }
    checkedScenarios++;
  }

  /* --- 7. 交互会话的随机对拍 ---
   * 页面允许用户随便输入键（这正是这一页的意义），所以不能只验证三条写死的脚本。
   * 这里用固定种子的伪随机序列跑 insert / search / remove，每一步都要求：
   *   · 每一帧的结构不变量成立（操作进行中允许暂时违规，结算帧不允许）
   *   · 操作之后的键集合与一个独立模型（JS 的 Set）完全一致
   *   · 树里没有的键必须报"没找到"，不能假装删掉了
   *   · 同一帧里节点 id 不重复（id 是视图复用 DOM 的依据，撞了画面就错位） */
  if (typeof topic.session === 'function') {
    let seed = 0x2f6e2b1;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const TRIALS = 12, PER_TRIAL = 16;
    let opsRun = 0, framesChecked = 0;
    for (let trial = 0; trial < TRIALS; trial++) {
      const session = topic.session(algo);
      const model = new Set(session.keys());
      const initial = [...model].sort((a, b) => a - b);
      for (let n = 0; n < PER_TRIAL; n++) {
        /* 键的种类跟着主题走：普通树的键是名字 */
        const key = topic.keyKind === 'text'
          ? 'k' + (1 + Math.floor(rnd() * 12))
          : 1 + Math.floor(rnd() * 40);
        const existed = model.has(key);
        const roll = rnd();
        const action = roll < 0.5 ? 'insert' : (roll < 0.75 ? 'search' : 'remove');
        let res;
        try { res = session[action](key); }
        catch (e) { fail(`${where} 会话`, `${action}(${key}) 抛错`, e.message); break; }
        opsRun++;
        if (!res || !res.entries || !res.entries.length) {
          fail(`${where} 会话`, `${action}(${key}) 没有产生帧`, '空轨迹');
          continue;
        }
        if (action === 'insert' && res.ok) model.add(key);
        if (action === 'remove' && existed && res.ok) model.delete(key);
        /* ok=false 有两种含义：没找到，或者算法明确拒绝（二叉树不允许删有两个孩子的节点）。
         * 前者必须与事实一致，后者是这一页的规则，都算如实报告。 */
        const refused = /refused/.test(res.kind);
        if (action === 'remove' && !res.ok && !refused && existed) {
          fail(`${where} 会话`, `remove(${key}) 说没找到，可树里明明有这个键`, `kind=${res.kind}`);
        }
        if (action === 'remove' && res.ok && !existed) {
          fail(`${where} 会话`, `remove(${key}) 说删掉了，可树里本来就没有`, `kind=${res.kind}`);
        }
        if (action === 'search' && res.ok !== existed) {
          fail(`${where} 会话`, `search(${key}) 的结果与事实不符`, `树里${existed ? '有' : '没有'}这个键，却报告 ok=${res.ok}`);
        }
        res.entries.forEach((e, i) => {
          framesChecked++;
          const settled = e.line == null;
          const ids = e.nodes.map(x => x.id);
          if (new Set(ids).size !== ids.length) {
            fail(`${where} 会话`, `${action}(${key}) 第 ${i + 1} 帧有重复 id`, ids.join(','));
          }
          const { problems } = Frames.inspect(e.nodes, Object.assign({}, topic.policy, {
            label: `${action}(${key})#${i + 1}`, allowTransient: !settled
          }));
          problems.slice(0, 3).forEach(p => fail(`${where} 会话`, p.what, `${action}(${key})#${i + 1} ${p.detail}`));
          if (settled) {
            Frames.checkSettled(e.nodes, topic.policy)
              .slice(0, 3).forEach(p => fail(`${where} 会话 结算帧`, p.what, `${action}(${key})#${i + 1} ${p.detail}`));
          }
        });
        /* 两边都要排序：堆的内部数组本来就不是有序的，直接比字符串会误报 */
        const got = session.keys().slice().sort((a, b) => a - b).join(',');
        const want = [...model].sort((a, b) => a - b).join(',');
        if (got !== want) fail(`${where} 会话`, `${action}(${key}) 之后键集合不对`, `树=[${got}] 模型=[${want}]`);
        if (session.size !== model.size) fail(`${where} 会话`, `${action}(${key}) 之后 size 不对`, `${session.size} vs ${model.size}`);
      }
      session.reset();
      const after = session.keys().slice().sort((a, b) => a - b).join(',');
      if (after !== initial.join(',')) {
        fail(`${where} 会话`, 'reset 之后没有回到初始树', `[${after}] vs [${initial.join(',')}]`);
      }
    }
    notes.push(`交互会话：${TRIALS} 轮 × ${PER_TRIAL} 次随机增删查，共 ${opsRun} 次操作 / ${framesChecked} 帧，键集合与模型一致`);
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
