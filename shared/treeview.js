/*!
 * Slow-Mo CS — tree view engine  (no dependencies beyond the vendored d3-hierarchy)
 *
 * 这一层只做一件事：把某一步的"树状态快照"绑到一组【持久存在】的 SVG 节点上。
 *
 *   const view = TreeView.mount(container, opts);
 *   view.update(state);        // state 见下方协议，节点被复用、增删、补间
 *   view.play(prevState, ms);  // 与上一步做 diff，高亮"刚刚新增/消失"的节点
 *
 * 为什么要"持久节点"：算法每一步都指向同一批对象（按 key 稳定标识），
 * 页面只更新属性，不重建 DOM。于是：
 *   - 动画只是 CSS transition，不需要重绘
 *   - "第 k 步高亮哪个节点"是绑定关系，不是写死的 id 字符串
 *   - 节点数与算法状态节点数必然一致（结构变化会真的增删 DOM）
 *
 * ---------------------------------------------------------------------------
 * 状态协议（算法侧只需要产出这个形状）
 * ---------------------------------------------------------------------------
 * state = {
 *   nodes: [ { key, label?, sub?, badge?, state?, parent } ],
 *            key    唯一且稳定的标识（用键值即可）
 *            label  主标签，默认 String(key)
 *            sub    副标签，例如 h=2 · bf=+1
 *            badge  角标，例如 "BF +2"（失衡时）
 *            state  空格分隔的状态类：visit now inserted removed rotate unbalanced
 *            color  'red' / 'black'（红黑树用；不传就是中性色）
 *            parent 父节点 key，null 表示根
 *   focus?: key|null     当前"看"的节点（与 state 里的类二选一或并用）
 *   note?:  string       画布角注（例如 "以 10 为轴左旋"）
 *   slot?:  {parent, side} 悬挂一个待插入的空槽位（虚框）
 * }
 * 节点顺序无关紧要，布局由 d3-hierarchy 算。
 */
