/*!
 * Slow-Mo CS — 结构不变量校验（Node 与浏览器共用）
 *
 * 通用规则对任何"有根树快照"都成立：
 *   id 唯一 · 父指针可达 · 恰好一个根 · 无环
 *
 * 另有可选策略（结构特有，按需打开）：
 *   maxChildren   每个节点最多几个孩子（二叉树 = 2）
 *   ordered       true = 孩子按键有序（BST / AVL / 红黑树）
 *   minHeap       true = 父不大于子（堆）
 *   heightField   true = 节点自带 height 且与结构一致
 *   balanced      允许的最大 |bf|（AVL = 1）
 *   allowTransient 操作进行中：允许"已发现但尚未修复"的失衡与高度滞后
 *
 * 这就是把"画面等于算法状态"从默契变成机器判定。历史上抓到的四个 bug
 * （成环、id 重复、焦点悬空、边堆积）全部由它这一类检查发现，肉眼看不出来。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.SlowMoFrames = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_POLICY = {
    maxChildren: 2,
    ordered: false,
    minHeap: false,
    heightField: false,
    balanced: null,
    allowTransient: false,
    /* 红黑性质：根为黑、无红红相连、每条根到空叶路径黑高相同。
     * 需要节点带 color 字段（'red' / 'black'）。 */
    redBlack: false,
    /* 多路树（B 树 / B+ 树）的分裂天生是"一步出现两个节点"：被劈的节点留住左半边，
     * 同时冒出一个右半边（根分裂时还多一个新根）。这不是失控的批量改动，
     * 而是这个结构的本来样子 —— 打开它表示"允许多节点差异"，其余规则照旧。 */
    multiChildDiff: false
  };

  /* 返回 { problems: [{what, detail}], info: {roots, maxDepth, size} } */
  function inspect(nodes, opts) {
    const P = Object.assign({}, DEFAULT_POLICY, opts || {});
    const label = P.label || 'frame';
    const problems = [];
    const bad = (what, detail) => problems.push({ what, detail });
    const list = Array.isArray(nodes) ? nodes : [];

    /* --- 通用：身份与指针 --- */
    const byId = new Map();
    for (const n of list) {
      if (!n || n.id == null) { bad('节点缺少 id', JSON.stringify(n)); continue; }
      if (byId.has(n.id)) bad('id 重复', `id=${n.id}`);
      byId.set(n.id, n);
    }
    for (const n of list) {
      if (n.parent == null) continue;
      if (!byId.has(n.parent)) bad('parent 指向不存在的节点', `node ${n.id}(key ${n.key}) -> parent ${n.parent}`);
      if (n.parent === n.id) bad('parent 指向自己', `node ${n.id}`);
    }

    const roots = list.filter(n => n.parent == null || !byId.has(n.parent));
    const realRoots = list.filter(n => n.parent == null);
    if (list.length && realRoots.length !== 1) {
      bad('根的数量不是 1', `${realRoots.length} 个（${realRoots.map(r => r.id).join(',')}）`);
    }

    /* --- 通用：无环 --- */
    for (const n of list) {
      let k = n.id, steps = 0;
      while (k != null && steps <= list.length + 1) { const p = byId.get(k); k = p ? p.parent : null; steps++; }
      if (steps > list.length + 1) { bad('父子链成环', `从 node ${n.id} 出发`); break; }
    }

    /* --- 孩子索引 --- */
    const kids = new Map();
    for (const n of list) {
      if (n.parent == null || !byId.has(n.parent)) continue;
      if (!kids.has(n.parent)) kids.set(n.parent, []);
      kids.get(n.parent).push(n);
    }

    /* --- 结构策略 --- */
    let maxDepth = 0;
    const depthOf = new Map();
    (function walk(id, d) {
      if (depthOf.has(id)) return;
      depthOf.set(id, d);
      maxDepth = Math.max(maxDepth, d);
      (kids.get(id) || []).forEach(c => walk(c.id, d + 1));
    })(realRoots[0] ? realRoots[0].id : (roots[0] || {}).id, 0);

    /* --- 红黑性质 ---
     * 插入/删除的修复过程中，"根变红""红红相连""黑高暂时不等"都是算法
     * 正在处理的中间状态（修复的最后一步会消掉）。所以它们在瞬态帧里是正常的，
     * 只有结算帧才必须全部成立 —— 跟 AVL 的"发现失衡但还没转"同理。 */
    if (P.redBlack) {
      const isRed = n => !!n && n.color === 'red';
      const isBlack = n => !n || n.color === 'black';
      const rbBad = (what, detail) => { if (!P.allowTransient) bad(what, detail); };

      if (realRoots[0] && isRed(realRoots[0])) rbBad('根不是黑色', `node ${realRoots[0].id}(key ${realRoots[0].key})`);
      for (const n of list) {
        /* 颜色字段本身非法（拼错、缺失）永远是问题，不算瞬态 */
        if (n.color !== 'red' && n.color !== 'black') {
          bad('节点颜色非法', `node ${n.id} color=${JSON.stringify(n.color)}`);
          continue;
        }
        if (!isRed(n)) continue;
        (kids.get(n.id) || []).forEach(c => {
          if (isRed(c)) rbBad('红红相连', `${n.id}(${n.key}) 与孩子 ${c.id}(${c.key}) 都是红`);
        });
      }

      /* 黑高：从根出发每条到空叶的路径，黑节点数必须相同 */
      (function blackHeight(id, depth, acc) {
        const n = byId.get(id);
        if (!n) return;
        const next = acc + (isBlack(n) ? 1 : 0);
        const cs = kids.get(id) || [];
        if (!cs.length) {
          if (depth === 0) return;
          if (P._bh == null) P._bh = next;
          else if (P._bh !== next) rbBad('黑高不等', `路径到 node ${id} 有 ${next} 个黑节点，别的路径是 ${P._bh}`);
          return;
        }
        cs.forEach(c => blackHeight(c.id, depth + 1, next));
      })(realRoots[0] ? realRoots[0].id : null, 0, 0);
    }

    for (const n of list) {
      const cs = kids.get(n.id) || [];
      if (P.maxChildren != null && cs.length > P.maxChildren) {
        bad(`孩子数超过 ${P.maxChildren}`, `node ${n.id} 有 ${cs.length} 个`);
      }
      const left = cs.filter(c => c.key < n.key);
      const right = cs.filter(c => c.key > n.key);

      if (P.ordered) {
        if (left.length + right.length !== cs.length) {
          bad('孩子键与父键相等或错序', `node ${n.id}(key ${n.key}) 孩子 ${cs.map(c => c.key).join(',')}`);
        }
        if (left.length > 1 || right.length > 1) bad('同侧多个孩子', `node ${n.id}`);
      }
      /* 上浮/下沉途中的中间帧必然违反堆序（正在交换的路上），
       * 只有结算帧才必须成立 —— 和红黑树的瞬态豁免同一个道理。 */
      if (P.minHeap && !P.allowTransient) {
        cs.forEach(c => { if (c.key < n.key) bad('最小堆序被破坏', `父 ${n.key} 有更小的孩子 ${c.key}`); });
      }
      if (P.heightField) {
        const lh = left[0] ? left[0].height : 0, rh = right[0] ? right[0].height : 0;
        const real = 1 + Math.max(lh, rh);
        if (n.height !== real) {
          const lag = Math.abs((n.height || 0) - real);
          if (lag > 1) bad('height 字段与结构严重脱节', `node ${n.id}: 记 ${n.height}，实为 ${real}`);
          else if (!P.allowTransient) bad('height 字段与结构不符', `node ${n.id}: 记 ${n.height}，实为 ${real}`);
        }
        if (P.balanced != null && Math.abs(lh - rh) > P.balanced && !P.allowTransient) {
          bad(`失衡 |bf|>${P.balanced}`, `node ${n.id}: bf=${lh - rh}`);
        }
      }
    }

    return { problems, info: { roots: realRoots.map(r => r.id), maxDepth, size: list.length } };
  }

  /* 帧间差异必须"一步能解释"：一次旋转最多动 4 个节点的父子关系 */
  function diffFrames(prev, next, opts) {
    /* 一次双旋最多动 4 个节点的父子关系；堆的一次下沉是"父 + 两个孩子"= 5 */
    const P = Object.assign({ maxChanges: 5, bulkDelete: false }, opts || {});
    const a = new Map((prev || []).map(n => [n.id, n]));
    const b = new Map((next || []).map(n => [n.id, n]));
    const added = [...b.keys()].filter(k => !a.has(k));
    const removed = [...a.keys()].filter(k => !b.has(k));
    const reparented = [...b.keys()].filter(k => a.has(k) && a.get(k).parent !== b.get(k).parent);
    const rekeyed = [...b.keys()].filter(k => a.has(k) && a.get(k).key !== b.get(k).key);
    const problems = [];
    if (added.length > 1 && !P.multiChildDiff) problems.push({ what: '一步新增了多个节点', detail: added.join(',') });
    /* bulkDelete：这一页的删除语义就是"整棵子树摘掉"（文件系统删目录），
     * 所以一步少掉多个节点是意料之中，不是失控。 */
    if (removed.length > 1 && !P.bulkDelete && !P.multiChildDiff) problems.push({ what: '一步删除了多个节点', detail: removed.join(',') });
    const changes = added.length + removed.length + reparented.length + rekeyed.length;
    if (changes > P.maxChanges && !P.bulkDelete && !P.multiChildDiff) {
      problems.push({ what: '一步内结构变化过多', detail: `+${added.length} -${removed.length} 换父${reparented.length} 换键${rekeyed.length}` });
    }
    return { problems, added, removed, reparented, rekeyed, changes };
  }

  /* 结算帧：算法一次操作真正完成的那一帧，必须完全合法 */
  function checkSettled(nodes, opts) {
    return inspect(nodes, Object.assign({}, opts, { allowTransient: false })).problems;
  }

  return { inspect, diffFrames, checkSettled, DEFAULT_POLICY };
});
