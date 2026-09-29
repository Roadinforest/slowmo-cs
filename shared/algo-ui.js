/*!
 * Slow-Mo CS — algorithm page kit
 *
 * 主题页共用的两个小零件：
 *   AlgoKit.stepChips(容器, 步骤, onPick)  步骤条：可点，标出已过 / 当前
 *   AlgoKit.table(容器, 行, 表头)          简单表格
 * 时间由 stepper.js 管，画面由 treeview.js 管，配色由 classic.css 管。
 */
(function (global) {
  'use strict';

  const el = (id, root) => (root || document).getElementById(id);

  /* 步骤条：当前 / 已过 / 未到 */
  function stepChips(container, steps, onPick) {
    container.innerHTML = '';
    const chips = steps.map((s, i) => {
      const b = document.createElement('button');
      b.className = 'step';
      const tag = Array.isArray(s.tag) ? s.tag : [s.tag, s.tag];
      b.textContent = (i + 1) + '. ' + (tag[0] || '');
      b.addEventListener('click', () => onPick(i));
      container.appendChild(b);
      return b;
    });
    const marks = {};
    steps.forEach((s, i) => { if (s.mark) marks[i] = s.mark; });
    return {
      update(i) {
        chips.forEach((b, k) => { b.className = 'step' + (k < i ? ' done' : '') + (k === i ? ' on' : ''); });
      },
      setLabels(lang) {
        chips.forEach((b, k) => {
          const tag = steps[k].tag;
          b.textContent = (k + 1) + '. ' + (Array.isArray(tag) ? tag[lang === 'en' ? 1 : 0] : tag);
        });
      }
    };
  }

  /* 复杂度小表 */
  function table(container, rows, heads) {
    container.innerHTML = '';
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    heads.forEach(h => { const th = document.createElement('th'); th.textContent = h; tr.appendChild(th); });
    thead.appendChild(tr);
    const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const row = document.createElement('tr');
      r.forEach((cell, i) => {
        const td = document.createElement('td');
        td.textContent = cell;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    container.append(thead, tbody);
  }

  global.AlgoKit = { el, stepChips, table };
})(window);
