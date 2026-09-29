/*!
 * 二叉搜索树页 —— 页配置
 *
 * 页面骨架、交互、时间线都在 shared/ 里；这里只写"这一页自己的东西"：
 * 算法模块、文案、复杂度表、以及视图状态怎么算。
 */
(function (global) {
  'use strict';
  global.__TREE_PAGE__ = {
    algo: global.BSTTree,
    debug: 'BST_DEBUG',
    id: 'bst',
    langKey: 'slowmo-bst-lang',
    policy: { maxChildren: 2, ordered: true },

    createSession: algo => new algo.Session(algo.SEED),

    ui: {
      zh: {
        title: '二叉搜索树 · 单步理解', tagline: '左小右大：查找路径就是比较路径',
        opLabel: '操作', size: '节点 %s', frames: '共 %s 帧',
        add: '插入', del: '删除', reset: '重置树', looking: '查找模式', pick: '点选模式',
        placeholder: '输入一个整数', invalid: '请输入一个整数',
        hint: '输入一个键按回车：已经在树里就执行查找，不在就执行插入。切到“删除”后点键即删；切到“点选模式”后直接点树上的节点。',
        note: '画面来自算法自己的结构快照：树是真长出来的，不是画死的示意图。',
        ready: '树已就绪：点一个键开始，或输入新的键',
        idle: '还没有操作。输入一个键，或直接点树上的节点。',
        balanced: '树保持“左小右大”：每个节点的左子树都比它小，右子树都比它大。',
        cx: [['查找', 'O(log n)', 'O(n)'], ['插入', 'O(log n)', 'O(n)'], ['删除', 'O(log n)', 'O(n)']],
        cxHead: ['操作', '典型 / 平衡', '最坏 / 退化成链']
      },
      en: {
        title: 'Binary search tree · Step by step', tagline: 'Smaller left, larger right: the comparison path is the search path',
        opLabel: 'Operations', size: 'nodes %s', frames: '%s frames',
        add: 'Insert', del: 'Delete', reset: 'Reset tree', looking: 'Look up', pick: 'Click mode',
        placeholder: 'type an integer', invalid: 'Please type an integer',
        hint: 'Type a key and press Enter: if it is in the tree you get a search, otherwise an insert. Switch to Delete and click a key to remove it; switch to Click mode and hit nodes directly.',
        note: 'Every frame comes from the algorithm\u2019s own structural snapshot: the tree really grows, nothing is drawn by hand.',
        ready: 'Tree ready: click a key to start, or type a new one',
        idle: 'No operations yet. Type a key, or click a node in the tree.',
        balanced: 'The tree keeps the ordering rule: everything left of a node is smaller, everything right is larger.',
        cx: [['Search', 'O(log n)', 'O(n)'], ['Insert', 'O(log n)', 'O(n)'], ['Delete', 'O(log n)', 'O(n)']],
        cxHead: ['Operation', 'Typical / balanced', 'Worst / a chain']
      }
    },

    readyText: ['树已就绪', 'Tree ready'],
    idleText: ['还没有操作。输入一个键，或直接点树上的节点。', 'No operations yet. Type a key, or click a node in the tree.'],

    viewState: (step, prev, ctx) => ctx.TreeState.stateFor(step, prev, {
      badges: (n, kids) => ({ sub: kids.length ? kids.length + ' 子' : '叶子' })
    }),

    sceneText: (step, vs, u, session) => u.balanced
  };
})(typeof window !== 'undefined' ? window : globalThis);
