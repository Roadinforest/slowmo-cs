/*!
 * 二叉树（层序数组表示）—— 真实实现
 *
 * 这一页讲的是"二叉树"本身，不是搜索树：左右是位置，不是大小关系。
 * 所以它用教材里那种层序数组：下标 i 的左孩子是 2i+1、右孩子是 2i+2，
 * 插入找"第一个空位"，删除只允许摘叶子或者让独子顶上 —— 中间挖洞会让下标关系断掉。
 *
 * 形状不变量（满二叉树之外不许有洞）由算法自己守：每次插入都取层序最浅的空位。
 */
(function (global) {
  'use strict';

  const Trace = (typeof require === 'function')
    ? require('../shared/trace.js').Trace
    : global.SlowMoTrace.Trace;

  let nextId = 1;
  class BNode {
    constructor(key) { this.id = nextId++; this.key = key; this.left = null; this.right = null; }
  }

  class BinaryTree extends Trace {
    constructor() {
      super();
      this._root = null;
      this.slots = [];            // 层序格子：null 表示空位
    }

    /* --- 交给记录器的接口 ------------------------------------------------ */
    root() { this._sync(); return this._root; }
    kids(n) { return [n.left, n.right].filter(Boolean); }
    static resetIds() { nextId = 1; }
    resetIds() { nextId = 1; }

    get rootNode() { return this._root; }
    set rootNode(v) { this._root = v; this._sync(); }

    /* 层序数组 → 指针树。下标关系是唯一的事实来源，指针只是它的读法。 */
    _sync() {
      this.slots.forEach(n => { if (n) { n.left = null; n.right = null; } });
      for (let i = 0; i < this.slots.length; i++) {
        const n = this.slots[i];
        if (!n) continue;
        const l = this.slots[2 * i + 1], r = this.slots[2 * i + 2];
        n.left = l || null;
        n.right = r || null;
      }
      this._root = this.slots[0] || null;
    }

    /* 层序最浅的空位：先上后下、先左后右 —— 这就是"按层序插入" */
    firstFree() {
      for (let i = 0; i < this.slots.length; i++) if (!this.slots[i]) return i;
      return this.slots.length;
    }

    /* ------------------------------------------------------------------ 插入 */
    insert(root, key) {
      const at = this.firstFree();
      const fresh = new BNode(key);
      const depth = Math.floor(Math.log2(at + 1));
      this._log(`先按层序找空位：下标 ${at} 是层序里第一个空位（第 ${depth + 1} 层）`,
                `Find the slot in level order: index ${at} is the first empty one (level ${depth + 1})`, null,
                `层序第一个空位：下标 ${at}`, `first empty slot in level order: index ${at}`, key);
      if (at > 0) {
        const p = Math.floor((at - 1) / 2);
        const side = at % 2 === 1 ? '左' : '右';
        if (!this.slots[p]) {
          this._log(`下标 ${p} 的父位置还是空的，${key} 不能挂过去（那会变成孤儿）`,
                    `Index ${p} is empty, so ${key} cannot hang there (it would be an orphan)`, null,
                    `父位置是空的，插入取消`, `the parent slot is empty, insert cancelled`, key);
          return root;
        }
        this._log(`它的父节点在下标 ${p}（${this.slots[p].key}），${key} 成为它的${side}孩子`,
                  `Its parent sits at index ${p} (${this.slots[p].key}); ${key} becomes its ${side} child`,
                  this.slots[p].id, `挂到 ${this.slots[p].key} 的${side}边`, `attach as the ${side} child of ${this.slots[p].key}`);
      } else {
        this._log(`${key} 落在下标 0：它是这棵树的根`,
                  `${key} lands at index 0: it is the root of the tree`, fresh.id,
                  `${key} 作根`, `${key} is the root`);
      }
      this.slots[at] = fresh;
      this._sync();
      this._log(`接好了：层序数组现在是 [${this._slotsText()}]`,
                `Linked: the level-order array is now [${this._slotsText()}]`, fresh.id,
                `接进数组，形状仍是"上面满、下面从左往右"`, `linked; the shape stays complete from the top left`);
      return this._root;
    }

    /* ------------------------------------------------------------------ 查找 */
    find(root, key) {
      let seen = 0;
      for (let i = 0; i < this.slots.length; i++) {
        const n = this.slots[i];
        if (!n) continue;
        seen++;
        if (n.key === key) {
          this._log(`命中：${key} 在下标 ${i}（第 ${seen} 个非空格子）`,
                    `Hit: ${key} sits at index ${i} (${seen}th filled cell)`, n.id,
                    `找到了`, `found it`);
          return n;
        }
        this._log(`${n.key} 不是 ${key}：二叉树没有"往哪边走"的依据，只能继续扫`,
                  `${n.key} is not ${key}: a plain binary tree gives no direction to choose, keep scanning`, n.id,
                  `继续扫下一个格子`, `keep scanning`);
      }
      this._log(`${key} 不在树里（扫了 ${seen} 个节点）`, `${key} is not in the tree (${seen} nodes scanned)`, null,
                `扫完了，没有`, `scanned everything, not found`);
      return null;
    }

    /* ------------------------------------------------------------------ 删除 */
    remove(root, key) {
      this.refused = null;
      const i = this.slots.findIndex(n => n && n.key === key);
      if (i < 0) {
        this._log(`${key} 不在这棵树里`, `${key} is not in this tree`, null,
                  `不在这里`, `not in this tree`);
        return root;
      }
      const node = this.slots[i];
      const l = this.slots[2 * i + 1], r = this.slots[2 * i + 2];
      this._log(`${key} 在下标 ${i}，孩子情况：${l ? '有左孩子 ' + l.key : '没有左孩子'}、${r ? '有右孩子 ' + r.key : '没有右孩子'}`,
                `${key} sits at index ${i}: ${l ? 'left child ' + l.key : 'no left child'}, ${r ? 'right child ' + r.key : 'no right child'}`,
                node.id, `先看它有几个孩子`, `check how many children it has`);
      if (l && r) {
        this._log(`${key} 有两个孩子：直接摘掉会让下标关系断掉（那些孩子会变成孤儿），这一页不做这种删除`,
                  `${key} has two children: unlinking it would break the index relation and orphan them, so this page refuses`,
                  node.id, `两个孩子：拒绝删除`, `two children: refuse to delete`);
        this.refused = `${key} 有两个孩子`;
        return root;
      }
      const only = l || r;
      this.slots[i] = only || null;
      if (only) {
        const oldIndex = this.slots.indexOf(only);
        this._log(`把独子 ${only.key} 从下标 ${oldIndex} 挪到下标 ${i}，顶替父节点的位置`,
                  `Move the only child ${only.key} from index ${oldIndex} to index ${i}, taking its parent's place`,
                  only.id, `独子顶上`, `the only child moves up`);
      } else {
        /* 这一帧之后它就不在树里了，焦点只能给"正在被清掉的格子"，
         * 不能再指向那个节点（契约要求 focus 指向存在的节点或给出 pendingKey）。 */
        this._log(`${key} 是叶子：直接把下标 ${i} 清空`, `${key} is a leaf: clear index ${i}`, null,
                  `叶子：清空这个格子`, `leaf: clear the cell`, key);
      }
      this._shrink();
      this._sync();
      this._log(`删好了：层序数组现在是 [${this._slotsText()}]`,
                `Done: the level-order array is now [${this._slotsText()}]`, null,
                `形状仍然完整`, `the shape stays complete`);
      return this._root;
    }

    /* 去掉尾部连续的空格：层序数组不该留着尾巴上的洞 */
    _shrink() { while (this.slots.length && !this.slots[this.slots.length - 1]) this.slots.pop(); }
    _slotsText() { return this.slots.map(n => (n ? n.key : '空')).join(' '); }
  }

  /* =========================================================================
   * 演示脚本：SEED 是满的一层（1 2 3 4 5 6 7），插入会落到第 4 层最左边
   * ====================================================================== */
  const SEED = [1, 2, 3, 4, 5, 6, 7];

  function buildSeed(tree) {
    tree.tracing = false;
    SEED.forEach(k => { tree.rootNode = tree.insert(tree.rootNode, k); });
    tree.tracing = true;
    tree.entries.length = 0;
    return tree;
  }
  function opInsert(keys) {
    const tree = buildSeed(new BinaryTree());
    tree.mark('树已就绪：1..7 正好铺满三层', 'Tree ready: 1..7 fill exactly three levels');
    (keys || [8, 9]).forEach(k => { tree.rootNode = tree.insert(tree.rootNode, k); });
    return tree;
  }
  function opSearch(key) {
    const tree = buildSeed(new BinaryTree());
    tree.mark('树已就绪', 'Tree ready');
    tree.find(tree.rootNode, key === undefined ? 5 : key);
    return tree;
  }
  function opDelete(key) {
    const tree = buildSeed(new BinaryTree());
    tree.mark('树已就绪', 'Tree ready');
    tree.rootNode = tree.remove(tree.rootNode, key === undefined ? 7 : key);
    return tree;
  }

  const Base = (typeof require === 'function')
    ? require('../shared/tree-session.js').TreeSession
    : global.SlowMoTreeSession.TreeSession;

  class BinarySession extends Base {
    constructor(seed) { super({ tree: () => new BinaryTree(), seed: seed || SEED }); }
    keys() { return this.tree.slots.map(n => n && n.key).filter(v => v != null); }
    has(key) { return this.tree.slots.some(n => n && n.key === key); }
    height() { return this.tree.slots.length ? Math.floor(Math.log2(this.tree.slots.length)) + 1 : 0; }
  }

  const API = {
    BinaryTree, BNode, SEED,
    ops: { insert: opInsert, search: opSearch, delete: opDelete },
    Session: BinarySession
  };
  global.BinaryTreePage = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
