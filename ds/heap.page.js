/*! 堆 / 优先队列页 —— 页配置（数组视图 + 树视图） */
(function (global) {
  'use strict';
  global.__TREE_PAGE__ = {
    algo: global.HeapTree,
    debug: 'HEAP_DEBUG',
    id: 'heap',
    langKey: 'slowmo-heap-lang',
    policy: { maxChildren: 2, minHeap: true },
    createSession: algo => new algo.Session(algo.SEED),

    ui: {
      zh: {
        title: '堆 / 优先队列 · 单步理解', tagline: '只保证父子顺序，不保证全局有序',
        opLabel: '操作', size: '元素 %s', frames: '共 %s 帧',
        add: '插入', del: '删除某个值', reset: '重置堆', looking: '查找模式', pick: '点选模式',
        placeholder: '输入一个整数', invalid: '请输入一个整数',
        hint: '输入一个键按回车：已经在堆里就查找（堆只能逐格扫，O(n)），不在就插入并上浮。切到“删除”后点键即删；右上角的“弹出最小值”是堆的本职操作，O(log n)。',
        note: '数组与树是同一份数据的两种读法：下标 i 的父节点是 ⌊(i−1)/2⌋，孩子是 2i+1 与 2i+2。',
        ready: '堆已就绪：点一个键开始，或输入新的键',
        idle: '还没有操作。输入一个键，或直接点树上的节点。',
        cx: [['读最小值', 'O(1)', 'O(1)'], ['插入', 'O(log n)', 'O(log n)'], ['弹出最小值', 'O(log n)', 'O(log n)'], ['查找任意值', 'O(n)', 'O(n)']],
        cxHead: ['操作', '典型', '最坏']
      },
      en: {
        title: 'Heap / priority queue · Step by step', tagline: 'Only parent-child order is guaranteed, never global order',
        opLabel: 'Operations', size: 'elements %s', frames: '%s frames',
        add: 'Insert', del: 'Delete a value', reset: 'Reset heap', looking: 'Look up', pick: 'Click mode',
        placeholder: 'type an integer', invalid: 'Please type an integer',
        hint: 'Type a key and press Enter: an existing key is searched (a heap can only scan, O(n)), a new one is appended and sifts up. Switch to Delete and click a key; the button on the right pops the minimum, which is what a heap is for, in O(log n).',
        note: 'The array and the tree are two readings of the same data: the parent of index i is \u230a(i\u22121)/2\u230b, its children are 2i+1 and 2i+2.',
        ready: 'Heap ready: click a key to start, or type a new one',
        idle: 'No operations yet. Type a key, or click a node in the tree.',
        cx: [['Peek minimum', 'O(1)', 'O(1)'], ['Insert', 'O(log n)', 'O(log n)'], ['Pop minimum', 'O(log n)', 'O(log n)'], ['Find any value', 'O(n)', 'O(n)']],
        cxHead: ['Operation', 'Typical', 'Worst']
      }
    },

    readyText: ['堆已就绪', 'Heap ready'],
    idleText: ['还没有操作。输入一个键，或直接点树上的节点。', 'No operations yet. Type a key, or click a node in the tree.'],

    viewState: (step, prev, ctx) => ctx.TreeState.heapState(step, prev),

    /* 数组视图：树与数组是同一份数据的两种读法，同帧同高亮 */
    arrayView: true,
    arrayEmptyText: '（空堆）',
    arrayItems: (step, session) => session.arrayItems(),

    sceneText: (step, vs, u) => {
      const bad = vs.nodes.filter(n => /unbalanced/.test(n.state || ''));
      return bad.length ? '<b>堆序被破坏</b>：父节点比孩子大，下一步要换。' : '堆序成立：每个父节点都不大于它的孩子。';
    },

    /* 堆的额外操作：弹出最小值 / 只读最小值 */
    extraOps: (mk, ctx) => {
      const u = ctx.u;
      mk('span', 'op-sep', '');
      mk('button', 'op-run', u.pop || '弹出最小值', () => ctx.run('pop'));
      mk('button', 'op-run', u.peek || '只读最小值', () => ctx.run('peek'));
    },

    /* 点树上的节点时，如果是"弹出最小值"模式就弹堆顶 */
    pickAction: (key, mode, session) => (mode === 'pop' ? 'pop' : null)
  };
})(typeof window !== 'undefined' ? window : globalThis);
