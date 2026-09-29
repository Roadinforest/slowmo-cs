/*!
 * AVL tree — 真实实现 + 执行轨迹（trace）
 *
 * 这个文件里只有算法：真实指针、真实旋转、真实高度。
 * 它不知道 SVG、不知道 DOM、不知道"步骤按钮"。
 * 每走一步就往 rec 里推一条记录：代码行号 + 双语旁白 + 真实结构快照。
 * 页面拿到 rec 后自己决定怎么画（shared/treeview.js）。
 *
 * 行号约定：每个函数第一行的行号就是它的"代码行"，由 codeLines() 在运行时
 * 数函数源码的前导空行得出（见 avl.html），所以重构代码不会让行号漂移。
 */
(function (global) {
  'use strict';

  /* 节点身份用自增 id，不用 key：
   * 删除时会把后继的 key 复制到目标节点上，那一刻树里会短暂出现两个相同 key，
   * 用 key 当身份就会撞成环。id 永不变，key 只是它携带的数据。 */
  let nextId = 1;
  class AVLNode {
    constructor(key) { this.id = nextId++; this.key = key; this.left = null; this.right = null; this.height = 1; }
    get bf() { return h(this.left) - h(this.right); }
  }

  const h = n => (n ? n.height : 0);
  const L = (zh, en) => [zh, en];
  const fmt = n => (n > 0 ? '+' : '') + n;
  const minNode = n => { while (n && n.left) n = n.left; return n; };

  class AVL {
    constructor(rec) { this.root = null; this.rec = rec || null; }   // 面板行 2

    /* 记录一步。第一个参数是在 classCode('AVL') 里的真实行号（1 起），
     * 也就是代码面板上高亮的那一行；nodes 永远是此刻真实的结构，不是写死的图。 */
    /* 快照前先把高度字段结算成与结构一致。
     * 回溯途中父节点的 height 会短暂落后于结构，如果原样拍下来，
     * 画面上就会出现"图是新的、高度是旧的"。结算一步本来就属于这个算法，
     * 放到这里只是让它先于快照发生；"重算高度"那一步的旁白照旧。 */
    /* 按 id 找到节点（旁白校正用） */
    _find(n, id) {
      if (!n) return null;
      if (n.id === id) return n;
      return this._find(n.left, id) || this._find(n.right, id);
    }

    _settle(n) {
      if (!n) return 0;
      n.height = 1 + Math.max(this._settle(n.left), this._settle(n.right));
      return n.height;
    }

    _log(line, zh, en, focus, doZh, doEn, pendingKey) {   // 面板行 6
      if (!this.rec) return;
      const focusNode = focus != null ? this._find(this.root, focus) : null;
      /* 一条记录 = 一帧，全部由算法给出：
       *   line  代码行号（自检用）
       *   text  这一帧的说明
       *   act   一句话：这一步在干什么（页面右栏直接显示）
       *   focus 此刻在看哪个节点
       *   nodes 此刻真实的结构快照                                     */
      this._settle(this.root);
      /* 旁白里的 bf 用结算后的真实值，和画面角标一致
       * （否则会出现"图上写 bf +2、文字说 bf=+1"这种自相矛盾） */
      if (typeof doZh === 'string' && zh.indexOf('bf=') >= 0) {
        zh = zh.replace(/bf=[+-]?\d+/g, 'bf=' + fmt(focusNode ? focusNode.bf : 0));
        en = en.replace(/bf=[+-]?\d+/g, 'bf=' + fmt(focusNode ? focusNode.bf : 0));
      }
      this.rec.entries.push({
        line,
        text: L(zh, en),
        act: doZh == null ? null : L(doZh, doEn),
        focus: focus == null ? null : focus,     // 节点 id（不是 key）
        pendingKey: pendingKey == null ? null : pendingKey,   // 焦点尚未创建时，它就是那个键
        nodes: snapshot(this.root)
      });
    }

    /* ------------------------------------------------------------------ 旋转 */
    rotateRight(y) {   // 面板行 12
      const x = y.left, t2 = x.right;
      x.right = y; y.left = t2;
      y.height = 1 + Math.max(h(y.left), h(y.right));
      x.height = 1 + Math.max(h(x.left), h(x.right));
      return x;
    }

    rotateLeft(x) {   // 面板行 20
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
    rebalance(node) {   // 面板行 32
      if (node.bf > 1) {
        if (h(node.left.left) >= h(node.left.right)) { // 5 左左
          this._log(75, `左左型（L 型）：以 ${node.key} 为轴右旋`,
                       `Left-left (L) case: rotate right at ${node.key}`, node.id, `以失衡节点为轴右旋`, `rotate right at the unbalanced node`);
          return this.rotateRight(node);
        }
        this._log(80, `左右型（LR 型）：先对 ${node.left.key} 左旋、再对 ${node.key} 右旋`,
                     `Left-right (LR) case: rotate left at ${node.left.key}, then right at ${node.key}`, node.id, `先对左孩子左旋，再右旋自己`, `rotate left at the left child, then right at the node`);
        node.left = this.rotateLeft(node.left);
        return this.rotateRight(node);
      }
      if (node.bf < -1) {
        if (h(node.right.right) >= h(node.right.left)) { // 10 右右
          this._log(86, `右右型（R 型）：以 ${node.key} 为轴左旋`,
                        `Right-right (R) case: rotate left at ${node.key}`, node.id, `以失衡节点为轴左旋`, `rotate left at the unbalanced node`);
          return this.rotateLeft(node);
        }
        this._log(91, `右左型（RL 型）：先对 ${node.right.key} 右旋、再对 ${node.key} 左旋`,
                      `Right-left (RL) case: rotate right at ${node.right.key}, then left at ${node.key}`, node.id, `先对右孩子右旋，再左旋自己`, `rotate right at the right child, then left at the node`);
        node.right = this.rotateRight(node.right);
        return this.rotateLeft(node);
      }
      return node;
    }

    /* ------------------------------------------------------------------ 插入 */
    insert(node, key) {   // 面板行 59
      if (!node) {
        this._log(98, `走到空位：${key} 将作为一个新叶子挂在这里`,
                       `Reached an empty slot: ${key} will hang here as a new leaf`, null,
                       `走到空位，${key} 要挂在这里`, `empty slot: ${key} goes here`, key);
        const fresh = new AVLNode(key);                       // 先建出来，还没接进树
        this._log(102, `${key} 已创建，但还没有接进树里`,
                       `${key} is created but not linked into the tree yet`, null,
                       `${key} 已创建，等待接入`, `${key} created, waiting to be linked`, key);
        return fresh;
      }
      if (key === node.key) {
        this._log(108, `${key} 已存在，插入被忽略（AVL 的键唯一）`,
                       `${key} already exists, insert ignored (AVL keys stay unique)`, node.id, `键已存在，跳过`, `key already exists, skip`);
        return node;
      }
      const goLeft = key < node.key;
      this._log(113, `比较：${key} ${goLeft ? '<' : '>'} ${node.key}，向${goLeft ? '左' : '右'}走`,
                     `Compare: ${key} ${goLeft ? '<' : '>'} ${node.key}, go ${goLeft ? 'left' : 'right'}`, node.id, `比较后决定往哪边走`, `compare, then pick a side`);
      if (goLeft) node.left = this.insert(node.left, key);
      else node.right = this.insert(node.right, key);
      this._log(117, `${key} 接到 ${node.key} 的${goLeft ? '左' : '右'}孩子上`,
                     `${key} is linked as the ${goLeft ? 'left' : 'right'} child of ${node.key}`, node.id,
                     `接到 ${node.key} 的${goLeft ? '左' : '右'}边`, `linked under ${node.key}`);
      node.height = 1 + Math.max(h(node.left), h(node.right));
      this._log(121, `回溯到 ${node.key}：重算高度 h=${node.height}，bf=${fmt(node.bf)}`,
                     `Unwind to ${node.key}: h=${node.height}, bf=${fmt(node.bf)}`, node.id, `回溯：更新高度与平衡因子`, `unwind: update height and balance factor`);
      if (node.bf > 1 || node.bf < -1) {
        this._log(124, `${node.key} 的 bf=${fmt(node.bf)} 越过 ±1，这棵子树失衡`,
                       `${node.key} has bf=${fmt(node.bf)}, past ±1: this subtree is unbalanced`, node.id, `失去平衡，必须旋转`, `out of balance, a rotation is required`);
      }
      return this.rebalance(node);
    }

    /* ------------------------------------------------------------------ 查找 */
    find(node, key) {   // 面板行 86
      while (node) {
        const cmp = key === node.key ? 0 : (key < node.key ? -1 : 1);
        if (cmp === 0) {
          this._log(134, `命中：${key} 就是当前节点`, `Hit: ${key} is the current node`, node.id, `找到了`, `found it`);
          return node;
        }
        this._log(141, `比较：${key} ${cmp < 0 ? '<' : '>'} ${node.key}，向${cmp < 0 ? '左' : '右'}走`,
                       `Compare: ${key} ${cmp < 0 ? '<' : '>'} ${node.key}, go ${cmp < 0 ? 'left' : 'right'}`, node.id, `比较后决定往哪边走`, `compare, then pick a side`);
        node = cmp < 0 ? node.left : node.right;
      }
      this._log(145, `走到空指针：${key} 不在树里，查找失败`,
                    `Reached a null pointer: ${key} is not in the tree, search fails`, null, `走到空指针：不在这里`, `hit a null pointer: not in the tree`);
      return null;
    }

    /* ------------------------------------------------------------------ 删除 */
    remove(node, key) {   // 面板行 103
      if (!node) {
        this._log(150, `${key} 不在这棵子树里`, `${key} is not in this subtree`, null, `这棵子树里没有它`, `not in this subtree`);
        return null;
      }
      if (key < node.key) {
        this._log(154, `比较：${key} < ${node.key}，去左子树删`,
                       `Compare: ${key} < ${node.key}, descend left`, node.id, `比当前节点小，往左找`, `smaller than this node, go left`);
        node.left = this.remove(node.left, key);
      } else if (key > node.key) {
        this._log(158, `比较：${key} > ${node.key}，去右子树删`,
                       `Compare: ${key} > ${node.key}, descend right`, node.id, `比当前节点大，往右找`, `greater than this node, go right`);
        node.right = this.remove(node.right, key);
      } else {
        this._log(164, `命中 ${key}：它就是当前节点`, `Hit ${key}: this is the node to remove`, node.id, `找到要删的节点`, `found the node to delete`);
        if (!node.left || !node.right) {
          const only = node.left || node.right;
          this._log(164, `${key} 至多一个孩子，直接用${only ? '孩子 ' + only.key : '空指针'}顶替`,
                         `${key} has at most one child, replace it with ${only ? 'child ' + only.key : 'null'}`, node.id, `至多一个孩子：直接顶替`, `at most one child: splice it out`);
          return only;
        }
        const s = minNode(node.right);
        this._log(170, `${key} 有两个孩子：右子树最小键 ${s.key} 是中序后继，用它顶替`,
                       `${key} has two children: the inorder successor is ${s.key}, the minimum of the right subtree`, s.id, `两个孩子：找中序后继顶替`, `two children: promote the inorder successor`);
        node.key = s.key;
        node.right = this.remove(node.right, s.key);
      }
      node.height = 1 + Math.max(h(node.left), h(node.right));
      this._log(176, `回溯到 ${node.key}：重算高度 h=${node.height}，bf=${fmt(node.bf)}`,
                     `Unwind to ${node.key}: h=${node.height}, bf=${fmt(node.bf)}`, node.id, `回溯：更新高度与平衡因子`, `unwind: update height and balance factor`);
      return this.rebalance(node);
    }
  }

  /* -------------------------------------------------------------------------
   * 快照：把真实结构压成可传输的数组（key + 父指针），页面据此建图
   * ---------------------------------------------------------------------- */
  /* 快照以 id 为父子指针，key 只是显示用的数据。
   * 这样即使删除过程中出现两个相同 key，结构也不会成环。 */
  function snapshot(root) {
    const out = [];
    (function walk(n, parentId) {
      if (!n) return;
      out.push({ id: n.id, key: n.key, parent: parentId, height: n.height });
      walk(n.left, n.id); walk(n.right, n.id);
    })(root, null);
    return out;
  }

  /* =========================================================================
   * 演示脚本（相当于"每种算法写一个 main"）：跑真实操作，收集真实轨迹
   * ====================================================================== */
  const SEED = [50, 30, 70, 20, 40, 60, 80];

  /* 造种子树：静默跑一遍插入，只留最终结构（轨迹由各自的操作重新记录） */
  function seedTree() {
    const tree = new AVL(null);
    SEED.forEach(k => { tree.root = tree.insert(tree.root, k); });
    return { tree, rec: { entries: [] } };
  }

  function withEntry(rec, tree, zh, en) {
    rec.entries.push({ line: null, text: L(zh, en), focus: tree.root ? tree.root.id : null, nodes: snapshot(tree.root) });
  }

  /* main 之一：插入一串键（其中 45 会触发 LR 双旋） */
  function opInsert(keys) {
    const rec = { entries: [] };
    const tree = new AVL(rec);
    keys.forEach(k => {
      tree.root = tree.insert(tree.root, k);
      withEntry(rec, tree, `${k} 插入完成：树高 ${h(tree.root)}，根为 ${tree.root.key}`,
                           `${k} inserted: height ${h(tree.root)}, root is ${tree.root.key}`);
    });
    return rec;
  }

  /* main 之二：在种子树里查找。键必须真的在树里，否则演示不出命中路径。 */
  function opSearch(key) {
    if (!SEED.includes(key)) throw new Error(`${key} 不在种子树 ${SEED.join(',')} 里，查找演示会跑成失败路径`);
    const { tree, rec } = seedTree();
    withEntry(rec, tree, `树已就绪；开始查找 ${key}`, `Tree ready; search for ${key}`);
    tree.rec = rec;
    tree.find(tree.root, key);
    return rec;
  }

  /* main 之三：删除有两个孩子的节点 */
  function opDelete(key) {
    if (!SEED.includes(key)) throw new Error(`${key} 不在种子树 ${SEED.join(',')} 里`);
    const { tree, rec } = seedTree();
    withEntry(rec, tree, `树已就绪；准备删除 ${key}`, `Tree ready; delete ${key}`);
    tree.rec = rec;
    tree.root = tree.remove(tree.root, key);
    withEntry(rec, tree, `${key} 删除完成：树高 ${h(tree.root)}，根为 ${tree.root ? tree.root.key : '—'}`,
                         `${key} removed: height ${h(tree.root)}, root is ${tree.root ? tree.root.key : '—'}`);
    return rec;
  }

  /* -------------------------------------------------------------------------
   * 源码暴露：代码面板直接渲染下面这些函数的真实函数体，不手抄。
   * _log 的第一个参数是"该函数内第几行"（1 起），因为每个函数第一行就是
   * 它的声明行；移动函数体不会让面板高亮错位。check-avl.js 会校验这件事。
   * ---------------------------------------------------------------------- */
  /* 源码从哪来：
   *   node            → 直接读本文件（自测、生成 bundle 用）
   *   浏览器          → 读 ds/avl.code.js 里固化的类体（file:// 下也能用，不依赖 XHR）
   *   浏览器 + 注入   → 若页面提供了 window.__AVL_SRC__（完整源码），优先用它，更"活" */
  const SRC = (typeof window === 'undefined')
    ? require('fs').readFileSync(__filename, 'utf8')
    : (window.__AVL_SRC__ || '');

  /* 浏览器里没有整份源码时，就用 bundle 的类体（已经去掉外层缩进） */
  const BUNDLE = (typeof window !== 'undefined' && window.AVL_SOURCE_BUNDLE) || null;

  function dedent(text, extra) {
    const pad = extra || '';
    const lines = text.replace(/\t/g, '  ').split('\n');
    let min = Infinity;
    lines.forEach(l => { if (l.trim()) min = Math.min(min, l.match(/^ */)[0].length); });
    if (!isFinite(min)) min = 0;
    return lines.map(l => (l.trim() ? pad + l.slice(min) : '')).join('\n').replace(/\s+$/, '');
  }

  /* 扫描前先把注释和字符串清成空格（保留换行），避免匹配到注释里的示例代码 */
  function blankOutComments(text) {
    let out = '', i = 0;
    while (i < text.length) {   // 面板行 219
      const c = text[i], n = text[i + 1];
      if (c === '/' && n === '*') { const e = text.indexOf('*/', i + 2); const stop = e === -1 ? text.length : e + 2; out += text.slice(i, stop).replace(/[^\n]/g, ' '); i = stop; }
      else if (c === '/' && n === '/') { const e = text.indexOf('\n', i); const stop = e === -1 ? text.length : e; out += ' '.repeat(stop - i); i = stop; }
      else if (c === '"' || c === "'" || c === '`') { let j = i + 1; while (j < text.length && text[j] !== c) { if (text[j] === '\\') j++; j++; } out += text.slice(i, j + 1).replace(/[^\n]/g, ' '); i = j + 1; }
      else { out += c; i++; }
    }
    return out;
  }

  /* 抽出 `class AVL { ... }` 整块（真实源码，保持原有注释与相对行距） */
  const CLEAN = blankOutComments(SRC);
  const SOURCE_BLOCKS = {};
  (function fromBundle() {
    if (SRC || !BUNDLE || !BUNDLE.src) return;
    /* bundle 存的是类体原始源码；下面 classCode 走同一条 dedent 管线，
     * 于是"打印行号"在浏览器和 node 下完全一致。 */
    SOURCE_BLOCKS[BUNDLE.cls] = { name: BUNDLE.cls, startLine: BUNDLE.line, src: BUNDLE.src };
  })();
  (function parseClasses() {
    if (!SRC) return;
    const re = /class\s+([A-Za-z_$][\w$]*)\s*\{/g;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(CLEAN))) {
      const braceAt = m.index + m[0].length - 1;
      let depth = 0, end = braceAt;
      for (let i = braceAt; i < SRC.length; i++) {
        const c = CLEAN[i];
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (!depth) { end = i; break; } }
      }
      const startLine = SRC.slice(0, m.index).split('\n').length;      // class 关键字所在行
      SOURCE_BLOCKS[m[1]] = { name: m[1], startLine, src: SRC.slice(m.index, end + 1) };
    }
  })();

  /* 方法名下移到类体里的相对行号 */
  function memberLines(className) {
    const block = SOURCE_BLOCKS[className];
    if (!block) throw new Error('avl.js: 找不到 class ' + className);
    const out = {};
    block.src.split('\n').forEach((l, i) => {
      const m = l.match(/^ {4}(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/);
      if (m) out[m[1]] = i + 1;                                          // 1 起，相对 class 行
    });
    return out;
  }

  /* 代码面板用：把类体打印出来（去掉最外层缩进），并给出成员名的显示行号 */
  function classCode(className) {
    const block = SOURCE_BLOCKS[className];
    if (!block) throw new Error('avl.js: 找不到 class ' + className);
    return { text: dedent(block.src), members: memberLines(className), sourceLine: block.startLine };
  }

  /* 自检：每个 _log(行号) 的高亮目标必须存在，且不是注释/空行。
   * 页面加载和 check-avl.js 都会调用它。 */
  function auditLogTargets(className) {
    const printed = classCode(className).text.split('\n');
    const problems = [];
    let count = 0;
    printed.forEach((line, i) => {
      const m = line.match(/this\._log\((\d+),/);
      if (!m) return;
      count++;
      const t = Number(m[1]);
      const target = printed[t - 1] || '';
      if (t < 1 || t > printed.length) problems.push({ from: i + 1, to: t, why: 'out of range' });
      else if (!target.trim()) problems.push({ from: i + 1, to: t, why: 'blank line' });
      else if (/^\s*(\/\/|\*|\/\*)/.test(target)) problems.push({ from: i + 1, to: t, why: 'comment line' });
    });
    return { count, problems };
  }

  /* 代码面板所需的全部东西，一次打包给出（页面与生成脚本共用同一份口径） */
  function sourceBundle(className) {
    const cc = classCode(className);
    const block = SOURCE_BLOCKS[className];
    return {
      cls: className,
      line: block.startLine,          // class 关键字在源文件里的行号
      src: block.src,                 // 类体原始源码（页面用它与 node 走同一条管线）
      members: cc.members,            // 成员名 → 打印行号
      audit: auditLogTargets(className),
      checksum: checksum(cc.text)
    };
  }

  /* 极简稳定校验和：只用来发现"页面里的代码和算法对不上" */
  function checksum(text) {
    let hnum = 2166136261;
    for (let i = 0; i < text.length; i++) { hnum ^= text.charCodeAt(i); hnum = Math.imul(hnum, 16777619); }
    return (hnum >>> 0).toString(16);
  }

  const API = { AVL, AVLNode, snapshot, SEED, h, L, seedTree,
                ops: { insert: opInsert, search: opSearch, delete: opDelete },
                classCode, memberLines, auditLogTargets, sourceBundle, checksum, source: SRC };
  global.AVLTree = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
