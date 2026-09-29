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
    extras(n) { return { keys: n.keys.slice(), kind: this.plus && !n.leaf ? 'sep' : 'rec' }; }
    static resetIds() { nextId = 1; }
    resetIds() { nextId = 1; }

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
        this._log(`根已经满了（${node.keys.length} 个键）：先劈开根，树长高一层`,
                  `The root is full (${node.keys.length} keys): split the root first and the tree grows`, node.id,
                  `先劈根`, `split the root first`);
        const sp = this._split(node, 0);
        const fresh = new BNode(false);
        fresh.keys = [sp.midKey];
        fresh.children = [sp.left, sp.right];
        this._root = fresh;
        node = fresh;
        this._log(`${sp.midKey} 成为新的根，树长高一层（现在 ${this._height(fresh)} 层）`,
                  `${sp.midKey} becomes the new root and the tree grows one level (now ${this._height(fresh)} levels)`,
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
        return n.keys.length > this.MAX ? this._split(n, depth) : null;
      }
      let i = 0;
      while (i < n.keys.length && key > n.keys[i]) i++;
      const child = n.children[i];
      if (child.keys.length >= this.MAX) {
        this._log(`第 ${i + 1} 个孩子已经满了（${child.keys.length} 个键）：先劈开它再往下`,
                  `Child ${i + 1} is full (${child.keys.length} keys): split it before descending`, child.id,
                  `下降前先劈开满孩子`, `split the full child before descending`);
        const sp = this._split(child, depth + 1);
        n.keys.splice(i, 0, sp.midKey);
        n.children.splice(i + 1, 0, sp.right);
        this._log(`${sp.midKey} 提上来插到第 ${i + 1} 个位置：这个节点现在是 [${label(n)}]`,
                  `${sp.midKey} is promoted into position ${i + 1}: the node now reads [${label(n)}]`, n.id,
                  `中间键提上来`, `the middle key moves up`);
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
      this._log(`${sub.midKey} 提上来插到第 ${i + 1} 个位置：这个节点现在是 [${label(n)}]`,
                `${sub.midKey} is promoted into position ${i + 1}: the node now reads [${label(n)}]`, n.id,
                `中间键提上来`, `the middle key moves up`);
      return n.keys.length > this.MAX ? this._split(n, depth) : null;
    }

    /* 分裂：B 树把中间键上移；B+ 树的叶子是"复制"上去，分隔键留在叶子里。
     * 分裂点取 floor((n-1)/2)：n 个键时左边 floor((n-1)/2) 个、右边 n-1-左边 个，
     * 两半都不超过上限。写成 floor(n/2) 的话 4 个键会切成"1 + 3"，右半边又是满的。 */
    _split(n, depth) {
      const mid = Math.floor((n.keys.length - 1) / 2);
      if (this.plus && n.leaf) {
        const right = new BNode(true);
        right.keys = n.keys.slice(mid);
        n.keys = n.keys.slice(0, mid);
        this._log(`叶子分裂成 [${label(n)}] 和 [${label(right)}]；${right.keys[0]} 复制一份上去当分隔键（叶子里仍然留着它）`,
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
      this._log(`分裂成 [${label(n)}] 和 [${label(right)}]，中间键 ${midKey} ${this.plus ? '复制' : '上移'}到父节点`,
                `Split into [${label(n)}] and [${label(right)}]; the middle key ${midKey} ${this.plus ? 'is copied' : 'moves'} up`,
                n.id, `中间键 ${midKey} ${this.plus ? '复制' : '上移'}`, `${midKey} goes up`);
      return { split: true, midKey, right, left: n };
    }

    /* ------------------------------------------------------------------ 删除
     * 下降之前先把目标孩子"补够"（保证删完还剩 MIN 个），所以进门时不会欠账；
     * 一路走到叶子，摘掉键；如果这个叶子因此低于下限，再自底向上修（借 / 合）。
     * B+ 树的记录只在叶子里，内部节点只做导航 —— 所以不存在"顶替内部键"这一步。 */
    remove(root, key) {
      this._refused = null;
      this._relinkIfPlus();
      if (!this.find(root, key)) {
        this._log(`${key} 不在这棵树里`, `${key} is not in this tree`, null, `不在这里`, `not in this tree`);
        return root;
      }
      this._log(`确认 ${key} 在树里，开始删除（路上先补够，不够就借、借不到就合）`,
                `${key} is in the tree; start deleting (top up on the way down; borrow, else merge)`, root.id,
                `开始删除`, `start the delete`);
      this._audit('删除前 ' + key);
      const res = this._remove(root, key);
      if (res && res.underflow && root.keys.length === 0 && !root.leaf && root.children.length === 1) {
        this._root = root.children[0];
        this._log(`根空了：它唯一的孩子成为新根，树矮一层`,
                  `The root ran empty: its only child becomes the new root and the tree shrinks`, this._root.id,
                  `根空了，树矮一层`, `the root is empty, the tree shrinks`);
      } else if (this._root.keys.length === 0 && this._root.leaf) {
        this._log(`树空了`, `The tree is now empty`, this._root.id, `删空了`, `now empty`);
      }
      this._relinkIfPlus();
      this._audit('删除后 ' + key);
      return this._root;
    }

    /* 返回 {underflow:true} 表示这一层的孩子删完不够了，需要调用者收拾 */
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
      let i = 0;
      while (i < n.keys.length && key > n.keys[i]) i++;
      if (!this.plus && i < n.keys.length && key === n.keys[i]) {
        /* B 树：键在内部节点上 —— 用前驱顶替，再到左子树里把前驱删掉 */
        const pred = this._maxKey(n.children[i]);
        this._log(`${key} 在内部节点里：用它左子树的最大键 ${pred} 顶替（前驱）`,
                  `${key} sits in an internal node: replace it with the predecessor ${pred}, the maximum of its left subtree`,
                  n.id, `内部节点：前驱顶替`, `internal node: take the predecessor`);
        this._topUp(n, i);
        const at = n.keys.indexOf(key);
        const target = at >= 0 ? at : i;
        const sub = this._remove(n.children[target], pred);
        if (n.keys[target] === key) n.keys[target] = pred;
        if (sub && sub.underflow) this._fixChild(n, target);
        return { underflow: n.keys.length < this.MIN && n.parent !== null };
      }
      this._topUp(n, i);
      /* 借位/合并会改动这一层的键，所以下标要重新算 */
      let j = 0;
      while (j < n.keys.length && key > n.keys[j]) j++;
      if (!this.plus && j < n.keys.length && key === n.keys[j]) {
        /* 补完之后键可能被挪到了分隔键上，重新走一次内部节点分支 */
        return this._remove(n, key);
      }
      const sub = this._remove(n.children[j], key);
      if (sub && sub.underflow) this._fixChild(n, j);
      return { underflow: n.keys.length < this.MIN };
    }

    /* 下降之前保证第 i 个孩子"删掉一个键之后仍然够" */
    _topUp(n, i) {
      const c = n.children[i];
      if (!c || c.keys.length > this.MIN) return;
      this._log(`第 ${i + 1} 个孩子只有 ${c.keys.length} 个键：删之前先借或合`,
                `Child ${i + 1} holds only ${c.keys.length} keys: borrow or merge before deleting`, c.id,
                `先补够再往下`, `top it up before descending`);
      this._fill(n, i);
    }

    /* 孩子删完不够了：借得到就借，借不到就合 */
    _fixChild(n, i) {
      const c = n.children[i];
      if (!c || c.keys.length >= this.MIN) return;
      if (n.children.length > 1) this._fill(n, i);
    }

    _maxKey(n) { while (!n.leaf) n = n.children[n.children.length - 1]; return n.keys[n.keys.length - 1]; }

    _maxKey(n) { while (!n.leaf) n = n.children[n.children.length - 1]; return n.keys[n.keys.length - 1]; }

    /* 保证第 i 个孩子至少有 MIN+1 个键：先借，借不到就合 */
    _fill(n, i) {
      const c = n.children[i];
      if (i > 0 && n.children[i - 1].keys.length > this.MIN) {
        const left = n.children[i - 1];
        const up = n.keys[i - 1];
        if (this.plus) {
          const moved = left.keys.pop();
          const sep = left.keys[left.keys.length - 1];
          n.keys[i - 1] = sep;
          c.keys.unshift(moved);
          this._log(`对左边兄弟借一个：${moved} 挪到 [${label(c)}]，分隔键换成 ${sep}`,
                    `Borrow from the left sibling: ${moved} moves to [${label(c)}] and the separator becomes ${sep}`,
                    c.id, `向左兄弟借`, `borrow from the left`);
        } else {
          const moved = left.keys.pop();
          c.keys.unshift(up);
          n.keys[i - 1] = moved;
          this._log(`对左边兄弟借一个：分隔键 ${up} 下来，${moved} 上去当新的分隔键`,
                    `Borrow from the left sibling: the separator ${up} moves down and ${moved} takes its place`,
                    c.id, `向左兄弟借`, `borrow from the left`);
        }
        return;
      }
      if (i < n.children.length - 1 && n.children[i + 1].keys.length > this.MIN) {
        const right = n.children[i + 1];
        const up = n.keys[i];
        if (this.plus) {
          const moved = right.keys.shift();
          n.keys[i] = right.keys[0];
          c.keys.push(moved);
          this._log(`对右边兄弟借一个：${moved} 挪到 [${label(c)}]，分隔键换成 ${n.keys[i]}`,
                    `Borrow from the right sibling: ${moved} moves to [${label(c)}] and the separator becomes ${n.keys[i]}`,
                    c.id, `向右兄弟借`, `borrow from the right`);
        } else {
          const moved = right.keys.shift();
          c.keys.push(up);
          n.keys[i] = moved;
          this._log(`对右边兄弟借一个：分隔键 ${up} 下来，${moved} 上去当新的分隔键`,
                    `Borrow from the right sibling: the separator ${up} moves down and ${moved} takes its place`,
                    c.id, `向右兄弟借`, `borrow from the right`);
        }
        return;
      }
      /* 两边都借不到：合并 */
      if (i < n.children.length - 1) {
        this._merge(n, i);
      } else {
        this._merge(n, i - 1);
      }
    }

    _merge(n, i) {
      const left = n.children[i], right = n.children[i + 1];
      if (this.plus) {
        /* B+ 树：被删掉的分隔键不再需要，直接并叶子 */
        left.keys = left.keys.concat(right.keys);
        left.children = left.children.concat(right.children);
        n.keys.splice(i, 1);
        n.children.splice(i + 1, 1);
        this._log(`两边都借不到：叶子合并成 [${label(left)}]，父节点少一个分隔键`,
                  `Neither sibling can lend: the leaves merge into [${label(left)}] and the parent loses a separator`,
                  left.id, `叶子合并`, `merge the leaves`);
      } else {
        const sep = n.keys[i];
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
  global.BTreePage = BTreeAPI;
  if (typeof module !== 'undefined' && module.exports) module.exports = { BTreeAPI, BPlusAPI };
  else global.BPlusPage = BPlusAPI;
})(typeof window !== 'undefined' ? window : globalThis);