(function (global) {
  'use strict';

  const SVGNS = 'http://www.w3.org/2000/svg';

  /* 布局比例默认值；页面可以用 CSS 变量覆盖：
   *   --tv-node-h:52; --tv-level:96;
   * 这样"同一套绑定逻辑"能适配不同主题的疏密。 */
  const DEFAULTS = { NODE_H: 44, LEVEL: 80, MIN_W: 52, MAX_W: 150, GAP: 28, PAD: 26, TOP: 34 };

  function metrics(container) {
    const cs = container && getComputedStyle ? getComputedStyle(container) : null;
    const num = (name, fallback) => {
      const v = cs ? parseFloat(cs.getPropertyValue(name)) : NaN;
      return isFinite(v) && v > 0 ? v : fallback;
    };
    const NODE_H = num('--tv-node-h', DEFAULTS.NODE_H);
    const LEVEL = num('--tv-level', DEFAULTS.LEVEL);
    return {
      NODE_H, LEVEL,
      TOP: NODE_H * 0.8,
      MIN_W: DEFAULTS.MIN_W,
      MAX_W: DEFAULTS.MAX_W,
      GAP: NODE_H * 0.62,
      PAD: DEFAULTS.PAD,
      LABEL: NODE_H * 0.30,        // 主标签字号
      SUB: NODE_H * 0.19           // 副标签字号
    };
  }

  /* 入场补间：先落到"起点"（透明），强制一次布局，再撤掉内联透明度，
   * 让 CSS transition 自然接管。
   * 不用 requestAnimationFrame —— 在没有合成帧的环境（自动化、后台标签页）里
   * 回调可能一直不触发，元素就永远停在透明状态。 */
  function fadeIn(node) {
    node.style.opacity = '0';
    void node.getBBox;                                   // 强制样式结算
    if (typeof node.getBoundingClientRect === 'function') node.getBoundingClientRect();
    node.style.opacity = '';
  }

  function el(name, attrs, parent) {
    const n = document.createElementNS(SVGNS, name);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  /* 估算文字宽度：CJK 按 1em，其余按 0.62em。比 canvas 测量便宜，且确定性好。 */
  function textWidth(str, size) {
    let w = 0;
    for (const ch of String(str)) w += (ch.charCodeAt(0) > 0x2e80 ? 1 : 0.62) * size;
    return w;
  }

  function nodeWidth(n, M) {
    const main = textWidth(n.label != null ? n.label : (n.key != null ? n.key : ''), M.LABEL) + M.NODE_H * 0.5;
    const sub = n.sub ? textWidth(n.sub, M.SUB) + M.NODE_H * 0.4 : 0;
    return Math.max(M.MIN_W, Math.min(M.MAX_W, Math.max(main, sub)));
  }

  function mount(container, opts) {
    const o = opts || {};
    const svg = el('svg', { class: 'tv', xmlns: SVGNS });
    /* xMidYMin：内容顶部对齐。容器比图高时，多余的空白留在下方而不是把图顶到中间。 */
    svg.setAttribute('preserveAspectRatio', 'xMidYMin meet');
    const gRoot = el('g', { class: 'tv-root' }, svg);
    const gEdges = el('g', { class: 'tv-edges' }, gRoot);
    const gNodes = el('g', { class: 'tv-nodes' }, gRoot);
    const noteEl = o.note !== false ? el('text', { class: 'tv-note', x: 16, y: 18 }, gRoot) : null;
    const empty = document.createElement('div');
    empty.className = 'tv-empty';
    empty.textContent = o.emptyText || '';
    container.innerHTML = '';
    container.appendChild(svg);
    if (o.emptyText) container.appendChild(empty);

    let prev = null;                       // 上一步的状态，用于 diff
    let cur = { nodes: [], edges: [] };
    let exiting = new Set();               // 正在淡出的元素：下一次渲染时必须清掉
    /* 每次渲染前重读一次比例：主题改了 CSS 变量，图跟着变 */
    let M = metrics(container);

    /* 每次渲染开头同步清扫上一轮的残影。
     * 只靠 setTimeout 是不够的：连续切帧（自动化、快速点步）时定时器来不及跑，
     * 已经"消失"的边就会越积越多——那正是图上出现多余连线的原因。 */
    function sweep() {
      exiting.forEach(rm => rm());
      exiting.clear();
    }
    function retire(node) {
      node.style.opacity = '0';
      const rm = () => node.remove();
      exiting.add(rm);
      setTimeout(rm, 260);                 // 淡出结束后收尾（重复调用无副作用）
    }

    /* 容器实际尺寸。布局按它算，viewBox 也按它定：
     * 宽度取 max(容器宽, 内容自然宽)，高度按同一比例缩放，
     * 于是 meet 之后缩放比恒为 1——文字不会忽大忽小，也不会被裁掉。 */
    function box() {
      const r = container.getBoundingClientRect();
      return { w: Math.max(320, Math.round(r.width) || 0), h: Math.max(200, Math.round(r.height) || 0) };
    }

    /* ---------------------------------------------------------------- layout */
    function layout(state) {
      const nodes = state.nodes || [];
      const byKey = new Map(nodes.map(n => [n.key, n]));
      const kids = new Map(), hasParent = new Set();
      nodes.forEach(n => {
        if (n.parent == null || !byKey.has(n.parent)) return;
        hasParent.add(n.key);
        if (!kids.has(n.parent)) kids.set(n.parent, []);
        kids.get(n.parent).push(n.key);
      });
      const roots = nodes.filter(n => !hasParent.has(n.key));
      if (!roots.length) return { pos: new Map(), width: 600, height: 240, rootKeys: [] };

      /* 多棵树（正常不会出现，出现就水平并列），按 key 排序保证稳定 */
      const sortedRoots = roots.map(r => r.key).sort((a, b) => String(a).localeCompare(String(b), 'en', { numeric: true }));

      /* 自底向上算每棵子树需要的半宽（自研布局：不依赖 d3，节点宽度可以精确参与） */
      const wCache = new Map();
      function halfWidth(key) {
        if (wCache.has(key)) return wCache.get(key);
        const n = byKey.get(key);
        const own = nodeWidth(n, M) / 2;
        const ks = kids.get(key) || [];
        if (!ks.length) { wCache.set(key, { left: own, right: own }); return wCache.get(key); }
        let left = 0, right = 0, first = true;
        ks.forEach(k => {
          const h = halfWidth(k);
          if (first) { left = h.left; right = h.right; first = false; }
          else { right += M.GAP + h.left + h.right; }
        });
        left = Math.max(own, left);
        right = Math.max(own, right);
        wCache.set(key, { left, right });
        return wCache.get(key);
      }

      const spanCache = new Map();
      function span(key) {                         // 子树总宽
        if (spanCache.has(key)) return spanCache.get(key);
        const h = halfWidth(key), v = h.left + h.right;
        spanCache.set(key, v);
        return v;
      }

      const pos = new Map();
      let cursor = M.PAD;
      let maxDepth = 0;
      sortedRoots.forEach(rk => {
        const s = span(rk);
        const h = halfWidth(rk);
        place(rk, cursor + h.left, 0);
        cursor += s + M.GAP * 2;
      });
      function place(key, x, depth) {
        maxDepth = Math.max(maxDepth, depth);
        pos.set(key, { x, y: M.TOP + depth * M.LEVEL, node: byKey.get(key) });
        const ks = kids.get(key) || [];
        let cx = x - span(key) / 2 + (halfWidth(key).left - halfWidth(key).right) / 2;
        /* 从子树区间的左边界开始依次摆放孩子 */
        let left = x - halfWidth(key).left;
        ks.forEach(k => {
          const h = halfWidth(k);
          place(k, left + h.left, depth + 1);
          left += h.left + h.right + M.GAP;
        });
      }

      const width = Math.max(o.minWidth || 520, cursor - M.GAP * 2 + M.PAD);
      const height = M.TOP + maxDepth * M.LEVEL + M.NODE_H / 2 + M.NODE_H * 0.9;
      return { pos, width, height, rootKeys: sortedRoots };
    }

    /* ------------------------------------------------------------ rendering */
    function render(state) {
      sweep();
      M = metrics(container);
      const { pos, width, height } = layout(state);
      const b = box();
      /* 内容比容器窄 → 把画布撑到容器宽；内容更高 → 等比放大画布高度以便滚动 */
      /* 画布尺寸同时受容器宽、高约束：
       *   - 内容比容器宽  → 画布撑到容器宽（图不会被裁）
       *   - 内容比容器高  → 画布留出等比例余量（宁可有留白，也不裁节点）
       * 小缩略图（审阅页）和大画布（正文页）用的是同一套规则。 */
      const natW = Math.max(1, Math.round(width)), natH = Math.round(height);
      const vw = Math.max(b.w, natW);
      const vh = Math.max(natH, Math.round(natH * (b.w / natW)));
      const maxH = Math.max(natH, b.h - 2);          // 容器给的高度上限
      svg.style.maxHeight = maxH + 'px';
      /* 关键：DOM 属性读回来永远是字符串，所以键一律按字符串比较。
       * 之前这里是数字 Set，curKeys.has("1") 永远 false，
       * 于是节点刚建好就被当成"已消失"删掉——图只在新建的那一帧可见。 */
      const K = k => String(k);
      const prevKeys = new Set((prev && prev.nodes || []).map(n => K(n.key)));
      const curKeys = new Set((state.nodes || []).map(n => K(n.key)));

      svg.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);
      svg.setAttribute('width', vw);
      svg.setAttribute('height', vh);
      svg.style.width = vw + 'px';
      svg.style.height = vh + 'px';

      /* 可见性：节点不在布局里（不该发生）也标记出来，便于自检 */
      const live = [...gNodes.querySelectorAll('g.tn')];

      /* --- 新增 / 更新节点 --- */
      (state.nodes || []).forEach(n => {
        const p = pos.get(n.key);
        if (!p) return;                                  // 孤儿节点：布局阶段已排除
        let g = gNodes.querySelector('g.tn[data-key="' + cssEsc(n.key) + '"]');
        const isNew = !g;
        if (isNew) {
          g = el('g', { class: 'tn', 'data-key': n.key }, gNodes);
          el('rect', { class: 'tn-box', x: 0, y: 0, rx: M.NODE_H * 0.16, height: M.NODE_H }, g);
          el('text', { class: 'tn-label', x: 0, y: 0, 'text-anchor': 'middle' }, g);
          el('text', { class: 'tn-sub', x: 0, y: 0, 'text-anchor': 'middle' }, g);
          el('text', { class: 'tn-badge', x: 0, y: 0, 'text-anchor': 'middle' }, g);
          el('circle', { class: 'tn-dot', r: 3.5 }, g);
          fadeIn(g);
        }
        const w = nodeWidth(n, M);
        const box = g.querySelector('.tn-box');
        box.setAttribute('x', -w / 2);
        box.setAttribute('y', -M.NODE_H / 2);
        box.setAttribute('width', w);

        const label = g.querySelector('.tn-label');
        const sub = g.querySelector('.tn-sub');
        const badge = g.querySelector('.tn-badge');
        label.style.fontSize = M.LABEL + 'px';
        sub.style.fontSize = M.SUB + 'px';
        badge.style.fontSize = M.SUB + 'px';
        const txt = n.label != null ? n.label : String(n.key);
        if (label.textContent !== txt) label.textContent = txt;
        const subTxt = n.sub || '';
        if (sub.textContent !== subTxt) sub.textContent = subTxt;
        label.setAttribute('y', subTxt ? -M.NODE_H * 0.06 : M.NODE_H * 0.12);
        sub.setAttribute('y', M.NODE_H * 0.26);
        sub.style.display = subTxt ? '' : 'none';

        const badgeTxt = n.badge || '';
        if (badge.textContent !== badgeTxt) badge.textContent = badgeTxt;
        badge.style.display = badgeTxt ? '' : 'none';
        badge.setAttribute('x', w / 2 - 4);
        badge.setAttribute('y', -M.NODE_H / 2 - 6);

        g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ')');
        const cls = 'tn'
          + (n.state ? ' ' + n.state : '')
          + (badgeTxt ? ' unbalanced' : '')
          + (n.color ? ' ' + n.color : '');
        if (g.getAttribute('class') !== cls) g.setAttribute('class', cls);
        g.setAttribute('data-active', curKeys.has(K(n.key)) ? '1' : '0');
      });

      /* --- 删除消失的节点 --- */
      live.forEach(g => {
        const k = g.getAttribute('data-key');
        if (curKeys.has(k)) return;
        if (prevKeys.has(k)) {
          g.setAttribute('class', 'tn removed');
          retire(g);
        } else {
          g.remove();
        }
      });

      /* --- 边：父 → 子，按 data-edge 复用 --- */
      const wanted = new Set();
      (state.nodes || []).forEach(n => {
        if (n.parent == null) return;
        const a = pos.get(n.parent), b = pos.get(n.key);
        if (!a || !b) return;
        /* 复用键必须是"能原样放进属性、也能原样进选择器"的字符串。
         * 用 \u0000 当分隔符会坏掉：setAttribute 存的是裸 \0，
         * 而查询串里的 \0 会被转义，两边永远匹配不上 → 每帧新建一条边。 */
        const id = K(n.parent) + '>' + K(n.key);
        wanted.add(id);
        let line = gEdges.querySelector('line[data-edge="' + cssEsc(id) + '"]');
        if (!line) {
          line = el('line', { class: 'tv-edge', 'data-edge': id }, gEdges);
          fadeIn(line);
        }
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y + M.NODE_H / 2);
        line.setAttribute('x2', b.x); line.setAttribute('y2', b.y - M.NODE_H / 2);
        const hot = (state.focus === n.key || state.focus === n.parent) ? ' hot' : '';
        line.setAttribute('class', 'tv-edge' + hot);
      });
      [...gEdges.querySelectorAll('line')].forEach(line => {
        if (!wanted.has(line.getAttribute('data-edge'))) retire(line);
      });

      /* --- 空槽位（插入的目标位置） --- */
      const oldSlot = gRoot.querySelector('g.tv-slot');
      if (oldSlot) oldSlot.remove();
      if (state.slot && pos.get(state.slot.parent)) {
        const a = pos.get(state.slot.parent);
        const dx = state.slot.side === 'left' ? -1 : 1;
        const x = a.x + dx * Math.max(M.NODE_H * 1.3, nodeWidth(a.node, M) / 2 + M.NODE_H * 0.9);
        const y = a.y + M.LEVEL;
        const g = el('g', { class: 'tv-slot' }, gRoot);
        el('line', { class: 'tv-edge ghost', x1: a.x, y1: a.y + M.NODE_H / 2, x2: x, y2: y - M.NODE_H / 2 }, g);
        el('rect', { class: 'tn-box', x: x - M.MIN_W / 2, y: y - M.NODE_H / 2, width: M.MIN_W, height: M.NODE_H, rx: M.NODE_H * 0.16 }, g);
        el('text', { class: 'tn-label', x, y: y + M.NODE_H * 0.12, 'text-anchor': 'middle' }, g).textContent = '?';
      }

      if (noteEl) noteEl.textContent = state.note || '';
      if (o.emptyText) empty.style.display = (state.nodes || []).length ? 'none' : '';
    }

    function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

    return {
      container, svg,
      update(state) { cur = state; render(state); prev = state; },
      /* 容器尺寸变了（窗口缩放、侧栏收起）时重画一次 */
      resize() { if (cur) render(cur); },
      /* 与"上一帧"对比：返回新增/消失的 key，页面可以拿去做额外提示 */
      diff(state, before) {
        const a = new Set((before && before.nodes || []).map(n => n.key));
        const b = new Set((state.nodes || []).map(n => n.key));
        return { added: [...b].filter(k => !a.has(k)), removed: [...a].filter(k => !b.has(k)) };
      },
      get state() { return cur; },
      get nodeCount() { return gNodes.querySelectorAll('g.tn').length; },
      get edgeCount() { return gEdges.querySelectorAll('line').length; },
      /* 自检用：渲染出来的 key 集合 vs 状态里的 key 集合 */
      audit(state) {
        const rendered = [...gNodes.querySelectorAll('g.tn:not(.removed)')].map(g => g.getAttribute('data-key'));
        const want = (state.nodes || []).map(n => String(n.key));
        /* 这一层自检就是用来防上面那类 bug 的：渲染集合必须等于状态集合 */
        const missing = want.filter(k => !rendered.includes(k));
        const extra = rendered.filter(k => !want.includes(k));
        const edges = [...gEdges.querySelectorAll('line:not([style*="opacity: 0"])')].length;
        const wantEdges = (state.nodes || []).filter(n => n.parent != null).length;
        return { missing, extra, edgeMismatch: edges !== wantEdges ? { rendered: edges, want: wantEdges } : null };
      }
    };
  }

  /* -------------------------------------------------------------------------
   * 数组视图
   *
   * 堆、并查集这类结构同时有"树"和"数组"两种真实表示，两边要能互相指认。
   * 用法：
   *   const arr = TreeView.mountArray(容器, { emptyText:'（空）' });
   *   arr.update([{ key:1, name:1 }, ...], { focus:1, marks:{ 2:'hot' } });
   * 单元格按数组顺序排列，每格显示下标与值；marks 用来跟树视图同步高亮。
   * ---------------------------------------------------------------------- */
  function mountArray(container, opts) {
    const o = opts || {};
    let cur = [];
    const empty = document.createElement('div');
    empty.className = 'tv-empty';
    empty.textContent = o.emptyText || '';
    container.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'tv-array';
    container.appendChild(row);
    if (o.emptyText) container.appendChild(empty);

    const cells = new Map();      // name -> { el, idx, val }
    function render(items, state) {
      const st = state || {};
      const wanted = new Set(items.map(it => String(it.name)));
      /* 消失的格子：先淡出再删，和树视图一个规矩 */
      [...cells.keys()].forEach(k => {
        if (wanted.has(k)) return;
        const c = cells.get(k);
        c.el.classList.add('gone');
        cells.delete(k);
        setTimeout(() => c.el.remove(), 260);
      });
      items.forEach((it, i) => {
        const name = String(it.name);
        let c = cells.get(name);
        if (!c) {
          const el = document.createElement('div');
          el.className = 'tv-cell';
          const idx = document.createElement('i');
          const val = document.createElement('b');
          el.append(idx, val);
          row.appendChild(el);
          c = { el, idx, val };
          cells.set(name, c);
          el.style.opacity = '0';
          void el.getBoundingClientRect();
          el.style.opacity = '';
        }
        c.idx.textContent = i;
        c.val.textContent = String(it.key);
        const mark = st.marks && st.marks[name];
        const cls = 'tv-cell'
          + (st.focus != null && String(st.focus) === name ? ' now' : '')
          + (mark ? ' ' + mark : '');
        if (c.el.className !== cls) c.el.className = cls;
        /* 数组顺序变化时靠 flex order 平滑移动，而不是重建 DOM */
        c.el.style.order = String(i);
      });
      if (o.emptyText) empty.style.display = items.length ? 'none' : '';
      cur = items;
    }
    return {
      update(items, state) { render(items || [], state); },
      get length() { return cur.length; },
      get cellCount() { return cells.size; }
    };
  }

  global.TreeView = { mount, mountArray, nodeWidth, textWidth, metrics };
})(window);
