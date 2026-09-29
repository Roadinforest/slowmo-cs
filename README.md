# Slow-Mo CS

**Computer science in slow motion.**

Most explanations hand you the result and skip the middle. A red-black tree
rotates, a scheduler switches threads, a page gets evicted, and you are told it
works. The interesting part, the part where the machine actually does something,
is compressed into one sentence.

This is a collection of interactive walkthroughs that slow those moments down.
Every topic is a small sandbox you drive yourself: press **Next**, step back,
change the speed, edit the input, take the wrong branch and rewind.

Open **`index.html`**. That is the whole setup.

## Features

- **Step control** — next, previous, play, pause, reset, click a step to jump,
  `←` `→` to flip, `space` to autoplay
- **Code and state, side by side** — the left panel shows what the machine is
  doing, the right panel shows the line of code responsible. Click a line number
  to jump to the step that runs it
- **Bilingual** — 中文 / English toggle in the top right, remembered per topic
- **Editable inputs** — build your own tree, bring your own page reference
  string, change the quantum (as topics land)
- **No build, no dependencies, no network** — plain HTML/CSS/JS, loads from
  `file://`, nothing to install
- **Content is data** — steps, strings and code listings live in a separate
  `.data.js` you can read and edit without touching rendering code

## Topics

| Area | Topic | Status |
| --- | --- | --- |
| OS | [Five I/O Models](os/io-models.html) — blocking, non-blocking, multiplexing, signal-driven, async | ✅ playable |
| Data structures | [Common tree structures](ds/trees.html) — N-ary, binary, BST, AVL, red-black, heap, B-tree, B+ tree | ✅ playable |
| Data structures | [AVL tree](ds/avl.html) — the real algorithm, traced: insert, search, delete, four rotations | ✅ playable |
| Data structures | [Red-black tree](ds/rbt.html) — recolour, rotate, and the double-black repair of delete | ✅ playable |
| Data structures | [Heap / priority queue](ds/heap.html) — sift-up and sift-down, array and tree in step | ✅ playable |
| Data structures | Hash table collisions, load factor, rehashing | planned |
| OS | Threads & context switch — registers, stack pointer, PCB | planned |
| OS | CPU scheduling — FCFS, SJF, RR, MLFQ with a live Gantt chart | planned |
| OS | Page replacement — FIFO, LRU, Clock on your own reference string | planned |
| OS | Deadlock & Banker's algorithm | planned |
| Architecture | Cache & locality — stride, size, associativity | planned |
| Architecture | Pipeline hazards and forwarding | planned |
| Compilers | Lexer & parser — text to tokens to a tree | planned |
| Networking | TCP handshake & congestion control | planned |

## Layout

```
slowmo-cs/
├── index.html              # the gallery: filter by area, open a topic
├── os/
│   ├── io-models.html      # one topic: rendering + wiring
│   └── io-models.data.js   # one topic: content and steps
├── ds/
│   ├── avl.html / avl.js       # one topic: main() only + the real algorithm
│   ├── rbt.html / rbt.js       # red-black tree, double-black repair included
│   ├── heap.html / heap.js     # min-heap, array view and tree view in step
│   ├── bst.html / bst.js       # every key you type runs the real algorithm
│   ├── general.html / general.js  # n-ary file tree, text keys
│   ├── binary.html / binary.js # level-order array reading
│   ├── btree.html / btree.js   # B-tree: split/borrow/merge, keys in internal nodes
│   ├── bplus.html / btree.js   # B+ tree: separators only, records in linked leaves
│   ├── trees.html              # the older, hand-drawn tree tour
│   └── trees.data.js
├── shared/
│   ├── classic.css         # the whole design system (tokens + every component)
│   ├── stepper.js          # the step engine
│   ├── tree-session.js     # a live tree + the frames each operation produced
│   ├── session-ui.js       # operation bar and the per-operation timeline
│   ├── tree-page.js/.css   # the shared page skeleton for the operable tree pages
│   ├── tree-state.js       # snapshot -> view state (focus, path, rotated, ...)
│   ├── trace.js            # the recorder: line numbers, snapshots, narration
│   ├── steps.js            # the step contract (shape of one frame)
│   ├── frames.js           # structural invariants (one root, no cycles, heap/RB rules)
│   ├── treeview.js         # algorithm state -> persistent DOM binding (+ array view)
│   ├── treeview.css        # the tree's states (colors come from classic.css)
│   ├── trees-render.js     # hand-drawn diagrams: layout + SVG (browser AND node)
│   └── algo-ui.js          # step chips, tables
└── tools/
    ├── check.mjs           # content + structure + gallery + randomized sessions
    ├── review.mjs          # browser: errors, frame parity, interaction, buttons, mobile
    ├── build-pages.mjs     # page config + template -> the six operable tree pages
    ├── trees-page.mjs      # hand-drawn page: data, scenes, and what actually renders
    └── topics.mjs          # the registry: where each topic's algorithm lives
```

