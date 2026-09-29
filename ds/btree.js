/*!
 * B 树与 B+ 树 —— 真实实现
 *
 * 两者共用同一套骨架（多路、有序、叶子同深度），差别只有三条：
 *
 *   B 树           每个节点既存键也存记录；分裂时中间键**上移**，
 *                  于是同一个键在树里只出现一次。
 *   B+ 树          内部节点只存"分隔键"（导航用），完整记录全在叶子，
 *                  叶子按键顺序链成一条链；分裂时中间键**复制**上去，
 *                  于是分隔键会同时留在叶子里 —— 这正是范围查询快的原因。
 *
 * 删除都比插入麻烦：孩子太少时要先向兄弟借，借不到就合并，合并可能一路传上去。
 * 这一页把借位/合并的每一步都留痕，因为教材最容易在这里讲糊。
 *
 * t = 最小度数（这里 2，即每个节点最多 4 个键、最少 1 个键；根可以只有 1 个键）。
 */
(function (global) {
  'use strict';

  const Trace = (typeof require === 'function')
    ? require('../shared/trace.js').Trace
    : global.SlowMoTrace.Trace;

  let nextId = 1;

  class BNode {
    constructor(leaf) { this.id = nextId++; this.keys = []; this.children = []; this.leaf = leaf; }
  }

  /* 节点身份是 id；显示用 label 由键拼出来，不参与身份 */
  const label = n => n.keys.join(' | ');

  class BTreeBase extends Trace {
    constructor(t, plus) {
      super();
      this.t = t || 2;
      this.MAX = 2 * this.t - 1;          // 最多 2t-1 个键
      this.MIN = this.t - 1;              // 非根节点最少 t-1 个键
      this.plus = !!plus;                 // true = B+ 树
      this._root = new BNode(true);
      this.chain = [];                    // B+ 树：叶子的从左到右顺序
      this.entries.length = 0;
    }

    /* --- 交给记录器的接口 ------------------------------------------------ */
    root() { if (this.plus) this._relink(); return this._root; }
    kids(n) { return n.children; }
    /* 节点显示：B+ 树的内部节点标成"分隔键"，叶子标成记录 */
    extras(n) { return { keys: n.keys.slice(), label: n.keys.join(' | '), kind: this.plus && !n.leaf ? 'sep' : 'rec' }; }
    static resetIds() { nextId = 1; }
    /* 会话层在"造好空树、还没撒种子"的时候会调这个（见 shared/tree-session.js）。
     * 构造函数已经给根发过号了，这里如果只把计数器拨回 1，紧接着新建的节点就会
     * 和根撞号 —— frames.js 的"id 唯一"当场失败，视图按 id 复用 DOM 也会错位。
     * 所以这里把树里已有的节点重新编号，计数器接在最后一个后面。 */
    resetIds() {
      let n = 0;
      (function walk(x) { x.id = ++n; x.children.forEach(walk); })(this._root);
      nextId = n + 1;
    }

    get rootNode() { return this._root; }
    set rootNode(v) { this._root = v; }
    get refused() { return this._refused || null; }
    set refused(v) { this._refused = v; }

    /* B+ 树：把叶子按左右顺序串起来，链是结构的一部分 */
    _relink() {
      const leaves = [];
      (function walk(n) { if (!n) return; if (n.leaf) { leaves.push(n); return; } n.children.forEach(walk); })(this._root);
      this.chain = leaves;
      leaves.forEach((n, i) => { n.next = leaves[i + 1] || null; });
    }

    /* 调试用：孩子数必须永远是键数+1。自检让错误停在现场，而不是传到几步之后。 */
    _audit(tag) {
      if (!this.__audit) return;
      const bad = [];
      (function walk(n, path) {
        if (n.children.length !== 0 && n.children.length !== n.keys.length + 1) {
          bad.push(`${path} keys=[${n.keys}] children=${n.children.length}`);
        }
        n.children.forEach((c, i) => walk(c, path + '/' + i));
      })(this._root, 'root');
      if (bad.length) throw new Error(`${tag}: ${bad.join(' ; ')}`);
    }

    _size(n) { return n ? n.keys.length + n.children.reduce((a, c) => a + this._size(c), 0) : 0; }
    _height(n) { return n && !n.leaf ? 1 + this._height(n.children[0]) : 1; }

    /* 键是否在树里（B+ 树只看叶子） */
    has(key) { return !!this.find(this._root, key); }

    /* ------------------------------------------------------------------ 查找 */
    find(root, key) {
      let n = root, depth = 0;
      while (n) {
        /* 在节点内部线性比较（节点很小，教材都这么写） */
        let i = 0;
        while (i < n.keys.length && key > n.keys[i]) {
          this._log(`比较：${key} > ${n.keys[i]}，继续往右看`, `Compare: ${key} > ${n.keys[i]}, keep moving right`, n.id,
                    `${key} 比 ${n.keys[i]} 大`, `${key} is greater than ${n.keys[i]}`);
          i++;
        }
        if (i < n.keys.length && key === n.keys[i]) {
          if (!this.plus) {
            this._log(`命中：${key} 就在这个节点里（第 ${depth + 1} 层）`,
                      `Hit: ${key} is inside this node (level ${depth + 1})`, n.id,
                      `找到了`, `found it`);
            return n;
          }
          /* B+ 树的内部节点只是分隔符：即使相等也要落到叶子里去 */
          if (n.leaf) {
            this._log(`命中：${key} 在叶子里（第 ${depth + 1} 层）`,
                      `Hit: ${key} is in a leaf (level ${depth + 1})`, n.id,
                      `在叶子里找到了`, `found it in a leaf`);
            return n;
          }
          this._log(`内部节点里也有 ${key}，但那只是分隔键，真正的记录在叶子里`,
                    `The internal node also holds ${key}, but that is only a separator; the record lives in a leaf`, n.id,
                    `分隔键不算命中，继续下到叶子`, `a separator is not a hit, descend to a leaf`);
        }
        if (n.leaf) {
          this._log(`${key} 不在这个叶子里：B 树只走一条根到叶的路径，没找到就是没有`,
                    `${key} is not in this leaf: a B-tree walks one root-to-leaf path, so it is absent`, n.id,
                    `叶子走到底，没有`, `reached the leaf, not there`);
          return null;
        }
        /* i 是"第一个不小于 key 的分隔键"，命中判定用它；
         * 但选孩子要用另一套下标：key 等于分隔键时，记录在右边那棵子树里
         * （B+ 的分隔键就是右子树的最小键），所以要往右走一格。
         * 两件事共用 i 会让"命中"和"下降"互相拆台 —— 之前就这么错过。 */
        const hitSep = i < n.keys.length && key === n.keys[i];
        const down = hitSep ? i + 1 : i;
        const where = down >= n.keys.length ? `${key} 比所有分隔键都大` : (key > n.keys[down] ? `${key} 比 ${n.keys[down]} 大` : `${key} 不大于 ${n.keys[down]}`);
        const whereEn = down >= n.keys.length ? `${key} is greater than every separator` : (key > n.keys[down] ? `${key} is greater than ${n.keys[down]}` : `${key} is not greater than ${n.keys[down]}`);
        this._log(`下到第 ${down + 1} 个孩子（${where}）`, `Descend into child ${down + 1} (${whereEn})`,
                  n.children[down] ? n.children[down].id : n.id,
                  `沿着分隔键下到孩子`, `follow the separators down`);
        n = n.children[down];
        depth++;
      }
      return null;
    }

    /* ------------------------------------------------------------------ 插入
     * 两个阶段，照教科书写：
     *   1. 下降时预防性分裂：孩子满了先劈开，保证要插进去的节点一定有位置；
     *      根满了就先劈根，树长高一层。
     *   2. 往回走时把中间键提上去（B 树是上移，B+ 树的叶子是复制）。
     * B+ 树的叶子分裂后会留在 2t-1 个键（上限），所以"孩子分裂完要提键"之前
     * 必须先确认父节点还有空位 —— 满的话就把父节点劈开，让提键发生在新父节点上。 */
    insert(root, key) {
      this._refused = null;
      this._relinkIfPlus();
      const existing = this.find(root, key);
      if (existing) {
        this._log(`${key} 已经存在，插入被忽略（键唯一）`, `${key} already exists, insert ignored (keys stay unique)`, existing.id,
                  `键已存在，跳过`, `key already exists, skip`);
        return root;
      }
      this._log(`从根开始找 ${key} 该去哪个叶子`, `Start at the root and find the leaf for ${key}`, root.id,
                `先走到目标叶子`, `walk down to the target leaf`);
      let node = root;
      if (node.keys.length >= this.MAX) {
        /* 劈根分两步（先分两半、再建新根），中间那一瞬间右半边还没挂回去。
         * 所以劈的时候先别留痕，等新根挂好再一次性记一帧 —— 否则读者会看到
         * "一步删掉 8 个节点、又一步加回来 10 个"这种假动作。 */
        const sp = this._split(node, 0, true);
        const fresh = new BNode(false);
        fresh.keys = [sp.midKey];
        fresh.children = [sp.left, sp.right];
        this._root = fresh;
        node = fresh;
        this._log(`根满了，劈成 [${label(sp.left)}] 和 [${label(sp.right)}]：${sp.midKey} 升上来当新的根，树长高一层（现在 ${this._height(fresh)} 层）`,
                  `The root was full, so it splits into [${label(sp.left)}] and [${label(sp.right)}]: ${sp.midKey} rises to become the new root and the tree grows one level (now ${this._height(fresh)} levels)`,
                  fresh.id, `根分裂，树长高`, `the root splits, the tree grows`);
      }
      const res = this._insertNonFull(node, key, 0);
      if (res && res.split) {
        /* 根又分裂了（只在根同时是叶子时可能发生，比如 B 树第一次插入撑满） */
        const fresh = new BNode(false);
        fresh.keys = [res.midKey];
        fresh.children = [res.left, res.right];
        this._root = fresh;
        node = fresh;
        this._log(`根分裂完了：${res.midKey} 成为新的根，树长高一层`,
                  `The root split: ${res.midKey} becomes the new root and the tree grows one level`,
                  fresh.id, `根分裂，树长高`, `the root splits, the tree grows`);
      }
      if (this.plus) this._relink();
      this._audit('插入后 ' + key);
      return node;
    }

    /* 往"还有空位"的节点里插。返回 {split:true,...} 表示这棵子树劈成了两半、要父节点接收。
     *
     * 两件事都要做，少一件都会在某个顺序下炸：
     *   1. 下降时若孩子满了，先劈开它再往下 —— 这样"要插进去的那个节点"一定有位置；
     *      当前节点因此多一个键，但它进门时非满（根已预先劈过），所以收得下。
     *   2. 回溯时孩子若又劈了，把中间键和右半边收进来 —— 此时自己同样还有空位。
     * 只做 1 会丢键（往下插时目标已满），只做 2 会遇到"孩子满 + 自己满"的死角。 */
    _insertNonFull(n, key, depth) {
      if (n.leaf) {
        const at = n.keys.findIndex(k => k > key);
        const pos = at < 0 ? n.keys.length : at;
        n.keys.splice(pos, 0, key);
        this._log(`插到叶子的第 ${pos + 1} 个位置：这个叶子现在是 [${label(n)}]`,
                  `Insert at position ${pos + 1} of the leaf: it now reads [${label(n)}]`, n.id,
                  `叶子插入完成`, `inserted into the leaf`);
        /* 满了先别留痕：此刻右半边还没挂回父节点，拍下来就是"凭空少了几个节点"。
         * 交给调用者在挂好之后一次性记一帧。 */
        return n.keys.length > this.MAX ? this._split(n, depth, true) : null;
      }
      let i = 0;
      while (i < n.keys.length && key > n.keys[i]) i++;
      const child = n.children[i];
      if (child.keys.length >= this.MAX) {
        const sp = this._split(child, depth + 1, true);
        n.keys.splice(i, 0, sp.midKey);
        n.children.splice(i + 1, 0, sp.right);
        this._log(`第 ${i + 1} 个孩子满了，先劈成 [${label(sp.left)}] 和 [${label(sp.right)}]；${sp.midKey} 提上来插到第 ${i + 1} 个位置，这个节点现在是 [${label(n)}]`,
                  `Child ${i + 1} was full, so it splits into [${label(sp.left)}] and [${label(sp.right)}]; ${sp.midKey} is promoted into position ${i + 1} and the node now reads [${label(n)}]`,
                  n.id, `先劈满孩子，中间键提上来`, `split the full child and promote its middle key`);
        if (key > sp.midKey) i++;
      }
      const sub = this._insertNonFull(n.children[i], key, depth + 1);
      if (!sub || !sub.split) return null;
      /* 孩子在中途又劈了：收下中间键与右半边。进门时非满、只被加过一个键，所以收得下。 */
      if (n.keys.length >= this.MAX) {
        throw new Error('收不下孩子的分裂：父节点本应还有空位');
      }
      n.keys.splice(i, 0, sub.midKey);
      n.children.splice(i + 1, 0, sub.right);
      this._log(`孩子劈成 [${label(sub.left)}] 和 [${label(sub.right)}]，${sub.midKey} 提上来插到第 ${i + 1} 个位置：这个节点现在是 [${label(n)}]`,
                `The child split into [${label(sub.left)}] and [${label(sub.right)}]; ${sub.midKey} is promoted into position ${i + 1} and the node now reads [${label(n)}]`,
                n.id, `中间键提上来`, `the middle key moves up`);
      return n.keys.length > this.MAX ? this._split(n, depth) : null;
    }

    /* 分裂：B 树把中间键上移；B+ 树的叶子是"复制"上去，分隔键留在叶子里。
     * 分裂点取 floor((n-1)/2)：n 个键时左边 floor((n-1)/2) 个、右边 n-1-左边 个，
     * 两半都不超过上限。写成 floor(n/2) 的话 4 个键会切成"1 + 3"，右半边又是满的。 */
    _split(n, depth, quiet) {
      const mid = Math.floor((n.keys.length - 1) / 2);
      if (this.plus && n.leaf) {
        const right = new BNode(true);
        right.keys = n.keys.slice(mid);
        n.keys = n.keys.slice(0, mid);
        if (!quiet) this._log(`叶子分裂成 [${label(n)}] 和 [${label(right)}]；${right.keys[0]} 复制一份上去当分隔键（叶子里仍然留着它）`,
                  `The leaf splits into [${label(n)}] and [${label(right)}]; ${right.keys[0]} is copied up as a separator (it stays in the leaf)`,
                  n.id, `叶子分裂，分隔键复制上去`, `leaf split, the separator is copied up`);
        return { split: true, midKey: right.keys[0], right, left: n };
      }
      const midKey = n.keys[mid];
      const right = new BNode(n.leaf);
      right.keys = n.keys.slice(mid + 1);
      right.children = n.children.slice(mid + 1);
      n.keys = n.keys.slice(0, mid);
      n.children = n.children.slice(0, mid + 1);
      if (!quiet) this._log(`分裂成 [${label(n)}] 和 [${label(right)}]，中间键 ${midKey} ${this.plus ? '复制' : '上移'}到父节点`,
                `Split into [${label(n)}] and [${label(right)}]; the middle key ${midKey} ${this.plus ? 'is copied' : 'moves'} up`,
                n.id, `中间键 ${midKey} ${this.plus ? '复制' : '上移'}`, `${midKey} goes up`);
      return { split: true, midKey, right, left: n };
    }

    /* ------------------------------------------------------------------ 删除
     * 删除比插入多两件麻烦事：
     *   1. 摘掉一个键可能让节点低于下限，所以下降之前先"补够"：目标孩子只有
     *      MIN 个键时，先向有富余的兄弟借一个（父子之间转一下），借不到就把它
     *      和兄弟连同分隔键合并。这样一路走到叶子，摘完键也不会欠账；合并会把
     *      父节点掏空，于是空了的根退位，树矮一层。
     *   2. B+ 树内部节点的键只是分隔符，含义是"右子树的最小键"。删掉叶子里最小
     *      的那个键之后，往上每一层的分隔键都要重新对齐 —— 这是 B+ 树删除最容易
     *      漏的一步（树看着还连通，查找和范围扫描却会走错路）。
     * B 树的键可以住在内部节点上：用左子树的最大键（前驱）或右子树的最小键
     * （后继）顶替，再下到子树里把前驱/后继删掉；两边都只有 MIN 个键时，把键
     * 拉下来和两个半边一起合并。 */
    remove(root, key) {
      this._refused = null;
      this._relinkIfPlus();
      if (!this.find(root, key)) {
        this._log(`${key} 不在这棵树里`, `${key} is not in this tree`, null, `不在这里`, `not in this tree`);
        return root;
      }
      this._log(`确认 ${key} 在树里，开始删除：下降前先补够，不够就借、借不到就合`,
                `${key} is in the tree; start deleting: top up on the way down, borrow or merge when short`, root.id,
                `开始删除`, `start the delete`);
      this._audit('删除前 ' + key);
      this._remove(root, key);
      const r = this._root;
      if (!r.leaf && r.keys.length === 0) {
        /* 根是唯一允许"空"的节点：空了就把唯一的孩子提上来，树矮一层 */
        this._root = r.children[0];
        this._log(`根空了：它唯一的孩子成为新根，树矮一层`,
                  `The root ran empty: its only child becomes the new root and the tree shrinks`, this._root.id,
                  `根空了，树矮一层`, `the root is empty, the tree shrinks`);
      } else if (r.leaf && r.keys.length === 0) {
        this._log(`树空了`, `The tree is now empty`, r.id, `删空了`, `now empty`);
      }
      this._relinkIfPlus();
      this._audit('删除后 ' + key);
      return this._root;
    }

    /* 把 key 从 n 这棵子树里摘掉。返回 {underflow:true} 表示这棵子树删完不够了，
     * 需要调用者收拾 —— 下降前先补够的话，只有根会遇到。 */
    _remove(n, key) {
      if (n.leaf) {
        const at = n.keys.indexOf(key);
        if (at < 0) return null;
        n.keys.splice(at, 1);
        this._log(`从叶子里摘掉 ${key}：现在是 [${n.keys.length ? label(n) : '空'}]`,
                  `Remove ${key} from the leaf: now [${n.keys.length ? label(n) : 'empty'}]`, n.id,
                  `叶子摘掉 ${key}`, `removed ${key} from the leaf`);
        return { underflow: n.keys.length < this.MIN };
      }
      let i = this._childIndex(n, key);
      /* B 树：键就住在内部节点上 */
      if (!this.plus && i < n.keys.length && n.keys[i] === key) return this._removeOwnKey(n, key, i);
      i = this._topUp(n, i);
      const sub = this._remove(n.children[i], key);
      if (sub && sub.underflow) i = this._fixChild(n, i);
      /* B+ 树：孩子的最小键可能变了，往上修正这一层的分隔键 */
      if (this.plus) this._refreshSeparator(n, i);
      return { underflow: n.keys.length < this.MIN };
    }

    /* key 该落在这个节点的第几个孩子里。
     * B 树：相等的键说明"键就在这个节点上"，下标停在它左边的孩子；
     * B+ 树：分隔键等于右子树的最小键，相等就要往右走 —— 记录在右边那半边。 */
    _childIndex(n, key) {
      let i = 0;
      if (this.plus) { while (i < n.keys.length && key >= n.keys[i]) i++; }
      else { while (i < n.keys.length && key > n.keys[i]) i++; }
      return i;
    }

    /* B 树专有：要删的键正住在内部节点上 —— 前驱/后继顶替，或者把键拉下来合并。 */
    _removeOwnKey(n, key, i) {
      const left = n.children[i], right = n.children[i + 1];
      if (left.keys.length > this.MIN) {
        const pred = this._maxKey(left);
        this._log(`${key} 住在内部节点里：用左子树的最大键 ${pred} 顶替（前驱），再到那个子树里把 ${pred} 删掉`,
                  `${key} lives in an internal node: replace it with the predecessor ${pred}, the maximum of the left subtree, then delete ${pred} down there`,
                  n.id, `内部节点上的键：前驱顶替`, `internal key: take the predecessor`);
        const sub = this._remove(left, pred);
        const was = n.keys[i];
        n.keys[i] = pred;                 // 先改结构再留痕：画面和旁白必须是同一时刻的状态
        this._log(`前驱 ${pred} 接替 ${was} 的键位：这个节点现在是 [${label(n)}]`,
                  `The predecessor ${pred} takes over the slot of ${was}: the node now reads [${label(n)}]`, n.id,
                  `前驱补位完成`, `the predecessor is in place`);
        if (sub && sub.underflow) this._fixChild(n, i);
        return { underflow: n.keys.length < this.MIN };
      }
      if (right.keys.length > this.MIN) {
        const succ = this._minKey(right);
        this._log(`${key} 住在内部节点里：用右子树的最小键 ${succ} 顶替（后继），再到那个子树里把 ${succ} 删掉`,
                  `${key} lives in an internal node: replace it with the successor ${succ}, the minimum of the right subtree, then delete ${succ} down there`,
                  n.id, `内部节点上的键：后继顶替`, `internal key: take the successor`);
        const sub = this._remove(right, succ);
        const was = n.keys[i];
        n.keys[i] = succ;                 // 先改结构再留痕，画面和旁白同一时刻
        this._log(`后继 ${succ} 接替 ${was} 的键位：这个节点现在是 [${label(n)}]`,
                  `The successor ${succ} takes over the slot of ${was}: the node now reads [${label(n)}]`, n.id,
                  `后继补位完成`, `the successor is in place`);
        if (sub && sub.underflow) this._fixChild(n, i + 1);
        return { underflow: n.keys.length < this.MIN };
      }
      this._log(`左右孩子都只有 ${this.MIN} 个键，谁都借不出：把 ${key} 拉下来，和两个半边合并成一个满节点`,
                `Both children hold just ${this.MIN} keys and can lend nothing: pull ${key} down and merge the two halves into one full node`,
                n.id, `两边都借不动：键拉下来合并`, `neither side can lend: pull the key down and merge`);
      this._merge(n, i);
      const sub = this._remove(n.children[i], key);
      if (sub && sub.underflow) this._fixChild(n, i);
      return { underflow: n.keys.length < this.MIN };
    }

    /* 下降之前保证第 i 个孩子"摘掉一个键之后仍然够"：至少 MIN+1 个键。
     * 返回补完之后这个孩子的下标（和左兄弟合并的话会减一）。 */
    _topUp(n, i) {
      const c = n.children[i];
      if (!c || c.keys.length > this.MIN) return i;
      this._log(`第 ${i + 1} 个孩子只有 ${c.keys.length} 个键：先补够再往下，免得到时候欠账`,
                `Child ${i + 1} holds only ${c.keys.length} keys: top it up before descending so it cannot run short`,
                c.id, `先补够再往下`, `top it up before descending`);
      return this._fill(n, i);
    }

    /* 孩子删完不够了：借得到就借，借不到就合。下降前先补够的话不该发生，这是兜底。 */
    _fixChild(n, i) {
      const c = n.children[i];
      if (!c || c.keys.length >= this.MIN) return i;
      this._log(`第 ${i + 1} 个孩子删完只剩 ${c.keys.length} 个键，低于下限 ${this.MIN}：向兄弟借或合并`,
                `Child ${i + 1} fell to ${c.keys.length} keys, below the minimum ${this.MIN}: borrow from a sibling or merge`,
                c.id, `欠账了，就地补`, `short by one, fix it here`);
      return this._fill(n, i);
    }

    /* 子树里的最大/最小键：一路走到底（B+ 树的最小键也一定在左边的叶子里） */
    _maxKey(n) { while (!n.leaf) n = n.children[n.children.length - 1]; return n.keys[n.keys.length - 1]; }
    _minKey(n) { while (!n.leaf) n = n.children[0]; return n.keys[0]; }

    /* 保证第 i 个孩子至少有 MIN+1 个键：先向左右兄弟借，借不到就合。
     * 返回"补完之后这个孩子落在哪个下标"——和左兄弟合并的话会减一，
     * 调用者（下降/回溯）要接着用这个新下标。 */
    _fill(n, i) {
      const c = n.children[i];
      if (i > 0 && n.children[i - 1].keys.length > this.MIN) return this._borrowFromLeft(n, i);
      if (i < n.children.length - 1 && n.children[i + 1].keys.length > this.MIN) return this._borrowFromRight(n, i);
      /* 两边都没有富余：合并。左边有兄弟就往左并，否则（i 是最后一个孩子）并 i-1 和 i */
      const at = i < n.children.length - 1 ? i : i - 1;
      this._merge(n, at);
      return at;
    }

    /* 向左兄弟借一个键（它有富余）。B+ 树的分隔键含义是"右子树的最小键"，
     * 所以分隔键要换成搬过来的那个键；搬的是内部节点时，孩子指针也得一起搬。 */
    _borrowFromLeft(n, i) {
      const c = n.children[i], left = n.children[i - 1];
      const sep = n.keys[i - 1];
      if (this.plus && !c.leaf) {
        /* 内部节点搬的是"最后一个孩子"：它自己的最小键在父节点里（就是 sep），
         * 所以只有 sep 下来给这个孩子当左边界；那个孩子的最小键升上去当新分隔键。
         * 搬一个孩子只加一个键 —— 多加一个键就会出现"3 个键配 3 个孩子"。 */
        const movedKey = left.keys.pop();
        const movedChild = left.children.pop();
        c.children.unshift(movedChild);
        c.keys.unshift(sep);
        n.keys[i - 1] = movedKey;
        this._log(`向左兄弟借：孩子 [${label(movedChild)}] 搬过来（原分隔键 ${sep} 下来当它的左边界），它的最小键 ${movedKey} 升上去当新的分隔键`,
                  `Borrow from the left sibling: child [${label(movedChild)}] moves over (the old separator ${sep} drops in as its left bound) and its smallest key ${movedKey} goes up as the new separator`,
                  c.id, `向左兄弟借（内部节点：连孩子一起搬）`, `borrow left (internal: a child moves too)`);
        return i;
      }
      const moved = left.keys.pop();
      if (!c.leaf) c.children.unshift(left.children.pop());
      if (this.plus) {
        c.keys.unshift(moved);
        n.keys[i - 1] = moved;
        this._log(`向左兄弟借：${moved} 挪到 [${label(c)}]，它成了这半边的最小键，分隔键跟着换成 ${moved}`,
                  `Borrow from the left sibling: ${moved} moves to [${label(c)}] and becomes its smallest key, so the separator becomes ${moved}`,
                  c.id, `向左兄弟借`, `borrow from the left`);
      } else {
        c.keys.unshift(sep);
        n.keys[i - 1] = moved;
        this._log(`向左兄弟借：分隔键 ${sep} 下来当 ${label(c)} 里最小的键，${moved} 上去当新的分隔键`,
                  `Borrow from the left sibling: the separator ${sep} drops in as the smallest key of [${label(c)}], and ${moved} takes its place as separator`,
                  c.id, `向左兄弟借`, `borrow from the left`);
      }
      return i;
    }

    /* 向右兄弟借一个键（它有富余）。 */
    _borrowFromRight(n, i) {
      const c = n.children[i], right = n.children[i + 1];
      const sep = n.keys[i];
      if (this.plus && !c.leaf) {
        const movedChild = right.children.shift();
        const movedKey = right.keys.shift();
        c.children.push(movedChild);
        c.keys.push(sep);              // sep 就是搬来的这个孩子的最小键
        n.keys[i] = movedKey;          // 右兄弟挪走第一个孩子后，最小键变成它原来的第一个分隔键
        this._log(`向右兄弟借：孩子 [${label(movedChild)}] 搬过来，配的最小键是原分隔键 ${sep}；右兄弟新的最小键 ${movedKey} 上去当分隔键`,
                  `Borrow from the right sibling: child [${label(movedChild)}] moves over with the old separator ${sep} as its smallest key; the sibling's new smallest key ${movedKey} goes up as the separator`,
                  c.id, `向右兄弟借（内部节点：连孩子一起搬）`, `borrow right (internal: a child moves too)`);
        return i;
      }
      const moved = right.keys.shift();
      if (!c.leaf) c.children.push(right.children.shift());
      if (this.plus) {
        c.keys.push(moved);
        n.keys[i] = right.keys[0];
        this._log(`向右兄弟借：${moved} 挪到 [${label(c)}]，右兄弟新的最小键 ${n.keys[i]} 上去当分隔键`,
                  `Borrow from the right sibling: ${moved} moves to [${label(c)}]; the sibling's new smallest key ${n.keys[i]} goes up as the separator`,
                  c.id, `向右兄弟借`, `borrow from the right`);
      } else {
        c.keys.push(sep);
        n.keys[i] = moved;
        this._log(`向右兄弟借：分隔键 ${sep} 下来当 ${label(c)} 里最大的键，${moved} 上去当新的分隔键`,
                  `Borrow from the right sibling: the separator ${sep} drops in as the largest key of [${label(c)}], and ${moved} takes its place as separator`,
                  c.id, `向右兄弟借`, `borrow from the right`);
      }
      return i;
    }

    /* 合并：左边吞掉右边，父节点少一个键和一个孩子（下标 i 的那个分隔键消失）。
     * B 树：分隔键本身就是记录，必须一起下来。
     * B+ 树：两个叶子合并时，分隔键只是叶子里那个键的复制品，丢掉；
     *        两个内部节点合并时，分隔键得下来给孩子指针当边界。 */
    _merge(n, i) {
      const left = n.children[i], right = n.children[i + 1];
      const sep = n.keys[i];
      if (this.plus && left.leaf) {
        left.keys = left.keys.concat(right.keys);
        n.keys.splice(i, 1);
        n.children.splice(i + 1, 1);
        this._log(`两边都借不到：两个叶子合并成 [${label(left)}]（分隔键 ${sep} 只是复制品，直接丢掉）`,
                  `Neither sibling can lend: the two leaves merge into [${label(left)}] and the separator ${sep} is simply dropped, it was only a copy`,
                  left.id, `叶子合并，分隔键丢掉`, `merge the leaves, drop the separator`);
      } else {
        left.keys = left.keys.concat([sep], right.keys);
        left.children = left.children.concat(right.children);
        n.keys.splice(i, 1);
        n.children.splice(i + 1, 1);
        this._log(`两边都借不到：连同分隔键 ${sep} 一起合并成 [${label(left)}]`,
                  `Neither sibling can lend: merge with the separator ${sep} into [${label(left)}]`,
                  left.id, `合并（分隔键也下来）`, `merge, the separator comes down`);
      }
      this._log(`合并之后父节点是 [${n.keys.length ? label(n) : '空'}]${n.keys.length ? '' : '：它自己也少了，向上继续处理'}`,
                `After the merge the parent reads [${n.keys.length ? label(n) : 'empty'}]${n.keys.length ? '' : ': it is short too, so handle it upwards'}`,
                n.id, `看看父节点够不够`, `check whether the parent is still fine`);
      return i;
    }

    /* B+ 树：第 i 个孩子的最小键变了，父节点里对应的分隔键要跟着改。
     * 第 0 个孩子没有分隔键 —— 它的上界由更上一层去修（回溯会一路修上去）。 */
    _refreshSeparator(n, i) {
      if (i <= 0) return i;
      const old = n.keys[i - 1];
      const mn = this._minKey(n.children[i]);
      if (old !== mn) {
        n.keys[i - 1] = mn;               // 先改结构再留痕，画面才是"改完之后"的样子
        this._log(`第 ${i + 1} 个孩子的最小键变成 ${mn}：分隔键从 ${old} 改成 ${mn}，导航才走得对`,
                  `The smallest key of child ${i + 1} is now ${mn}: the separator changes from ${old} to ${mn} so navigation stays correct`,
                  n.id, `分隔键跟着改`, `the separator follows`);
      }
      return i;
    }

    _relinkIfPlus() { if (this.plus) this._relink(); }
  }

  /* =========================================================================
   * 演示脚本
   * ====================================================================== */
  const SEED = [10, 20, 30, 40, 50, 60, 70, 80];
  const PLUS_SEED = [10, 20, 30, 40, 50, 60, 70, 80];

  function makeTree(plus) {
    const t = new BTreeBase(2, plus);
    const keys = plus ? PLUS_SEED : SEED;
    t.tracing = false;
    keys.forEach(k => { t.rootNode = t.insert(t.rootNode, k); });
    t.tracing = true; t.entries.length = 0;
    return t;
  }

  function ops(plus) {
    return {
      insert(keys) {
        const t = makeTree(plus);
        t.mark('树已就绪', 'Tree ready');
        (keys || [45, 55]).forEach(k => { t.rootNode = t.insert(t.rootNode, k); t.mark(`${k} 插入完成`, `${k} inserted`); });
        return t;
      },
      search(key) {
        const t = makeTree(plus);
        t.mark('树已就绪', 'Tree ready');
        t.find(t.rootNode, key === undefined ? 50 : key);
        return t;
      },
      delete(key) {
        const t = makeTree(plus);
        t.mark('树已就绪', 'Tree ready');
        t.rootNode = t.remove(t.rootNode, key === undefined ? 20 : key);
        t.mark(`${key} 删除完成`, `${key} removed`);
        return t;
      }
    };
  }

  const Base = (typeof require === 'function')
    ? require('../shared/tree-session.js').TreeSession
    : global.SlowMoTreeSession.TreeSession;

  /* 会话：键都是整数；keys() 用中序（B+ 树取叶子链，顺序同样是升序） */
  function sessionFor(plus) {
    return class BSession extends Base {
      constructor(seed) { super({ tree: () => new BTreeBase(2, plus), seed: seed || (plus ? PLUS_SEED : SEED) }); }
      /* B 树的键分布在整个树里，B+ 树的记录只在叶子里 —— 两种都要收集全 */
      keys() {
        const plus = this.tree.plus, out = [];
        (function walk(n) {
          if (!n) return;
          if (!(plus && !n.leaf)) out.push(...n.keys);
          n.children.forEach(walk);
        })(this.tree.rootNode);
        return out;
      }
      has(key) { return this.keys().includes(key); }
      height() { return this.tree._height(this.tree.rootNode); }
    };
  }

  const BTreeAPI = {
    BTree: BTreeBase, BNode, SEED,
    ops: ops(false),
    Session: sessionFor(false),
    makeTree: () => makeTree(false)
  };
  const BPlusAPI = {
    BPlusTree: BTreeBase, BNode, SEED: PLUS_SEED,
    ops: ops(true),
    Session: sessionFor(true),
    makeTree: () => makeTree(true)
  };
  /* 浏览器里两个页面各取一个；Node 里一次给出两个供工具使用 */
  global.BTreePage = BTreeAPI;
  global.BPlusPage = BPlusAPI;
  if (typeof module !== 'undefined' && module.exports) module.exports = { BTreeAPI, BPlusAPI };
})(typeof window !== 'undefined' ? window : globalThis);
