/*!
 * slowmo-cs 浏览器侧审阅 —— node tools/review.mjs [--shots]
 *
 * 用系统 Chrome 的 DevTools 协议跑（不需要 npm 依赖）：
 *   1. 逐页加载，抓运行时错误
 *   2. 算法驱动页：把每一步的"算法状态节点数/边数"和"真实 DOM 节点数/边数"对照
 *   3. 全站按钮审计：不该有按钮还挂在浏览器默认样式上
 *   4. 移动端 390px 横向溢出检查
 *   5. --shots：每页截图到 artifacts/，供人工过目
 *
 * 退出码非 0 = 有不通过项。
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { TOPICS } from './topics.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ARTIFACTS = path.join(ROOT, 'artifacts');
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const PORT = Number(process.env.CDP_PORT || 9411);
const WANT_SHOTS = process.argv.includes('--shots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAGES = [
  { id: 'index', url: 'file://' + path.join(ROOT, 'index.html') },
  { id: 'io', url: 'file://' + path.join(ROOT, 'os/io-models.html') },
  { id: 'trees', url: 'file://' + path.join(ROOT, 'ds/trees.html') },
  /* 登记表里的主题也纳入；已经在上面单独列过的就跳过 */
  ...TOPICS
    .filter(t => !['index', 'io-models', 'trees'].includes(t.id))
    .map(t => ({ id: t.id, url: 'file://' + path.join(ROOT, t.page), topic: t }))
];

const failures = [];
const fail = (where, what, detail) => failures.push({ where, what, detail: detail || '' });

/* 按钮审计：找出还带着浏览器默认外观的按钮 */
const BUTTON_AUDIT = `(() => {
  const out = [];
  document.querySelectorAll('button').forEach(b => {
    const cs = getComputedStyle(b);
    const native = cs.backgroundColor === 'buttonface' ||
                   (cs.appearance && cs.appearance !== 'none' && cs.appearance !== 'auto');
    if (native) out.push({ cls: b.className || '(无类)', text: (b.textContent || '').trim().slice(0, 14) });
  });
  return { total: document.querySelectorAll('button').length, native: out };
})()`;

/* 算法驱动页的逐帧 DOM 对照 */
const frameParity = (frames) => `(() => {
  const D = window[${JSON.stringify('AVL_DEBUG')}];
  if (!D) return { skipped: true };
  const tabs = [...document.querySelectorAll('.optab')];
  const out = [];
  for (let t = 0; t < tabs.length; t++) {
    tabs[t].click();
    const n = document.querySelectorAll('#chips .step').length;
    const bad = [];
    for (let i = 0; i < n; i++) {
      D.go(i);
      const st = D.steps()[i];
      const c = D.counts();
      const wantEdges = st.nodes.filter(x => x.parent != null).length;
      if (c.domNodes !== st.nodes.length) bad.push({ frame: i + 1, what: '节点数', trace: st.nodes.length, dom: c.domNodes });
      if (c.domEdges !== wantEdges) bad.push({ frame: i + 1, what: '边数', trace: wantEdges, dom: c.domEdges });
    }
    out.push({ name: tabs[t].textContent, frames: n, bad });
  }
  return { scenes: out };
})()`;

async function main() {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/slowmo-review',
    '--window-size=1440,940', '--lang=zh-CN', 'about:blank'], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page'); } catch {}
  }
  if (!target) { console.error('Chrome 没起来，检查 CHROME 环境变量'); process.exit(1); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0; const pending = new Map(); let events = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result);
    } else if (m.method) events.push(m);
  };
  const send = (method, params = {}, ms = 60000) => new Promise((res, rej) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); rej(new Error('CDP 超时: ' + method)); }, ms);
    pending.set(id, { res: v => { clearTimeout(timer); res(v); }, rej: e => { clearTimeout(timer); rej(e); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text);
    return r.result.value;
  };

  await send('Runtime.enable'); await send('Page.enable');
  if (WANT_SHOTS) fs.mkdirSync(ARTIFACTS, { recursive: true });

  console.log('\n浏览器侧审阅\n');
  for (const page of PAGES) {
    events = [];
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: page.url });
    await sleep(2600);

    /* 1. 运行时错误 */
    const errs = events.filter(e => e.method === 'Runtime.exceptionThrown')
      .map(e => (e.params.exceptionDetails.exception || {}).description || e.params.exceptionDetails.text);
    errs.forEach(msg => fail(page.id, '运行时错误', String(msg).split('\n')[0]));

    /* 2. 逐帧 DOM 对照（算法驱动页） */
    let parity = '—';
    if (page.topic) {
      const r = await evaluate(frameParity());
      if (r.skipped) parity = '跳过（页面没暴露调试口）';
      else {
        const bad = r.scenes.flatMap(s => s.bad.map(b => `${s.name}#${b.frame} ${b.what} 轨迹=${b.trace} DOM=${b.dom}`));
        bad.forEach(b => fail(page.id, '逐帧 DOM 不一致', b));
        parity = r.scenes.map(s => `${s.name} ${s.frames} 帧`).join(' / ') + (bad.length ? ` ✗ ${bad.length} 处` : ' ✓');
      }
    }

    /* 3. 按钮审计 */
    const btns = await evaluate(BUTTON_AUDIT);
    btns.native.forEach(b => fail(page.id, '按钮仍是系统默认样式', `.${b.cls} "${b.text}"`));

    /* 4. 移动端溢出 */
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(700);
    const mob = await evaluate(`(() => {
      const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth;
      return { over: sw - cw };
    })()`);
    if (mob.over > 1) fail(page.id, '移动端横向溢出', mob.over + 'px');

    /* 5. 截图 */
    if (WANT_SHOTS) {
      await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 940, deviceScaleFactor: 1, mobile: false });
      await sleep(600);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(ARTIFACTS, page.id + '.png'), Buffer.from(shot.data, 'base64'));
    }

    console.log(`  ${page.id.padEnd(7)} 错误 ${String(errs.length).padStart(2)} · 按钮 ${String(btns.total).padStart(2)}（默认样式 ${btns.native.length}）· 移动端溢出 ${mob.over}px · 逐帧对照 ${parity}`);
  }

  ws.close(); chrome.kill();

  if (!failures.length) { console.log('\n✓ 全部通过\n'); process.exit(0); }
  console.log(`\n✗ ${failures.length} 处失败\n`);
  const byWhat = {};
  failures.forEach(f => { (byWhat[f.what] = byWhat[f.what] || []).push(f); });
  for (const [what, list] of Object.entries(byWhat)) {
    console.log(`  ${what}  ×${list.length}`);
    list.slice(0, 6).forEach(f => console.log(`      ${f.where}  — ${f.detail}`));
    if (list.length > 6) console.log(`      …… 还有 ${list.length - 6} 处`);
  }
  console.log('');
  process.exit(1);
}

main().catch(e => { console.error(e.message); process.exit(1); });
