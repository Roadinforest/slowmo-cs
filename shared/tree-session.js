/*!
 * 可操作的树 —— 会话基类（浏览器与 Node 共用）
 *
 * 四种树对外的接口不一样：BST/AVL 的 insert 是 (root, key) 并返回新根，
 * 红黑树与堆是 insert(key) 自己维护根。交互层不该知道这些差别，所以这里统一成：
 *
 *   session.insert(key) / search(key) / remove(key) / reset()
 *     → { kind, key, ok, entries }      entries = 这次操作的真实帧
 *   session.keys() / has(key) / size / height() / rootNode()
 *
 * 三个必须守住的点（都是踩过的坑）：
 *   1. 身份计数器在"造种子之前"复位。先造树再复位会让种子节点占住 1..n，
 *      而会话里的新节点又从 1 开始发号 —— 视图按 id 复用 DOM，撞号就画面错位。
 *   2. 会话内绝不复位计数器：上一帧的节点和这一帧的节点必须是同一个 id。
 *   3. 每次操作只清空"轨迹"，不清空树 —— 用户要看到树真的长大、真的变矮。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof globalThis !== 'undefined') globalThis.SlowMoTreeSession = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class TreeSession {
    /* opts.tree 是"怎么造一棵空树"，通常就是 () => new Algo.Tree() */
    constructor(opts) {
      const o = opts || {};
      this._make = o.tree;
      this.seed = (o.seed || []).slice();
      this._n = 0;
      this._rebuild();
    }

    _rebuild() {
      const tree = this._make();
      this.tree = tree;
      /* 计数器必须在造种子之前复位：见文件头的第 1 条 */
      if (typeof tree.resetIds === 'function') tree.resetIds();
      tree.tracing = false;
      this.seed.forEach(k => this._insertRaw(tree, k));
      tree.tracing = true;
      tree.entries.length = 0;
    }

    /* 两种调用约定：insert(root, key) 返回新根 / insert(key) 自己维护根。
     * 判据不能用 fn.length —— 有默认值的形参（红黑树是 insert(key, parent = null)）
     * 不计入 length，会被误判成单参数，于是把 key 当成 root 传进去，插入静默失效。
     * 改用"数第一个参数名"：形参名是 root/node 才算两参数约定。
     * 另外返回值必须接回 rootNode —— 丢掉返回值等于没插入。 */
    _twoArg(fn) { return /^\s*\(?\s*(root|node|n)\b/.test(String(fn).replace(/^[^(]*\(/, '(')); }
    _insertRaw(tree, key) {
      const next = this._twoArg(tree.insert) ? tree.insert(tree.rootNode, key) : tree.insert(key);
      /* 有返回值才回写：堆的 insert 自己维护数组，返回 undefined，
       * 无条件回写会把它的根写成 undefined（堆就空了）。 */
      if (next !== undefined) tree.rootNode = next;
    }
    _removeRaw(tree, key) {
      const next = this._twoArg(tree.remove) ? tree.remove(tree.rootNode, key) : tree.remove(key);
      if (next !== undefined && (next === null || typeof next === 'object')) tree.rootNode = next;
    }

    /* 查找同理：红黑树的 find 只看 key，BST/AVL 要 (root, key) */
    _find(tree, key) {
      if (typeof tree.find !== 'function') return null;
      return this._twoArg(tree.find) ? tree.find(tree.rootNode, key) : tree.find(key);
    }

    /* 会话对外的统一接口：rootNode() 返回"快照节点数组"（不是根节点本身）。
     * 别用 this.tree.root() —— 那是算法内部的根指针，堆那边还会每次现拼一棵视图树。 */
    rootNode() { return this.snapshot(); }
    snapshot() { return this.tree.snapshot(); }
    get size() { return this.keys().length; }

    reset() { this._rebuild(); this._n = 0; }

    _begin(zh, en) {
      this.tree.entries.length = 0;
      this.tree.mark(zh, en);
    }
    _done(kind, key, ok) {
      this._n++;
      return { kind, key, ok, op: this._n, entries: this.tree.entries.slice() };
    }

    /* 子类可以覆盖：每种结构"找得到吗"的代价不同 */
    has(key) { return this.keys().includes(key); }

    search(key) {
      this._begin(`查找 ${key}`, `Search ${key}`);
      const hit = this._find(this.tree, key);
      this.tree.mark(hit ? `${key} 在树里` : `${key} 不在树里`, hit ? `${key} is in the tree` : `${key} is not in the tree`);
      return this._done(hit ? 'search' : 'search-miss', key, !!hit);
    }

    insert(key) {
      this._begin(`插入 ${key}`, `Insert ${key}`);
      const existed = this.has(key);
      /* 已经存在就必须真的什么都不做 —— 只改文案、照样往下插，
       * 堆这种允许重复键的结构会悄悄多出一个元素（键集合被改坏，画面上看不出来）。 */
      this.tree.refused = null;
      if (!existed) this._insertRaw(this.tree, key);
      if (this.tree.refused) {
        this.tree.mark(this.tree.refused, this.tree.refused);
        return this._done('insert-refused', key, false);
      }
      this.tree.mark(existed ? `${key} 已经在树里，这次没有改动结构` : `${key} 插入完成`,
                     existed ? `${key} was already there; nothing changed` : `${key} inserted`);
      return this._done(existed ? 'insert-dup' : 'insert', key, true);
    }

    /* 堆这类结构支持"弹出最值"：不需要键。默认没有就报错，页面按钮据此决定要不要显示。 */
    supportsPop() { return typeof this.tree.pop === 'function'; }
    supportsPeek() { return typeof this.tree.peek === 'function'; }
    pop() {
      if (!this.supportsPop()) return null;
      this._begin('弹出最小值：堆顶就是它', 'Pop the minimum: it sits at the root');
      const empty = !this.tree.items || !this.tree.items.length;
      const top = this.tree.pop();
      this.tree.mark(empty ? '堆本来是空的' : `弹出 ${top}`, empty ? 'The heap was empty' : `Popped ${top}`);
      return this._done(empty ? 'delete-miss' : 'pop', top, !empty);
    }
    peek() {
      if (!this.supportsPeek()) return null;
      this._begin('读最小值', 'Read the minimum');
      const top = this.tree.peek();
      this.tree.mark(`最小值是 ${top}`, `The minimum is ${top}`);
      return this._done('peek', top, top != null);
    }

    remove(key) {
      this._begin(`删除 ${key}`, `Delete ${key}`);
      if (!this.has(key)) {
        this._find(this.tree, key);
        this.tree.mark(`${key} 不在树里，没有可删的东西`, `${key} is not in the tree, nothing to delete`);
        return this._done('delete-miss', key, false);
      }
      this.tree.refused = null;
      this._removeRaw(this.tree, key);
      /* 算法可以拒绝删除（比如"两个孩子"在下标表示里会挖出孤儿）。
       * 那种情况必须如实报告，不能让按钮说"删好了"而树没变。 */
      if (this.tree.refused) {
        this.tree.mark(this.tree.refused, this.tree.refused);
        return this._done('delete-refused', key, false);
      }
      this.tree.mark(`${key} 删除完成`, `${key} removed`);
      return this._done('delete', key, true);
    }
  }

  /* 二叉搜索类结构共用的中序遍历：键一律升序 */
  function inOrder(root, kids) {
    const out = [];
    (function walk(n) {
      if (!n) return;
      const ks = (kids(n) || []).filter(Boolean);
      walk(ks[0] || null);
      out.push(n.key);
      walk(ks[1] || null);
    })(root);
    return out;
  }

  return { TreeSession, inOrder };
});
