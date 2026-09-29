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

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');

export const TOPICS = [
  {
    id: 'avl',
    name: { zh: 'AVL 树', en: 'AVL tree' },
    page: 'ds/avl.html',
    /* 算法实现 + 源码解析器（后者只有 node 用） */
    load: () => ({
      algo: require(path.join(ROOT, 'ds/avl.js')),
      src: require(path.join(ROOT, 'ds/avl.source.js'))
    }),
    /* 每个操作流：跑一遍真实算法，得到真实轨迹 */
    scenarios: (algo) => [
      { key: 'insert', zh: '依次插入 50 30 70 20 40 45', run: () => algo.ops.insert([50, 30, 70, 20, 40, 45]) },
      { key: 'search', zh: '查找 40', run: () => algo.ops.search(40) },
      { key: 'delete', zh: '删除有两个孩子的节点 50', run: () => algo.ops.delete(50) }
    ],
    /* 这一页每个操作聚焦哪几个方法（源码行号契约按它校验） */
    members: ['rotateRight', 'rotateLeft', 'rebalance', 'insert', 'find', 'remove'],
    /* 结构特有策略：AVL 是严格平衡的 BST，节点自带 height */
    policy: { maxChildren: 2, ordered: true, heightField: true, balanced: 1 }
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
