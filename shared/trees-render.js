/* 树状图的布局与绘制：只有这一份实现。
 *
 * 页面（ds/trees.html）和离线校验（tools/trees-page.mjs）都从这里取同一份代码，
 * 所以"数据对不对"和"画出来对不对"可以分别被机器检查。
 * 之前这段逻辑只活在页面里，没有浏览器就跑不了，叶链短接线整整一代都没画出来。
 *
 * 输入是纯数据：
 *   {nodes:[{id,label,kind}], edges:[[父,子]], leafNodes:[链格], leafEdges:[[链格,链格]]}
 * 坐标系是自造的：先按相对坐标摆好，最后统一平移进 MARGIN。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TreesRender = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const GAP = 34, LEVEL = 70, TOP = 30, MARGIN = 28;
  const CHAIN_HGAP = 18;      /* 叶链格之间的最小间距 */
  const DROP_TOLERANCE = 8;   /* 链格偏离锚点超过这个值就不画短接线（免得出现斜线） */

  function cloneDiagram(source) {
    return {
      nodes: source.nodes.map(x => ({ ...x })),
      edges: source.edges.map(x => [...x]),
      leafNodes: (source.leafNodes || []).map(x => ({ ...x })),
      leafEdges: (source.leafEdges || []).map(x => [...x]),
    };
  }

  function nodeWidth(node) {
    const label = String(node.label);
    return Math.max(48, Math.min(118, 24 + [...label].length * 13));
  }

  function layoutDiagram(d, text) {
    const tr = typeof text === 'function' ? text : (x => x);
    const widthOf = node => Math.max(48, Math.min(118, 24 + [...tr(node.label)].length * 13));
    const byId = new Map(d.nodes.map(x => [x.id, x]));
    /* 层级只由 edges 决定。leafEdges 是叶链的横向邻居关系，绝不能参与父子判定 ——
     * 否则根会因为"被别人指向过"而不再是根，链格还会被拉成孩子。 */
    const kids = new Map(), hasParent = new Set();
    d.edges.forEach(([a, b]) => {
      if (!kids.has(a)) kids.set(a, []);
      kids.get(a).push(b);
      hasParent.add(b);
    });
    const roots = d.nodes.filter(x => !hasParent.has(x.id) && kids.has(x.id));
    const rootData = roots[0] || d.nodes[0];
    if (!rootData) return { positions: new Map(), links: [], drops: [], chainLinks: [], width: 560, height: 120 };

    /* 每棵子树要占多宽：max(自身宽度, 孩子们排开的总宽)。
     * 少了前一项，叶子比子树还宽时窗口就偏心，邻子树的叶子会撞在一起
     * （binary 图的 ∅ 和 D 就是这样叠在同一格的）。 */
    const half = new Map();
    const halfWidth = id => {
      if (half.has(id)) return half.get(id);
      const node = byId.get(id);
      const own = widthOf(node) / 2;
      const cs = kids.get(id) || [];
      if (!cs.length) { half.set(id, own); return own; }
      const total = cs.reduce((a, c) => a + halfWidth(c) * 2, 0) + GAP * (cs.length - 1);
      const need = Math.max(own, total / 2);
      half.set(id, need);
      return need;
    };

    const pos = new Map();
    /* 参数名不要用 x —— 下面摆叶链行时有个 xs，同名形参会把它遮住。 */
    const put = (id, cx, cy) => {
      const node = byId.get(id);
      const p = { x: cx, y: cy, node, w: widthOf(node) };
      pos.set(id, p);
      return p;
    };
    let maxDepth = 0, tMin = 0, tMax = 0, first = true;
    const anchors = [];                       /* 叶页锚点，按 x 从左到右 */
    (function place(id, x, depth) {
      maxDepth = Math.max(maxDepth, depth);
      const p = put(id, x, TOP + depth * LEVEL);
      const w2 = p.w / 2;
      if (first) { tMin = x - w2; tMax = x + w2; first = false; }
      else { tMin = Math.min(tMin, x - w2); tMax = Math.max(tMax, x + w2); }
      const cs = kids.get(id) || [];
      if (!cs.length) { if (p.node.kind !== 'chain') anchors.push(p); return; }
      /* 孩子们在整棵子树的窗口里排开、整体居中 —— 窗口宽度含父节点自身宽度。 */
      const windows = cs.map(c => halfWidth(c) * 2);
      let cx = x - (windows.reduce((a, b) => a + b, 0) + GAP * (cs.length - 1)) / 2;
      cs.forEach((c, i) => { place(c, cx + windows[i] / 2, depth + 1); cx += windows[i] + GAP; });
    })(rootData.id, 0, 0);
    anchors.sort((a, b) => a.x - b.x);

    /* B+ 树的叶子链：整行摆在树下方，每格的理想位置是"正上方那个叶页的中心"，
     * 太挤就往右让位。锚点只从叶页里取 —— 用 d.nodes[i] 会错位（开头是根和内部页）。 */
    const chainNodes = (d.leafNodes || []).filter(Boolean);
    const chainLeaf = [];
    if (chainNodes.length) {
      const rowY = TOP + (maxDepth + 1) * LEVEL, tCenter = (tMin + tMax) / 2;
      const ws = chainNodes.map(widthOf);
      const xs = chainNodes.map((cn, i) => anchors[i] ? anchors[i].x : tCenter);
      anchors.slice(0, chainNodes.length).forEach(a => chainLeaf.push(a.node.id));
      /* 行中心对齐树中心：位移 = 树中心 − 本行实际中心。 */
      const rowShift = tCenter - (xs[0] + xs[xs.length - 1]) / 2;
      let prev = null;
      chainNodes.forEach((cn, i) => {
        const p = { x: xs[i] + rowShift, y: rowY, node: cn, w: ws[i] };
        if (prev && p.x - p.w / 2 < prev.x + prev.w / 2 + CHAIN_HGAP) p.x = prev.x + prev.w / 2 + CHAIN_HGAP + p.w / 2;
        pos.set(cn.id, p);
        prev = p;
      });
      maxDepth += 1;
    }

    /* 定宽 + 一次平移：把所有东西挪进 MARGIN 之内。 */
    const all = [...pos.values()];
    const min = Math.min(...all.map(p => p.x - p.w / 2));
    const width = Math.max(560, Math.max(...all.map(p => p.x + p.w / 2)) - min + MARGIN * 2);
    pos.forEach(p => { p.x = p.x - min + MARGIN; });
    const height = TOP + maxDepth * LEVEL + 40;

    const links = [];
    d.edges.forEach(([a, b]) => { if (pos.has(a) && pos.has(b)) links.push({ from: a, to: b }); });
    const drops = [];
    chainNodes.forEach((cn, i) => {
      const b = pos.get(cn.id), leafId = chainLeaf[i];
      const leaf = leafId && pos.get(leafId);
      if (b && leaf && Math.abs(b.x - leaf.x) <= DROP_TOLERANCE) drops.push({ from: leafId, to: cn.id });
    });
    const chainLinks = (d.leafEdges || [])
      .filter(([a, b]) => pos.has(a) && pos.has(b))
      .map(([a, b]) => ({ from: a, to: b }));
    return { positions: pos, links, drops, chainLinks, width, height };
  }

  function drawDiagram(d, focus, text) {
    const tr = typeof text === 'function' ? text : (x => x);
    const layout = layoutDiagram(d, tr);
    const pos = id => layout.positions.get(id);
    let out = '<svg viewBox="0 0 ' + layout.width + ' ' + layout.height + '" preserveAspectRatio="xMidYMin meet" role="img">';
    layout.links.forEach(({ from, to }) => {
      const a = pos(from), b = pos(to); if (!a || !b) return;
      out += '<line class="edge ' + (focus === from || focus === to ? 'hot' : '') + '" x1="' + a.x + '" y1="' + (a.y + 20) + '" x2="' + b.x + '" y2="' + (b.y - 20) + '"/>';
    });
    /* 叶页 → 它下面那个链格的短竖线 */
    layout.drops.forEach(({ from, to }) => {
      const a = pos(from), b = pos(to); if (!a || !b) return;
      out += '<line class="drop ' + (focus === from || focus === to ? 'hot' : '') + '" x1="' + a.x + '" y1="' + (a.y + 20) + '" x2="' + b.x + '" y2="' + (b.y - 16) + '"/>';
    });
    /* 链格之间的横向虚线 —— 这就是"叶子按键相连"那件事 */
    layout.chainLinks.forEach(({ from, to }) => {
      const a = pos(from), b = pos(to); if (!a || !b) return;
      out += '<line class="leafline ' + (focus === from || focus === to ? 'hot' : '') + '" x1="' + (a.x + a.w / 2) + '" y1="' + a.y + '" x2="' + (b.x - b.w / 2) + '" y2="' + b.y + '"/>';
    });
    [...layout.positions.values()].forEach(p => {
      const a = p.node, shown = tr(a.label), hot = a.id === focus ? 'hot' : '';
      if (a.kind === 'chain') {                   /* 叶链的一个格子：只画编号与键值 */
        out += '<g class="node chain ' + hot + '"><rect x="' + (p.x - p.w / 2) + '" y="' + (p.y - 16) + '" width="' + p.w + '" height="32" rx="4"/><text class="label" x="' + p.x + '" y="' + p.y + '">' + shown + '</text></g>';
        return;
      }
      out += '<g class="node ' + a.kind + ' ' + hot + '"><rect x="' + (p.x - p.w / 2) + '" y="' + (p.y - 20) + '" width="' + p.w + '" height="40" rx="8"/><text class="label" x="' + p.x + '" y="' + p.y + '">' + shown + '</text></g>';
    });
    return out + '</svg>';
  }

  return { cloneDiagram, nodeWidth, layoutDiagram, drawDiagram };
});
