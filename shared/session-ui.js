/*!
 * 交互层：让树真的能被操作
 *
 * 四种树（AVL / 红黑树 / 堆 / BST…）需要的交互是同一件事：
 *   输入一个键 → 跑一次真实算法 → 把这次操作的帧接到轨迹尾部 → 逐帧看
 * 所以这一层不碰任何算法细节，只跟一个"会话"打交道：
 *
 *   session.insert(key) / search(key) / remove(key) / reset()
 *     → { kind, key, ok, entries }   entries 就是这次操作的真实帧
 *
 * 帧不清空：读者点"上一帧"能退回上一次操作，时间线上也看得见刚才做了什么。
 * 会话内部保留树本身，所以树会真的长大、真的变矮。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.SlowMoSessionUI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const OPNAME = {
    insert: ['插入', 'Insert'], 'insert-dup': ['已存在', 'already there'],
    search: ['查找', 'Search'], 'search-miss': ['查找', 'Search'],
    delete: ['删除', 'Delete'], 'delete-miss': ['删除', 'Delete'],
    'delete-refused': ['删除被拒绝', 'delete refused'],
    'insert-refused': ['插入未发生', 'insert not done'],
    pop: ['弹出', 'Pop'], peek: ['读最小值', 'Peek']
  };
  const OPHINT = {
    insert: ['跳到这次插入', 'jump to this insert'],
    'insert-dup': ['跳到这次操作', 'jump to this operation'],
    search: ['跳到这次查找', 'jump to this search'],
    'search-miss': ['跳到这次查找', 'jump to this search'],
    delete: ['跳到这次删除', 'jump to this delete'],
    'delete-miss': ['跳到这次删除', 'jump to this delete'],
    'delete-refused': ['跳到这次删除（被拒绝）', 'jump to this refused delete'],
    'insert-refused': ['跳到这次插入（未发生）', 'jump to this refused insert'],
    pop: ['跳到这次弹出', 'jump to this pop'],
    peek: ['跳到这次读值', 'jump to this peek']
  };

  function mount(cfg) {
    const el = cfg.el;
    const session = cfg.session;
    const label = cfg.label || (x => x);
    const stepper = cfg.stepper;
    const chips = cfg.chips || null;
    const readyText = cfg.readyText || ['树已就绪', 'Tree ready'];

    let steps = [];
    let ops = [];          /* 每次操作：{ kind, key, ok, from, count } */
    let last = null;
    let firstFrameOfOp = -1;   /* 最后一次操作的起始帧；-1 = 还没有操作 */

    function readyFrame() {
      const nodes = session.rootNode();
      return { text: label(readyText), act: null, focus: nodes && nodes.length ? nodes[0].id : null, nodes };
    }

    function syncStepper(goTo) {
      stepper.length = Math.max(1, steps.length);
      if (goTo != null) { stepper.pause(); stepper.go(goTo); }
      else stepper.go(Math.min(stepper.index, Math.max(0, steps.length - 1)));
    }

    /* --- 一次操作 --- */
    function run(action, key) {
      if (key == null) return null;
      if (typeof key === 'number' && !Number.isFinite(key)) return null;
      const fn = session[action];
      if (typeof fn !== 'function') return null;
      const res = fn.call(session, key);
      if (!res || !res.entries || !res.entries.length) return null;

      const from = steps.length;
      res.entries.forEach(e => steps.push({ text: e.text, act: e.act, focus: e.focus, nodes: e.nodes }));
      const op = { kind: res.kind, key: res.key, ok: res.ok, from, count: res.entries.length };
      ops.push(op);
      last = op;
      firstFrameOfOp = from;
      renderTimeline();
      syncStepper(from);
      return res;
    }

    function reset() {
      if (typeof session.reset === 'function') session.reset();
      steps = [readyFrame()];
      ops = [];
      last = null;
      firstFrameOfOp = -1;
      renderTimeline();
      syncStepper(0);
    }

    /* 初始：只显示当前这棵树 */
    function init() {
      steps = [readyFrame()];
      renderTimeline();
      syncStepper(0);
    }

    /* --- 时间线：一行一次操作，行内是这次操作的帧 --- */
    function renderTimeline() {
      const box = el('timeline');
      if (!box) return;
      box.innerHTML = '';
      if (!ops.length) {
        const hint = document.createElement('span');
        hint.className = 'tl-idle';
        hint.textContent = label(cfg.idleText || ['在上面输入一个键，或直接点树上的节点', 'Type a key above, or click a node in the tree']);
        box.appendChild(hint);
        return;
      }
      ops.forEach(op => {
        const row = document.createElement('div');
        row.className = 'tl-op';

        const head = document.createElement('button');
        head.className = 'tl-head' + (op === last ? ' on' : '') + (op.ok ? '' : ' miss');
        head.textContent = label(OPNAME[op.kind] || [op.kind, op.kind]) + ' ' + op.key + (op.ok ? '' : ' ✗');
        head.title = label(OPHINT[op.kind] || ['跳到这次操作', 'jump to this operation']);
        head.onclick = () => { stepper.pause(); stepper.go(op.from); };
        row.appendChild(head);

        for (let i = 0; i < op.count; i++) {
          const b = document.createElement('button');
          b.className = 'tl-frame';
          b.textContent = String(i + 1);
          b.setAttribute('data-at', String(op.from + i));
          b.onclick = () => { stepper.pause(); stepper.go(op.from + i); };
          row.appendChild(b);
        }
        box.appendChild(row);
      });
      box.scrollTop = box.scrollHeight;
      mark(stepper.index);
    }

    /* 当前帧高亮：只动 class，不重建 DOM */
    function mark(i) {
      if (chips && chips.mark) chips.mark(firstFrameOfOp);
      const box = el('timeline');
      if (!box) return;
      [...box.querySelectorAll('.tl-frame')].forEach(b => {
        const at = Number(b.getAttribute('data-at'));
        b.className = 'tl-frame' + (at === i ? ' on' : '') + (at < i ? ' done' : '');
      });
      [...box.querySelectorAll('.tl-op')].forEach((row, oi) => {
        const op = ops[oi];
        if (op) row.classList.toggle('live', i >= op.from && i < op.from + op.count);
      });
    }

    return {
      init, run, reset, render: renderTimeline, mark,
      get steps() { return steps; },
      get ops() { return ops; },
      get last() { return last; },
      get firstFrameOfOp() { return firstFrameOfOp; },
      state: () => ({
        frames: steps.length, ops: ops.length, index: stepper.index,
        keys: session.keys(), size: session.size, last: last && last.kind
      })
    };
  }

  return { mount, OPNAME };
});