`stepper.js` only handles *time* — the cursor, autoplay, the progress bar, the
keyboard. `classic.css` only handles *looks*. `treeview.js` only handles
*binding*. Nobody touches anybody else's state.

### Two kinds of topic page

**Hand-drawn** (`os/io-models.html`, `ds/trees.html`) — you author a `steps`
array of snapshots. The layout and drawing live in `shared/trees-render.js`, and
that module is loaded by *both* the page and `tools/trees-page.mjs`: the same
code that puts pixels on screen is the code the checker runs, so "the data is
fine but nothing appears" is a build failure instead of something you notice
months later. That layer caught two real defects the data checks could not see:
B+ leaf-chain cells that never entered the layout at all, and two nodes landing
on the same pixel in four diagrams.

**Algorithm-driven, and directly operable** (`ds/bst.html`, `ds/avl.html`,
`ds/rbt.html`, `ds/heap.html`, `ds/general.html`, `ds/binary.html`,
`ds/btree.html`, `ds/bplus.html`) — you write the
algorithm as a subclass of `Trace` (`shared/trace.js`), it records its own run, and
the page is just a `main`:

```js
class MyTree extends Trace {
  root() { return this._root }
  kids(n) { return [n.left, n.right] }
  settle() { /* 拍快照前把派生字段算对 */ }
  extras(n) { /* 结构特有的展示字段，比如颜色 */ }
  insert(key) {
    this._log('比较…', 'Compare…', node.id, '比较后决定往哪边走', 'compare, then pick a side');
  }
}
```

`_log` records one frame: where it was emitted (taken from the call stack, so there is
no constant to drift), a bilingual narration, an optional one-line summary, the node
being looked at, and a structural snapshot. Nothing is drawn by hand, and node identity
is a stable `id` — `key` is just data the node carries.

### Using the tree, not just watching it

These six pages share one interaction layer, so each page only supplies a config:

```
shared/tree-session.js   a live tree: insert / search / remove / reset, and the
                         frames each operation produced (id counter never resets
                         inside a session, or the view would reuse the wrong DOM)
shared/session-ui.js     operation bar + timeline: every operation gets a row,
                         and every frame in it is clickable
shared/tree-page.js      mounts the view, wires the stepper, renders each frame,
                         and derives highlights from the snapshot
shared/tree-page.css     the shared layout (canvas + timeline on the left, the
                         narration on the right)
shared/tree-page.tpl.html  the page skeleton
tools/build-pages.mjs    page config (ds/<id>.page.js) + template → ds/<id>.html
```

Type a key and press Enter: an existing key is searched, a new one is inserted.
Switch to Delete and click a key to remove it. `node tools/build-pages.mjs --check`
fails if a generated page has drifted from the template or its config, and
`node tools/check.mjs` runs 12 × 16 random insert/search/delete operations per
topic against a `Set` model, checking every frame's structural invariants and the
resulting key set — that is what makes "the user can type anything" a claim with
machine backing instead of a hope.

Two structural facts are expressed as explicit policies in `tools/topics.mjs`
rather than papered over: a multi-way insert genuinely produces two nodes in one
step (a split leaves the left half in place and creates a right half, plus a new
root when the root splits), so `multiChildDiff` allows that; and a B+ tree's
internal keys are copies of leaf keys by design, so `separatorsMayRepeat` turns off
the "keys must be unique" rule for that page only. Everything else — one root, no
cycles, children in order, leaves on one level, one step may not delete a whole
subtree — stays enforced.

