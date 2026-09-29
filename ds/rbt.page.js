/*! 红黑树页 —— 页配置（骨架与交互见 shared/tree-page.js） */
(function (global) {
  'use strict';
  global.__TREE_PAGE__ = {
    algo: global.RBTree,
    debug: 'RBT_DEBUG',
    id: 'rbt',
    langKey: 'slowmo-rbt-lang',
    policy: { maxChildren: 2, ordered: true, redBlack: true },
    createSession: algo => new algo.Session(algo.SEED),

    ui: {
      zh: {
        title: '红黑树 · 单步理解', tagline: '用颜色换平衡：最长路径不超过最短路径的两倍',
        opLabel: '操作', size: '节点 %s', frames: '共 %s 帧',
        add: '插入', del: '删除', reset: '重置树', looking: '查找模式', pick: '点选模式',
        placeholder: '输入一个整数', invalid: '请输入一个整数',
        hint: '输入一个键按回车：已经在树里就查找，不在就插入（新节点先染红，再靠变色与旋转修复）。切到“删除”后点键即删，双黑修复会一步步演给你看。',
        note: '画面来自算法自己的结构快照：颜色是数据，不是装饰。',
        ready: '树已就绪：点一个键开始，或输入新的键',
        idle: '还没有操作。输入一个键，或直接点树上的节点。',
        cx: [['查找', 'O(log n)', 'O(log n)'], ['插入', 'O(log n)', 'O(log n)'], ['删除', 'O(log n)', 'O(log n)']],
        cxHead: ['操作', '典型', '最坏']
      },
      en: {
        title: 'Red-black tree · Step by step', tagline: 'Balance bought with colour: the longest path is at most twice the shortest',
        opLabel: 'Operations', size: 'nodes %s', frames: '%s frames',
        add: 'Insert', del: 'Delete', reset: 'Reset tree', looking: 'Look up', pick: 'Click mode',
        placeholder: 'type an integer', invalid: 'Please type an integer',
        hint: 'Type a key and press Enter: an existing key is searched, a new one is inserted red and then repaired by recolouring and rotations. Switch to Delete and click a key; the double-black repair plays out step by step.',
        note: 'Every frame comes from the algorithm\u2019s own structural snapshot: the colours are data, not decoration.',
        ready: 'Tree ready: click a key to start, or type a new one',
        idle: 'No operations yet. Type a key, or click a node in the tree.',
        cx: [['Search', 'O(log n)', 'O(log n)'], ['Insert', 'O(log n)', 'O(log n)'], ['Delete', 'O(log n)', 'O(log n)']],
        cxHead: ['Operation', 'Typical', 'Worst']
      }
    },

    readyText: ['树已就绪', 'Tree ready'],
    idleText: ['还没有操作。输入一个键，或直接点树上的节点。', 'No operations yet. Type a key, or click a node in the tree.'],

    viewState: (step, prev, ctx) => ctx.TreeState.rbtState(step, prev),

    sceneText: (step, vs, u) => {
      const bad = vs.nodes.filter(n => n.badge || /unbalanced/.test(n.state || ''));
      const redred = vs.nodes.filter(n => /unbalanced/.test(n.state || ''));
      if (redred.length) return '<b>红红相连</b>：违反红黑性质，必须在这一步修好。';
      return '红黑性质成立：根是黑的，没有红红相连，每条根到空叶的路径黑高相同。';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
