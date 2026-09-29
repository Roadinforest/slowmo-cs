/*!
 * Slow-Mo CS — 步骤契约
 *
 * 一个主题页无论怎么实现，产出的"一步"必须是这个形状：
 *
 *   {
 *     text:   [zh, en]   这一步在说什么（完整说明）
 *     act?:   [zh, en]   一句话摘要；没有就退回 text
 *     focus?: 节点 id     此刻在看谁
 *     pendingKey?: 键     焦点尚未创建时，它就是那个键
 *     nodes:  [节点...]   此刻真实的结构快照
 *   }
 *
 * 节点：{ id, key, parent, ... } —— id 是稳定身份，key 只是它携带的数据。
 *
 * 为什么要有这份文件：这些约束以前只存在于我们的默契里，于是"focus 该传 id
 * 还是 key"这种问题会漏掉一半调用点。现在它可执行，Node 侧和浏览器侧用同一份。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;   // node / tools
  if (typeof window !== 'undefined') window.SlowMoSteps = api;                 // 页面
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const isPair = x => Array.isArray(x) && x.length === 2 &&
    x.every(v => typeof v === 'string' && v.trim().length > 0);

  /* 检查一帧的形状。返回问题数组（空 = 通过）。 */
  function checkStep(step, where) {
    const e = [];
    if (!step || typeof step !== 'object') { e.push(`${where}: 不是对象`); return e; }
    if (!isPair(step.text)) e.push(`${where}.text: 必须是 [中文, English] 且都非空`);
    if (step.act != null && !isPair(step.act)) e.push(`${where}.act: 必须是 [中文, English] 且都非空`);
    if (!Array.isArray(step.nodes)) e.push(`${where}.nodes: 必须是数组`);
    else {
      const ids = step.nodes.map(n => n && n.id);
      if (new Set(ids).size !== ids.length) e.push(`${where}.nodes: id 重复`);
      step.nodes.forEach((n, i) => {
        if (!n || typeof n !== 'object') { e.push(`${where}.nodes[${i}]: 不是对象`); return; }
        if (n.id == null) e.push(`${where}.nodes[${i}].id: 缺少稳定身份`);
        /* 节点至少要能说明"自己是哪个键"：单键节点看 key，
         * 多键节点（B 树 / B+ 树）看 keys 数组 —— 它们的键不止一个。 */
        const hasKeys = Array.isArray(n.keys) && n.keys.length > 0;
        if (n.key == null && !hasKeys) e.push(`${where}.nodes[${i}].key: 缺少键值`);
      });
    }
    /* focus 契约：要么是本帧存在的节点 id，要么用 pendingKey 声明"还没创建" */
    if (step.focus != null) {
      const ids = new Set((step.nodes || []).map(n => n && n.id));
      if (!ids.has(step.focus) && step.pendingKey == null) {
        e.push(`${where}.focus: 指向不存在的节点 ${step.focus}，也没给 pendingKey`);
      }
      if (step.pendingKey != null && ids.has(step.focus)) {
        e.push(`${where}.pendingKey: 节点已经存在，不该再声明 pendingKey`);
      }
    }
    return e;
  }

  /* 检查整条流 */
  function checkSteps(steps, where) {
    const e = [];
    if (!Array.isArray(steps) || !steps.length) return [`${where}: 空流`];
    steps.forEach((s, i) => e.push(...checkStep(s, `${where}#${i + 1}`)));
    return e;
  }

  return { isPair, checkStep, checkSteps };
});
