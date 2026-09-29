/*!
 * 二叉搜索树（BST）—— 真实实现
 *
 * 这里只有算法：真实指针、真实比较、真实删除。它不知道 SVG、不知道按钮。
 * "每走一步记一帧"交给 shared/trace.js；交互会话（连着做好几次操作）见文件末尾。
 *
 * 节点身份用自增 id，不用 key：删除有两个孩子的节点时会把后继的键复制过来，
 * 那一刻树里会短暂出现两个相同键，用键当身份就会撞成环。
 */
(function (global) {
  'use strict';

  const Trace = (typeof require === 'function')
    ? require('../shared/trace.js').Trace          // node / tools
    : global.SlowMoTrace.Trace;                    // 浏览器

  const minNode = n => { while (n && n.left) n = n.left; return n; };

  let nextId = 1;
  class BSTNode {
    constructor(key) { this.id = nextId++; this.key = key; this.left = null; this.right = null; }
  }

  class BST extends Trace {
    constructor(opts) {
      super(opts);
      this._root = null;
      /* 交给树视图做布局用的顺序号：BST 按中序给出左右次序 */
      this._order = new Map();
    }

    /* --- 交给记录器的接口 ------------------------------------------------ */
    root() { return this._root; }
    kids(n) { return [n.left, n.right]; }
    /* 快照里的身份就是自增 id */
    static resetIds() { nextId = 1; }
    resetIds() { nextId = 1; }

    get rootNode() { return this._root; }
    set rootNode(v) { this._root = v; }

    /* ------------------------------------------------------------------ 查找 */
    find(node, key) {
      const path = [];
      while (node) {
        path.push(node.key);
        if (key === node.key) {
          this._log(`命中：${key} 就是当前节点（比较了 ${path.length} 次）`,
                    `Hit: ${key} is the current node (${path.length} comparisons)`, node.id,
                    `找到了`, `found it`);
          return node;
        }
        const goLeft = key < node.key;
        this._log(`比较：${key} ${goLeft ? '<' : '>'} ${node.key}，向${goLeft ? '左' : '右'}走`,
                  `Compare: ${key} ${goLeft ? '<' : '>'} ${node.key}, go ${goLeft ? 'left' : 'right'}`, node.id,
                  `比当前节点${goLeft ? '小' : '大'}，往${goLeft ? '左' : '右'}找`,
                  `${goLeft ? 'smaller' : 'greater'} than this node, go ${goLeft ? 'left' : 'right'}`);
        node = goLeft ? node.left : node.right;
      }
      this._log(`走到空指针：${key} 不在树里（共比较 ${path.length} 次）`,
                `Reached a null pointer: ${key} is not in the tree (${path.length} comparisons)`, null,
                `走到空指针：不在这里`, `hit a null pointer: not in the tree`);
      return null;
    }

    /* ------------------------------------------------------------------ 插入 */
    insert(node, key) {
      if (!node) {
        const fresh = new BSTNode(key);
        /* 此刻 fresh 还没接进树，快照里没有它 —— 焦点只能给"待接入的键"，
         * 免得画面指向一个不存在的节点（这一步的契约由 shared/steps.js 守）。 */
        this._log(`走到空位：${key} 将作为一个新叶子挂在这里`,
                  `Reached an empty slot: ${key} will hang here as a new leaf`, null,
                  `空位就是它的位置`, `the empty slot is its place`, key);
        return fresh;
      }
      if (key === node.key) {
        this._log(`${key} 已存在，插入被忽略（BST 的键唯一）`,
                  `${key} already exists, insert ignored (BST keys stay unique)`, node.id,
                  `键已存在，跳过`, `key already exists, skip`);
        return node;
      }
      const goLeft = key < node.key;
      this._log(`比较：${key} ${goLeft ? '<' : '>'} ${node.key}，向${goLeft ? '左' : '右'}走`,
                `Compare: ${key} ${goLeft ? '<' : '>'} ${node.key}, go ${goLeft ? 'left' : 'right'}`, node.id,
                `比当前节点${goLeft ? '小' : '大'}，往${goLeft ? '左' : '右'}找`,
                `${goLeft ? 'smaller' : 'greater'} than this node, go ${goLeft ? 'left' : 'right'}`);
      if (goLeft) node.left = this.insert(node.left, key);
      else node.right = this.insert(node.right, key);
      this._log(`${key} 接到 ${node.key} 的${goLeft ? '左' : '右'}孩子上`,
                `${key} is linked as the ${goLeft ? 'left' : 'right'} child of ${node.key}`, node.id,
                `接到 ${node.key} 的${goLeft ? '左' : '右'}边`, `linked under ${node.key}`);
      return node;
    }

    /* ------------------------------------------------------------------ 删除 */
    remove(node, key) {
      if (!node) {
        this._log(`${key} 不在这棵子树里，删除结束`,
                  `${key} is not in this subtree, delete stops`, null,
                  `这棵子树里没有它`, `not in this subtree`);
        return null;
      }
      if (key < node.key) {
        this._log(`比较：${key} < ${node.key}，去左子树删`,
                  `Compare: ${key} < ${node.key}, descend left`, node.id,
                  `比当前节点小，往左找`, `smaller than this node, go left`);
        node.left = this.remove(node.left, key);
        return node;
      }
      if (key > node.key) {
        this._log(`比较：${key} > ${node.key}，去右子树删`,
                  `Compare: ${key} > ${node.key}, descend right`, node.id,
                  `比当前节点大，往右找`, `greater than this node, go right`);
        node.right = this.remove(node.right, key);
        return node;
      }
      this._log(`命中 ${key}：它就是当前节点`, `Hit ${key}: this is the node to remove`, node.id,
                `找到要删的节点`, `found the node to delete`);
      if (!node.left && !node.right) {
        this._log(`${key} 是叶子：直接摘掉，父节点的这一侧变成空指针`,
                  `${key} is a leaf: unlink it, the parent's slot becomes null`, node.id,
                  `叶子：直接摘掉`, `leaf: unlink it`);
        return null;
      }
      if (!node.left || !node.right) {
        const only = node.left || node.right;
        this._log(`${key} 只有一个孩子 ${only.key}：让孩子整棵顶上来`,
                  `${key} has one child ${only.key}: the child subtree moves up`, node.id,
                  `一个孩子：直接顶上`, `one child: the child takes its place`);
        return only;
      }
      const s = minNode(node.right);
      /* 顺序很重要：先从右子树里把后继摘掉，再把它的键复制上来。
       * 反过来写（先复制键、再删后继）会让树里短暂出现两个相同键，
       * 那一帧就违反了"左小右大"——读者会在画面上真的看到两个一样的键。 */
      this._log(`${key} 有两个孩子：右子树的最小键 ${s.key} 是中序后继，用它顶替`,
                `${key} has two children: the inorder successor is ${s.key}, the minimum of the right subtree`, s.id,
                `两个孩子：找中序后继顶替`, `two children: promote the inorder successor`);
      node.right = this.remove(node.right, s.key);
      node.key = s.key;
      this._log(`${s.key} 已经从中序后继的位置摘下来，现在覆盖到原节点上`,
                `${s.key} is unlinked from its old place and now overwrites the node`, node.id,
                `后继摘下来了，覆盖原节点`, `successor unlinked; overwrite the node`);
      return node;
    }

    /* 给树视图用的"顺序号"：中序遍历的次序就是左右次序。
     * 树视图自己也会按键排，但这里显式给出，删除交换后也稳定。 */
    order() {
      const out = new Map();
      let i = 0;
      (function walk(n) { if (!n) return; walk(n.left); out.set(n.id, i++); walk(n.right); })(this._root);
      return out;
    }
  }

  /* =========================================================================
   * 演示脚本：跑真实操作，得到真实轨迹
   * ====================================================================== */
  const SEED = [50, 30, 70, 20, 40, 60, 80];
  const DEMO_INSERT = [50, 30, 70, 20, 40, 45];
  const DEMO_SEARCH = 40;
  const DEMO_DELETE = 50;

  function seedTree() {
    const tree = new BST();
    tree.tracing = false;
    SEED.forEach(k => { tree.rootNode = tree.insert(tree.rootNode, k); });
    tree.tracing = true;
    tree.entries.length = 0;
    tree.resetIds();
    return tree;
  }

  function opInsert(keys) {
    const tree = new BST();
    keys.forEach(k => {
      tree.rootNode = tree.insert(tree.rootNode, k);
      tree.mark(`${k} 插入完成`, `${k} inserted`);
    });
    return tree;
  }

  function opSearch(key) {
    if (!SEED.includes(key)) throw new Error(`${key} 不在种子树 ${SEED.join(',')} 里`);
    const tree = seedTree();
    tree.mark(`树已就绪；开始查找 ${key}`, `Tree ready; search for ${key}`);
    tree.find(tree.rootNode, key);
    return tree;
  }

  function opDelete(key) {
    if (!SEED.includes(key)) throw new Error(`${key} 不在种子树 ${SEED.join(',')} 里`);
    const tree = seedTree();
    tree.mark(`树已就绪；准备删除 ${key}`, `Tree ready; delete ${key}`);
    tree.rootNode = tree.remove(tree.rootNode, key);
    tree.mark(`${key} 删除完成`, `${key} removed`);
    return tree;
  }

  /* =========================================================================
   * 交互会话：一棵"活着"的树，用户每按一次就往前推一步
   *
   * 与上面的 ops.* 的区别：ops.* 每次开一棵新树、跑一段写死的脚本；
   * Session 保留树本身，因此连续操作能看到树真的长大、真的变矮。
   * 节点 id 在会话内不复位 —— 复位会让"上一帧的节点"和"这一帧的节点"
   * 被认成同一个（树视图靠 id 复用 DOM），画面就会错位。
   * ====================================================================== */
  const Base = (typeof require === 'function')
    ? require('../shared/tree-session.js').TreeSession
    : global.SlowMoTreeSession.TreeSession;

  /* 会话：一棵"活着"的树 —— 详见 shared/tree-session.js 的注释 */
  class BSTSession extends Base {
    constructor(seed) { super({ tree: () => new BST(), seed: seed || SEED }); }
    keys() { return inOrderKeys(this.tree.rootNode); }
    has(key) { let n = this.tree.rootNode; while (n) { if (key === n.key) return true; n = key < n.key ? n.left : n.right; } return false; }
    height() { const h = n => (n ? 1 + Math.max(h(n.left), h(n.right)) : 0); return h(this.tree.rootNode); }
  }
  function inOrderKeys(root) { const out = []; (function w(n) { if (!n) return; w(n.left); out.push(n.key); w(n.right); })(root); return out; }

  const API = {
    BST, BSTNode, SEED, DEMO_INSERT, DEMO_SEARCH, DEMO_DELETE,
    ops: { insert: opInsert, search: opSearch, delete: opDelete },
    Session: BSTSession
  };
  global.BSTTree = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
