/*! 二叉树（层序数组）页 —— 页配置 */
(function (global) {
  'use strict';
  global.__TREE_PAGE__ = {
    algo: global.BinaryTreePage,
    debug: 'BINTREE_DEBUG',
    id: 'binary',
    langKey: 'slowmo-binary-lang',
    policy: { maxChildren: 2 },
    createSession: algo => new algo.Session(),

    ui: {
      zh: {
        title: '二叉树 · 单步理解', tagline: '左右是位置，不是大小：所以它自己不会保持有序',
        opLabel: '操作', size: '节点 %s', frames: '共 %s 帧',
        add: '层序插入', del: '删除', reset: '重置树', looking: '查找模式', pick: '点选模式',
        placeholder: '输入一个整数', invalid: '请输入一个整数',
        hint: '输入一个键按回车：已经在树里就查找，不在就按层序插到第一个空位（先上后下、先左后右）。删除只支持叶子和独子——删有两个孩子的节点会挖出孤儿，这一页会明确拒绝。',
        note: '层序数组：下标 i 的左孩子是 2i+1、右孩子是 2i+2。插入永远补最浅的空位，所以形状始终"上面满、下面从左往右"。',
        ready: '树已就绪：1..7 正好铺满三层，下一个键会落到第 4 层最左边',
        idle: '还没有操作。输入一个键，或直接点树上的节点。',
        balanced: '二叉树本身不排序：左孩子不一定更小。要"左小右大"就得看二叉搜索树那一页。',
        cx: [['查找', 'O(n)', 'O(n)'], ['层序插入', 'O(n)', 'O(n)'], ['删除叶子', 'O(n)', 'O(n)']],
        cxHead: ['操作', '典型', '最坏']
      },
      en: {
        title: 'Binary tree · Step by step', tagline: 'Left and right are positions, not sizes, so it stays unordered',
        opLabel: 'Operations', size: 'nodes %s', frames: '%s frames',
        add: 'Level-order insert', del: 'Delete', reset: 'Reset tree', looking: 'Look up', pick: 'Click mode',
        placeholder: 'type an integer', invalid: 'Please type an integer',
        hint: 'Type a key and press Enter: an existing key is searched, a new one takes the first empty slot in level order (top to bottom, left to right). Only leaves and single-child nodes can be deleted \u2014 removing a node with two children would orphan them, and this page refuses.',
        note: 'Level-order array: the left child of index i is 2i+1, the right child is 2i+2. Inserts always fill the shallowest slot, so the shape stays complete from the top left.',
        ready: 'Tree ready: 1..7 fill exactly three levels; the next key lands on level 4, leftmost',
        idle: 'No operations yet. Type a key, or click a node in the tree.',
        balanced: 'A binary tree is not sorted: the left child is not necessarily smaller. For "smaller left, larger right" see the BST page.',
        cx: [['Search', 'O(n)', 'O(n)'], ['Level-order insert', 'O(n)', 'O(n)'], ['Delete a leaf', 'O(n)', 'O(n)']],
        cxHead: ['Operation', 'Typical', 'Worst']
      }
    },

    readyText: ['树已就绪', 'Tree ready'],
    idleText: ['还没有操作。输入一个键，或直接点树上的节点。', 'No operations yet. Type a key, or click a node in the tree.'],

    viewState: (step, prev, ctx) => ctx.TreeState.stateFor(step, prev, {
      badges: (n, kids) => ({ sub: kids.length === 2 ? '左右都有' : (kids.length ? (kids[0].key < n.key ? '左' : '右') : '叶子') })
    }),

    sceneText: (step, vs, u) => u.balanced,

    extraMetrics: (add, step, vs, session) => {
      add('层 ' + session.height());
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
