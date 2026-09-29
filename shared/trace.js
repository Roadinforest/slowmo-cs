/*!
 * Slow-Mo CS — 轨迹记录器
 *
 * 一个算法想被"一步一步看"，只需要做两件事：
 *   1. extends Trace（或 new Trace() 后当 mixin 用）
 *   2. 在每个"值得停一下"的位置调用 this._log(...)
 *
 * 记录器负责：
 *   · 行号：从调用栈取，不维护数字常量（见下面 callerLine 的注释）
 *   · 快照：每次记录前做一次 settle()，再把结构压成可传输的数组
 *   · 旁白：双语 text 与一句话 act
 *   · 焦点：此刻在看哪个节点（节点 id）
 *
 * 快照只要求节点暴露 { id, key, parent, children?, height? }。
 * 树、堆、图都能用；结构特有的部分由子类提供：
 *
 *   class MyAlgo extends Trace {
 *     root()   { return this._root }              // 从哪开始
 *     node(id) { ... }                            // 按 id 找节点
 *     idx(n)   { return n.id }                    // 快照里的身份字段
 *     kids(n)  { return [n.left, n.right] }       // 孩子（顺序随意）
 *     settle() { ... }                            // 拍快照前把派生字段算对
 *   }
 *
 * 历史上这一层踩过的坑：V8 会把"取行号"的助手函数内联，于是按函数名过滤栈帧
 * 不稳定 —— 有时栈里出现助手、有时直接是 _log 自己，结果每帧都指向同一行。
 * 现在用 Error.captureStackTrace(err, fn)，它专门用来排除某函数及其上层，不受内联影响。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.SlowMoTrace = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const pair = (zh, en) => [zh, en];

  /* 调用点的真实行号。fn 传"想要排除的最上层函数"（通常就是记录函数自己）。 */
  function callerLine(fn) {
    if (typeof Error.captureStackTrace === 'function') {
      const holder = {};
      Error.captureStackTrace(holder, fn);
      const frames = (holder.stack || '').split('\n');
      for (let i = 1; i < frames.length; i++) {
        const m = /:(\d+):\d+\)?\s*$/.exec(frames[i]);
        if (m) return Number(m[1]);
      }
      return null;
    }
    /* 没有这个 API 的引擎：退回到正则解析，最坏情况下行号不准，不影响算法 */
    const st = new Error().stack || '';
    const m = /:([0-9]+):[0-9]+/.exec(st);
    return m ? Number(m[1]) : null;
  }

  /* 括号感知的参数计数：用来判断 pendingKey 有没有传 */
  function arity(fn, max) {
    const s = String(fn);
    const open = s.indexOf('(');
    if (open < 0) return 0;
    let depth = 0, n = 1, i = open + 1;
    for (; i < s.length; i++) {
      const c = s[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' && depth === 0) break;
      else if (c === ')' || c === ']' || c === '}') depth--;
      else if (c === ',' && depth === 0) n++;
    }
    return n;
  }

  class Trace {
    constructor(opts) {
      const o = opts || {};
      this.entries = [];
      this._opts = o;
      this._logging = false;
      this.tracing = true;          // 置 false 则 _log 不记录（用于静默造种子树）
      /* 记录调用点的参数个数，用来区分"没传 pendingKey"和"显式传了 undefined" */
      this._logArity = arity(this._log.bind(this), 6);
      this._reset();
    }

    /* --- 子类可覆盖 ------------------------------------------------------ */
    root() { return null; }                 // 快照的起点
    node() { return null; }                 // 按 id 找节点
    kids() { return []; }                   // 节点的孩子（顺序随意）
    idx(n) { return n.id; }                 // 快照里的身份字段
    settle() {}                             // 拍快照前把派生字段算对
    /* -------------------------------------------------------------------- */

    /* 每个主题的演示脚本通常按顺序跑多个操作，身份计数器在每次开始时复位，
     * 这样同一段脚本永远得到同一批 id（截图对比、分享链接都依赖这点）。 */
    _reset() { if (typeof this.constructor.resetIds === 'function') this.constructor.resetIds(); }

    _find(n, id) {
      if (!n) return null;
      if (this.idx(n) === id) return n;
      for (const c of this.kids(n) || []) {
        const hit = this._find(c, id);
        if (hit) return hit;
      }
      return null;
    }

    /* 把真实结构压成可传输的数组。父指针用身份字段，不用 key ——
     * key 会在删除时被后继顶替，那一刻树里会短暂出现两个相同 key。 */
    snapshotNode(n, parentId, out) {
      const extra = this.extras ? this.extras(n) : null;
      out.push(Object.assign({ id: this.idx(n), key: n.key, parent: parentId, height: n.height }, extra));
      for (const c of this.kids(n) || []) if (c) this.snapshotNode(c, this.idx(n), out);
    }
    snapshot() {
      const out = [];
      const r = this.root();
      if (r) this.snapshotNode(r, null, out);
      return out;
    }

    /* 记一步。
     *   zh/en      这一帧的说明（双语）
     *   focus      此刻在看哪个节点（id）
     *   doZh/doEn  一句话：这一步在干什么（页面右栏直接显示）
     *   pendingKey 焦点尚未创建时，它就是那个键
     * 最后两个参数可省略。 */
    _log(zh, en, focus, doZh, doEn, pendingKey) {
      if (!this.tracing) return;                 // 静默模式
      if (this._logging) return;                 // 防重入
      this._logging = true;
      try {
        const line = callerLine(this._log);
        const focusNode = focus != null ? this._find(this.root(), focus) : null;

        /* 拍快照前先把派生字段算对：回溯途中父节点的高度会短暂落后于结构，
         * 原样拍下来就会出现"图是新的、高度是旧的"。算法本身照样在回溯时重算，
         * 这里只是让它先于快照发生。 */
        this.settle();

        /* 旁白里的 bf 用结算后的真实值，和画面角标一致
         * （否则会出现"图上写 bf +2、文字说 bf=+1"这种自相矛盾） */
        if (typeof doZh === 'string' && zh.indexOf('bf=') >= 0 && focusNode && typeof focusNode.bf === 'number') {
          const v = (focusNode.bf > 0 ? '+' : '') + focusNode.bf;
          zh = zh.replace(/bf=[+-]?\d+/g, 'bf=' + v);
          en = en.replace(/bf=[+-]?\d+/g, 'bf=' + v);
        }

        this.entries.push({
          line,
          text: pair(zh, en),
          act: doZh == null ? null : pair(doZh, doEn),
          focus: focus == null ? null : focus,
          pendingKey: pendingKey == null ? null : pendingKey,
          nodes: this.snapshot()
        });
      } finally {
        this._logging = false;
      }
    }

    /* 操作之间的"汇总帧"：没有对应的代码行，用来显示"这一步做完了"和最终状态 */
    mark(zh, en) {
      if (!this.tracing) return this;
      this.settle();
      const r = this.root();
      const line = callerLine(this.mark);
      this.entries.push({
        line: null,
        text: pair(zh, en),
        act: null,
        focus: r ? this.idx(r) : null,
        pendingKey: null,
        nodes: this.snapshot()
      });
      return this;
    }
  }

  return { Trace, callerLine, pair, arity };
});
