/*! AVL 树页 —— 页配置（骨架与交互见 shared/tree-page.js） */
(function (global) {
  'use strict';
  global.__TREE_PAGE__ = {
    algo: global.AVLTree,
    debug: 'AVL_DEBUG',
    id: 'avl',
    langKey: 'slowmo-avl-lang',
    policy: { maxChildren: 2, ordered: true, heightField: true, balanced: 1 },
    createSession: algo => new algo.Session(algo.SEED),

    ui: {
      zh: {
        title: 'AVL 树 · 单步理解', tagline: '严格平衡的二叉搜索树：左右子树高度差不超过 1',
        opLabel: '操作', size: '节点 %s', frames: '共 %s 帧',
        add: '插入', del: '删除', reset: '重置树', looking: '查找模式', pick: '点选模式',
        placeholder: '输入一个整数', invalid: '请输入一个整数',
        hint: '输入一个键按回车：已经在树里就查找，不在就插入并自动旋转平衡。切到“删除”后点键即删；旋转过的节点会标成靛蓝。',
        note: '画面来自算法自己的结构快照：树是真长出来的，旋转也是真的发生了。',
        ready: '树已就绪：点一个键开始，或输入新的键',
        idle: '还没有操作。输入一个键，或直接点树上的节点。',
        cx: [['查找', 'O(log n)', 'O(log n)'], ['插入', 'O(log n)', 'O(log n)'], ['删除', 'O(log n)', 'O(log n)']],
        cxHead: ['操作', '典型', '最坏']
      },
      en: {
        title: 'AVL tree · Step by step', tagline: 'A strictly balanced BST: child heights differ by at most 1',
        opLabel: 'Operations', size: 'nodes %s', frames: '%s frames',
        add: 'Insert', del: 'Delete', reset: 'Reset tree', looking: 'Look up', pick: 'Click mode',
        placeholder: 'type an integer', invalid: 'Please type an integer',
        hint: 'Type a key and press Enter: an existing key is searched, a new one is inserted and the tree rebalances itself. Switch to Delete and click a key to remove it; rotated nodes are drawn in indigo.',
        note: 'Every frame comes from the algorithm\u2019s own structural snapshot: the tree really grows, and the rotations really happen.',
        ready: 'Tree ready: click a key to start, or type a new one',
        idle: 'No operations yet. Type a key, or click a node in the tree.',
        cx: [['Search', 'O(log n)', 'O(log n)'], ['Insert', 'O(log n)', 'O(log n)'], ['Delete', 'O(log n)', 'O(log n)']],
        cxHead: ['Operation', 'Typical', 'Worst']
      }
    },

    readyText: ['树已就绪', 'Tree ready'],
    idleText: ['还没有操作。输入一个键，或直接点树上的节点。', 'No operations yet. Type a key, or click a node in the tree.'],

    viewState: (step, prev, ctx) => ctx.TreeState.avlState(step, prev),

    sceneText: (step, vs, u) => {
      const unbalanced = vs.nodes.filter(n => n.badge).map(n => n.key);
      return unbalanced.length
        ? `<b>${unbalanced.length}</b> 个节点暂时越过 ±1 —— 下一步就会旋转修好。`
        : '此刻每个节点的平衡因子都在 ±1 之内。';
    },

    extraMetrics: (add, step) => {
      add('h %s'.replace('%s', step.nodes.length ? Math.max(...step.nodes.map(n => n.height || 0)) : 0));
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