## Adding a topic

```js
const i18n = SlowMo.i18n(null, 'slowmo-<topic>-lang');
const stepper = new SlowMo.Stepper({ length: steps.length, onChange: applyStep });
SlowMo.controls(stepper, { prev:'#prev', next:'#next', progress:'#prog', counter:'#counter' });

function applyStep(i) {
  const s = steps[i];       // a snapshot, not an instruction
  draw(s);                  // your own rendering
}
```

Two rules keep it honest:

1. **A step is a state snapshot.** Render step `i` from `steps[i]` alone. Never
   accumulate deltas as you step forward, or stepping backwards will lie.
2. **Steps are data.** Keep them in `topic.data.js`, out of the rendering file.
   That file doubles as the thing people read to learn the topic.

Copy `os/io-models.html` and start hacking. For a real algorithm, write
`ds/<topic>.js` (the structure + a `Session`) plus `ds/<topic>.page.js` (the page
config) and add one entry to `tools/build-pages.mjs` and one to `tools/topics.mjs`.
`tools/check.mjs` then verifies the step contract, the structural invariants, the
frame-to-frame diff budget, the recorded line numbers, and a randomized operation
session against an independent model.

## Quality gates

Two commands, no dependencies, no `npm install`:

```bash
node tools/check.mjs      # 内容契约 / 结构不变量 / 帧间差异 / 源码行号 / 展厅一致性
node tools/review.mjs     # 浏览器侧：运行时错误、逐帧 DOM 对照、按钮样式、移动端溢出
```

`check.mjs` is the definition of done for a topic. It enforces, among other things:

- **the step contract** (`shared/steps.js`) — every frame carries a bilingual
  `text`, a stable node `id` per node, and a `focus` that either exists in that
  frame or is declared with `pendingKey`
- **line numbers taken from the call stack** — a frame records where it was
  emitted via `Error.captureStackTrace(err, this._log)`, so there is no
  hand-maintained constant to drift when the algorithm is edited
- **structure-specific rules** — ordered children (BST/AVL/RB), heap order,
  red-black properties (black root, no red-red, equal black height), height
  fields, bounded balance. Rules that an algorithm breaks *on purpose* mid-fix
  (an unbalanced subtree, a temporarily red root, a heap order awaiting a swap)
  are allowed in mid-operation frames but forbidden in the frame that settles it
- **structural invariants** (`shared/frames.js`) — one root, no cycles, parent
  pointers reachable, children ordered, height fields consistent, balance within
  bounds. Frames that settle an operation must satisfy all of them; frames in the
  middle may show a not-yet-repaired imbalance
- **explainable frame diffs** — one step may add/remove one node, or reparent at
  most four (a double rotation)
- **gallery honesty** — a card may not link to a missing page or claim a step
  count the topic does not have

Both run in CI (`.github/workflows/ci.yml`). They exist because every real bug in
this project so far was invisible on screen and was caught by these checks, not by
looking: a node aliased by key during delete, a `Set` comparing `1` to `"1"`, an
edge cache keyed on a `\0` separator. Screen-reading does not scale; assertions do.

## License

MIT

---

## 中文

把课本上一笔带过的那几步放慢。红黑树为什么会旋转、线程切换到底换掉了什么、
数据在哪一步被拷贝——**自己按下一步**，能回退、能改参数、能停在任意一帧。

打开 `index.html` 即可，没有构建、没有依赖、可离线。

- 左侧是机器此刻的状态，右侧是负责这一刻的代码；点行号可以跳到对应步骤
- `←` `→` 翻步，空格自动播放，右上角切中英文
- 每个主题由三部分组成：`xxx.html`（渲染）+ `xxx.data.js`（内容与步骤）+
  `shared/`（共用引擎与样式）
- 加主题就两步：写一个 `steps` 数组，写一个 `applyStep` 把它画出来

**一条硬规则**：每一步必须是"状态快照"，只靠 `steps[i]` 渲染，不许在前进时
累积增量——否则往回退的时候，画面就开始撒谎。
