/*!
 * AVL tree — 真实实现
 *
 * 这个文件里只有算法：真实指针、真实旋转、真实高度。
 * 它不知道 SVG、不知道 DOM、不知道"步骤按钮"。
 * "每走一步记一帧"由 shared/trace.js 的记录器负责 —— 算法只管调 this._log(...)。
 *
 * 节点身份用自增 id，不用 key：删除时会把后继的 key 复制到目标节点上，
 * 那一刻树里会短暂出现两个相同 key，用 key 当身份就会撞成环。
 */
(function (global) {
  'use strict';

  const Trace = (typeof require === 'function')
    ? require('../shared/trace.js').Trace          // node / tools
    : global.SlowMoTrace.Trace;                    // 浏览器

  const h = n => (n ? n.height : 0);
  const fmt = n => (n > 0 ? '+' : '') + n;
  const minNode = n => { while (n && n.left) n = n.left; return n; };

  let nextId = 1;
  class AVLNode {
    constructor(key) { this.id = nextId++; this.key = key; this.left = null; this.right = null; this.height = 1; }
    get bf() { return h(this.left) - h(this.right); }
  }

  class AVL extends Trace {
    constructor() {
      super();
      this._root = null;
    }

    /* --- 交给记录器的接口 ------------------------------------------------ */
    root() { return this._root; }
    kids(n) { return [n.left, n.right]; }
    /* 拍快照前把高度结算成与结构一致：回溯途中父节点的 height 会短暂落后于结构，
     * 原样拍下来画面上就会出现"图是新的、高度是旧的"。结算本来就属于这个算法，
     * 这里只是让它先于快照发生；"重算高度"那一步的旁白照旧。 */
    settle() { this._settle(this._root); }
    _settle(n) {
      if (!n) return 0;
      n.height = 1 + Math.max(this._settle(n.left), this._settle(n.right));
      return n.height;
    }
    static resetIds() { nextId = 1; }
    /* 每次操作从这里开始时复位身份计数器，同一段脚本永远得到同一批 id */
    resetIds() { nextId = 1; }

    get rootNode() { return this._root; }
    set rootNode(v) { this._root = v; }

    /* ------------------------------------------------------------------ 旋转 */
    rotateRight(y) {
      const x = y.left, t2 = x.right;
      x.right = y; y.left = t2;
      y.height = 1 + Math.max(h(y.left), h(y.right));
      x.height = 1 + Math.max(h(x.left), h(x.right));
      return x;
    }

    rotateLeft(x) {
      const y = x.right, t2 = y.left;
      y.left = x; x.right = t2;
      x.height = 1 + Math.max(h(x.left), h(x.right));
      y.height = 1 + Math.max(h(y.left), h(y.right));
      return y;
    }

    /* ------------------------------------------------------------------ 平衡
     * 四种型别都从真实结构判定，不靠"插入的键"猜：
     *   重的一侧是单侧偏（孩子的外侧更高）→ 单旋；孩子的内侧更高 → 双旋。
     * 删除时同样成立，所以插入/删除共用这一段。 */
    rebalance(node) {
      if (node.bf > 1) {
        if (h(node.left.left) >= h(node.left.right)) {
          this._log(`左左型（L 型）：以 ${node.key} 为轴右旋`,
                    `Left-left (L) case: rotate right at ${node.key}`, node.id,
                    `以失衡节点为轴右旋`, `rotate right at the unbalanced node`);
          return this.rotateRight(node);
        }
        this._log(`左右型（LR 型）：先对 ${node.left.key} 左旋、再对 ${node.key} 右旋`,
                  `Left-right (LR) case: rotate left at ${node.left.key}, then right at ${node.key}`, node.id,
                  `先对左孩子左旋，再右旋自己`, `rotate left at the left child, then right at the node`);
        node.left = this.rotateLeft(node.left);
        return this.rotateRight(node);
      }
      if (node.bf < -1) {
        if (h(node.right.right) >= h(node.right.left)) {
          this._log(`右右型（R 型）：以 ${node.key} 为轴左旋`,
                    `Right-right (R) case: rotate left at ${node.key}`, node.id,
                    `以失衡节点为轴左旋`, `rotate left at the unbalanced node`);
          return this.rotateLeft(node);
        }
        this._log(`右左型（RL 型）：先对 ${node.right.key} 右旋、再对 ${node.key} 左旋`,
                  `Right-left (RL) case: rotate right at ${node.right.key}, then left at ${node.key}`, node.id,
                  `先对右孩子右旋，再左旋自己`, `rotate right at the right child, then left at the node`);
        node.right = this.rotateRight(node.right);
        return this.rotateLeft(node);
      }
      return node;
    }

    /* ------------------------------------------------------------------ 插入 */
    insert(node, key) {
      if (!node) {
        this._log(`走到空位：${key} 将作为一个新叶子挂在这里`,
                  `Reached an empty slot: ${key} will hang here as a new leaf`, null,
                  `走到空位，${key} 要挂在这里`, `empty slot: ${key} goes here`, key);
        const fresh = new AVLNode(key);
        this._log(`${key} 已创建，但还没有接进树里`,
                  `${key} is created but not linked into the tree yet`, null,
                  `${key} 已创建，等待接入`, `${key} created, waiting to be linked`, key);
        return fresh;
      }
      if (key === node.key) {
        this._log(`${key} 已存在，插入被忽略（AVL 的键唯一）`,
                  `${key} already exists, insert ignored (AVL keys stay unique)`, node.id,
                  `键已存在，跳过`, `key already exists, skip`);
        return node;
      }
      const goLeft = key < node.key;
      this._log(`比较：${key} ${goLeft ? '<' : '>'} ${node.key}，向${goLeft ? '左' : '右'}走`,
                `Compare: ${key} ${goLeft ? '<' : '>'} ${node.key}, go ${goLeft ? 'left' : 'right'}`, node.id,
                `比较后决定往哪边走`, `compare, then pick a side`);
      if (goLeft) node.left = this.insert(node.left, key);
      else node.right = this.insert(node.right, key);
      this._log(`${key} 接到 ${node.key} 的${goLeft ? '左' : '右'}孩子上`,
                `${key} is linked as the ${goLeft ? 'left' : 'right'} child of ${node.key}`, node.id,
                `接到 ${node.key} 的${goLeft ? '左' : '右'}边`, `linked under ${node.key}`);
      node.height = 1 + Math.max(h(node.left), h(node.right));
      this._log(`回溯到 ${node.key}：重算高度 h=${node.height}，bf=${fmt(node.bf)}`,
                `Unwind to ${node.key}: h=${node.height}, bf=${fmt(node.bf)}`, node.id,
                `回溯：更新高度与平衡因子`, `unwind: update height and balance factor`);
      if (node.bf > 1 || node.bf < -1) {
        this._log(`${node.key} 的 bf=${fmt(node.bf)} 越过 ±1，这棵子树失衡`,
                  `${node.key} has bf=${fmt(node.bf)}, past ±1: this subtree is unbalanced`, node.id,
                  `失去平衡，必须旋转`, `out of balance, a rotation is required`);
      }
      return this.rebalance(node);
    }

    /* ------------------------------------------------------------------ 查找 */
    find(node, key) {
      while (node) {
        const cmp = key === node.key ? 0 : (key < node.key ? -1 : 1);
        if (cmp === 0) {
          this._log(`命中：${key} 就是当前节点`, `Hit: ${key} is the current node`, node.id,
                    `找到了`, `found it`);
          return node;
        }
        this._log(`比较：${key} ${cmp < 0 ? '<' : '>'} ${node.key}，向${cmp < 0 ? '左' : '右'}走`,
                  `Compare: ${key} ${cmp < 0 ? '<' : '>'} ${node.key}, go ${cmp < 0 ? 'left' : 'right'}`, node.id,
                  `比较后决定往哪边走`, `compare, then pick a side`);
        node = cmp < 0 ? node.left : node.right;
      }
      this._log(`走到空指针：${key} 不在树里，查找失败`,
                `Reached a null pointer: ${key} is not in the tree, search fails`, null,
                `走到空指针：不在这里`, `hit a null pointer: not in the tree`);
      return null;
    }

    /* ------------------------------------------------------------------ 删除 */
    remove(node, key) {
      if (!node) {
        this._log(`${key} 不在这棵子树里`, `${key} is not in this subtree`, null,
                  `这棵子树里没有它`, `not in this subtree`);
        return null;
      }
      if (key < node.key) {
        this._log(`比较：${key} < ${node.key}，去左子树删`,
                  `Compare: ${key} < ${node.key}, descend left`, node.id,
                  `比当前节点小，往左找`, `smaller than this node, go left`);
        node.left = this.remove(node.left, key);
      } else if (key > node.key) {
        this._log(`比较：${key} > ${node.key}，去右子树删`,
                  `Compare: ${key} > ${node.key}, descend right`, node.id,
                  `比当前节点大，往右找`, `greater than this node, go right`);
        node.right = this.remove(node.right, key);
      } else {
        this._log(`命中 ${key}：它就是当前节点`, `Hit ${key}: this is the node to remove`, node.id,
                  `找到要删的节点`, `found the node to delete`);
        if (!node.left || !node.right) {
          const only = node.left || node.right;
          this._log(`${key} 至多一个孩子，直接用${only ? '孩子 ' + only.key : '空指针'}顶替`,
                    `${key} has at most one child, replace it with ${only ? 'child ' + only.key : 'null'}`, node.id,
                    `至多一个孩子：直接顶替`, `at most one child: splice it out`);
          return only;
        }
        const s = minNode(node.right);
        /* 顺序很重要：先从右子树里摘掉后继，再把键复制上来。
         * 反过来写会让树里短暂出现两个相同键，那一帧就违反了"左小右大"。 */
        this._log(`${key} 有两个孩子：右子树最小键 ${s.key} 是中序后继，用它顶替`,
                  `${key} has two children: the inorder successor is ${s.key}, the minimum of the right subtree`, s.id,
                  `两个孩子：找中序后继顶替`, `two children: promote the inorder successor`);
        node.right = this.remove(node.right, s.key);
        node.key = s.key;
        this._log(`${s.key} 已经从中序后继的位置摘下来，现在覆盖到原节点上`,
                  `${s.key} is unlinked from its old place and now overwrites the node`, node.id,
                  `后继摘下来了，覆盖原节点`, `successor unlinked; overwrite the node`);
      }
      node.height = 1 + Math.max(h(node.left), h(node.right));
      this._log(`回溯到 ${node.key}：重算高度 h=${node.height}，bf=${fmt(node.bf)}`,
                `Unwind to ${node.key}: h=${node.height}, bf=${fmt(node.bf)}`, node.id,
                `回溯：更新高度与平衡因子`, `unwind: update height and balance factor`);
      return this.rebalance(node);
    }
  }

  /* =========================================================================
   * 演示脚本：跑真实操作，得到真实轨迹
   * ====================================================================== */
  const SEED = [50, 30, 70, 20, 40, 60, 80];

  /* 造种子树：静默跑一遍插入，只留最终结构；之后的记录从零开始 */
  function seedTree() {
    const tree = new AVL();
    tree.tracing = false;
    SEED.forEach(k => { tree.rootNode = tree.insert(tree.rootNode, k); });
    tree.tracing = true;            // 造完必须恢复，否则后面的操作一片空白
    tree.entries.length = 0;
    tree.resetIds();
    return tree;
  }

  /* main 之一：插入一串键（其中 45 会触发 LR 双旋） */
  function opInsert(keys) {
    const tree = new AVL();
    keys.forEach(k => {
      tree.rootNode = tree.insert(tree.rootNode, k);
      tree.mark(`${k} 插入完成：树高 ${h(tree.rootNode)}，根为 ${tree.rootNode.key}`,
                `${k} inserted: height ${h(tree.rootNode)}, root is ${tree.rootNode.key}`);
    });
    return tree;
  }

  /* main 之二：在种子树里查找 */
  function opSearch(key) {
    if (!SEED.includes(key)) throw new Error(`${key} 不在种子树 ${SEED.join(',')} 里，查找演示会跑成失败路径`);
    const tree = seedTree();
    tree.mark(`树已就绪；开始查找 ${key}`, `Tree ready; search for ${key}`);
    tree.find(tree.rootNode, key);
    return tree;
  }

  /* main 之三：删除有两个孩子的节点 */
  function opDelete(key) {
    if (!SEED.includes(key)) throw new Error(`${key} 不在种子树 ${SEED.join(',')} 里`);
    const tree = seedTree();
    tree.mark(`树已就绪；准备删除 ${key}`, `Tree ready; delete ${key}`);
    tree.rootNode = tree.remove(tree.rootNode, key);
    tree.mark(`${key} 删除完成：树高 ${h(tree.rootNode)}，根为 ${tree.rootNode ? tree.rootNode.key : '—'}`,
              `${key} removed: height ${h(tree.rootNode)}, root is ${tree.rootNode ? tree.rootNode.key : '—'}`);
    return tree;
  }

  const Base = (typeof require === 'function')
    ? require('../shared/tree-session.js').TreeSession
    : global.SlowMoTreeSession.TreeSession;

  /* 会话：一棵"活着"的 AVL —— 用户连着插入/删除，树会自己重新平衡 */
  class AVLSession extends Base {
    constructor(seed) { super({ tree: () => new AVL(), seed: seed || SEED }); }
    keys() { const out = []; (function w(n) { if (!n) return; w(n.left); out.push(n.key); w(n.right); })(this.tree.rootNode); return out; }
    has(key) { let n = this.tree.rootNode; while (n) { if (key === n.key) return true; n = key < n.key ? n.left : n.right; } return false; }
    height() { return h(this.tree.rootNode); }
  }

  const API = { AVL, AVLNode, SEED, Session: AVLSession, ops: { insert: opInsert, search: opSearch, delete: opDelete } };
  global.AVLTree = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
