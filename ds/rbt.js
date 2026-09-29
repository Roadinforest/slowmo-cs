/*!
 * Red-black tree — 真实实现
 *
 * 和 AVL 一样：只有算法，没有 DOM。"每走一步记一帧"由 shared/trace.js 负责。
 *
 * 删除用的是"额外黑（双黑）"那一套标准做法，包括四种兄弟情形 ——
 * 这是红黑树最容易被教材略过、也最容易讲错的地方，所以每一步都留痕。
 *
 * 节点身份用自增 id，不用 key：删除时会把后继的 key 复制到目标节点上。
 */
(function (global) {
  'use strict';

  const Trace = (typeof require === 'function')
    ? require('../shared/trace.js').Trace
    : global.SlowMoTrace.Trace;

  const RED = 'red', BLACK = 'black';
  const isRed = n => !!n && n.color === RED;
  const isBlack = n => !n || n.color === BLACK;      // 空叶算黑，这是红黑树的约定
  const colorName = n => (isRed(n) ? '红' : '黑');
  const colorNameEn = n => (isRed(n) ? 'red' : 'black');

  let nextId = 1;
  class RBNode {
    constructor(key, color) {
      this.id = nextId++;
      this.key = key;
      this.color = color || RED;      // 新节点一律先染红
      this.left = null;
      this.right = null;
      this.parent = null;
    }
  }

  class RBTree extends Trace {
    constructor() { super(); this._root = null; }

    /* --- 交给记录器的接口 ------------------------------------------------ */
    root() { return this._root; }
    kids(n) { return [n.left, n.right]; }
    /* 红黑树不靠高度维护平衡，所以没有需要结算的派生字段 */
    settle() {}
    /* 颜色必须进快照 —— 它就是这棵树的数据 */
    extras(n) { return { color: n.color }; }
    resetIds() { nextId = 1; }

    get rootNode() { return this._root; }

    /* --- 基本操作 -------------------------------------------------------- */
    _setRoot(n) { this._root = n; if (n) n.parent = null; }

    /* 把 v 挂到 u 的位置上（含空叶），返回挂上去的节点 */
    _transplant(u, v) {
      if (!u.parent) this._setRoot(v);
      else if (u === u.parent.left) u.parent.left = v;
      else u.parent.right = v;
      if (v) v.parent = u.parent;
      return v;
    }

    rotateLeft(x) {
      const y = x.right;
      x.right = y.left;
      if (y.left) y.left.parent = x;
      y.parent = x.parent;
      if (!x.parent) this._root = y;
      else if (x === x.parent.left) x.parent.left = y;
      else x.parent.right = y;
      y.left = x; x.parent = y;
      return y;
    }

    rotateRight(y) {
      const x = y.left;
      y.left = x.right;
      if (x.right) x.right.parent = y;
      x.parent = y.parent;
      if (!y.parent) this._root = x;
      else if (y === y.parent.right) y.parent.right = x;
      else y.parent.left = x;
      x.right = y; y.parent = x;
      return x;
    }

    minNode(n) { while (n && n.left) n = n.left; return n; }

    /* ------------------------------------------------------------------ 插入 */
    insert(key) {
      const node = new RBNode(key);
      if (!this._root) {
        this._setRoot(node);
        this._log(`空树：${key} 直接成为根`, `Empty tree: ${key} becomes the root`, node.id,
                  `空树，${key} 直接做根`, `empty tree: ${key} is the root`);
        this._log(`根必须是黑色`, `The root must be black`, node.id,
                  `根染黑，性质恢复`, `paint the root black`);
        node.color = BLACK;
        return;
      }

      /* 1. 先按 BST 规则找到位置并挂上（新节点默认红） */
      let cur = this._root, parent = null, goLeft = false;
      while (cur) {
        if (key === cur.key) {
          this._log(`${key} 已存在，插入被忽略（键唯一）`,
                    `${key} already exists, insert ignored (keys are unique)`, cur.id,
                    `键已存在，跳过`, `key exists, skip`);
          return;
        }
        parent = cur; goLeft = key < cur.key;
        this._log(`比较：${key} ${goLeft ? '<' : '>'} ${cur.key}，向${goLeft ? '左' : '右'}走`,
                  `Compare: ${key} ${goLeft ? '<' : '>'} ${cur.key}, go ${goLeft ? 'left' : 'right'}`, cur.id,
                  `比较后决定往哪边走`, `compare, then pick a side`);
        cur = goLeft ? cur.left : cur.right;
      }
      node.parent = parent;
      if (goLeft) parent.left = node; else parent.right = node;
      this._log(`${key} 挂到 ${parent.key} 的${goLeft ? '左' : '右'}边，新节点一律先染红`,
                `${key} hangs under ${parent.key} as a ${goLeft ? 'left' : 'right'} child; new nodes start red`, node.id,
                `插入 ${key}（先染红）`, `insert ${key} (red first)`);

      /* 2. 修复：红节点不能有红孩子 */
      this._fixAfterInsert(node);
      this._log(`插入 ${key} 完成：根为 ${this._root.key}（黑）`,
                `${key} inserted: root is ${this._root.key} (black)`, this._root.id,
                `插入完成，性质恢复`, `insert done, properties restored`);
    }

    _fixAfterInsert(node) {
      let z = node;
      while (z.parent && isRed(z.parent)) {
        const p = z.parent, g = p.parent;
        if (!g) break;
        const uncle = (p === g.left) ? g.right : g.left;
        if (isRed(uncle)) {
          this._log(`父 ${p.key} 与叔 ${uncle.key} 都是红的：把它们变黑、祖父 ${g.key} 变红`,
                    `Parent ${p.key} and uncle ${uncle.key} are both red: paint them black, grandparent ${g.key} red`, g.id,
                    `叔为红：变色，问题上推`, `red uncle: recolor, push the problem up`);
          p.color = BLACK; uncle.color = BLACK; g.color = RED;
          z = g;
          this._log(`现在要看祖父 ${g.key} 有没有和自己的父亲撞红`,
                    `Now check whether grandparent ${g.key} clashes with its own parent`, g.id,
                    `从祖父继续往上检查`, `continue checking from the grandparent`);
        } else {
          if (p === g.left && z === p.right) {
            this._log(`叔为黑，且 ${z.key} 是 ${p.key} 的右孩子：先左旋 ${p.key}，把形状摆成一条直线`,
                      `Black uncle and ${z.key} is the right child of ${p.key}: rotate left at ${p.key} to straighten it`, p.id,
                      `先左旋摆正形状`, `rotate left to straighten`);
            this.rotateLeft(p);
            z = p;
          } else if (p === g.right && z === p.left) {
            this._log(`叔为黑，且 ${z.key} 是 ${p.key} 的左孩子：先右旋 ${p.key}，把形状摆成一条直线`,
                      `Black uncle and ${z.key} is the left child of ${p.key}: rotate right at ${p.key} to straighten it`, p.id,
                      `先右旋摆正形状`, `rotate right to straighten`);
            this.rotateRight(p);
            z = p;
          }
          const p2 = z.parent, g2 = p2.parent;
          if (p2 === g2.left) {
            this._log(`父 ${p2.key} 变黑、祖父 ${g2.key} 变红，再对 ${g2.key} 右旋`,
                      `Paint parent ${p2.key} black and grandparent ${g2.key} red, then rotate right at ${g2.key}`, g2.id,
                      `变色 + 右旋收尾`, `recolor + rotate right`);
            p2.color = BLACK; g2.color = RED;
            this.rotateRight(g2);
          } else {
            this._log(`父 ${p2.key} 变黑、祖父 ${g2.key} 变红，再对 ${g2.key} 左旋`,
                      `Paint parent ${p2.key} black and grandparent ${g2.key} red, then rotate left at ${g2.key}`, g2.id,
                      `变色 + 左旋收尾`, `recolor + rotate left`);
            p2.color = BLACK; g2.color = RED;
            this.rotateLeft(g2);
          }
          break;
        }
      }
      if (isRed(this._root)) {
        this._log(`根又变红了：根必须永远是黑的`,
                  `The root is red again: the root must always be black`, this._root.id,
                  `根染回黑`, `paint the root black again`);
        this._root.color = BLACK;
      }
    }

    /* ------------------------------------------------------------------ 查找 */
    find(key) {
      let cur = this._root;
      while (cur) {
        const cmp = key === cur.key ? 0 : (key < cur.key ? -1 : 1);
        if (cmp === 0) {
          this._log(`命中：${key} 就是当前节点（${colorName(cur)}）`,
                    `Hit: ${key} is the current node (${colorNameEn(cur)})`, cur.id,
                    `找到了`, `found it`);
          return cur;
        }
        this._log(`比较：${key} ${cmp < 0 ? '<' : '>'} ${cur.key}，向${cmp < 0 ? '左' : '右'}走`,
                  `Compare: ${key} ${cmp < 0 ? '<' : '>'} ${cur.key}, go ${cmp < 0 ? 'left' : 'right'}`, cur.id,
                  `比较后决定往哪边走`, `compare, then pick a side`);
        cur = cmp < 0 ? cur.left : cur.right;
      }
      this._log(`走到空指针：${key} 不在树里，查找失败`,
                `Reached a null pointer: ${key} is not in the tree, search fails`, null,
                `走到空指针：不在这里`, `hit a null pointer: not in the tree`);
      return null;
    }

    /* ------------------------------------------------------------------ 删除
     * 先按 BST 删掉，再修复"某一侧黑高少了一" —— 也就是双黑。 */
    remove(key) {
      const z = this.find(key);
      if (!z) return false;

      let y = z, yColor = y.color, x = null, xParent = null;
      if (!z.left) {
        xParent = z.parent;
        x = this._transplant(z, z.right);
        this._log(`${key} 至多一个孩子：直接用孩子顶替它`,
                  `${key} has at most one child: splice it out`, x ? x.id : (xParent ? xParent.id : null),
                  `至多一个孩子：顶替`, `at most one child: splice`);
      } else if (!z.right) {
        xParent = z.parent;
        x = this._transplant(z, z.left);
        this._log(`${key} 至多一个孩子：直接用孩子顶替它`,
                  `${key} has at most one child: splice it out`, x ? x.id : (xParent ? xParent.id : null),
                  `至多一个孩子：顶替`, `at most one child: splice`);
      } else {
        y = this.minNode(z.right);
        yColor = y.color;
        x = y.right;
        if (y.parent === z) {
          xParent = y;
          if (x) x.parent = y;
        } else {
          xParent = y.parent;
          this._transplant(y, y.right);
          y.right = z.right; y.right.parent = y;
        }
        this._transplant(z, y);
        y.left = z.left; y.left.parent = y;
        y.color = z.color;
        this._log(`${key} 有两个孩子：中序后继 ${y.key}（${colorName(y)}）搬到它的位置，并继承它的颜色`,
                  `${key} has two children: the inorder successor ${y.key} (${colorNameEn(y)}) moves up and takes its colour`, y.id,
                  `后继 ${y.key} 顶上`, `successor ${y.key} moves up`);
      }

      if (yColor === BLACK) {
        this._log(`被移走的是黑节点：这一侧的黑高少了 1，需要"额外黑"来修复`,
                  `A black node was removed: this side is one black short and needs an "extra black"`, x ? x.id : (xParent ? xParent.id : null),
                  `出现双黑，开始修复`, `double black: start fixing`);
        this._fixAfterDelete(x, xParent);
      } else {
        this._log(`被移走的是红节点：黑高没变，不需要修复`,
                  `A red node was removed: black height is unchanged, no repair needed`, x ? x.id : (xParent ? xParent.id : null),
                  `删的是红节点，无需修复`, `red node removed, nothing to fix`);
      }
      if (this._root && isRed(this._root)) {
        this._log(`根又变红了：根必须永远是黑的`, `The root is red again: the root must be black`, this._root.id,
                  `根染回黑`, `paint the root black again`);
        this._root.color = BLACK;
      }
      this._log(`${key} 删除完成：根为 ${this._root ? this._root.key : '—'}`,
                `${key} removed: root is ${this._root ? this._root.key : '—'}`, this._root ? this._root.id : null,
                `删除完成，性质恢复`, `delete done, properties restored`);
      return true;
    }

    /* 双黑修复：x 是"缺一层黑"的那个位置（可能是空叶，此时用 xParent 定位） */
    _fixAfterDelete(x, xParent) {
      let node = x, parent = xParent;
      while (node !== this._root && isBlack(node)) {
        if (!parent) break;
        if (node === parent.left) {
          let sib = parent.right;
          if (isRed(sib)) {
            this._log(`兄弟 ${sib.key} 是红的：先把兄弟染黑、父染红，再对父左旋，转成"兄弟为黑"的情形`,
                      `Sibling ${sib.key} is red: paint it black, the parent red, then rotate left at the parent to reach the black-sibling case`, parent.id,
                      `兄弟为红：先转成兄弟为黑`, `red sibling: convert to black-sibling case`);
            sib.color = BLACK; parent.color = RED; this.rotateLeft(parent);
            sib = parent.right;
          }
          const nearRed = isRed(sib && sib.left), farRed = isRed(sib && sib.right);
          if (!nearRed && !farRed) {
            this._log(`兄弟 ${sib ? sib.key : '(空)'} 的孩子都是黑的：把兄弟染红，缺一层黑上移给父节点`,
                      `Both of sibling ${sib ? sib.key : '(null)'} children are black: paint the sibling red and push the missing black up to the parent`, parent.id,
                      `兄弟孩子都黑：染红兄弟，问题上推`, `black nephews: redden sibling, push up`);
            if (sib) sib.color = RED;
            node = parent; parent = parent.parent;
          } else {
            if (!farRed) {
              this._log(`远侄子 ${sib.right ? sib.right.key : '(空)'} 是黑的、近侄子 ${sib.left.key} 是红的：先对兄弟右旋，把红的换到外侧`,
                        `Far nephew is black but near nephew ${sib.left.key} is red: rotate right at the sibling to move the red outward`, sib.id,
                        `近侄子红：先右旋兄弟`, `near nephew red: rotate sibling right`);
              sib.left.color = BLACK; sib.color = RED; this.rotateRight(sib);
              sib = parent.right;
            }
            this._log(`远侄子 ${sib.right.key} 是红的：兄弟接父色、父染黑、远侄子染黑，再对父左旋 —— 额外黑被吸收`,
                      `Far nephew ${sib.right.key} is red: sibling takes the parent colour, parent and far nephew go black, then rotate left at the parent — the extra black is absorbed`, parent.id,
                      `远侄子红：旋转变色收尾`, `red far nephew: rotate and recolor`);
            sib.color = parent.color; parent.color = BLACK;
            if (sib.right) sib.right.color = BLACK;
            this.rotateLeft(parent);
            node = this._root;
            parent = null;
          }
        } else {
          let sib = parent.left;
          if (isRed(sib)) {
            this._log(`兄弟 ${sib.key} 是红的：先把兄弟染黑、父染红，再对父右旋，转成"兄弟为黑"的情形`,
                      `Sibling ${sib.key} is red: paint it black, the parent red, then rotate right at the parent to reach the black-sibling case`, parent.id,
                      `兄弟为红：先转成兄弟为黑`, `red sibling: convert to black-sibling case`);
            sib.color = BLACK; parent.color = RED; this.rotateRight(parent);
            sib = parent.left;
          }
          const nearRed = isRed(sib && sib.right), farRed = isRed(sib && sib.left);
          if (!nearRed && !farRed) {
            this._log(`兄弟 ${sib ? sib.key : '(空)'} 的孩子都是黑的：把兄弟染红，缺一层黑上移给父节点`,
                      `Both of sibling ${sib ? sib.key : '(null)'} children are black: paint the sibling red and push the missing black up to the parent`, parent.id,
                      `兄弟孩子都黑：染红兄弟，问题上推`, `black nephews: redden sibling, push up`);
            if (sib) sib.color = RED;
            node = parent; parent = parent.parent;
          } else {
            if (!farRed) {
              this._log(`远侄子 ${sib.left ? sib.left.key : '(空)'} 是黑的、近侄子 ${sib.right.key} 是红的：先对兄弟左旋，把红的换到外侧`,
                        `Far nephew is black but near nephew ${sib.right.key} is red: rotate left at the sibling to move the red outward`, sib.id,
                        `近侄子红：先左旋兄弟`, `near nephew red: rotate sibling left`);
              sib.right.color = BLACK; sib.color = RED; this.rotateLeft(sib);
              sib = parent.left;
            }
            this._log(`远侄子 ${sib.left.key} 是红的：兄弟接父色、父染黑、远侄子染黑，再对父右旋 —— 额外黑被吸收`,
                      `Far nephew ${sib.left.key} is red: sibling takes the parent colour, parent and far nephew go black, then rotate right at the parent — the extra black is absorbed`, parent.id,
                      `远侄子红：旋转变色收尾`, `red far nephew: rotate and recolor`);
            sib.color = parent.color; parent.color = BLACK;
            if (sib.left) sib.left.color = BLACK;
            this.rotateRight(parent);
            node = this._root;
            parent = null;
          }
        }
      }
      if (node) {
        this._log(`双黑落到 ${node.key} 上就结束了：把它染黑，黑高恢复`,
                  `The extra black lands on ${node.key}: paint it black and black height is restored`, node.id,
                  `双黑落定，染黑收尾`, `extra black settles: paint black`);
        node.color = BLACK;
      }
    }
  }

  /* =========================================================================
   * 演示脚本
   * ====================================================================== */
  /* 一串插入：会先后触发"叔为红只需变色"和"需要旋转"两类情形 */
  const INSERT_KEYS = [20, 10, 30, 5, 15, 25, 35, 1];
  /* 种子树：4 层、形状规整，删除时能真正走到"双黑修复"（这是红黑树最该讲的
   * 一步）。试过几棵更小的树，删除恰好都落在红节点上，修复分支一次都进不去。 */
  const SEED = [7, 3, 18, 10, 22, 8, 11, 26];
  /* 演示查找：命中深处的一个键 */
  const SEARCH_KEY = 8;
  /* 演示删除：删掉 3，会触发双黑修复 */
  const DELETE_KEY = 3;

  function seedTree() {
    const tree = new RBTree();
    tree.tracing = false;
    SEED.forEach(k => tree.insert(k));
    tree.tracing = true;
    tree.entries.length = 0;
    tree.resetIds();
    return tree;
  }

  function opInsert() {
    const tree = new RBTree();
    INSERT_KEYS.forEach(k => {
      tree.insert(k);
      tree.mark(`${k} 插入完成：根为 ${tree._root.key}`,
                `${k} inserted: root is ${tree._root.key}`);
    });
    return tree;
  }

  function opSearch(key) {
    if (key === undefined) key = SEARCH_KEY;
    const tree = seedTree();
    tree.mark(`树已就绪；开始查找 ${key}`, `Tree ready; search for ${key}`);
    tree.find(key);
    return tree;
  }

  function opDelete(key) {
    if (key === undefined) key = DELETE_KEY;
    if (!SEED.includes(key)) throw new Error(`${key} 不在种子树 ${SEED.join(',')} 里`);
    const tree = seedTree();
    tree.mark(`树已就绪；准备删除 ${key}`, `Tree ready; delete ${key}`);
    tree.remove(key);
    return tree;
  }

  const API = {
    RBTree, RBNode, RED, BLACK, SEED, INSERT_KEYS, SEARCH_KEY, DELETE_KEY,
    ops: { insert: opInsert, search: opSearch, delete: opDelete }
  };
  global.RBTree = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
