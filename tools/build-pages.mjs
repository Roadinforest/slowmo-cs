/*!
 * 生成可操作的树页 —— node tools/build-pages.mjs [--check]
 *
 * 六个树页的骨架是同一套（左画布 + 时间线 / 右解说 / 底部游标），
 * 所以骨架只有一份 shared/tree-page.tpl.html，各页只提供一份"页配置"：
 *
 *   ds/<id>.page.js   →   ds/<id>.html
 *
 * --check 不写文件，只检查"页面与模板/配置是否一致"，供 tools/check.mjs 调用：
 * 手改生成物会在闸门里失败，而不是悄悄漂移成一页跟别人不一样的东西。
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TPL = fs.readFileSync(path.join(ROOT, 'shared/tree-page.tpl.html'), 'utf8');

/* 每页：标题、算法脚本、自己的样式（只差左右栏比例） */
export const PAGES = [
  {
    id: 'bst',
    title: '二叉搜索树 · 单步理解',
    scripts: ['./bst.js', './bst.page.js'],
    css: '  /* 这一页是普通 BST，没有额外的东西要画 */'
  },
  {
    id: 'avl',
    title: 'AVL 树 · 单步理解',
    scripts: ['./avl.js', './avl.page.js'],
    css: '  /* 树里要显示高度与平衡因子，节点比别的页宽一点 */\n  .wrap{grid-template-columns:minmax(460px,1.25fr) minmax(360px,1fr)}'
  },
  {
    id: 'rbt',
    title: '红黑树 · 单步理解',
    scripts: ['./rbt.js', './rbt.page.js'],
    css: '  /* 颜色就是数据：节点比别的页宽一点 */\n  .wrap{grid-template-columns:minmax(460px,1.25fr) minmax(360px,1fr)}'
  },
  {
    id: 'general',
    title: '普通树 / 多叉树 · 单步理解',
    scripts: ['./general.js', './general.page.js'],
    css: '  /* 多叉树比较宽，画布给多一点 */\n  .wrap{grid-template-columns:minmax(460px,1.3fr) minmax(360px,1fr)}'
  },
  {
    id: 'binary',
    title: '二叉树 · 单步理解',
    scripts: ['./binary.js', './binary.page.js'],
    css: '  /* 层序数组的树比较紧凑 */\n  .wrap{grid-template-columns:minmax(440px,1.2fr) minmax(360px,1fr)}'
  },
  {
    id: 'heap',
    title: '堆 / 优先队列 · 单步理解',
    scripts: ['./heap.js', './heap.page.js'],
    css: '  /* 数组视图与树视图共用左栏 */\n  .stage{min-height:200px}'
  }
];

function render(page) {
  const scripts = page.scripts.map(s => `<script src="${s}"></script>`).join('\n');
  return TPL
    .replace(/__PAGE_TITLE__/g, page.title)
    .replace(/__PAGE_CSS__/g, page.css)
    .replace(/__ALGO_SCRIPT__/g, scripts);
}

export function buildAll() {
  const out = [];
  for (const page of PAGES) {
    const file = path.join(ROOT, 'ds', page.id + '.html');
    out.push({ id: page.id, file, html: render(page) });
  }
  return out;
}

const CHECK = process.argv.includes('--check');
const pages = buildAll();
if (CHECK) {
  const stale = pages.filter(p => !fs.existsSync(p.file) || fs.readFileSync(p.file, 'utf8') !== p.html);
  if (stale.length) {
    console.error('页面与模板不一致（跑 node tools/build-pages.mjs 重新生成）：');
    stale.forEach(p => console.error('  ' + path.relative(ROOT, p.file)));
    process.exit(1);
  }
  console.log(`页面生成物已核对：${pages.length} 页与 shared/tree-page.tpl.html 一致`);
} else {
  for (const p of pages) {
    fs.writeFileSync(p.file, p.html);
    console.log('生成', path.relative(ROOT, p.file));
  }
}
