/*! B+ 树页 —— 页配置（内部节点只存分隔键，记录全在叶子，叶子链成一条链） */
(function (global) {
  'use strict';
  global.__TREE_PAGE__ = {
    algo: global.BPlusPage,
    debug: 'BPLUS_DEBUG',
    id: 'bplus',
    langKey: 'slowmo-bplus-lang',
    /* 分隔键就是叶子键的副本，所以"键必须唯一"这条对它不成立 */
    policy: { maxChildren: 4, ordered: true, multiChildDiff: true, separatorsMayRepeat: true },
    createSession: algo => new algo.Session(),

    ui: {
      zh: {
        title: 'B+ 树 · 单步理解', tagline: '内部节点只导航，记录全在叶子，叶子连成一条链',
        opLabel: '操作', size: '节点 %s', frames: '共 %s 帧',
        add: '插入', del: '删除', reset: '重置树', looking: '查找模式', pick: '点选模式',
        placeholder: '输入一个整数', invalid: '请输入一个整数',
        hint: '输入一个键按回车。注意两件事：内部节点里的键只是"分隔键"，真记录永远在叶子；叶子分裂时中间键是**复制**上去的，所以它会同时留在叶子和内部节点里。',
        note: '分隔键的含义是"右子树的最小键"。删掉叶子里最小的那个键之后，祖先的分隔键必须跟着改 —— 这是 B+ 树删除最容易漏的一步。',
        ready: '树已就绪：输入一个键开始',
        idle: '还没有操作。输入一个键，或直接点树上的节点。',
        balanced: '真正有序的数据只在最下面一层：叶子按键顺序连成一条链，所以范围查询只要定位起点再顺着链走。',
        cx: [['查找（点查）', 'O(log n)', 'O(log n)'], ['插入', 'O(log n)', 'O(log n)'], ['删除', 'O(log n)', 'O(log n)'], ['范围查询', 'O(log n + k)', 'O(log n + k)']],
        cxHead: ['操作', '典型', '最坏']
      },
      en: {
        title: 'B+ tree · Step by step', tagline: 'Internal nodes navigate only; every record lives in a linked leaf',
        opLabel: 'Operations', size: 'nodes %s', frames: '%s frames',
        add: 'Insert', del: 'Delete', reset: 'Reset tree', looking: 'Look up', pick: 'Click mode',
        placeholder: 'type an integer', invalid: 'Please type an integer',
        hint: 'Type a key and press Enter. Two things to watch: keys inside internal nodes are separators only and the real records always live in leaves; when a leaf splits its middle key is COPIED up, so it stays in the leaf as well.',
        note: 'A separator means "the smallest key of the right subtree". After deleting a leaf\u2019s smallest key the ancestors\u2019 separators must be realigned \u2014 the step B+ deletion most often forgets.',
        ready: 'Tree ready: type a key to start',
        idle: 'No operations yet. Type a key, or click a node in the tree.',
        balanced: 'The ordered data lives only on the bottom level: leaves are linked in key order, so a range query locates the start and then walks the chain.',
        cx: [['Point lookup', 'O(log n)', 'O(log n)'], ['Insert', 'O(log n)', 'O(log n)'], ['Delete', 'O(log n)', 'O(log n)'], ['Range scan', 'O(log n + k)', 'O(log n + k)']],
        cxHead: ['Operation', 'Typical', 'Worst']
      }
    },

    readyText: ['树已就绪', 'Tree ready'],
    idleText: ['还没有操作。输入一个键，或直接点树上的节点。', 'No operations yet. Type a key, or click a node in the tree.'],

    viewState: (step, prev, ctx) => ctx.TreeState.stateFor(step, prev, {
      badges: n => ({ sub: n.keys ? n.keys.length + ' 键' : '' })
    }),

    sceneText: (step, vs, u) => u.balanced,
    extraMetrics: (add, step, vs, session) => add('层 ' + session.height())
  };
})(typeof window !== 'undefined' ? window : globalThis);
