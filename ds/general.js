/*!
 * 普通树 / 多叉树 —— 真实实现
 *
 * 这一页的模型是文件系统：每个节点有名字，孩子的顺序由"添加顺序"决定，
 * 没有排序、没有平衡 —— 这正是它和搜索树的分界线。
 *
 * 三个操作都留痕：
 *   查找  从根开始逐层找（这里走的是广度优先：先看同层的，再往下）
 *   插入  先确认同名不重复，再挂到指定父节点下
 *   删除  把整个子树摘掉（文件系统里删目录就是这个语义）
 *
 * 节点身份用自增 id（重名在"先创建再改名"的教学场景里会出现），名字只是标签。
 */
(function (global) {
  'use strict';

  const Trace = (typeof require === 'function')
    ? require('../shared/trace.js').Trace
    : global.SlowMoTrace.Trace;

  let nextId = 1;
  class GNode {
    constructor(name) { this.id = nextId++; this.key = name; this.children = []; }
  }

  class GeneralTree extends Trace {
    constructor() {
      super();
      this._root = null;
      this._parentOf = new Map();       // 孩子 id -> 父节点
    }

    /* --- 交给记录器的接口 ------------------------------------------------ */
    root() { return this._root; }
    kids(n) { return n.children; }
    static resetIds() { nextId = 1; }
    resetIds() { nextId = 1; }

    get rootNode() { return this._root; }
    set rootNode(v) { this._root = v; this._reindex(); }
    _reindex() {
      this._parentOf = new Map();
      const walk = (n, p) => { this._parentOf.set(n.id, p); n.children.forEach(c => walk(c, n)); };
      if (this._root) walk(this._root, null);
    }

    /* 广度优先找同名节点：普通树没有顺序，只能扫 */
    bfs(name) {
      if (!this._root) return null;
      const queue = [this._root];
      let seen = 0;
      while (queue.length) {
        const n = queue.shift();
        seen++;
        if (n.key === name) return { node: n, seen };
        queue.push(...n.children);
      }
      return { node: null, seen };
    }

    /* ------------------------------------------------------------------ 查找 */
    find(root, name) {
      if (!root) {
        this._log('树是空的，找不到任何东西', 'The tree is empty, there is nothing to find', null,
                  '空树', 'empty tree');
        return null;
      }
      const queue = [root];
      let seen = 0;
      while (queue.length) {
        const n = queue.shift();
        seen++;
        if (n.key === name) {
          this._log(`命中：${name} 在已看过的第 ${seen} 个节点上`, `Hit: ${name} is node ${seen} in scan order`, n.id,
                    `找到了`, `found it`);
          return n;
        }
        this._log(`不是它：${n.key}${n.children.length ? `，把 ${n.children.length} 个孩子排到队尾` : '（叶子）'}`,
                  `Not it: ${n.key}${n.children.length ? `, queue its ${n.children.length} children` : ' (a leaf)'}`, n.id,
                  `继续扫`, `keep scanning`);
        queue.push(...n.children);
      }
      this._log(`扫完全树都没有 ${name}：普通树没有排序，只能这样一个个看`,
                `Scanned the whole tree, no ${name}: an unordered tree leaves no shortcut`, null,
                `扫完了，没有`, `scanned everything, not found`);
      return null;
    }

    /* ------------------------------------------------------------------ 插入 */
    /* parent 为 null 时挂到根；根不存在时它成为根 */
    insert(root, name, parentName) {
      if (!root) {
        const fresh = new GNode(name);
        this._log(`${name} 成为这棵树的根`, `${name} becomes the root of this tree`, fresh.id,
                  `${name} 作根`, `${name} is the root`);
        return fresh;
      }
      this.refused = null;
      const hit = this.bfs(name);
      if (hit.node) {
        this._log(`${name} 已经存在（第 ${hit.seen} 个就扫到它），插入被忽略`,
                  `${name} already exists (found at scan position ${hit.seen}), insert ignored`, hit.node.id,
                  `同名节点已存在，跳过`, `a node with this name exists, skip`);
        return root;
      }
      let parent = null;
      if (parentName == null) {
        parent = root;
        this._log(`没有指定父节点，默认挂到根 ${root.key} 下面`,
                  `No parent given, so it hangs under the root ${root.key}`, root.id,
                  `挂到根下`, `hang it under the root`);
      } else {
        const ph = this.bfs(parentName);
        parent = ph.node;
        if (!parent) {
          this._log(`找不到父节点 ${parentName}，这次插入没有发生`,
                    `No parent named ${parentName}; nothing was inserted`, root.id,
                    `父节点不存在，放弃`, `the parent does not exist, give up`);
          this.refused = `找不到父节点 ${parentName}`;
          return root;
        }
        this._log(`父节点 ${parentName} 已经找到，${name} 将作为它的第 ${parent.children.length + 1} 个孩子`,
                  `Parent ${parentName} is found; ${name} becomes its child number ${parent.children.length + 1}`, parent.id,
                  `挂到 ${parentName} 下`, `hang it under ${parentName}`);
      }
      const fresh = new GNode(name);
      parent.children.push(fresh);
      this._parentOf.set(fresh.id, parent);
      this._log(`${name} 挂好了：它是 ${parent.key} 的孩子（孩子数 ${parent.children.length}），自己还没有孩子`,
                `${name} is attached as a child of ${parent.key} (now ${parent.children.length} children); it has none yet`, fresh.id,
                `挂上了，${name} 是叶子`, `attached; ${name} is a leaf`);
      return root;
    }

    /* ------------------------------------------------------------------ 删除 */
    /* 删掉整棵子树（文件系统里删目录就是这个语义） */
    remove(root, name) {
      if (!root) {
        this._log('树是空的，没有可删的东西', 'The tree is empty, nothing to delete', null,
                  '空树', 'empty tree');
        return root;
      }
      this.refused = null;
      if (root.key === name) {
        this._log(`${name} 就是根：整棵树都跟着消失`, `${name} is the root: the whole tree goes with it`, root.id,
                  `删根＝清空`, `removing the root empties the tree`);
        this._parentOf = new Map();
        return null;
      }
      const found = this._findParent(root, name);
      if (!found) {
        this._log(`${name} 不在这棵树里`, `${name} is not in this tree`, null,
                  `不在这里`, `not in this tree`);
        return root;
      }
      const { parent, node, index } = found;
      const count = this._subtreeSize(node);
      this._log(`${name} 是 ${parent.key} 的第 ${index + 1} 个孩子；它的子树一共 ${count} 个节点`,
                `${name} is child ${index + 1} of ${parent.key}; its subtree holds ${count} nodes`, node.id,
                `找到要删的子树`, `found the subtree to delete`);
      parent.children.splice(index, 1);
      this._parentOf.delete(node.id);
      this._log(`${name} 整棵摘掉了：${parent.key} 现在有 ${parent.children.length} 个孩子`,
                `${name} is unlinked: ${parent.key} now has ${parent.children.length} children`, parent.id,
                `整棵子树摘掉`, `the whole subtree is unlinked`);
      return root;
    }

    _findParent(node, name) {
      for (let i = 0; i < node.children.length; i++) {
        const c = node.children[i];
        if (c.key === name) return { parent: node, node: c, index: i };
        const deep = this._findParent(c, name);
        if (deep) return deep;
      }
      return null;
    }
    _subtreeSize(n) { return 1 + n.children.reduce((a, c) => a + this._subtreeSize(c), 0); }
  }

  /* =========================================================================
   * 演示脚本
   * ====================================================================== */
  const SEED = ['项目', '文档', '素材', '报告.pdf', '新文件', '测试', '音乐', '封面.png'];
  /* 种子：项目/{文档/{报告.pdf,新文件,测试}, 素材/{音乐,封面.png}} */

  function buildSeed(tree) {
    tree.tracing = false;
    tree.rootNode = tree.insert(tree.rootNode, '项目', null);
    tree.rootNode = tree.insert(tree.rootNode, '文档', '项目');
    tree.rootNode = tree.insert(tree.rootNode, '素材', '项目');
    tree.rootNode = tree.insert(tree.rootNode, '报告.pdf', '文档');
    tree.rootNode = tree.insert(tree.rootNode, '新文件', '文档');
    tree.rootNode = tree.insert(tree.rootNode, '测试', '文档');
    tree.rootNode = tree.insert(tree.rootNode, '音乐', '素材');
    tree.rootNode = tree.insert(tree.rootNode, '封面.png', '素材');
    tree.tracing = true;
    tree.entries.length = 0;
    return tree;
  }

  function opInsert(name, parent) {
    const tree = new GeneralTree();
    buildSeed(tree);
    tree.mark('树已就绪', 'Tree ready');
    tree.rootNode = tree.insert(tree.rootNode, name, parent);
    tree.mark(`${name} 插入完成`, `${name} inserted`);
    return tree;
  }
  function opSearch(name) {
    const tree = new GeneralTree();
    buildSeed(tree);
    tree.mark('树已就绪', 'Tree ready');
    tree.find(tree.rootNode, name);
    return tree;
  }
  function opDelete(name) {
    const tree = new GeneralTree();
    buildSeed(tree);
    tree.mark('树已就绪', 'Tree ready');
    tree.rootNode = tree.remove(tree.rootNode, name);
    tree.mark(`${name} 删除完成`, `${name} removed`);
    return tree;
  }

  const Base = (typeof require === 'function')
    ? require('../shared/tree-session.js').TreeSession
    : global.SlowMoTreeSession.TreeSession;

  /* 会话：文件树。名字就是键（文本键），同名不允许重复。 */
  class GeneralSession extends Base {
    constructor(seed) { super({ tree: () => new GeneralTree(), seed: [] }); }
    /* 种子不是"一串键"，而是一棵具体的目录树，所以自己实现重建 */
    _rebuild() {
      const tree = this._make();
      this.tree = tree;
      tree.resetIds();
      tree.tracing = false;
      if (this.seedTree !== false) buildSeed(tree);
      tree.tracing = true;
      tree.entries.length = 0;
    }
    keys() { const out = []; (function w(n) { if (!n) return; out.push(n.key); n.children.forEach(w); })(this.tree.rootNode); return out; }
    has(name) { return !!this.tree.bfs(name).node; }
    height() { const h = n => (n ? 1 + Math.max(0, ...n.children.map(h)) : 0); return h(this.tree.rootNode); }
    /* 插入时需要指定父节点：默认挂到根下面 */
    insert(name, parent) {
      if (typeof name === 'object' && name) { parent = name.parent; name = name.name; }
      if (!name) return null;
      this.tree.entries.length = 0;
      this.tree.mark(`插入 ${name}${parent ? '（父节点 ' + parent + '）' : '（挂到根下）'}`,
                     `Insert ${name}${parent ? ' under ' + parent : ' under the root'}`);
      this.tree.rootNode = this.tree.insert(this.tree.rootNode, name, parent || this.tree.rootNode.key);
      this.tree.mark(`${name} 插入完成`, `${name} inserted`);
      this._n++;
      return { kind: 'insert', key: name, ok: true, op: this._n, entries: this.tree.entries.slice() };
    }
    remove(name) {
      this.tree.entries.length = 0;
      this.tree.mark(`删除 ${name}：整棵子树一起摘掉`, `Delete ${name}: its whole subtree goes with it`);
      const existed = this.has(name);
      this.tree.rootNode = this.tree.remove(this.tree.rootNode, name);
      this.tree.mark(existed ? `${name} 删除完成` : `${name} 不在这棵树里`, existed ? `${name} removed` : `${name} is not in this tree`);
      this._n++;
      return { kind: existed ? 'delete' : 'delete-miss', key: name, ok: existed, op: this._n, entries: this.tree.entries.slice() };
    }
    reset() { this._rebuild(); this._n = 0; }
  }

  const API = {
    GeneralTree, GNode, SEED,
    ops: { insert: opInsert, search: opSearch, delete: opDelete },
    Session: GeneralSession
  };
  global.GeneralTree = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
