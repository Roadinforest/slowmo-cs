/*!
 * 主题登记表（Node 工具读）
 *
 * 每一栏告诉工具：算法在哪、怎么跑出轨迹、这一页有哪些操作流、
 * 以及这个结构特有的不变量是什么。
 *
 * 页面跑的是同一份代码，只是页面不读这个文件 —— 它自己调 AVL.ops.*。
 * 所以这里写错会被 check.mjs 抓到，而不是悄悄漂移。
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');

export const TOPICS = [
  {
    id: 'btree',
    debug: 'BTREE_DEBUG',
    name: { zh: 'B 树', en: 'B-tree' },
    page: 'ds/btree.html',
    load: () => ({ algo: require(path.join(ROOT, 'ds/btree.js')).BTreeAPI }),
    sourceFile: 'ds/btree.js',
    scenarios: (algo) => [
      { key: 'insert', zh: '插入 45 55', run: () => algo.ops.insert([45, 55]) },
      { key: 'search', zh: '查找 50', run: () => algo.ops.search(50) },
      { key: 'delete', zh: '删除 20（触发借位/合并）', run: () => algo.ops.delete(20) }
    ],
    members: ['insert', 'find', 'remove', '_split'],
    /* 多路树：每节点最多 4 个孩子；分裂天生一步出现两个节点 */
    policy: { maxChildren: 4, multiChildDiff: true },
    session: (algo) => new algo.Session()
  },

  {
    id: 'bplus',
    debug: 'BPLUS_DEBUG',
    name: { zh: 'B+ 树', en: 'B+ tree' },
    page: 'ds/bplus.html',
    load: () => ({ algo: require(path.join(ROOT, 'ds/btree.js')).BPlusAPI }),
    sourceFile: 'ds/btree.js',
    scenarios: (algo) => [
      { key: 'insert', zh: '插入 45 55', run: () => algo.ops.insert([45, 55]) },
      { key: 'search', zh: '查找 50', run: () => algo.ops.search(50) },
      { key: 'delete', zh: '删除 20（叶子链与分隔键都要维护）', run: () => algo.ops.delete(20) }
    ],
    members: ['insert', 'find', 'remove', '_split'],
    /* 多路树 + 分隔键是叶子键的副本，所以"键唯一"对它不成立 */
    policy: { maxChildren: 4, multiChildDiff: true, separatorsMayRepeat: true },
    session: (algo) => new algo.Session()
  },

  {
    id: 'general',
    debug: 'GENERAL_DEBUG',
    name: { zh: '普通树 / 多叉树', en: 'General / n-ary tree' },
    page: 'ds/general.html',
    load: () => ({ algo: require(path.join(ROOT, 'ds/general.js')) }),
    sourceFile: 'ds/general.js',
    scenarios: (algo) => [
      { key: 'insert', zh: '在根下插入「图片」', run: () => algo.ops.insert('图片', '项目') },
      { key: 'search', zh: '查找「测试」', run: () => algo.ops.search('测试') },
      { key: 'delete', zh: '删除「文档」（整棵子树）', run: () => algo.ops.delete('文档') }
    ],
    members: ['insert', 'find', 'remove'],
    /* 多叉、无序：只查单根无环。删除语义是"整棵子树摘掉"，所以允许一步少多个节点 */
    policy: { maxChildren: 64, bulkDelete: true },
    session: (algo) => new algo.Session(),
    /* 这一页的键是名字，随机对拍要按名字造键 */
    keyKind: 'text'
  },

  {
    id: 'binary',
    debug: 'BINTREE_DEBUG',
    name: { zh: '二叉树', en: 'Binary tree' },
    page: 'ds/binary.html',
    load: () => ({ algo: require(path.join(ROOT, 'ds/binary.js')) }),
    sourceFile: 'ds/binary.js',
    scenarios: (algo) => [
      { key: 'insert', zh: '层序插入 8 9', run: () => algo.ops.insert([8, 9]) },
      { key: 'search', zh: '查找 5', run: () => algo.ops.search(5) },
      { key: 'delete', zh: '删除叶子 7', run: () => algo.ops.delete(7) }
    ],
    members: ['insert', 'find', 'remove'],
    policy: { maxChildren: 2 },
    session: (algo) => new algo.Session()
  },

  {
    id: 'bst',
    /* 页面暴露的调试口：审阅工具用它逐帧对照 DOM 与算法状态 */
    debug: 'BST_DEBUG',
    name: { zh: '二叉搜索树', en: 'BST' },
    page: 'ds/bst.html',
    load: () => ({ algo: require(path.join(ROOT, 'ds/bst.js')) }),
    sourceFile: 'ds/bst.js',
    scenarios: (algo) => [
      { key: 'insert', zh: '依次插入 50 30 70 20 40 45', run: () => algo.ops.insert(algo.DEMO_INSERT) },
      { key: 'search', zh: '查找 40', run: () => algo.ops.search(algo.DEMO_SEARCH) },
      { key: 'delete', zh: '删除有两个孩子的节点 50', run: () => algo.ops.delete(algo.DEMO_DELETE) }
    ],
    members: ['insert', 'find', 'remove'],
    /* 有序二叉，不维护高度字段 */
    policy: { maxChildren: 2, ordered: true },
    /* 交互会话：随机操作序列的对拍检查（结构 + 键集合都要对） */
    session: (algo) => new algo.Session()
  },

  {
    id: 'avl',
    /* 页面暴露的调试口：审阅工具用它逐帧对照 DOM 与算法状态 */
    debug: 'AVL_DEBUG',
    name: { zh: 'AVL 树', en: 'AVL tree' },
    page: 'ds/avl.html',
    /* 算法实现。行号由运行时从调用栈取，不再需要源码解析器。 */
    load: () => ({ algo: require(path.join(ROOT, 'ds/avl.js')) }),
    /* 算法源文件：用来核对"记录的行号确实落在算法代码里" */
    sourceFile: 'ds/avl.js',
    /* 每个操作流：跑一遍真实算法，得到真实轨迹 */
    scenarios: (algo) => [
      { key: 'insert', zh: '依次插入 50 30 70 20 40 45', run: () => algo.ops.insert([50, 30, 70, 20, 40, 45]) },
      { key: 'search', zh: '查找 40', run: () => algo.ops.search(40) },
      { key: 'delete', zh: '删除有两个孩子的节点 50', run: () => algo.ops.delete(50) }
    ],
    /* 这一页每个操作聚焦哪几个方法（源码行号契约按它校验） */
    members: ['rotateRight', 'rotateLeft', 'rebalance', 'insert', 'find', 'remove'],
    /* 结构特有策略：AVL 是严格平衡的 BST，节点自带 height */
    policy: { maxChildren: 2, ordered: true, heightField: true, balanced: 1 },
    session: (algo) => new algo.Session()
  },

  {
    id: 'rbt',
    name: { zh: '红黑树', en: 'Red-black tree' },
    page: 'ds/rbt.html',
    debug: 'RBT_DEBUG',
    load: () => ({ algo: require(path.join(ROOT, 'ds/rbt.js')) }),
    sourceFile: 'ds/rbt.js',
    scenarios: (algo) => [
      { key: 'insert', zh: '依次插入 20 10 30 5 15 25 35 1', run: () => algo.ops.insert() },
      { key: 'search', zh: '查找 8', run: () => algo.ops.search() },
      { key: 'delete', zh: '删除 3（触发双黑修复）', run: () => algo.ops.delete() }
    ],
    /* 红黑树：有序二叉 + 根黑 / 无红红 / 黑高相等。它不维护高度字段，也不要求 |bf|<=1 */
    policy: { maxChildren: 2, ordered: true, redBlack: true },
    session: (algo) => new algo.Session()
  },

  {
    id: 'heap',
    name: { zh: '堆 / 优先队列', en: 'Heap / priority queue' },
    page: 'ds/heap.html',
    debug: 'HEAP_DEBUG',
    load: () => ({ algo: require(path.join(ROOT, 'ds/heap.js')) }),
    sourceFile: 'ds/heap.js',
    scenarios: (algo) => [
      { key: 'insert', zh: '依次插入 5 3 8 1 9 2', run: () => algo.ops.insert() },
      { key: 'peek', zh: '读最小值', run: () => algo.ops.peek() },
      { key: 'pop', zh: '删除最小值', run: () => algo.ops.pop() }
    ],
    /* 堆只保证"父不大于孩子"，左右之间没有顺序；也没有 height 字段 */
    policy: { maxChildren: 2, ordered: false, minHeap: true },
    session: (algo) => new algo.Session()
  },

  /* --------------------------------------------------------------------
   * 手绘快照式的页面没有独立的算法模块，登记它们在页面里声明的操作流步数。
   * 这样展厅卡片上的数字有东西可以核对（历史问题：写着 127 步，
   * 而最长单流只有几步）。等它们改造成算法驱动式，再补 scenarios。
   * ------------------------------------------------------------------ */
  {
    id: 'io-models',
    name: { zh: '五种 I/O 模型', en: 'Five I/O Models' },
    page: 'os/io-models.html',
    load: () => ({}),
    scenarios: () => [],
    longestFlow: 14
  },
  {
    id: 'trees',
    name: { zh: '常见树结构', en: 'Common Tree Structures' },
    page: 'ds/trees.html',
    load: () => ({}),
    scenarios: () => [],
    longestFlow: 5
  }
];
