/*! B 树页 —— 页配置（多路平衡树，t=2：每节点最多 3 个键） */
(function (global) {
  'use strict';
  global.__TREE_PAGE__ = {
    algo: global.BTreePage,
    debug: 'BTREE_DEBUG',
    id: 'btree',
    langKey: 'slowmo-btree-lang',
    /* 多路树：一个节点最多 2t 个孩子；分裂天生一步冒出两个节点 */
    policy: { maxChildren: 4, ordered: true, multiChildDiff: true },
    createSession: algo => new algo.Session(),

    ui: {
      zh: {
        title: 'B 树 · 单步理解', tagline: '一个节点装多个键：层数矮、磁盘读得少',
        opLabel: '操作', size: '节点 %s', frames: '共 %s 帧',
        add: '插入', del: '删除', reset: '重置树', looking: '查找模式', pick: '点选模式',
        placeholder: '输入一个整数', invalid: '请输入一个整数',
        hint: '输入一个键按回车：已经在树里就查找，不在就插入。插入会把满节点劈成两半、中间键升上去；删除先向兄弟借、借不到就合并。右键上的节点也能直接操作。',
        note: '每个节点里的键是排好序的；一个节点最多 2t−1 个键（这里 t=2，所以最多 3 个），最少 t−1 个。键可以住在内部节点上，这是 B 树与 B+ 树最大的区别。',
        ready: '树已就绪：输入一个键开始',
        idle: '还没有操作。输入一个键，或直接点树上的节点。',
        balanced: '所有叶子都在同一层：这就是 B 树"平衡"的含义，与左右子树高度差无关。',
        cx: [['查找', 'O(log n)', 'O(log n)'], ['插入', 'O(log n)', 'O(log n)'], ['删除', 'O(log n)', 'O(log n)']],
        cxHead: ['操作', '典型', '最坏']
      },
      en: {
        title: 'B-tree · Step by step', tagline: 'Many keys per node: a shallow tree, so few disk reads',
        opLabel: 'Operations', size: 'nodes %s', frames: '%s frames',
        add: 'Insert', del: 'Delete', reset: 'Reset tree', looking: 'Look up', pick: 'Click mode',
        placeholder: 'type an integer', invalid: 'Please type an integer',
        hint: 'Type a key and press Enter: an existing key is searched, a new one is inserted. A full node splits in two and its middle key moves up; a delete borrows from a sibling first and merges when it cannot. You can also click a node in the tree.',
        note: 'Keys inside a node are sorted; a node holds at most 2t\u22121 keys (here t=2, so three) and at least t\u22121. A key may live in an internal node \u2014 that is the main difference from a B+ tree.',
        ready: 'Tree ready: type a key to start',
        idle: 'No operations yet. Type a key, or click a node in the tree.',
        balanced: 'Every leaf sits on the same level: that is what balance means for a B-tree, not a height difference between two subtrees.',
        cx: [['Search', 'O(log n)', 'O(log n)'], ['Insert', 'O(log n)', 'O(log n)'], ['Delete', 'O(log n)', 'O(log n)']],
        cxHead: ['Operation', 'Typical', 'Worst']
      }
    },

    readyText: ['树已就绪', 'Tree ready'],
    idleText: ['还没有操作。输入一个键，或直接点树上的节点。', 'No operations yet. Type a key, or click a node in the tree.'],

    /* 多键节点：label 由 keys 拼出来，角标写这个节点有几个键 */
    viewState: (step, prev, ctx) => ctx.TreeState.stateFor(step, prev, {
      badges: n => ({ sub: n.keys ? n.keys.length + ' 键' : '' })
    }),

    sceneText: (step, vs, u) => u.balanced,
    extraMetrics: (add, step, vs, session) => add('层 ' + session.height())
  };
})(typeof window !== 'undefined' ? window : globalThis);
