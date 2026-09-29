/*!
 * Binary heap — 真实实现
 *
 * 堆是"树 + 数组"两种真实表示同时存在的结构，所以这一页的看点不是形状，
 * 而是同一份数据在两个视图里互相对应 —— 数组下标 i 的父节点是 ⌊(i−1)/2⌋，
 * 两个孩子的下标是 2i+1 与 2i+2。
 *
 * 记录器在 shared/trace.js。节点身份用自增 id；index 会随上浮/下沉变化，
 * 所以它只能当展示字段（extras），不能当身份。
 */
(function (global) {
  'use strict';

  const Trace = (typeof require === 'function')
    ? require('../shared/trace.js').Trace
    : global.SlowMoTrace.Trace;

  let nextId = 1;
  class HeapNode {
    constructor(key) { this.id = nextId++; this.key = key; this.index = -1; }
  }

  class MinHeap extends Trace {
    constructor() { super(); this.items = []; this._root = null; }

    /* --- 交给记录器的接口 ------------------------------------------------ */
    /* 堆用数组存，树形只是它的读法：这里把数组拼成一棵只有指针的"视图树"，
     * 让 treeview.js 能用同一套布局去画。父指针由下标关系推出，不是另存一份。 */
    root() { this._root = this.items.length ? this._view(0) : null; return this._root; }
    kids(n) { return [n.left, n.right].filter(Boolean); }
    idx(n) { return n.id; }
    extras(n) { return { index: n.index }; }
    settle() { /* 堆没有需要结算的派生字段 */ }
    resetIds() { nextId = 1; }

    _view(i) {
      if (i >= this.items.length) return null;
      const it = this.items[i];
      it.index = i;
      const node = { id: it.id, key: it.key, index: i, left: null, right: null };
      node.left = this._view(2 * i + 1);
      node.right = this._view(2 * i + 2);
      return node;
    }

    /* 数组视图要的数据（按真实存储顺序） */
    arrayItems() { return this.items.map((it, i) => ({ name: it.id, key: it.key, index: i })); }

    /* --- 数组操作 -------------------------------------------------------- */
    _swap(i, j) {
      const t = this.items[i]; this.items[i] = this.items[j]; this.items[j] = t;
      this.items[i].index = i; this.items[j].index = j;
    }
    _parent(i) { return Math.floor((i - 1) / 2); }

    /* ------------------------------------------------------------------ 插入 */
    insert(key) {
      const node = new HeapNode(key);
      this.items.push(node);
      const i = this.items.length - 1;
      node.index = i;
      this._log(`${key} 追加到数组末尾（下标 ${i}）：形状仍是完全二叉树，但父子顺序可能被破坏`,
                `${key} is appended at index ${i}: the shape stays complete but heap order may be broken`, node.id,
                `末尾追加 ${key}`, `append ${key} at the end`);

      this._siftUpFrom(i);
      this.mark(`${key} 插入完成：堆顶是 ${this.items[0].key}，共 ${this.items.length} 个元素`,
                `${key} inserted: the root is ${this.items[0].key}, size ${this.items.length}`);
    }

    /* ------------------------------------------------------------------ 取最小 */
    peek() {
      if (!this.items.length) {
        this._log(`堆是空的，没有最值可取`, `The heap is empty, there is no minimum`, null,
                  `空堆`, `empty heap`);
        return null;
      }
      const top = this.items[0];
      this._log(`堆顶就是最小值 ${top.key}（下标 0），直接读，不用走任何路径`,
                `The root holds the minimum ${top.key} (index 0); read it directly, no path to walk`, top.id,
                `读堆顶 ${top.key}`, `read the root ${top.key}`);
      return top.key;
    }

    /* ------------------------------------------------------------------ 删除最小 */
    pop() {
      if (!this.items.length) {
        this._log(`堆是空的，没有可删的元素`, `The heap is empty, nothing to remove`, null,
                  `空堆`, `empty heap`);
        return null;
      }
      const top = this.items[0];
      this._log(`最小值 ${top.key} 在堆顶，准备移除它`, `The minimum ${top.key} sits at the root; remove it`, top.id,
                `移除堆顶 ${top.key}`, `remove the root ${top.key}`);

      const last = this.items.pop();
      if (!this.items.length) {
        this._log(`堆里只剩它一个，删掉就空了`, `It was the only element; the heap is now empty`, null,
                  `删空`, `now empty`);
        this.mark(`删除完成：堆为空`, `Removed: the heap is empty`);
        return top.key;
      }
      this.items[0] = last; last.index = 0;
      this._log(`把末尾的 ${last.key} 搬到堆顶：形状还是完全二叉树，但堆序坏了`,
                `Move the last element ${last.key} to the root: the shape stays complete but heap order is broken`, last.id,
                `末尾 ${last.key} 补到堆顶`, `last element ${last.key} moves to the root`);

      this._siftDown(0);

      this.mark(`删除完成：输出 ${top.key}，堆顶现在是 ${this.items[0].key}，共 ${this.items.length} 个元素`,
                `Removed: output ${top.key}; the root is now ${this.items[0].key}, size ${this.items.length}`);
      return top.key;
    }

    /* 上浮：只要比父小就换上去。插入用它，"删除任意元素"补位后也可能用它 */
    _siftUpFrom(i) {
      let cur = i;
      while (cur > 0) {
        const p = this._parent(cur);
        this._log(`比较 ${this.items[cur].key} 与父节点 ${this.items[p].key}（下标 ${p}）`,
                  `Compare ${this.items[cur].key} with its parent ${this.items[p].key} (index ${p})`, this.items[cur].id,
                  `与父节点比较`, `compare with the parent`);
        if (this.items[cur].key >= this.items[p].key) {
          this._log(`${this.items[cur].key} 不小于父节点，堆序已经满足，上浮停止`,
                    `${this.items[cur].key} is not smaller than its parent; heap order holds, stop`, this.items[cur].id,
                    `父更小，停止上浮`, `parent is smaller, stop`);
          break;
        }
        this._swap(cur, p);
        this._log(`${this.items[p].key} 与父节点交换：${this.items[p].key} 上浮到下标 ${p}`,
                  `Swap: ${this.items[p].key} sifts up to index ${p}`, this.items[p].id,
                  `交换，继续上浮`, `swap, keep sifting up`);
        cur = p;
      }
      return cur;
    }

    /* 下沉：每次和"更小的那个孩子"换。pop 用它，"删除任意元素"补位后也用它 */
    _siftDown(start) {
      /* 下沉：每次和"更小的那个孩子"换 */
      let cur = start;
      const n = this.items.length;
      while (true) {
        const l = 2 * cur + 1, r = 2 * cur + 2;
        let small = cur;
        if (l < n) {
          this._log(`比较 ${this.items[cur].key} 与左孩子 ${this.items[l].key}（下标 ${l}）`,
                    `Compare ${this.items[cur].key} with its left child ${this.items[l].key} (index ${l})`, this.items[cur].id,
                    `与左孩子比较`, `compare with the left child`);
          if (this.items[l].key < this.items[small].key) small = l;
        }
        if (r < n) {
          this._log(`比较 ${this.items[cur].key} 与右孩子 ${this.items[r].key}（下标 ${r}）`,
                    `Compare ${this.items[cur].key} with its right child ${this.items[r].key} (index ${r})`, this.items[cur].id,
                    `与右孩子比较`, `compare with the right child`);
          if (this.items[r].key < this.items[small].key) small = r;
        }
        if (small === cur) {
          this._log(`${this.items[cur].key} 比两个孩子都小，堆序恢复，下沉停止`,
                    `${this.items[cur].key} is smaller than both children; heap order is restored, stop`, this.items[cur].id,
                    `比孩子都小，停止下沉`, `smaller than both children, stop`);
          break;
        }
        this._swap(cur, small);
        this._log(`与更小的孩子 ${this.items[small].key} 交换：${this.items[small].key} 上浮一层，${this.items[cur].key} 继续下沉`,
                  `Swap with the smaller child: ${this.items[small].key} rises one level, ${this.items[cur].key} keeps sinking`, this.items[cur].id,
                  `与更小的孩子交换`, `swap with the smaller child`);
        cur = small;
      }
    }

    /* 从任意下标恢复堆序：删掉中间某个元素后，补上来的那个可能比父小（要上浮），
     * 也可能比孩子大（要下沉）。两种都试一遍，堆序一定回来。 */
    reheapify(i) {
      if (i < 0 || i >= this.items.length) return;
      const p = this._parent(i);
      if (i > 0 && this.items[i].key < this.items[p].key) this._siftUpFrom(i);
      else this._siftDown(i);
    }

    /* 建堆：从最后一个非叶节点往前逐个下沉（教材里的 O(n) 建堆） */
    buildFrom(keys) {
      this.items = [];
      keys.forEach(k => this.items.push(new HeapNode(k)));
      this.items.forEach((it, i) => { it.index = i; });
      this._log(`${keys.length} 个元素先按顺序摆成完全二叉树的形状，此时堆序还没建立`,
                `${keys.length} elements are laid out as a complete binary tree; heap order does not hold yet`, this.items[0].id,
                `先摆成完全二叉树`, `lay out as a complete tree`);
      for (let i = Math.floor(this.items.length / 2) - 1; i >= 0; i--) {
        let cur = i;
        const n = this.items.length;
        this._log(`从下标 ${i}（${this.items[i].key}）开始下沉`,
                  `Sift down from index ${i} (${this.items[i].key})`, this.items[i].id,
                  `处理下标 ${i}`, `sift down from ${i}`);
        while (true) {
          const l = 2 * cur + 1, r = 2 * cur + 2;
          let small = cur;
          if (l < n && this.items[l].key < this.items[small].key) small = l;
          if (r < n && this.items[r].key < this.items[small].key) small = r;
          if (small === cur) break;
          this._swap(cur, small);
          cur = small;
        }
      }
      this.mark(`建堆完成：堆顶是 ${this.items[0].key}`, `Heap built: root is ${this.items[0].key}`);
    }
  }

  /* =========================================================================
   * 演示脚本
   * ====================================================================== */
  const INSERT_KEYS = [5, 3, 8, 1, 9, 2];
  const SEED = [1, 3, 5, 7, 9, 6, 8];

  function seedHeap() {
    const heap = new MinHeap();
    heap.tracing = false;
    SEED.forEach(k => heap.insert(k));
    heap.tracing = true;
    heap.entries.length = 0;
    heap.resetIds();
    return heap;
  }

  function opInsert() {
    const heap = new MinHeap();
    INSERT_KEYS.forEach(k => heap.insert(k));
    return heap;
  }
  function opPeek() {
    const heap = seedHeap();
    heap.mark(`堆已就绪；直接读最值`, `Heap ready; read the minimum`);
    heap.peek();
    return heap;
  }
  function opPop() {
    const heap = seedHeap();
    heap.mark(`堆已就绪；准备删除最值`, `Heap ready; remove the minimum`);
    heap.pop();
    return heap;
  }

  const Base = (typeof require === 'function')
    ? require('../shared/tree-session.js').TreeSession
    : global.SlowMoTreeSession.TreeSession;

  /* 会话：堆是数组，所以查找是"扫一遍"（O(n)），删除是"按值删"（O(n)）。
   * 删除的做法：先把它和末尾元素对调，再把末尾弹掉，最后从那个位置下沉。
   * 只有"下沉结束"之后才记一帧 —— 中间态会让堆序短暂崩掉，不该画给读者看。 */
  class HeapSession extends Base {
    constructor(seed) { super({ tree: () => new MinHeap(), seed: seed || SEED }); }
    keys() { return this.tree.items.map(it => it.key); }
    has(key) { return this.tree.items.some(it => it.key === key); }
    height() { return Math.floor(Math.log2(this.tree.items.length + 1)); }
    /* 数组视图用的格子：名字是节点 id（身份），下标会随上浮/下沉变化 */
    arrayItems() { return this.tree.arrayItems(); }

    /* 堆的"查找"是逐格比较，不是走路径 */
    search(key) {
      this.tree.entries.length = 0;
      this.tree.mark(`查找 ${key}：堆只能逐个比较，没有可走的路径`, `Search ${key}: a heap has no search path, only a scan`);
      const i = this.tree.items.findIndex(it => it.key === key);
      if (i >= 0) {
        const node = this.tree.root() && this.tree.items[i];
        this.tree._log(`${key} 在下标 ${i}（比较了 ${i + 1} 格）`, `${key} sits at index ${i} (${i + 1} cells compared)`,
                       node ? node.id : null, `扫到了`, `found by scanning`);
        this.tree.mark(`${key} 在堆里`, `${key} is in the heap`);
        return this._done('search', key, true);
      }
      this.tree.mark(`${key} 不在堆里`, `${key} is not in the heap`);
      return this._done('search-miss', key, false);
    }

    /* 按值删除：与末尾对调，弹出末尾，再下沉 */
    remove(key) {
      const items = this.tree.items;
      this.tree.entries.length = 0;
      this.tree.mark(`删除 ${key}：先扫一遍找到它的下标`, `Delete ${key}: scan for its index first`);
      const i = items.findIndex(it => it.key === key);
      if (i < 0) {
        this.tree.mark(`${key} 不在堆里，没有可删的东西`, `${key} is not in the heap, nothing to delete`);
        return this._done('delete-miss', key, false);
      }
      const last = items.length - 1, lastKey = items[last].key;
      if (i !== last) {
        this.tree._swap(i, last);
        this.tree.items.pop();
        this.tree.items.forEach((it, k) => { it.index = k; });
        /* 只有"恢复堆序之后"才记帧：中间态是故意坏的，不该画给读者看 */
        this.tree._log(`把末尾的 ${lastKey} 换到下标 ${i} 并弹掉，再从那里恢复堆序`,
                       `The last element ${lastKey} takes index ${i} and the end is popped; heap order is restored from there`,
                       items.length ? items[Math.min(i, items.length - 1)].id : null,
                       `与末尾对调后恢复堆序`, `swap with the end, then restore heap order`);
        this.tree.reheapify(i);
      } else {
        this.tree.items.pop();
        this.tree.items.forEach((it, k) => { it.index = k; });
        this.tree._log(`${key} 就在末尾，直接弹掉，形状与堆序都还是好的`,
                       `${key} is the last cell; pop it directly, shape and order both survive`, null,
                       `末尾元素，直接弹掉`, `last cell: just pop it`);
      }
      this.tree.mark(`${key} 删除完成：共 ${this.tree.items.length} 个元素`, `${key} removed: size ${this.tree.items.length}`);
      return this._done('delete', key, true);
    }
  }

  const API = {
    MinHeap, HeapNode, SEED, INSERT_KEYS, Session: HeapSession,
    ops: { insert: opInsert, peek: opPeek, pop: opPop }
  };
  global.HeapTree = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
