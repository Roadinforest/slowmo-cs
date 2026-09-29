/*! 普通树 / 多叉树页 —— 页配置（文件系统模型，文本键） */
(function (global) {
  'use strict';
  global.__TREE_PAGE__ = {
    algo: global.GeneralTree,
    debug: 'GENERAL_DEBUG',
    id: 'general',
    langKey: 'slowmo-general-lang',
    keyType: 'text',
    policy: { maxChildren: 64 },
    createSession: algo => new algo.Session(),

    ui: {
      zh: {
        title: '普通树 / 多叉树 · 单步理解', tagline: '每个节点可以有任意多个孩子：没有顺序，也就没有捷径',
        opLabel: '操作', size: '节点 %s', frames: '共 %s 帧',
        add: '插入到根下', del: '删除子树', reset: '重置树', looking: '查找模式', pick: '点选模式',
        placeholder: '节点名，如 图片', invalid: '请输入一个节点名',
        hint: '输入一个名字按回车：已经在树里就查找，不在就挂到根下面（默认父节点是根）。切到“删除”后点名字即删——注意删的是整棵子树。',
        note: '普通树没有排序，所以查找只能从根开始逐层扫：这正是"多叉但不有序"的代价。',
        ready: '树已就绪：点一个节点开始，或输入新的名字',
        idle: '还没有操作。输入一个名字，或直接点树上的节点。',
        balanced: '这一页的模型是文件系统：孩子按添加顺序排列，名字不排序，父子之间没有大小关系。',
        cx: [['查找', 'O(n)', 'O(n)'], ['插入', 'O(n)（要先查重名）', 'O(n)'], ['删除子树', 'O(n)', 'O(n)']],
        cxHead: ['操作', '典型', '最坏']
      },
      en: {
        title: 'General / n-ary tree · Step by step', tagline: 'Any number of children per node: no order, so no shortcut',
        opLabel: 'Operations', size: 'nodes %s', frames: '%s frames',
        add: 'Insert under root', del: 'Delete subtree', reset: 'Reset tree', looking: 'Look up', pick: 'Click mode',
        placeholder: 'a node name, e.g. photos', invalid: 'Please type a node name',
        hint: 'Type a name and press Enter: an existing name is searched, a new one hangs under the root (the root is the default parent). Switch to Delete and click a name \u2014 note that the whole subtree goes.',
        note: 'An unordered tree gives no shortcut, so a lookup scans from the root outwards: that is the price of many children without order.',
        ready: 'Tree ready: click a node to start, or type a new name',
        idle: 'No operations yet. Type a name, or click a node in the tree.',
        balanced: 'The model here is a file system: children keep insertion order, names are not sorted, and parent and child have no size relation.',
        cx: [['Search', 'O(n)', 'O(n)'], ['Insert', 'O(n) (duplicate check)', 'O(n)'], ['Delete subtree', 'O(n)', 'O(n)']],
        cxHead: ['Operation', 'Typical', 'Worst']
      }
    },

    readyText: ['树已就绪', 'Tree ready'],
    idleText: ['还没有操作。输入一个名字，或直接点树上的节点。', 'No operations yet. Type a name, or click a node in the tree.'],

    viewState: (step, prev, ctx) => ctx.TreeState.stateFor(step, prev, {
      badges: (n, kids) => ({ sub: kids.length ? kids.length + ' 个孩子' : '叶子' })
    }),

    sceneText: (step, vs, u) => u.balanced,
    extraMetrics: (add, step) => {
      const leaves = step.nodes.filter(n => !step.nodes.some(x => x.parent === n.id)).length;
      add('叶子 ' + leaves);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
