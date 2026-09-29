/*!
 * 手绘快照式页面的"图与场景一致性"校验
 *
 * ds/trees.html 这一类的页面里，图不是算法生成的，而是手写的一张表
 * （diagrams）+ 一套场景（scenes，每帧指向某张图和一个焦点）。
 * 手写就会漂移，而且**屏幕上完全看不出来**：
 *
 *   · 焦点指向图里不存在的节点  → 该高亮的没高亮，读者以为这一步没内容
 *   · 边引用了不存在的节点      → 那个节点永远不画（B+ 的叶子链就是这样丢的）
 *   · 出现环 / 多个根           → 布局只画第一棵树，其余静默消失
 *   · 数据说 n 个节点、画出来 m 个 → 图和正文说的不是一回事
 *
 * 这些都是这一页真实发生过的缺陷，所以固化成检查。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

/* 布局与绘制只有一份实现（shared/trees-render.js），页面和这里用的是同一份代码。
 * 否则这一层只能靠浏览器审阅，Node 侧看不见 —— 叶链短接线整整一代没画出来，
 * 就是这么漏掉的。 */
const { drawDiagram, layoutDiagram } = createRequire(import.meta.url)('../shared/trees-render.js');
const idText = x => x;

/* 把一段浏览器风格的 JS 跑在沙箱里，取回它定义的值 */
function evalInSandbox(code, exportExpr) {
  const box = {
    n: (id, x, y, label, kind = '') => ({ id, x, y, label, kind }),
    Object, Math, Number, String, Array, JSON, console,
    window: {}
  };
  box.globalThis = box;
  vm.createContext(box);
  vm.runInContext(code + '\n;__out=' + exportExpr + ';', box);
  return box.__out;
}

/* 从 trees.html 里取出 diagrams 表（含 Object.assign 追加的那些） */
function loadDiagrams(pagePath) {
  const html = fs.readFileSync(pagePath, 'utf8');
  const script = html.match(/<script>\n([\s\S]*?)<\/script>/);
  if (!script) throw new Error('页面里没有内联脚本');
  const body = script[1];
  const start = body.indexOf('const diagrams=');
  const assignAt = body.indexOf('Object.assign(diagrams');
  const end = body.indexOf('});', assignAt) + 3;
  if (start < 0 || assignAt < 0) throw new Error('找不到 diagrams 表');
  return evalInSandbox(body.slice(start, end).replace('const diagrams=', 'var diagrams='), 'diagrams');
}

