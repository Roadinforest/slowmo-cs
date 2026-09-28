/* Content only: each frame is a complete snapshot.  Rendering lives in trees.html. */
window.SLOWMO_TREES = {
  structures: [
    {
      id:'general',
      name:{zh:'普通树 / 多叉树',en:'General / N-ary tree'},
      tagline:{zh:'层级，不是顺序。孩子可以有很多个。',en:'Hierarchy, not ordering. A node may have many children.'},
      use:{zh:'目录、DOM、组织架构、评论回复树',en:'Directories, DOM, org charts, comment threads'},
      ops:[['查找','Search','O(n)','O(n)'],['插入','Insert','O(1)*','O(1)*'],['删除子树','Delete subtree','O(k)','O(k)']],
      footnote:{zh:'* 已经拿到父节点引用时；若要先按值找到父节点，仍需 O(n)。k 是子树节点数。',en:'* When the parent is already known; finding it by value still costs O(n). k is subtree size.'},
      code:[['没有“左小右大”的规则','No left-smaller/right-larger rule'],['要找值，只能逐节点检查','To find a value, inspect nodes one by one'],['在已知父节点下挂孩子：O(1)','Attach a child to a known parent: O(1)'],['删除节点通常连同它的后代：O(k)','Deleting a node usually removes its descendants: O(k)']],
      scenes:[
        {tag:['结构','Shape'],title:['一个节点可以分出任意多个孩子','One node may branch to any number of children'],text:['它表达的是“属于谁 / 包含什么”，而非数字大小关系。','It represents “belongs to / contains”, not numeric ordering.'],line:0,focus:'root',diagram:'general'},
        {tag:['查找','Search'],title:['找“报告.pdf”：逐个目录走访','Find “report.pdf”: visit directories one by one'],text:['没有排序承诺，最坏情况下每个节点都要看一次：<b>O(n)</b>。','There is no ordering promise; in the worst case inspect every node: <b>O(n)</b>.'],line:1,focus:'report',diagram:'general'},
        {tag:['插入','Insert'],title:['已知“项目”目录时，直接挂入新文件','With the “Projects” directory known, attach a new file directly'],text:['只有改父节点的孩子列表：常见实现为 <b>O(1)</b>。先定位父节点则另算。','Only the parent’s child list changes: commonly <b>O(1)</b>. Locating the parent is separate.'],line:2,focus:'new',diagram:'general'},
        {tag:['删除','Delete'],title:['删除目录时，整棵子树一起离开','Deleting a directory removes its whole subtree'],text:['必须处理该目录下每个后代。若子树有 k 个节点，就是 <b>O(k)</b>。','Every descendant must be handled. With k nodes in the subtree, that is <b>O(k)</b>.'],line:3,focus:'projects',diagram:'general'}
      ]
    },
    {
      id:'binary',name:{zh:'二叉树',en:'Binary tree'},tagline:{zh:'每个节点至多两个孩子；不自动有序。',en:'At most two children per node; not automatically ordered.'},use:{zh:'表达式树、决策树、二叉堆与 BST 的基础',en:'Expression trees, decision trees, and the basis for heaps and BSTs'},ops:[['查找','Search','O(n)','O(n)'],['插入','Insert','O(n)','O(n)'],['删除','Delete','O(n)','O(n)']],footnote:{zh:'这里采用层序寻找第一个空槽位的插入，以及“最深最右节点替换”删除：完整操作都需要遍历。若调用方已经持有明确槽位，单纯连接或断开指针才是 O(1)。',en:'This page inserts by level-order search for the first empty slot and deletes via deepest-rightmost replacement, so each complete operation traverses the tree. Only linking or unlinking an already-known slot is O(1).'},code:[['每个节点只有 left 与 right 两个槽位','Each node has only left and right slots'],['“左、右”只是位置，不表示大小','Left/right are positions, not values'],['查找某值：遍历，最坏 O(n)','Find a value: traverse; worst case O(n)'],['层序插入先寻找第一个空槽位：O(n)','Level-order insertion first locates an empty slot: O(n)'],['最深最右节点替换删除需要遍历：O(n)','Deepest-rightmost replacement deletion requires traversal: O(n)'],['表达式树中，内部节点是运算符，叶子是操作数','In an expression tree, internal nodes are operators and leaves operands']],scenes:[
        {tag:['结构','Shape'],title:['两个槽位，让结构可递归地定义','Two slots make the structure recursively defined'],text:['“二叉”只限制分叉数。它本身<strong>不保证</strong>排序或平衡。','“Binary” only limits branching. It <strong>does not guarantee</strong> ordering or balance.'],line:0,focus:'root',diagram:'binary'},
        {tag:['查找','Search'],title:['寻找 8，可能必须访问整棵树','Looking for 8 may require visiting the whole tree'],text:['因为 8 可以出现在任何位置，最坏情况下遍历全部 n 个节点：<b>O(n)</b>。','Because 8 may be anywhere, the worst case traverses all n nodes: <b>O(n)</b>.'],line:2,focus:'eight',diagram:'binary'},
        {tag:['插入','Insert'],title:['把节点接到空槽位：已知位置是 O(1)','Attach to an empty slot: O(1) once known'],text:['指针连接很便宜；真正昂贵的往往是“那个空槽位在哪”。','Linking pointers is cheap; locating that empty slot is often the expensive part.'],line:0,focus:'slot',diagram:'binary'},
        {tag:['应用','Use'],title:['表达式树：结构就是计算顺序','Expression tree: structure is evaluation order'],text:['例如 <code>(a + b) × c</code>：先算加法，再算乘法。这里不需要键的排序。','For <code>(a + b) × c</code>: add first, then multiply. Key ordering is unnecessary.'],line:5,focus:'plus',diagram:'expr'}
      ]},
    {
      id:'bst',name:{zh:'二叉搜索树（BST）',en:'Binary search tree (BST)'},tagline:{zh:'左子树更小、右子树更大；高度决定速度。',en:'Smaller keys left, larger keys right; height determines speed.'},use:{zh:'内存中的有序集合、范围查询教学基础',en:'In-memory ordered sets and the basis for range-query reasoning'},ops:[['查找','Search',['平均 O(log n)','Average O(log n)'],['最坏 O(n)','Worst O(n)']],['插入','Insert',['平均 O(log n)','Average O(log n)'],['最坏 O(n)','Worst O(n)']],['删除','Delete',['平均 O(log n)','Average O(log n)'],['最坏 O(n)','Worst O(n)']]],footnote:{zh:'操作都只走一条根到叶路径，成本是树高 h；平衡时 h≈log n，退化成链时 h=n。',en:'Every operation follows one root-to-leaf path, costing height h; balanced h≈log n, a chain gives h=n.'},code:[['if key < node.key: go left','if key < node.key: go left'],['if key > node.key: go right','if key > node.key: go right'],['每次比较排除一整个子树','Each comparison discards an entire subtree'],['运行时间 = 路径长度 = 高度 h','Running time = path length = height h'],['删除双孩子节点：用后继/前驱替换','Delete a two-child node: replace with successor/predecessor']],scenes:[
        {tag:['规则','Rule'],title:['一次比较，排除半边候选','One comparison discards half the candidates'],text:['查找 7：<code>7 &gt; 5</code> 向右；<code>7 &lt; 8</code> 向左。只走一条路径。','Search 7: <code>7 &gt; 5</code> right; <code>7 &lt; 8</code> left. Follow one path.'],line:0,focus:'seven',diagram:'bst'},
        {tag:['查找','Search'],title:['平衡时路径短：O(log n)','A balanced tree has short paths: O(log n)'],text:['每层大致把候选减半。高度约为 <b>log n</b>，查找、插入、删除同理。','Each level roughly halves candidates. Height is about <b>log n</b>; same idea for insert and delete.'],line:3,focus:'root',diagram:'bst'},
        {tag:['退化','Degenerate'],title:['按升序插入，BST 会长成链','Ascending inserts can turn a BST into a chain'],text:['此时每次只排除一个节点，树高变为 n，三个操作都可能退化到 <b>O(n)</b>。','Each step now discards only one node, height becomes n, and all three operations can degrade to <b>O(n)</b>.'],line:3,focus:'chain',diagram:'chain'},
        {tag:['删除','Delete'],title:['双孩子节点：取中序后继补位','Two-child delete: promote the inorder successor'],text:['先沿一条路径找到节点，再找右子树最小者；仍是 <b>O(h)</b>。','Find the node along one path, then the smallest in its right subtree; still <b>O(h)</b>.'],line:4,focus:'succ',diagram:'bst'}
      ]},
    {
      id:'avl',name:{zh:'AVL 树',en:'AVL tree'},tagline:{zh:'严格平衡的 BST：左右子树高度差最多 1。',en:'A strictly balanced BST: child heights differ by at most 1.'},use:{zh:'读多写少、希望查询路径很紧凑的内存索引',en:'Read-heavy in-memory indexes needing tightly bounded paths'},ops:[['查找','Search','O(log n)','O(log n)'],['插入','Insert','O(log n)','O(log n)'],['删除','Delete','O(log n)','O(log n)']],footnote:{zh:'旋转是常数时间；插入最多修复到根的一条路径，删除可能沿路径做多次修复，整体仍 O(log n)。',en:'A rotation is O(1); repair follows one path to root. Deletion may repair repeatedly, but remains O(log n).'},code:[['balance = height(left) − height(right)','balance = height(left) − height(right)'],['要求 balance ∈ {−1, 0, 1}','Require balance ∈ {−1, 0, 1}'],['失衡时做单旋或双旋','When unbalanced, use a single or double rotation'],['旋转保持 BST 的中序顺序','Rotation preserves BST in-order order'],['因此高度始终是 O(log n)','Therefore height stays O(log n)']],scenes:[
        {tag:['检查','Check'],title:['每个节点都看“左右差几层”','Every node watches its height difference'],text:['AVL 把平衡因子限制在 −1、0、1。比普通 BST 更严格。','AVL confines the balance factor to −1, 0, or 1. It is stricter than an ordinary BST.'],line:1,focus:'root',diagram:'avl'},
        {tag:['插入','Insert'],title:['插入 30 造成右右失衡','Insert 30 causes a right-right imbalance'],text:['局部高度差变为 −2；一次左旋把 20 提上来。旋转本身是 <b>O(1)</b>。','The local height difference becomes −2; one left rotation promotes 20. The rotation itself is <b>O(1)</b>.'],line:2,focus:'thirty',diagram:'avlbad'},
        {tag:['修复','Repair'],title:['旋转后仍满足“左小右大”','After rotation, “smaller left, larger right” still holds'],text:['旋转只重新安排局部父子关系，并未打乱中序序列 10, 20, 30。','Rotation rearranges local parent/child links without changing in-order sequence 10, 20, 30.'],line:3,focus:'twenty',diagram:'avl'},
        {tag:['复杂度','Complexity'],title:['严格限制高度，所以三种操作均为 O(log n)','Strict height bounds make all three operations O(log n)'],text:['先像 BST 一样走高为 h 的路径，再做局部修复；而 h 始终是 <b>O(log n)</b>。','Walk a height-h BST path, then repair locally; h always stays <b>O(log n)</b>.'],line:4,focus:'root',diagram:'avl'}
      ]},
    {
      id:'rb',name:{zh:'红黑树',en:'Red-black tree'},tagline:{zh:'用颜色约束“足够平衡”，降低更新时旋转频率。',en:'Color rules keep it “balanced enough” with fewer update rotations.'},use:{zh:'C++ map/set、Java TreeMap、内核定时器与区间结构',en:'C++ map/set, Java TreeMap, kernel timers, interval structures'},ops:[['查找','Search','O(log n)','O(log n)'],['插入','Insert','O(log n)','O(log n)'],['删除','Delete','O(log n)','O(log n)']],footnote:{zh:'最长根叶路径至多约为最短路径两倍，因此高度 O(log n)。它通常比 AVL 松，但写入重平衡更少。',en:'The longest root-leaf path is at most about twice the shortest, so height is O(log n). It is looser than AVL but usually rebalances writes less.'},code:[['根为黑；红节点不能有红孩子','Root is black; red nodes cannot have red children'],['每条根到空叶路径黑节点数相同','Every root-to-null-leaf path has equal black height'],['插入后：变色或旋转 + 变色','After insert: recolor or rotate + recolor'],['这些规则把高度限制为 O(log n)','These rules bound height by O(log n)'],['删除用“额外黑色”案例修复','Deletion repairs “extra black” cases']],scenes:[
        {tag:['规则','Rules'],title:['颜色不是数据，是高度的护栏','Colors are guardrails for height, not data'],text:['红红相连不允许；任一路径的黑节点数相同。这些局部规则约束全局形状。','No red-red parent/child pair; every path has the same black count. Local rules constrain global shape.'],line:0,focus:'root',diagram:'rb'},
        {tag:['插入','Insert'],title:['叔叔是红：先变色，把问题上推','Red uncle: recolor first, push the problem upward'],text:['很多插入只需改颜色；需要旋转时也只处理局部常数个节点。','Many inserts only recolor; rotations, when needed, touch only a constant-size neighborhood.'],line:2,focus:'uncle',diagram:'rb'},
        {tag:['查找','Search'],title:['查找仍是 BST 查找，但路径被高度界限制','Search is still BST search, but its path has a height bound'],text:['比较方向和 BST 相同；颜色规则保证不会出现 n 长的链，故 <b>O(log n)</b>。','Comparison directions match a BST; color rules prevent an n-long chain, giving <b>O(log n)</b>.'],line:3,focus:'seven',diagram:'rb'},
        {tag:['取舍','Trade-off'],title:['比 AVL 松一点，工程中往往更偏爱写入表现','Looser than AVL, often favored for write behavior'],text:['AVL 的查询路径通常更短；红黑树允许更松的形状，更新时通常少做旋转。','AVL paths are usually shorter; red-black trees allow a looser shape and commonly rotate less on updates.'],line:3,focus:'root',diagram:'rb'}
      ]},
    {
      id:'heap',name:{zh:'堆 / 优先队列',en:'Heap / priority queue'},tagline:{zh:'只保证父子优先级，不保证全局有序。',en:'Only parent-child priority is guaranteed, not global ordering.'},use:{zh:'任务调度、定时器、Top-K、Dijkstra、事件模拟',en:'Scheduling, timers, Top-K, Dijkstra, event simulation'},ops:[['查看最值','Peek','O(1)','O(1)'],['插入','Insert','O(log n)','O(log n)'],['删除最值','Pop','O(log n)','O(log n)'],['查找任意值','Find arbitrary','O(n)','O(n)']],footnote:{zh:'此处以二叉最小堆为例。数组紧凑存储；索引 i 的父节点是 ⌊(i−1)/2⌋。',en:'A binary min-heap is shown. It stores compactly in an array; parent of index i is ⌊(i−1)/2⌋.'},code:[['堆顶永远是最小（或最大）元素','The root is always min (or max)'],['新元素放到数组末尾','Put a new element at the array end'],['向上交换，直到父节点更优','Swap upward until the parent is better'],['删除堆顶：末尾元素补到根，再下沉','Pop root: move last element to root, then sift down'],['任意元素没有左右排序，查找需扫描','Arbitrary elements lack left/right ordering; search scans']],scenes:[
        {tag:['规则','Rule'],title:['只比较父子：根就是最小值','Only parent-child comparisons: the root is the minimum'],text:['子树之间并不排序。3 在 8 左右都可以；因此它适合“下一件最紧急的事”。','Subtrees are not ordered against one another. A 3 could be anywhere below 8; this suits “what is next?”'],line:0,focus:'root',diagram:'heap'},
        {tag:['查看','Peek'],title:['读最小值，不走路径：O(1)','Read the minimum without a path: O(1)'],text:['最优元素固定在数组下标 0 / 树根，直接读取。','The best element is fixed at array index 0 / the root; read it directly.'],line:0,focus:'root',diagram:'heap'},
        {tag:['插入','Insert'],title:['新元素放末尾，再一路上浮','Append, then sift up'],text:['完全二叉树高度是 <b>log n</b>；最多每层交换一次，所以插入 <b>O(log n)</b>。','A complete binary tree has height <b>log n</b>; at most one swap per level makes insert <b>O(log n)</b>.'],line:2,focus:'one',diagram:'heapinsert'},
        {tag:['删除','Pop'],title:['末尾补到根，再一路下沉','Move last to root, then sift down'],text:['每层选择更小的孩子继续交换，最多走树高：<b>O(log n)</b>。','Choose the smaller child at each level and swap down, at most the tree height: <b>O(log n)</b>.'],line:3,focus:'nine',diagram:'heap'},
        {tag:['限制','Limit'],title:['找任意值不是它的强项','Finding an arbitrary value is not its strength'],text:['想找 7，不能根据“比根大”决定往左或右；最坏仍要扫描 <b>O(n)</b>。','To find 7, “larger than root” does not choose left or right; worst case scans <b>O(n)</b>.'],line:4,focus:'seven',diagram:'heap'}
      ]},
    {
      id:'b',name:{zh:'B 树',en:'B-tree'},tagline:{zh:'一个节点放多个有序键，专为少读磁盘页。',en:'Many sorted keys per node, built to minimize disk-page reads.'},use:{zh:'数据库和文件系统的传统磁盘索引',en:'Traditional database and filesystem disk indexes'},ops:[['查找','Search','O(log n)','O(log n)'],['插入','Insert','O(log n)','O(log n)'],['删除','Delete','O(log n)','O(log n)']],footnote:{zh:'复杂度按树高计；工程上更重要的单位是 I/O 次数。高扇出让高度很低，一个节点通常正好装进一个页。',en:'Complexity is by height; in practice the key unit is I/O count. High fan-out keeps height low, and a node often fits one page.'},code:[['一个节点存多个有序 key 与子指针','A node stores multiple sorted keys and child pointers'],['在页内二分或线性定位分支','Find a branch inside the page'],['满节点分裂，中间 key 上推','Split a full node; promote the middle key'],['高扇出 ⇒ 高度很小','High fan-out ⇒ very small height'],['每层通常只需读取一个磁盘页','Each level usually reads one disk page']],scenes:[
        {tag:['页','Page'],title:['把一层尽可能塞进一个磁盘页','Fit as much of one level as possible in one disk page'],text:['内存树追求少比较；B 树更在意少 I/O。一个节点含多个键，分出很多孩子。','In-memory trees minimize comparisons; B-trees care more about I/O. One node holds many keys and has many children.'],line:0,focus:'root',diagram:'btree'},
        {tag:['查找','Search'],title:['一次页读取，排除大量范围','One page read discards a large range'],text:['在根页找到 42 落在 30 与 50 之间，只进入对应孩子页。扇出高，层数低。','In the root page, 42 falls between 30 and 50, so enter one child page. High fan-out means few levels.'],line:1,focus:'forty',diagram:'btree'},
        {tag:['插入','Insert'],title:['页满时分裂，把中间键上推','When a page fills, split it and promote the middle key'],text:['分裂只沿根到叶的一条路径传播；即使传播到根，页层数也是 <b>O(log n)</b>。','Splits propagate only along a root-to-leaf path; even up to root, page levels are <b>O(log n)</b>.'],line:2,focus:'split',diagram:'btree'},
        {tag:['删除','Delete'],title:['删除后借键或合并，保持各层饱满','After deletion, borrow a key or merge to keep levels full'],text:['这样不会退化成稀疏长链。重点是：百万级记录也可能只需几次页读取。','This avoids a sparse, tall chain. The point: millions of records may need only a few page reads.'],line:4,focus:'root',diagram:'btree'}
      ]},
    {
      id:'bplus',name:{zh:'B+ 树',en:'B+ tree'},tagline:{zh:'内部节点只导航；全部记录在叶子，叶子相连。',en:'Internal nodes navigate; all records live in linked leaves.'},use:{zh:'关系型数据库的主流索引与范围扫描',en:'The mainstream index for relational databases and range scans'},ops:[['查找','Search','O(log n)','O(log n)'],['插入','Insert','O(log n)','O(log n)'],['删除','Delete','O(log n)','O(log n)'],['范围扫描','Range scan','O(log n + k)','O(log n + k)']],footnote:{zh:'先 O(log n) 定位起点叶，再沿叶子链输出 k 条连续记录。内部节点更小，通常带来更高扇出。',en:'First locate the starting leaf in O(log n), then follow leaf links for k consecutive records. Smaller internal nodes often mean higher fan-out.'},code:[['内部节点的 key 只是分隔符','Internal keys are separators only'],['所有完整记录都在叶子节点','All complete records are in leaf nodes'],['叶子节点按 key 顺序链成链表','Leaves link together in key order'],['单点查找：走根到叶，O(log n)','Point lookup: root to leaf, O(log n)'],['范围查询：定位起点 + 叶链扫描，O(log n + k)','Range: locate start + scan leaf chain, O(log n + k)']],scenes:[
        {tag:['布局','Layout'],title:['内部页负责指路，叶子页存真数据','Internal pages guide; leaf pages hold the actual data'],text:['同一个分隔键可以出现在内部和叶子；真正的数据记录只在叶子。','A separator may appear internally and in a leaf; actual records reside only in leaves.'],line:1,focus:'root',diagram:'bplus'},
        {tag:['单点','Point lookup'],title:['找 42：像 B 树一样向下定位叶子','Find 42: descend to its leaf like a B-tree'],text:['经过少数高扇出层，到达包含 42 的叶子，时间 <b>O(log n)</b>。','Pass through a few high-fan-out levels to the leaf containing 42, in <b>O(log n)</b>.'],line:3,focus:'forty',diagram:'bplus'},
        {tag:['范围','Range scan'],title:['查 20…60：先找 20，再顺着叶子链走','Scan 20…60: find 20, then follow the leaf chain'],text:['无需反复回到父节点。定位起点 <b>O(log n)</b>，输出 k 条结果是 <b>O(k)</b>。','No need to repeatedly climb to parents. Locate start <b>O(log n)</b>, output k results in <b>O(k)</b>.'],line:4,focus:'range',diagram:'bplus'},
        {tag:['为什么','Why'],title:['范围查询友好，是数据库偏爱它的原因','Range scans explain why databases favor it'],text:['内部节点不放完整记录，单页可容纳更多分支；树更矮，连续叶子也利于顺序 I/O。','Internal nodes omit full records, fitting more branches per page; the tree is shorter and consecutive leaves help sequential I/O.'],line:2,focus:'leaf',diagram:'bplus'}
      ]}
  ]
};

