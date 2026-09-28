/*!
 * Slow-Mo CS — shared step engine  (no dependencies, works from file://)
 *
 * 这个文件只负责"时间"，不负责"长什么样"：
 *   SlowMo.i18n(dict)          中英切换 + 记忆（localStorage）
 *   new SlowMo.Stepper(opts)   步骤游标：go / next / prev / play / pause
 *   SlowMo.controls(stepper,..) 把游标接到页脚按钮、进度条、键盘
 *   SlowMo.codeLines(el, ...)  代码清单渲染 + 当前行高亮
 *
 * 主题文件只写两件事：steps（状态快照数组）和 render(index, step)。
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * i18n
   * ------------------------------------------------------------------ */
  function i18n(dict, key) {
    const store = key || 'slowmo-lang';
    const read = () => { try { return localStorage.getItem(store); } catch (e) { return null; } };
    let lang = read();
    if (lang !== 'zh' && lang !== 'en') {
      const list = navigator.languages || [navigator.language || 'en'];
      lang = list.some(l => /^zh/i.test(l)) ? 'zh' : 'en';
    }

    const listeners = [];
    const api = {
      dict: dict || {},
      get lang() { return lang; },
      set lang(v) {
        if (v !== 'zh' && v !== 'en') return;
        lang = v;
        try { localStorage.setItem(store, v); } catch (e) {}
        listeners.forEach(f => f(lang));
      },
      /* 取当前语言的字符串；传 {zh,en} 之外的东西原样返回 */
      t(x) {
        return (x && typeof x === 'object' && !Array.isArray(x) && ('zh' in x || 'en' in x))
          ? (x[lang] != null ? x[lang] : x.zh)
          : x;
      },
      toggle() { api.lang = (lang === 'zh') ? 'en' : 'zh'; },
      onChange(fn) { listeners.push(fn); return api; }
    };
    return api;
  }

  /* ------------------------------------------------------------------ *
   * Stepper —— 纯游标，不碰 DOM
   * ------------------------------------------------------------------ */
  class Stepper {
    constructor(opts) {
      const o = opts || {};
      this.length = o.length || 0;
      this.index = 0;
      this.interval = o.interval || 1600;   // 自动播放每步毫秒
      this._timer = null;
      this._subs = [];
      this.onChange = o.onChange || null;
    }
    get isPlaying() { return this._timer !== null; }
    get atEnd() { return this.index >= this.length - 1; }
    get atStart() { return this.index <= 0; }

    /* 订阅即立刻收到一次当前状态，方便初始化渲染 */
    on(fn) { this._subs.push(fn); fn(this.index, this); return this; }
    _emit() {
      this._subs.forEach(f => f(this.index, this));
      if (this.onChange) this.onChange(this.index, this);
    }

    /* 跳步：越界会被夹住；i 相同也会重新渲染（切换语言时需要） */
    go(i) {
      const n = Math.max(0, Math.min(this.length - 1, i | 0));
      const moved = (n !== this.index);
      this.index = n;
      /* 走到最后一步就停下（自己清掉定时器，避免多发一次通知） */
      if (n === this.length - 1 && this._timer) { clearInterval(this._timer); this._timer = null; }
      this._emit();
      return moved;
    }
    next() { return this.go(this.index + 1); }
    prev() { return this.go(this.index - 1); }
    first() { return this.go(0); }
    last() { return this.go(this.length - 1); }

    play() {
      if (this._timer || this.length < 2) return this;
      if (this.atEnd) this.go(0);
      this._timer = setInterval(() => {
        if (this.atEnd) return this.pause();
        this.go(this.index + 1);
      }, this.interval);
      this._emit();
      return this;
    }
    pause() {
      if (!this._timer) return this;
      clearInterval(this._timer);
      this._timer = null;
      this._emit();
      return this;
    }
    toggle() { return this.isPlaying ? this.pause() : this.play(); }
    reset() { this.pause(); return this.go(0); }
  }

  /* ------------------------------------------------------------------ *
   * controls —— 页脚按钮 / 进度条 / 计数器 / 键盘
   * ------------------------------------------------------------------ */
  function controls(stepper, opts) {
    const o = opts || {};
    const $ = s => (typeof s === 'string' ? document.querySelector(s) : s);
    const prev = $(o.prev), next = $(o.next), play = $(o.play), reset = $(o.reset),
      bar = $(o.progress), counter = $(o.counter), hint = $(o.hint);

    /* enabled 为 false 时（例如切到对比表视图）忽略键盘 */
    const enabled = () => (typeof o.enabled === 'function' ? o.enabled() : o.enabled !== false);

    function labels() {
      const L = o.labels || {};
      if (prev) prev.textContent = L.prev || '◀';
      if (next) next.textContent = L.next || '▶';
      if (reset) reset.textContent = L.reset || '↺';
      if (hint) hint.textContent = L.hint || '';
      if (L.title) document.title = L.title;
    }
    function sync() {
      if (bar) bar.style.width = stepper.length ? ((stepper.index + 1) / stepper.length * 100) + '%' : '0';
      if (counter) counter.textContent = (stepper.index + 1) + ' / ' + stepper.length;
      if (prev) prev.disabled = stepper.atStart;
      if (next) next.disabled = stepper.atEnd;
      if (play && o.labels) play.textContent = stepper.isPlaying
        ? (o.labels.pause || '⏸') : (o.labels.play || '▶');
    }

    if (prev) prev.onclick = () => { stepper.pause(); stepper.prev(); };
    if (next) next.onclick = () => { stepper.pause(); stepper.next(); };
    if (play) play.onclick = () => stepper.toggle();
    if (reset) reset.onclick = () => stepper.reset();

    if (o.keys !== false) {
      document.addEventListener('keydown', e => {
        if (!enabled()) return;
        const tag = (e.target && e.target.tagName) || '';
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || e.target.isContentEditable) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); stepper.pause(); stepper.next(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); stepper.pause(); stepper.prev(); }
        else if (e.key === ' ') { e.preventDefault(); stepper.toggle(); }
      });
    }

    stepper.on(sync);
    return { sync, labels };
  }

  /* ------------------------------------------------------------------ *
   * codeLines —— 代码清单：每行 [zh, en] 或字符串，可点击跳步
   * ------------------------------------------------------------------ */
  function codeLines(container, lines, opts) {
    const o = opts || {};
    const pre = typeof container === 'string' ? document.querySelector(container) : container;
    pre.innerHTML = '';
    const rows = [];
    lines.forEach((ln, i) => {
      const row = document.createElement('div');
      row.className = 'cl';
      const no = document.createElement('span');
      no.className = 'no';
      no.textContent = i + 1;
      const tx = document.createElement('span');
      tx.className = 'tx';
      tx.textContent = Array.isArray(ln) ? (ln[o.lang === 'en' ? 1 : 0] != null
        ? ln[o.lang === 'en' ? 1 : 0] : ln[0]) : ln;
      row.append(no, tx);
      if (o.onPick) row.onclick = () => o.onPick(i);
      pre.appendChild(row);
      rows.push(row);
    });
    return {
      rows,
      highlight(line, scroll) {
        rows.forEach(r => r.classList.remove('on'));
        const r = rows[line];
        if (!r) return;
        r.classList.add('on');
        if (scroll && r.scrollIntoView) r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    };
  }

  global.SlowMo = { i18n, Stepper, controls, codeLines };
})(window);