export function checkTreesPage(root, pageRel) {
  const failures = [];
  const notes = [];
  const pagePath = path.join(root, pageRel);

  /* --- 图本身 --- */
  let diagrams;
  try { diagrams = loadDiagrams(pagePath); }
  catch (e) { return { failures: [{ where: pageRel, what: '读不出 diagrams', detail: e.message }], notes }; }

  for (const [name, d] of Object.entries(diagrams)) {
    const all = [...d.nodes, ...(d.leafNodes || [])];
    const ids = new Set();
    all.forEach(n => {
      if (ids.has(n.id)) failures.push({ where: pageRel, what: `图 ${name} 节点 id 重复`, detail: n.id });
      ids.add(n.id);
    });
    (d.edges || []).forEach(([a, b]) => {
      if (!ids.has(a)) failures.push({ where: pageRel, what: `图 ${name} 边起点不存在`, detail: `${a} -> ${b}` });
      if (!ids.has(b)) failures.push({ where: pageRel, what: `图 ${name} 边终点不存在`, detail: `${a} -> ${b}` });
    });
    (d.leafEdges || []).forEach(([a, b]) => {
      if (!ids.has(a)) failures.push({ where: pageRel, what: `图 ${name} 叶子链起点不存在`, detail: `${a} -> ${b}` });
      if (!ids.has(b)) failures.push({ where: pageRel, what: `图 ${name} 叶子链终点不存在`, detail: `${a} -> ${b}` });
    });

    /* 层级：只由 edges 决定；必须恰好一个根，且所有节点都可达 */
    const kids = new Map(), incoming = new Set();
    (d.edges || []).forEach(([a, b]) => {
      if (!kids.has(a)) kids.set(a, []);
      kids.get(a).push(b);
      incoming.add(b);
    });
    const roots = d.nodes.filter(n => !incoming.has(n.id));
    if (d.nodes.length && roots.length !== 1) {
      failures.push({ where: pageRel, what: `图 ${name} 根的数量不是 1`, detail: `${roots.length} 个：${roots.map(r => r.id).join(',')}` });
    }
    const seen = new Set();
    (function walk(id) {
      if (seen.has(id)) return;
      seen.add(id);
      (kids.get(id) || []).forEach(walk);
    })(roots[0] ? roots[0].id : (d.nodes[0] || {}).id);
    d.nodes.forEach(n => {
      if (!seen.has(n.id)) failures.push({ where: pageRel, what: `图 ${name} 有不可达节点（永远不会被画出来）`, detail: `${n.id} "${n.label}"` });
    });

    /* 有序性：只对"按键排序"的图检查（BST / AVL / 红黑树）。
     * 跳过：avlbad 是故意画的失衡状态；chain 是退化链；
     *       堆只保证父不大于孩子，左右之间没有顺序。 */
    if (/^(bst|avl|rb)/.test(name) && !/bad/.test(name)) {
      const byId = new Map(d.nodes.map(n => [n.id, n]));
      d.nodes.forEach(p => {
        const ps = Number(p.label);
        if (!Number.isFinite(ps)) return;
        /* 左右由孩子相对父节点的位置决定 —— 不能按"排序后第几个"，
         * 否则只有一个孩子、而它在右边时会被误判成左孩子。 */
        (kids.get(p.id) || []).map(cid => byId.get(cid)).filter(Boolean).forEach(c => {
          /* kind='doomed' 是"被后继顶替、还没断开"的节点，它和父节点同值正是要点 */
          if (c.kind === 'doomed') return;
          const cv = Number(c.label);
          if (!Number.isFinite(cv)) return;
          if (c.x < p.x && cv >= ps) failures.push({ where: pageRel, what: `图 ${name} 左孩子不小于父节点`, detail: `${cv} 在 ${ps} 左边` });
          if (c.x > p.x && cv <= ps) failures.push({ where: pageRel, what: `图 ${name} 右孩子不大于父节点`, detail: `${cv} 在 ${ps} 右边` });
        });
      });
    }
  }

  /* --- 场景引用的图与焦点 --- */
  const dataSrc = fs.readFileSync(path.join(root, 'ds/trees.data.js'), 'utf8');
  const DATA = evalInSandbox(dataSrc, 'window.SLOWMO_TREES');
  let frames = 0;
  for (const s of DATA.structures) {
    for (const [opKey, flow] of Object.entries(s.walkthroughs)) {
      flow.scenes.forEach((sc, i) => {
        frames++;
        const where = `${s.id}/${opKey}#${i + 1}`;
        const d = diagrams[sc.diagram];
        if (!d) { failures.push({ where: pageRel, what: `${where} 指向不存在的图`, detail: sc.diagram }); return; }
        const ids = new Set([...d.nodes, ...(d.leafNodes || [])].map(n => n.id));
        if (sc.focus && !ids.has(sc.focus)) {
          failures.push({ where: pageRel, what: `${where} 焦点不在图 ${sc.diagram} 里`, detail: `focus="${sc.focus}"` });
        }
      });
    }
  }
  /* --- 画出来的东西：坐标有限、都在画布内、叶链真的连上了 ---
   * 这一层专门抓"数据没问题但屏幕上缺东西"的缺陷：
   *   · 叶链格没进布局（它们不在 edges 里，很容易整行丢掉）
   *   · 叶页与链格的短接线偏移过大而静默不画
   *   · 坐标是 NaN / 负号 / 超出 viewBox（图会被裁掉）
   *   · 两个节点叠在同一位置（看上去少了一个） */
  for (const [name, d] of Object.entries(diagrams)) {
    {
      const svg = drawDiagram(d, null, idText);
      const layout = layoutDiagram(d, idText);
      const box = svg.match(/viewBox="0 0 ([\d.-]+) ([\d.-]+)"/);
      if (!box) { failures.push({ where: pageRel, what: `图 ${name} 的 ${label}没有 viewBox`, detail: svg.slice(0, 60) }); continue; }
      const [vbW, vbH] = [Number(box[1]), Number(box[2])];
      const want = [...d.nodes, ...(d.leafNodes || [])].length;
      if (layout.positions.size !== want) {
        failures.push({ where: pageRel, what: `图 ${name} 有节点没进布局`, detail: `数据 ${want} 个，布局 ${layout.positions.size} 个` });
      }
      const groups = (svg.match(/<g class="node /g) || []).length;
      if (groups !== want) {
        failures.push({ where: pageRel, what: `图 ${name} 画出来的节点数不对`, detail: `数据 ${want} 个，SVG ${groups} 个` });
      }
      const seen = new Map();
      for (const [id, p] of layout.positions) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.w)) {
          failures.push({ where: pageRel, what: `图 ${name} 坐标不是有限数`, detail: `${id}: x=${p.x} y=${p.y} w=${p.w}` });
          continue;
        }
        const key = `${p.x},${p.y}`;
        if (seen.has(key)) failures.push({ where: pageRel, what: `图 ${name} 两个节点叠在同一格`, detail: `${seen.get(key)} 与 ${id} @ ${key}` });
        seen.set(key, id);
        if (p.x - p.w / 2 < -0.01 || p.x + p.w / 2 > vbW + 0.01 || p.y > vbH + 0.01) {
          failures.push({ where: pageRel, what: `图 ${name} 节点超出画布`, detail: `${id} @ x=${p.x.toFixed(1)} w=${p.w} / viewBox ${vbW}x${vbH}` });
        }
      }
      /* 叶链：每个链格要么有短接线落到它上方的叶页，要么明确不画（偏移过大） */
      const chains = (d.leafNodes || []).length;
      if (chains) {
        const linked = new Set(layout.drops.map(x => x.to));
        const unlinked = (d.leafNodes || []).filter(cn => !linked.has(cn.id));
        if (unlinked.length > chains / 2) {
          failures.push({ where: pageRel, what: `图 ${name} 的叶子链没连上叶页`, detail: `${unlinked.length}/${chains} 个链格没有短接线：${unlinked.map(c => c.id).join(',')}` });
        }
      }
      if (d.leafNodes && d.leafNodes.length) {
        const lls = (svg.match(/<line class="leafline/g) || []).length;
        const drops = (svg.match(/<line class="drop/g) || []).length;
        if (lls !== Math.max(0, d.leafNodes.length - 1)) {
          failures.push({ where: pageRel, what: `图 ${name} 叶子链虚线数不对`, detail: `${d.leafNodes.length} 个链格应有 ${d.leafNodes.length - 1} 条，实际 ${lls} 条` });
        }
        if (drops === 0) failures.push({ where: pageRel, what: `图 ${name} 叶页到链格一条短接线都没有`, detail: `${d.leafNodes.length} 个链格` });
      }
    }
  }
  notes.push(`图 ${Object.keys(diagrams).length} 张 / 场景 ${frames} 帧：节点可达、焦点有效；布局与绘制各核一遍（坐标有限、不出画布、叶链连通）`);

  return { failures, notes };
}