/*
 * Complete operation walkthroughs. Each row is normalized into a full frame;
 * no frame depends on mutations performed by the previous frame.
 */
(function attachWalkthroughs(DATA){
  const L=(zh,en)=>[zh,en];
  const F=(name,rows)=>({name,scenes:rows.map((r,i)=>({
    tag:r[0],title:r[1],text:r[2],diagram:r[3],focus:r[4],line:r[5],
    cost:r[6]||L(`第 ${i+1} 步`,`Step ${i+1}`)
  }))});
  const FEATURES={
    general:[L('孩子数量不固定，天然表达一对多层级','Unbounded child count naturally models one-to-many hierarchy'),L('没有键的全局排序规则','No global key-ordering rule'),L('深度、宽度和形状完全由业务数据决定','Depth, width, and shape are determined by domain data')],
    binary:[L('每个节点最多有左、右两个孩子','Each node has at most left and right children'),L('“左/右”只是位置，本身不代表大小','Left/right are positions and do not imply value order'),L('是 BST、AVL、红黑树和二叉堆的结构基础','Structural foundation for BSTs, AVL, red-black trees, and binary heaps')],
    bst:[L('左子树键更小，右子树键更大','Keys are smaller on the left and larger on the right'),L('中序遍历会得到有序序列','In-order traversal produces sorted order'),L('性能完全取决于树高，可能退化成链','Performance depends on height and may degrade into a chain')],
    avl:[L('首先是一棵 BST，额外维护节点高度','A BST that additionally maintains node heights'),L('任意节点左右子树高度差最多 1','Child subtree heights differ by at most 1 at every node'),L('平衡更严格，查询路径短，但更新可能旋转更多','Stricter balance gives shorter lookups but may rotate more on updates')],
    rb:[L('首先是一棵 BST，用红黑颜色维护近似平衡','A BST using red/black colors for approximate balance'),L('红节点不能连续，每条根叶路径黑高相同','No consecutive red nodes; every root-leaf path has equal black height'),L('平衡比 AVL 宽松，通常更适合频繁增删','Looser than AVL and often better suited to frequent updates')],
    heap:[L('通常是完全二叉树，并紧凑存放在数组中','Usually a complete binary tree stored compactly in an array'),L('只保证父节点优先于孩子，不保证左右子树有序','Only parent-child priority is ordered; subtrees are not globally sorted'),L('堆顶最值 O(1)，适合实现优先队列','O(1) access to the top priority makes it ideal for priority queues')],
    b:[L('一个节点存多个有序键并拥有多个孩子','Each node stores multiple sorted keys and has many children'),L('所有节点都可以同时保存索引键和记录','Both internal and leaf nodes may store keys and records'),L('高扇出降低树高，优化磁盘页 I/O','High fan-out lowers height and minimizes disk-page I/O')],
    bplus:[L('内部节点只保存导航分隔键','Internal nodes store navigation separators only'),L('完整记录全部位于同一层的叶节点','All complete records live in leaves at the same depth'),L('叶子按键相连，单点和范围查询都高效','Leaves are linked by key, enabling efficient point and range queries')]
  };
  const W={
    general:{
      search:F(L('查找“App”','Find “App”'),[
        [L('开始','Start'),L('从根节点开始深度优先遍历','Start a depth-first traversal at the root'),L('普通树没有键的排序规则，因此不能提前判断目标在哪个分支。','A general tree has no key ordering, so no branch can be ruled out in advance.'),'general','root',0,L('已访问 1 个节点','1 node visited')],
        [L('检查分支','Inspect branch'),L('先检查“文档”及其孩子','Inspect “Documents” and its children first'),L('这一整支都可能藏着目标；未找到后才能回溯。','The target could be anywhere in this branch; only after a miss can we backtrack.'),'general','docs',1,L('已访问 3 个节点','3 nodes visited')],
        [L('换分支','Next branch'),L('回到根，再进入“项目”','Backtrack to root, then enter “Projects”'),L('遍历顺序可以是 DFS 或 BFS，但最坏情况都要看完所有节点。','Traversal may be DFS or BFS, but both can inspect every node in the worst case.'),'general','projects',1,L('已访问 4 个节点','4 nodes visited')],
        [L('找到','Found'),L('比较命中“App”','The comparison matches “App”'),L('目标在第 5 次访问时找到；若它不存在，则会访问 n 个节点，所以查找是 <b>O(n)</b>。','The target is found on visit 5; if absent, all n nodes are visited, so search is <b>O(n)</b>.'),'general','app',1,L('完成 · O(n)','Done · O(n)')]
      ]),
      insert:F(L('插入“测试”','Insert “Tests”'),[
        [L('定位父节点','Locate parent'),L('先从根寻找父节点“项目”','First find the parent “Projects” from the root'),L('若只有父节点的名字而没有引用，这一步本身最坏需要 <b>O(n)</b>。','If only the parent name is known, locating it itself costs <b>O(n)</b> in the worst case.'),'general','root',1,L('查找父节点','Finding parent')],
        [L('命中父节点','Parent found'),L('遍历到“项目”','Traversal reaches “Projects”'),L('现在已经拿到父节点对象，可以修改它的孩子列表。','We now hold the parent object and can modify its child list.'),'general','projects',2,L('已拿到父节点引用','Parent reference acquired')],
        [L('分配节点','Allocate'),L('创建“测试”节点','Create the “Tests” node'),L('分配节点并初始化其孩子列表；这是常数次本地操作。','Allocate the node and initialize its child list; this is constant local work.'),'generalAdded','tests',2,L('局部工作 O(1)','Local work O(1)')],
        [L('连接','Link'),L('把新节点追加到“项目”的孩子列表','Append the new node to “Projects” children'),L('已知父节点时连接通常为 <b>O(1)</b>；若包含定位父节点，总成本为 <b>O(n)</b>。','Linking is usually <b>O(1)</b> with the parent known; including parent lookup, total cost is <b>O(n)</b>.'),'generalAdded','projects',2,L('完成 · O(1)*','Done · O(1)*')]
      ]),
      delete:F(L('删除“项目”子树','Delete “Projects” subtree'),[
        [L('定位','Locate'),L('从根遍历寻找“项目”','Traverse from the root to find “Projects”'),L('普通树无法按大小选择方向，定位目标最坏仍为 O(n)。','A general tree cannot choose a direction by key order; locating the target is O(n) worst case.'),'general','root',1,L('开始查找','Search started')],
        [L('命中','Found'),L('找到“项目”以及它在父节点中的位置','Find “Projects” and its slot in the parent'),L('删除连接前，要保存父节点引用或孩子下标。','Before removing the link, retain the parent reference or child index.'),'general','projects',3,L('目标子树大小 k=2','Target subtree size k=2')],
        [L('清理子树','Release subtree'),L('后序处理“App”等后代','Process descendants such as “App” in postorder'),L('每个后代都必须释放或解除引用，因此清理 k 个节点需要 <b>O(k)</b>。','Every descendant must be released or unlinked, so cleaning k nodes costs <b>O(k)</b>.'),'general','app',3,L('已处理 1 / 2','Processed 1 / 2')],
        [L('断开','Detach'),L('从根的孩子列表移除“项目”','Remove “Projects” from the root child list'),L('子树已经消失。已知目标引用时删除成本由子树大小决定：<b>O(k)</b>。','The subtree is gone. With the target reference known, deletion is governed by subtree size: <b>O(k)</b>.'),'generalDeleted','root',3,L('完成 · O(k)','Done · O(k)')]
      ])
    },
    binary:{
      search:F(L('查找 8','Find 8'),[
        [L('开始','Start'),L('从根 A 开始 DFS','Start DFS at root A'),L('普通二叉树只有 left/right 槽位，没有“左小右大”的含义。','A plain binary tree only has left/right slots; they do not mean smaller/larger.'),'binary','root',1,L('访问 1 个节点','1 node visited')],
        [L('向左','Go left'),L('检查 B','Inspect B'),L('A 不是目标，只能按既定遍历顺序继续。','A is not the target, so continue in the chosen traversal order.'),'binary','left',2,L('访问 2 个节点','2 nodes visited')],
        [L('命中','Match'),L('B 的左孩子是 8','B’s left child is 8'),L('找到后停止；如果目标在最后或不存在，仍需检查全部 n 个节点。','Stop when found; if last or absent, all n nodes must still be inspected.'),'binary','eight',2,L('完成 · 最坏 O(n)','Done · worst O(n)')]
      ]),
      insert:F(L('按层序插入 X','Level-order insert X'),[
        [L('开始','Start'),L('用队列从根开始层序扫描','Use a queue for a level-order scan from the root'),L('为了保持完全/紧凑形状，常见示例会寻找第一个空槽位。','To keep a compact shape, a common implementation looks for the first empty slot.'),'binary','root',3,L('队列 [A]','Queue [A]')],
        [L('检查 A','Inspect A'),L('A 的左右槽位都已占用','Both slots of A are occupied'),L('把 B、C 入队，继续扫描下一层。','Enqueue B and C, then scan the next level.'),'binary','root',3,L('队列 [B, C]','Queue [B, C]')],
        [L('找到空位','Find slot'),L('B 的右槽位为空','B’s right slot is empty'),L('定位空位需要遍历；最坏可能扫描 n 个节点。','Locating a free slot requires traversal and may scan n nodes in the worst case.'),'binary','slot',3,L('空槽位已定位','Empty slot located')],
        [L('连接','Link'),L('把 X 连接为 B.right','Link X as B.right'),L('真正的指针写入是 <b>O(1)</b>；但完整操作包含前面的层序定位，因此总成本为 <b>O(n)</b>。','The pointer write itself is <b>O(1)</b>; the complete operation includes level-order location, so total cost is <b>O(n)</b>.'),'binaryAdded','x',3,L('完成 · O(n)','Done · O(n)')]
      ]),
      delete:F(L('删除 C','Delete C'),[
        [L('找目标','Find target'),L('层序遍历找到 C','Find C by level-order traversal'),L('普通二叉树没有搜索顺序，定位最坏 O(n)。','A plain binary tree has no search ordering, so location is O(n) worst case.'),'binary','right',4,L('目标 C 已找到','Target C found')],
        [L('找替代','Find replacement'),L('继续找到最深最右节点 E','Continue to the deepest rightmost node E'),L('一种常见删除算法用最深最右节点填补目标位置。','One common deletion algorithm fills the target slot with the deepest rightmost node.'),'binary','e',4,L('替代节点 E','Replacement E')],
        [L('覆盖','Copy'),L('把 E 的值复制到 C 的位置','Copy E’s value into C’s position'),L('结构暂时仍有两个 E；下一步移除原来的叶子。','There are temporarily two E values; next remove the original leaf.'),'binaryCopied','right',4,L('值已复制','Value copied')],
        [L('移除叶子','Remove leaf'),L('断开原 E 节点','Detach the original E node'),L('遍历支配成本，因此完整删除最坏为 <b>O(n)</b>。','Traversal dominates, so the full deletion is worst-case <b>O(n)</b>.'),'binaryDeleted','right',4,L('完成 · O(n)','Done · O(n)')]
      ])
    },
    bst:{
      search:F(L('查找 7','Search 7'),[
        [L('根比较','Compare root'),L('7 与根 5 比较','Compare 7 with root 5'),L('<code>7 &gt; 5</code>，左子树全部小于 5，可以整体排除。','<code>7 &gt; 5</code>; the entire left subtree is below 5 and can be discarded.'),'bst','root',0,L('比较 1 次','1 comparison')],
        [L('向右','Go right'),L('7 与 8 比较','Compare 7 with 8'),L('<code>7 &lt; 8</code>，排除 8 的右子树，进入左孩子。','<code>7 &lt; 8</code>; discard 8’s right subtree and enter its left child.'),'bst','eight',0,L('比较 2 次','2 comparisons')],
        [L('命中','Match'),L('当前键正好是 7','The current key is exactly 7'),L('只走根到节点的一条路径，成本等于路径长度 h。','Only one root-to-node path is followed, so cost equals path length h.'),'bst','seven',3,L('完成 · O(h)','Done · O(h)')]
      ]),
      insert:F(L('插入 6','Insert 6'),[
        [L('比较 5','Compare 5'),L('6 大于 5，向右','6 is greater than 5; go right'),L('插入先执行一次失败的 BST 查找。','Insertion begins as an unsuccessful BST search.'),'bst','root',0,L('比较 1 次','1 comparison')],
        [L('比较 8','Compare 8'),L('6 小于 8，向左','6 is less than 8; go left'),L('只有这一条候选路径需要继续。','Only this candidate path needs to continue.'),'bst','eight',0,L('比较 2 次','2 comparisons')],
        [L('比较 7','Compare 7'),L('6 小于 7，发现空的左槽位','6 is less than 7; its left slot is empty'),L('到达空指针，查找阶段结束。','The null pointer is reached; the search phase ends.'),'bst','seven',0,L('比较 3 次','3 comparisons')],
        [L('插入','Attach'),L('把 6 连接为 7.left','Attach 6 as 7.left'),L('连接是 O(1)，但寻找位置用了 h 步，总体 <b>O(h)</b>；平衡时为 O(log n)。','Linking is O(1), but finding the slot took h steps, for <b>O(h)</b> total; balanced gives O(log n).'),'bstAdded','six',3,L('完成 · O(h)','Done · O(h)')]
      ]),
      delete:F(L('删除 8','Delete 8'),[
        [L('定位','Locate'),L('从 5 向右找到 8','Go right from 5 to find 8'),L('先按 BST 规则走一条根到目标的路径。','First follow one root-to-target path using BST ordering.'),'bst','eight',4,L('目标有两个孩子','Target has two children')],
        [L('找后继','Find successor'),L('进入右子树，找到最小键 9','Enter the right subtree and find its minimum key 9'),L('中序后继一定没有左孩子，适合搬到目标位置。','The inorder successor has no left child, making it suitable to move into the target slot.'),'bst','succ',4,L('后继 = 9','Successor = 9')],
        [L('替换键','Replace key'),L('用 9 覆盖 8','Replace 8 with 9'),L('BST 的中序顺序仍保持有序；现在只需删除原来的叶子 9。','The BST in-order sequence remains sorted; now remove the original leaf 9.'),'bstCopied','eight',4,L('转化为删除叶子','Reduced to leaf deletion')],
        [L('移除后继','Remove successor'),L('断开原来的 9','Detach the original 9'),L('定位目标和后继都在同一高度范围内，总成本 <b>O(h)</b>。','Locating the target and successor stays within the tree height, for <b>O(h)</b> total.'),'bstDeleted','eight',4,L('完成 · O(h)','Done · O(h)')]
      ])
    },
    avl:{
      search:F(L('查找 30','Search 30'),[
        [L('比较根','Compare root'),L('30 大于 20，向右','30 is greater than 20; go right'),L('AVL 的查找规则与 BST 完全相同。','AVL search follows exactly the same comparisons as a BST.'),'avl','twenty',4,L('比较 1 次','1 comparison')],
        [L('命中','Match'),L('右孩子就是 30','The right child is 30'),L('AVL 把高度严格限制为 O(log n)，因此最坏查找也是 <b>O(log n)</b>。','AVL strictly bounds height to O(log n), so worst-case search is also <b>O(log n)</b>.'),'avl','thirty',4,L('完成 · O(log n)','Done · O(log n)')]
      ]),
      insert:F(L('依次插入 10、20、30','Insert 10, 20, 30'),[
        [L('插入 10','Insert 10'),L('10 成为根','10 becomes the root'),L('单节点的平衡因子为 0。','A single node has balance factor 0.'),'avlOne','root',1,L('高度 1','Height 1')],
        [L('插入 20','Insert 20'),L('20 成为 10 的右孩子','20 becomes the right child of 10'),L('根的平衡因子为 −1，仍满足 AVL 条件。','The root balance factor is −1, still valid for AVL.'),'avlTwo','twenty',1,L('平衡因子 −1','Balance factor −1')],
        [L('插入 30','Insert 30'),L('30 落到 20 的右侧，形成 RR 失衡','30 lands right of 20, creating an RR imbalance'),L('节点 10 的平衡因子变为 −2，必须修复。','Node 10 now has balance factor −2 and must be repaired.'),'avlbad','thirty',2,L('发现首个失衡祖先 10','First unbalanced ancestor: 10')],
        [L('左旋','Rotate left'),L('以 10 为轴左旋，20 上升','Rotate left at 10; 20 moves up'),L('旋转只改常数个指针，并保持中序顺序 10,20,30。','The rotation changes a constant number of pointers and preserves in-order sequence 10,20,30.'),'avl','twenty',3,L('旋转 O(1)','Rotation O(1)')],
        [L('完成','Done'),L('重新计算高度和平衡因子','Recompute heights and balance factors'),L('搜索路径 O(log n) 加常数次旋转，插入总计 <b>O(log n)</b>。','An O(log n) search path plus constant rotations makes insertion <b>O(log n)</b>.'),'avl','twenty',4,L('完成 · O(log n)','Done · O(log n)')]
      ]),
      delete:F(L('删除 40 并重平衡','Delete 40 and rebalance'),[
        [L('初始','Initial'),L('沿 BST 路径寻找 40','Follow the BST path to find 40'),L('删除前的 AVL 树满足每个节点高度差不超过 1。','Before deletion, every AVL node has height difference at most 1.'),'avlDeleteStart','forty',4,L('查找 O(log n)','Search O(log n)')],
        [L('删除叶子','Remove leaf'),L('断开叶子 40','Detach leaf 40'),L('局部删除是 O(1)，但它可能降低祖先子树的高度。','Local removal is O(1), but it may lower ancestor subtree heights.'),'avlDeleteBad','thirty',0,L('30 的平衡因子变为 +2','Balance at 30 becomes +2')],
        [L('判断类型','Classify'),L('左孩子 20 也偏左：LL 型','Left child 20 is also left-heavy: LL case'),L('因此对 30 做一次右旋即可。','A single right rotation at 30 is sufficient.'),'avlDeleteBad','twenty',2,L('选择右旋','Choose right rotation')],
        [L('右旋','Rotate right'),L('20 上升，30 下沉到右侧','20 rises; 30 moves down to the right'),L('沿删除路径向根继续更新高度；每层最多做常数工作。','Continue updating heights toward the root; each level does constant work.'),'avlDeleteDone','twenty',3,L('完成 · O(log n)','Done · O(log n)')]
      ])
    },
    rb:{
      search:F(L('查找 12','Search 12'),[
        [L('比较 10','Compare 10'),L('12 大于 10，向右','12 is greater than 10; go right'),L('颜色不参与键的比较；查找仍按 BST 顺序。','Color does not participate in key comparison; search still follows BST ordering.'),'rbBase','root',3,L('比较 1 次','1 comparison')],
        [L('比较 15','Compare 15'),L('12 小于 15，向左','12 is less than 15; go left'),L('红黑性质只负责限制路径不会过长。','Red-black properties only ensure the path cannot become too long.'),'rbBase','fifteen',3,L('比较 2 次','2 comparisons')],
        [L('命中','Match'),L('当前节点是 12','The current node is 12'),L('树高最坏 O(log n)，所以查找最坏也是 <b>O(log n)</b>。','Tree height is O(log n) worst case, so search is also <b>O(log n)</b>.'),'rbBase','twelve',3,L('完成 · O(log n)','Done · O(log n)')]
      ]),
      insert:F(L('插入 1（叔叔为红）','Insert 1 (red uncle)'),[
        [L('BST 插入','BST insert'),L('沿 10 → 5 找到空位','Follow 10 → 5 to an empty slot'),L('新节点先按 BST 规则插入，并默认染成红色。','Insert by BST rules first; the new node starts red.'),'rbInsert','one',2,L('路径 O(log n)','Path O(log n)')],
        [L('发现冲突','Detect conflict'),L('1 与父节点 5 都是红色','Both 1 and parent 5 are red'),L('红节点不能有红孩子；查看叔叔 15 的颜色。','A red node cannot have a red child; inspect uncle 15.'),'rbInsert','five',0,L('红-红冲突','Red-red conflict')],
        [L('变色','Recolor'),L('父 5、叔 15 变黑，祖父 10 变红','Color parent 5 and uncle 15 black; grandparent 10 red'),L('叔叔为红时不旋转，把黑高冲突向上移动。','With a red uncle, no rotation is needed; move the black-height issue upward.'),'rbRecolor','root',2,L('常数次变色','Constant recolors')],
        [L('修正根','Fix root'),L('根节点 10 必须为黑','The root 10 must be black'),L('根重新染黑，所有红黑性质恢复；总成本由搜索路径决定，为 <b>O(log n)</b>。','Recolor the root black; all properties are restored. Search-path cost dominates: <b>O(log n)</b>.'),'rbInsertDone','root',3,L('完成 · O(log n)','Done · O(log n)')]
      ]),
      delete:F(L('删除黑色叶子 5','Delete black leaf 5'),[
        [L('定位','Locate'),L('按 BST 规则找到黑色叶子 5','Find black leaf 5 using BST ordering'),L('定位目标需要 O(log n)。删除黑节点会让一侧黑高少 1。','Locating the target costs O(log n). Removing a black node lowers one side’s black height by 1.'),'rbDeleteStart','five',4,L('目标 = 黑色叶子','Target = black leaf')],
        [L('双黑','Double black'),L('移除 5，空位置携带“额外黑”','Remove 5; the null slot carries an “extra black”'),L('兄弟 15 为黑，且远侄子 18 为红，命中可一次旋转收尾的情况。','Sibling 15 is black and far nephew 18 is red, a case resolvable by one rotation.'),'rbDeleteBad','ghost',4,L('检查兄弟与侄子','Inspect sibling and nephews')],
        [L('旋转变色','Rotate + recolor'),L('围绕 10 左旋，并重新分配颜色','Rotate left around 10 and redistribute colors'),L('15 接替父节点位置；10 与 18 变黑，额外黑被吸收。','15 takes the parent position; 10 and 18 become black, absorbing the extra black.'),'rbDeleteDone','fifteen',4,L('局部修复 O(1)','Local repair O(1)')],
        [L('验证','Verify'),L('所有根到空叶路径黑高再次相同','All root-to-null paths again have equal black height'),L('修复最多沿高度向上传播，因此完整删除为 <b>O(log n)</b>。','Repair propagates at most up the tree height, so full deletion is <b>O(log n)</b>.'),'rbDeleteDone','root',3,L('完成 · O(log n)','Done · O(log n)')]
      ])
    },
    heap:{
      search:F(L('查找任意值 7','Find arbitrary value 7'),[
        [L('开始扫描','Start scan'),L('从数组下标 0 / 树根开始','Start at array index 0 / the root'),L('堆只保证父节点优于孩子，不能根据大小选择左或右。','A heap only says a parent outranks its children; value does not choose left or right.'),'heap','root',4,L('检查 1 个元素','1 element checked')],
        [L('继续扫描','Continue'),L('按数组顺序检查 4、5','Inspect 4 and 5 in array order'),L('7 可能在任一子树；两边都不能排除。','7 may be in either subtree; neither side can be discarded.'),'heap','five',4,L('检查 3 个元素','3 elements checked')],
        [L('命中','Match'),L('下标 3 的值是 7','Value at index 3 is 7'),L('若目标不存在就要扫描全部 n 项，因此任意值查找最坏 <b>O(n)</b>。','If absent, all n items must be scanned, so arbitrary search is worst-case <b>O(n)</b>.'),'heap','seven',4,L('完成 · O(n)','Done · O(n)')]
      ]),
      insert:F(L('插入 0','Insert 0'),[
        [L('追加','Append'),L('把 0 放到数组末尾','Put 0 at the array end'),L('追加保持完全二叉树形状，但暂时破坏最小堆父子顺序。','Appending preserves complete-tree shape but temporarily violates min-heap order.'),'heapinsert','one',1,L('数组追加 O(1)','Array append O(1)')],
        [L('比较父节点','Compare parent'),L('0 小于父节点 5，交换','0 is less than parent 5; swap'),L('新元素向上移动一层。','The new element moves up one level.'),'heapBubble1','one',2,L('上浮 1 层','Sifted up 1 level')],
        [L('再次比较','Compare again'),L('0 小于根 1，再交换','0 is less than root 1; swap again'),L('到达根后没有父节点，停止上浮。','At the root there is no parent, so sifting stops.'),'heapBubble2','one',2,L('上浮 2 层','Sifted up 2 levels')],
        [L('完成','Done'),L('父节点均不大于孩子','Every parent is no greater than its children'),L('完全二叉树高度是 log n，最多每层交换一次：插入 <b>O(log n)</b>。','A complete binary tree has height log n and at most one swap per level: insert <b>O(log n)</b>.'),'heapBubble2','root',2,L('完成 · O(log n)','Done · O(log n)')]
      ]),
      delete:F(L('删除最小值','Delete minimum'),[
        [L('读堆顶','Read root'),L('最小值 1 位于根','Minimum 1 is at the root'),L('堆顶读取是 O(1)，现在准备移除它。','Reading the root is O(1); now remove it.'),'heap','root',3,L('输出 1','Output 1')],
        [L('末尾补位','Move last'),L('把末尾 8 搬到根','Move last element 8 to the root'),L('数组末尾删除是 O(1)，但根处违反堆序。','Removing the array tail is O(1), but the root now violates heap order.'),'heapPopStart','root',3,L('待下沉 8','8 must sift down')],
        [L('选择孩子','Choose child'),L('4 与 5 中选择较小的 4，与 8 交换','Choose smaller child 4 over 5 and swap it with 8'),L('每一层必须与更优的孩子交换，才能同时修复两棵子树。','At each level, swap with the better child to preserve both subheaps.'),'heapPopMid','eight',3,L('下沉 1 层','Sifted down 1 level')],
        [L('停止','Stop'),L('8 小于下一层孩子 9，堆序恢复','8 is below 9, so heap order is restored'),L('最多走完全二叉树的高度，删除堆顶为 <b>O(log n)</b>。','At most the complete-tree height is traversed, so delete-min is <b>O(log n)</b>.'),'heapPopDone','eight',3,L('完成 · O(log n)','Done · O(log n)')]
      ])
    },
    b:{
      search:F(L('查找 30','Search 30'),[
        [L('读取根页','Read root page'),L('把根节点所在磁盘页读入内存','Read the root node’s disk page into memory'),L('根页含有有序键 20、40；一次 I/O 获得多个分隔边界。','The root page contains sorted keys 20 and 40; one I/O yields several separators.'),'btreeBase','root',1,L('磁盘 I/O：1 次','Disk I/O: 1')],
        [L('页内定位','Search in page'),L('30 位于 20 与 40 之间','30 lies between 20 and 40'),L('页内比较很便宜，选择中间孩子指针。','In-page comparisons are cheap; choose the middle child pointer.'),'btreeBase','root',1,L('选择中间分支','Middle branch selected')],
        [L('读取叶页','Read leaf page'),L('加载包含 25、30 的叶节点','Load the leaf containing 25 and 30'),L('第二次页读取后在页内命中 30。','After the second page read, 30 matches within the page.'),'btreeBase','middle',4,L('磁盘 I/O：2 次','Disk I/O: 2')],
        [L('完成','Done'),L('搜索只访问一条根到叶路径','Search visits one root-to-leaf path'),L('高扇出让高度约为 logₘn，因此查找为 <b>O(log n)</b>，且实际 I/O 次数很少。','High fan-out gives height about logₘn, so search is <b>O(log n)</b> with very few actual I/Os.'),'btreeBase','middle',4,L('完成 · O(log n)','Done · O(log n)')]
      ]),
      insert:F(L('插入 65（发生分裂）','Insert 65 (with split)'),[
        [L('向下定位','Descend'),L('65 大于根页中的 40，进入最右孩子','65 exceeds 40 in the root page; enter the rightmost child'),L('目标叶页 [50|60|70] 已满。标准算法在下降前先分裂满孩子。','Target leaf [50|60|70] is full. The standard algorithm splits a full child before descending.'),'btreeInsertStart','right',1,L('读取 2 个页','2 pages read')],
        [L('分裂叶页','Split leaf'),L('把 60 上推到父节点','Promote 60 into the parent'),L('原页分成 [50] 与 [70]；根从 [20|40] 变成 [20|40|60]。','The old page splits into [50] and [70]; root changes from [20|40] to [20|40|60].'),'btreeSplit','root',2,L('1 次页分裂','1 page split')],
        [L('选择新孩子','Choose new child'),L('65 大于 60，进入新建的 [70] 页','65 exceeds 60; enter the new [70] page'),L('分裂后目标孩子不满，可以安全插入。','After the split, the target child is non-full and safe to insert into.'),'btreeSplit','right2',1,L('定位新右页','New right page selected')],
        [L('页内插入','Insert in page'),L('得到有序叶页 [65|70]','Obtain sorted leaf page [65|70]'),L('分裂最多沿一条根叶路径发生，完整插入为 <b>O(log n)</b>。','Splits occur along at most one root-to-leaf path, so full insertion is <b>O(log n)</b>.'),'btreeInsertDone','right2',2,L('完成 · O(log n)','Done · O(log n)')]
      ]),
      delete:F(L('删除 5（向兄弟借键）','Delete 5 (borrow from sibling)'),[
        [L('定位叶页','Locate leaf'),L('5 小于根中的 20，进入最左叶页','5 is below root key 20; enter the leftmost leaf'),L('目标页只有一个键 [5]，直接删除会低于最小占用率。','The target page contains only [5]; direct deletion would violate minimum occupancy.'),'btreeDeleteStart','left',4,L('发现潜在下溢','Potential underflow detected')],
        [L('检查兄弟','Inspect sibling'),L('右兄弟 [25|30] 有多余键','Right sibling [25|30] has an extra key'),L('可以通过父节点旋转借一个键，不必合并页面。','A key can be borrowed through the parent without merging pages.'),'btreeDeleteStart','middle',4,L('选择借键','Borrow selected')],
        [L('旋转键','Rotate keys'),L('父键 20 下移，兄弟键 25 上移','Move parent key 20 down and sibling key 25 up'),L('根变为 [25|40]，左页暂时为 [5|20]，中页变为 [30]。','Root becomes [25|40], left page temporarily [5|20], middle page [30].'),'btreeBorrow','root',4,L('占用率已安全','Occupancy now safe')],
        [L('删除目标','Delete target'),L('从左页移除 5，留下 [20]','Remove 5 from the left page, leaving [20]'),L('每层只做常数次借键/合并，最多沿树高处理，因此删除为 <b>O(log n)</b>。','Each level performs constant borrowing/merging along at most the tree height, so deletion is <b>O(log n)</b>.'),'btreeDeleteDone','left',4,L('完成 · O(log n)','Done · O(log n)')]
      ])
    },
    bplus:{
      search:F(L('查找 42','Search 42'),[
        [L('内部页','Internal page'),L('根中的 30、50 只负责导航','Keys 30 and 50 in the root only guide navigation'),L('42 位于 [30,50) 区间，因此选择中间叶页。','42 lies in [30,50), so choose the middle leaf page.'),'bplusBase','root',0,L('页 I/O：1','Page I/O: 1')],
        [L('叶页','Leaf page'),L('加载 [30|42] 叶页','Load leaf page [30|42]'),L('完整记录只存在叶子；在这里进行最终键比较。','Complete records exist only in leaves; final key comparison happens here.'),'bplusBase','middle',3,L('页 I/O：2','Page I/O: 2')],
        [L('命中','Match'),L('在叶页中找到 42 对应记录','Find the record for 42 in the leaf'),L('根到叶路径长度是 O(log n)，故单点查找为 <b>O(log n)</b>。','The root-to-leaf path is O(log n), so point lookup is <b>O(log n)</b>.'),'bplusBase','middle',3,L('完成 · O(log n)','Done · O(log n)')]
      ]),
      insert:F(L('插入 45（叶子分裂）','Insert 45 (leaf split)'),[
        [L('定位叶页','Locate leaf'),L('45 落入 [30|42] 所在叶页','45 belongs in the leaf containing [30|42]'),L('沿内部节点导航到叶子，花费 O(log n)。','Navigate through internal nodes to the leaf in O(log n).'),'bplusBase','middle',0,L('定位 O(log n)','Locate O(log n)')],
        [L('插入后溢出','Insert and overflow'),L('叶页暂时成为 [30|42|45]','Leaf temporarily becomes [30|42|45]'),L('示例设定叶页最多两个键，因此必须分裂。','In this example a leaf holds at most two keys, so it must split.'),'bplusOverflow','middle',1,L('叶页溢出','Leaf overflow')],
        [L('分裂叶子','Split leaf'),L('分成 [30|42] 与 [45]，修复叶链','Split into [30|42] and [45], repairing leaf links'),L('新叶插入原叶与 [50|60] 之间，顺序链仍连续。','Insert the new leaf between the old leaf and [50|60], preserving the ordered chain.'),'bplusSplit','newleaf',2,L('创建 1 个新叶页','1 new leaf page')],
        [L('复制分隔键','Copy separator'),L('把新叶最小键 45 复制到父节点','Copy new leaf minimum 45 into the parent'),L('B+ 树的分隔键仍保留在叶子；更新最多向根传播，插入为 <b>O(log n)</b>。','The B+ separator remains in the leaf; updates propagate at most to root, so insertion is <b>O(log n)</b>.'),'bplusInsertDone','root',0,L('完成 · O(log n)','Done · O(log n)')]
      ]),
      delete:F(L('删除 42（更新分隔键）','Delete 42 (update separator)'),[
        [L('定位','Locate'),L('通过根分隔键找到 [30|42] 叶页','Use root separators to find leaf [30|42]'),L('删除和查找一样先走一条根到叶路径。','Deletion begins with the same root-to-leaf path as search.'),'bplusBase','middle',0,L('定位 O(log n)','Locate O(log n)')],
        [L('叶内删除','Delete in leaf'),L('移除 42，叶页剩下 [30]','Remove 42, leaving leaf [30]'),L('叶页仍达到最小占用率，不需要借键或合并。','The leaf still meets minimum occupancy, so no borrowing or merge is needed.'),'bplusDeleteDone','middle',1,L('叶内操作 O(1)','In-leaf work O(1)')],
        [L('检查父节点','Check parent'),L('该叶最小键仍是 30，父分隔键无需变化','Leaf minimum remains 30; parent separator is unchanged'),L('若删除的是叶子最小键，则还必须把新的最小键更新到祖先分隔位置。','If the deleted key were the leaf minimum, its new minimum would need propagation to ancestor separators.'),'bplusDeleteDone','root',0,L('无需结构修复','No structural repair')],
        [L('完成','Done'),L('叶子链仍保持有序连续','Leaf chain remains ordered and continuous'),L('定位加沿路径的修复最多为树高，因此删除为 <b>O(log n)</b>。','Location plus path repair is bounded by tree height, so deletion is <b>O(log n)</b>.'),'bplusDeleteDone','middle',0,L('完成 · O(log n)','Done · O(log n)')]
      ]),
      range:F(L('范围查询 20…60','Range query 20…60'),[
        [L('定位起点','Locate start'),L('从根下降到包含 20 的第一个叶页','Descend from root to the first leaf containing 20'),L('起点定位与单点查询相同，成本 O(log n)。','Start location matches a point lookup and costs O(log n).'),'bplusBase','left',4,L('定位 · O(log n)','Locate · O(log n)')],
        [L('扫描当前叶','Scan leaf'),L('输出 20，然后沿叶链向右','Output 20, then follow the leaf link right'),L('不需要回到父节点重新查找下一条记录。','There is no need to return to parents to find the next record.'),'bplusBase','left',4,L('已输出 1 条','1 record emitted')],
        [L('连续扫描','Continue scan'),L('依次输出 30、42、50、60','Emit 30, 42, 50, and 60 in order'),L('叶子链把相邻键放在顺序页中，适合磁盘预读和范围扫描。','The leaf chain keeps adjacent keys in sequential pages, ideal for prefetch and range scans.'),'bplusBase','range',4,L('已输出 k=5 条','k=5 records emitted')],
        [L('越过上界','Pass upper bound'),L('遇到大于 60 的键后停止','Stop at the first key greater than 60'),L('总成本为定位起点 <b>O(log n)</b> 加输出结果 <b>O(k)</b>。','Total cost is <b>O(log n)</b> to locate the start plus <b>O(k)</b> to emit results.'),'bplusBase','range',4,L('完成 · O(log n + k)','Done · O(log n + k)')]
      ])
    }
  };
  DATA.structures.forEach(s=>{
    s.features=FEATURES[s.id];
    s.walkthroughs=Object.assign({overview:{name:L('特点','Characteristics'),scenes:s.scenes}},W[s.id]);
    const genericNames={search:L('查找','Search'),insert:L('插入','Insert'),delete:L('删除','Delete'),range:L('范围查询','Range query')};
    Object.keys(genericNames).forEach(key=>{if(s.walkthroughs[key])s.walkthroughs[key].name=genericNames[key]});
    const targets={
      general:{search:L('App','App'),insert:L('“测试”节点','“Tests” node'),delete:L('“项目”子树','“Projects” subtree')},
      binary:{search:L('值 8','value 8'),insert:L('节点 X','node X'),delete:L('节点 C','node C')},
      bst:{search:L('键 7','key 7'),insert:L('键 6','key 6'),delete:L('键 8','key 8')},
      avl:{search:L('键 30','key 30'),insert:L('键 30','key 30'),delete:L('键 40','key 40')},
      rb:{search:L('键 12','key 12'),insert:L('键 1','key 1'),delete:L('键 5','key 5')},
      heap:{search:L('值 7','value 7'),insert:L('值 0','value 0'),delete:L('堆顶最小值 1','minimum root value 1')},
      b:{search:L('键 30','key 30'),insert:L('键 65','key 65'),delete:L('键 5','key 5')},
      bplus:{search:L('键 42','key 42'),insert:L('键 45','key 45'),delete:L('键 42','key 42'),range:L('20 ≤ key ≤ 60','20 ≤ key ≤ 60')}
    };
    Object.entries(targets[s.id]).forEach(([key,value])=>{s.walkthroughs[key].target=value});
  });
})(window.SLOWMO_TREES);
