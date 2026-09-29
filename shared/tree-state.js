/*!
 * 快照 → 视图状态
 *
 * 算法给出的每一帧只有结构（谁是谁的孩子、key、id、height），
 * 但画面上要区分的东西更多：正在看的节点、走过的路径、刚长出来的、
 * 刚刚被旋转过的、以及"违反本结构不变量"的节点。
 *
 * 这份推导只做一次、四棵树共用 —— 以前它写在 avl.html 里，别的页面各写一份
 * 就会漂移：同一个节点在 AVL 页标红、在红黑树页不标，读者看到两套说法。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.SlowMoTreeState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* 通用树视图状态：孩子按 id 给出的顺序就是左右顺序。
   * badges(step, node) 返回每棵树自己的角标（AVL 是 h/bf，红黑树是颜色）。 */
  function stateFor(step, prevStep, opts) {
    const o = opts || {};
    const nodes = (step && step.nodes) || [];
    if (!nodes.length) return { nodes: [], focus: null, note: '' };

    const byId = new Map(nodes.map(n => [n.id, n]));
    /* 焦点可能"还没接进树"（新建但未挂上）或"刚被摘掉"：那时它不在快照里，
     * 退回根节点最稳，别让画面失去焦点。 */
    const focusOnTree = step.focus != null && byId.has(step.focus);
    const focus = focusOnTree ? step.focus : (nodes.find(n => n.parent == null) || nodes[0]).id;

    const kidsOf = new Map();
    nodes.forEach(n => {
      if (n.parent == null) return;
      if (!kidsOf.has(n.parent)) kidsOf.set(n.parent, []);
      kidsOf.get(n.parent).push(n.id);
    });

    /* 根到焦点的路径 */
    const path = new Set();
    if (focusOnTree) for (let k = focus; k != null; k = (byId.get(k) || {}).parent) path.add(k);

    const before = prevStep && prevStep.nodes ? new Set(prevStep.nodes.map(n => n.id)) : null;
    const previous = prevStep && prevStep.nodes ? new Map(prevStep.nodes.map(n => [n.id, n])) : null;

    const out = nodes.map(n => {
      const kids = (kidsOf.get(n.id) || []).map(k => byId.get(k));
      const cls = [];
      if (path.has(n.id) && n.id !== focus) cls.push('visit');
      if (n.id === focus && focusOnTree) cls.push('now');
      if (before && !before.has(n.id)) cls.push('inserted');            // 刚长出来的
      if (previous) {
        const was = previous.get(n.id);
        if (was && was.parent !== n.parent) cls.push('rotated');        // 父指针变了 = 旋转/借位/上浮
        if (was && was.key !== n.key) cls.push('rekeyed');              // 键被后继顶替（只改标签）
      }
      if (o.flag && o.flag(n, kids, step)) cls.push('unbalanced');    // 结构特有：失衡 / 红红相连

      const extra = o.badges ? o.badges(n, kids, step) : {};
      return Object.assign({
        key: n.id,
        parent: n.parent,
        label: String(n.key),
        state: cls.join(' ')
      }, extra);
    });
    return { nodes: out, focus, note: '' };
  }

  /* 平衡因子：孩子按键分左右（只有二叉搜索类结构用得上） */
  function childLR(node, kids) {
    const hl = kids.find(c => c.key < node.key), hr = kids.find(c => c.key > node.key);
    return { hl, hr };
  }

  /* AVL：角标是高度与平衡因子，|bf|>1 要标红 */
  function avlState(step, prevStep) {
    return stateFor(step, prevStep, {
      flag: (n, kids) => {
        const { hl, hr } = childLR(n, kids);
        return Math.abs((hl ? hl.height : 0) - (hr ? hr.height : 0)) > 1;
      },
      badges: (n, kids) => {
        const { hl, hr } = childLR(n, kids);
        const bf = (hl ? hl.height : 0) - (hr ? hr.height : 0);
        return {
          sub: 'h' + n.height + ' · bf ' + (bf > 0 ? '+' : '') + bf,
          badge: Math.abs(bf) > 1 ? 'bf ' + (bf > 0 ? '+' : '') + bf : '',
          bf, height: n.height
        };
      }
    });
  }

  /* 红黑树：角标是颜色；红红相连=违规（根红也算，它必须最后被修好） */
  function rbtState(step, prevStep) {
    return stateFor(step, prevStep, {
      flag: (n, kids, s) => {
        if (n.color === 'red') {
          if (n.parent == null) return true;
          const p = (s.nodes || []).find(x => x.id === n.parent);
          return !!p && p.color === 'red';
        }
        return false;
      },
      badges: n => ({ sub: n.color === 'red' ? '红' : '黑', color: n.color })
    });
  }

  /* 堆：角标是数组下标，父大于子要标红（小顶堆） */
  function heapState(step, prevStep) {
    const byId = new Map(((step && step.nodes) || []).map(n => [n.id, n]));
    return stateFor(step, prevStep, {
      flag: (n, kids) => kids.some(c => c.key < n.key),
      badges: n => ({ sub: n.index == null ? '' : '[' + n.index + ']', index: n.index })
    });
  }

  /* 普通树 / 二叉树：没有额外不变量，角标是孩子数 */
  function plainState(step, prevStep) {
    return stateFor(step, prevStep, {
      badges: (n, kids) => ({ sub: kids.length ? kids.length + ' 个子节点' : '叶子' })
    });
  }

  return { stateFor, avlState, rbtState, heapState, plainState };
});
