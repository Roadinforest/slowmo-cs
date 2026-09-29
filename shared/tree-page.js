/*!
 * 可操作的树页 —— 交互胶水（浏览器）
 *
 * 六个树页共用这一段：树视图、游标、页脚、操作条、时间线、帧 → 视图状态、
 * 自检、调试口。每页只提供一份"页配置"（算法模块、文案、复杂度表、
 * 要不要显示高度/颜色/数组视图），不再各写一份。
 *
 * 页面骨架在 shared/tree-page.tpl.html，样式在 shared/tree-page.css。
 */
(function (global) {
  'use strict';

  const OPNAME = {
    insert: ['插入', 'Insert'], 'insert-dup': ['已存在', 'already there'],
    search: ['查找', 'Search'], 'search-miss': ['查找', 'Search'],
    delete: ['删除', 'Delete'], 'delete-miss': ['删除', 'Delete'],
    pop: ['弹出', 'Pop'], peek: ['读最小值', 'Peek']
  };

  function el(id) { return document.getElementById(id); }

  function start(cfg) {
    const algo = cfg.algo;
    const TreeState = global.SlowMoTreeState, Kit = global.AlgoKit;
    const SessionUI = global.SlowMoSessionUI, Steps = global.SlowMoSteps, Frames = global.SlowMoFrames;
    const I18N = global.SlowMo.i18n(null, cfg.langKey);
    const t = x => (Array.isArray(x) ? x[I18N.lang === 'en' ? 1 : 0] : I18N.t(x));
    const T = x => t(x);
    const UI = cfg.ui;

    const session = cfg.createSession(algo);
    const stage = el('stage');
    const extra = cfg.extraView ? cfg.extraView(el, t) : null;
    const view = TreeView.mount(stage, { emptyText: '—' });
    /* 堆这类"数组 + 树"两种读法的结构：两边的数据是同一份，高亮也要同步 */
    let arrayView = null;
    if (cfg.arrayView && el('arrayWrap')) {
      el('arrayWrap').hidden = false;
      arrayView = TreeView.mountArray(el('arrayWrap'), { emptyText: cfg.arrayEmptyText || '（空）' });
    }

    const stepper = new global.SlowMo.Stepper({ length: 1, interval: 1500, onChange: applyStep });
    const labels = {};
    const ctl = global.SlowMo.controls(stepper, {
      prev: '#prev', next: '#next', play: '#play', reset: '#reset',
      progress: '#prog', counter: '#counter', labels
    });
    /* 页脚是几何图标：接管 sync，别让库把文字写进按钮 */
    ctl.sync = function () {
      const bar = el('prog');
      if (bar) bar.style.width = stepper.length ? ((stepper.index + 1) / stepper.length * 100) + '%' : '0';
      if (el('counter')) el('counter').textContent = (stepper.index + 1) + ' / ' + stepper.length;
      if (el('prev')) el('prev').disabled = stepper.atStart;
      if (el('next')) el('next').disabled = stepper.atEnd;
      if (el('play')) el('play').classList.toggle('playing', stepper.isPlaying);
    };
    ctl.labels = function () {};

    const engine = SessionUI.mount({
      el, session, stepper, chips: null, label: T,
      readyText: cfg.readyText,
      idleText: cfg.idleText
    });

    /* 上一次会话的轨迹留在原地：换语言、点 chips 都不该把读者刚做的事擦掉 */
    let steps = engine.steps, mode = 'auto';
    let rank = new Map();

    /* ---------------- 帧 → 视图 ---------------- */
    function applyStep(i) {
      const step = steps[i];
      if (!step) return;
      const vs = cfg.viewState(step, i > 0 ? steps[i - 1] : null, { TreeState, rank, session });
      if (cfg.onView) cfg.onView(vs, step, session);
      rank = inOrderRank(step.nodes);
      view.update(vs);
      if (arrayView) arrayView.update(cfg.arrayItems(step, session), { focus: vs.focus });

      const u = UI[I18N.lang];
      const last = engine.last;
      el('eyebrow').textContent = (last ? T(OPNAME[last.kind] || [last.kind, last.kind]) + ' ' + last.key + ' · ' : '')
        + (i + 1) + ' / ' + steps.length;
      el('sceneTitle').textContent = step.act ? t(step.act) : t(step.text);
      el('sceneAct').textContent = step.act ? t(step.text) : '';
      /* 右栏那句"此刻结构怎么样"由各页自己给：AVL 讲平衡因子，红黑树讲颜色性质 */
      if (el('sceneText')) {
        el('sceneText').innerHTML = typeof cfg.sceneText === 'function'
          ? cfg.sceneText(step, vs, u, session)
          : (cfg.sceneText ? t(cfg.sceneText) : '');
      }

      renderMetrics(step, vs, u, i);
      engine.mark(i);
      ctl.sync();
    }

    function renderMetrics(step, vs, u, i) {
      const m = el('metrics');
      if (!m) return;
      m.innerHTML = '';
      const add = (txt, warn) => {
        const sp = document.createElement('span');
        sp.className = 'metric' + (warn ? ' warn' : '');
        sp.textContent = txt;
        m.appendChild(sp);
      };
      add(u.frames.replace('%s', steps.length) + ' · ' + (i + 1));
      add(u.size.replace('%s', step.nodes.length));
      if (cfg.extraMetrics) cfg.extraMetrics(add, step, vs, session);
      const last = engine.last;
      if (last) add(T(OPNAME[last.kind] || [last.kind, last.kind]) + ' ' + last.key);
    }

    /* ---------------- 操作条 ---------------- */
    function renderOpBox() {
      const box = el('opBox');
      if (!box) return;
      box.innerHTML = '';
      const u = UI[I18N.lang];
      const mk = (tag, cls, text, onclick) => {
        const b = document.createElement(tag);
        b.className = cls; b.textContent = text;
        if (onclick) b.onclick = onclick;
        box.appendChild(b); return b;
      };

      const input = mk('input', 'op-input', '');
      input.type = 'text';
      if (cfg.keyType !== 'text') input.inputMode = 'numeric';
      input.id = 'keyInput';
      input.placeholder = u.placeholder;
      input.setAttribute('aria-label', u.placeholder);
      input.onkeydown = e => { if (e.key === 'Enter') { doPrimary(); e.preventDefault(); } };

      mk('button', 'op-run primary', u.add, doPrimary);
      mk('button', 'op-run' + (mode === 'delete' ? ' on' : ''), u.del, () => {
        mode = mode === 'delete' ? 'auto' : 'delete'; renderOpBox();
      });
      mk('span', 'op-sep', '');
      mk('button', 'op-mode' + (mode === 'pick' ? ' on' : ''), u.pick, () => {
        mode = mode === 'pick' ? 'auto' : 'pick'; renderOpBox();
      });
      mk('button', 'op-run', u.reset, () => {
        engine.reset(); steps = engine.steps; applyStep(0);
      });
      if (cfg.extraOps) cfg.extraOps(mk, { session, run: run, el, t, u, I18N });

      if (el('opMeta')) el('opMeta').innerHTML = u.opLabel;
    }

    /* 两种键：整数（搜索树、堆）与文本（普通树的文件名）。页配置里声明 keyType。 */
    function readKey() {
      const input = el('keyInput');
      if (!input) return null;
      const raw = (input.value || '').trim();
      let key = null;
      if (cfg.keyType === 'text') key = raw || null;
      else {
        const n = Number(raw);
        if (raw && Number.isFinite(n) && Number.isInteger(n)) key = n;
      }
      if (key == null) {
        input.classList.add('bad');
        input.placeholder = UI[I18N.lang].invalid;
        input.value = '';
        setTimeout(() => input.classList.remove('bad'), 900);
        return null;
      }
      input.value = '';
      return key;
    }

    /* 默认行为：树里已经有这个键 → 查找；没有 → 插入 */
    function defaultAction(key) {
      return session.has(key) ? 'search' : 'insert';
    }
    function doPrimary() {
      const k = readKey(); if (k == null) return;
      run(defaultAction(k), k);
    }
    function pickKey(k, wanted) {
      if (wanted) return run(wanted, k);
      if (mode === 'delete') return run('remove', k);
      /* 点的是树里已经有的键 → 查找；否则交给页面决定（默认是插入） */
      if (session.has(k)) return run('search', k);
      run(cfg.missingAction || 'insert', k);
    }

    /* run：所有交互的唯一入口 —— 会话跑算法、帧接上轨迹、时间线重建 */
    function run(action, key) {
      const res = engine.run(action, key);
      if (!res) return null;
      steps = engine.steps;
      applyStep(engine.firstFrameOfOp);
      return res;
    }

    /* 树上直接点：点中哪个键就对哪个键做当前动作 */
    stage.addEventListener('click', e => {
      const g = e.target.closest ? e.target.closest('g.tn') : null;
      if (!g) return;
      const raw = g.getAttribute('data-key');
      const k = cfg.keyType === 'text' ? raw : Number(raw);
      if (cfg.keyType === 'text' ? !!k : Number.isFinite(k)) {
        pickKey(k, cfg.pickAction ? cfg.pickAction(k, mode, session) : null);
      }
    });

    /* 帧导航由时间线负责（见 shared/session-ui.js）：
     * 一次操作可能几十帧，全部铺成小标签会挤成一片，按操作分行更好读。 */

    /* ---------------- 文案 ---------------- */
    function relabel() {
      Object.assign(labels, { prev: '◀', next: '▶', play: '▶', pause: '⏸', reset: '↺' });
      ctl.labels(); ctl.sync();
      document.documentElement.lang = I18N.lang === 'zh' ? 'zh-CN' : 'en';
      document.title = UI[I18N.lang].title;
      el('title').textContent = UI[I18N.lang].title.split(' · ')[0];
      el('tagline').textContent = UI[I18N.lang].tagline;
      el('lang').textContent = I18N.lang === 'zh' ? 'EN' : '中文';
      el('note').textContent = UI[I18N.lang].note;
      if (el('hint')) el('hint').textContent = UI[I18N.lang].hint;
      Kit.table(el('cx'), UI[I18N.lang].cx, UI[I18N.lang].cxHead);
      renderOpBox();
      engine.render();
      applyStep(stepper.index);
    }
    el('lang').onclick = () => { I18N.toggle(); relabel(); };

    /* ---------------- 自检与调试口 ---------------- */
    function selfCheck() {
      const bad = [];
      steps.forEach((s, i) => {
        Steps.checkSteps([s], cfg.id + '#' + (i + 1)).forEach(m => bad.push(m));
        Frames.inspect(s.nodes, Object.assign({}, cfg.policy, { allowTransient: true }))
          .problems.forEach(p => bad.push(p.what + ' ' + p.detail));
      });
      if (bad.length) console.error(cfg.id + ' 页面自检失败：', bad.slice(0, 10));
      return bad;
    }

    global[cfg.debug] = Object.assign({
      probe: i => {
        stepper.pause(); stepper.go(i);
        const st = steps[i];
        return {
          i: i + 1, stepNodes: st.nodes.map(n => n.id), focus: st.focus,
          domNodes: [...document.querySelectorAll('#stage g.tn')].map(g => g.getAttribute('data-key')),
          domClasses: [...document.querySelectorAll('#stage g.tn')].map(g => g.getAttribute('class'))
        };
      },
      steps: () => steps,
      state: () => engine.state(),
      session: () => ({ keys: session.keys(), size: session.size }),
      keys: () => session.keys(),
      sampleKey: () => (session.keys().length ? session.keys()[Math.floor(session.keys().length / 2)] : null),
      run: (action, key) => run(action, key),
      reset: () => { engine.reset(); steps = engine.steps; applyStep(0); },
      go: i => { stepper.pause(); stepper.go(i); },
      apply: i => applyStep(i),
      counts: () => ({
        stateNodes: (steps[stepper.index] || {}).nodes.length,
        domNodes: document.querySelectorAll('#stage g.tn:not(.removed)').length,
        domEdges: [...document.querySelectorAll('#stage line.tv-edge')].filter(l => l.style.opacity !== '0').length,
        focus: (steps[stepper.index] || {}).focus
      }),
      selfCheck
    }, cfg.debugExtra || {});

    engine.init();
    relabel();
    return { run, engine, session, view, stepper, applyStep, relabel };
  }

  /* 快照里节点只说"父是谁"，没说"我是左还是右"：中序编号一下就知道谁在左边。
   * 键可能短暂重复（删除时后继的键会被复制上来），所以用中序位置判定，不用键大小。 */
  function inOrderRank(nodes) {
    const byId = new Map(nodes.map(n => [n.id, n]));
    const kidsOf = new Map();
    nodes.forEach(n => {
      if (n.parent == null || !byId.has(n.parent)) return;
      if (!kidsOf.has(n.parent)) kidsOf.set(n.parent, []);
      kidsOf.get(n.parent).push(n);
    });
    const root = nodes.find(n => n.parent == null);
    const rank = new Map();
    let i = 0;
    (function walk(n) {
      if (!n) return;
      const ks = kidsOf.get(n.id) || [];
      walk(ks.find(c => c.key < n.key));
      rank.set(n.id, i++);
      walk(ks.find(c => c.key > n.key));
    })(root);
    return rank;
  }

  global.SlowMoTreePage = { start, inOrderRank, OPNAME };
})(typeof window !== 'undefined' ? window : globalThis);
