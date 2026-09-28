/*!
 * 五种 I/O 模型 —— 内容数据 / Five I/O Models — content
 *
 * 这里只有"内容和步骤"，没有任何渲染逻辑：改文案、改代码清单、加一步，
 * 都只动本文件。渲染在 ./io-models.html，单步引擎在 ../shared/stepper.js。
 *
 * Only content and steps live here. Rendering lives in ./io-models.html,
 * the step engine in ../shared/stepper.js.
 *
 * Schema (per model):
 *   id, file, name{zh,en}, tagline{zh,en}
 *   lines[]    代码清单，每行 [zh, en] 或单个字符串
 *   lineStep[] 代码行号 -> 步骤下标（可点行号跳步）
 *   steps[]    { tag, short, line, phase, st{proc,rq,buf,cpu}, arrow, a/k/n, say }
 *   truth      底部的"真相/坑"
 *   table      对比表模型：cols[], rows[][]（与 steps 互斥）
 */
window.SLOWMO_IO_MODELS = {
  "models": [
    {
      "id": "blocking",
      "name": {
        "zh": "① 阻塞 I/O",
        "en": "① Blocking I/O"
      },
      "file": "01_blocking.c",
      "tagline": {
        "zh": "进程从“等数据”到“拿到数据”全程被挂起，一个线程只能伺候一个连接",
        "en": "The process stays suspended from “waiting for data” all the way to “data in the user buffer” — one thread serves exactly one connection"
      },
      "lines": [
        [
          "/* ① 阻塞 I/O —— 从“等数据”到“数据拷进用户缓冲区”，进程全程被挂起",
          "/* ① Blocking I/O — suspended from \"waiting for data\" all the way to"
        ],
        [
          " *",
          " * \"data copied into the user buffer\"."
        ],
        [
          " * 编译: make 01_blocking      运行: ./01_blocking",
          " *"
        ],
        [
          " * 发送: python3 send.py 9101",
          " * build: make 01_blocking        run: ./01_blocking"
        ],
        [
          " */",
          " * send:  python3 send.py 9101"
        ],
        "#define _GNU_SOURCE",
        "#include <stdio.h>",
        "#include <stdlib.h>",
        "#include <string.h>",
        "#include <unistd.h>",
        "#include <sys/socket.h>",
        "#include <netinet/in.h>",
        "#include <arpa/inet.h>",
        "",
        "#define PORT 9101",
        "",
        "static void die(const char *msg) { perror(msg); exit(1); }",
        "",
        "int main(void)",
        "{",
        [
          "    int fd = socket(AF_INET, SOCK_DGRAM, 0);              /* 1. 建一个 UDP socket */",
          "    int fd = socket(AF_INET, SOCK_DGRAM, 0);              /* 1. create a UDP socket */"
        ],
        "    if (fd < 0) die(\"socket\");",
        "",
        "    struct sockaddr_in addr;",
        "    memset(&addr, 0, sizeof addr);",
        "    addr.sin_family      = AF_INET;",
        "    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);",
        "    addr.sin_port        = htons(PORT);",
        [
          "    if (bind(fd, (struct sockaddr *)&addr, sizeof addr) < 0)  /* 2. 绑定本地端口 */",
          "    if (bind(fd, (struct sockaddr *)&addr, sizeof addr) < 0)  /* 2. bind a local port */"
        ],
        "        die(\"bind\");",
        "",
        "    char buf[128];",
        [
          "    printf(\"[应用] 准备调用 recvfrom，接下来会一直卡在这里...\\n\");",
          "    printf(\"[app] about to call recvfrom; from here on it blocks...\\n\");"
        ],
        "",
        [
          "    ssize_t n = recvfrom(fd, buf, sizeof buf - 1, 0, NULL, NULL);  /* 3. ★阻塞★ 两个阶段都在等 */",
          "    ssize_t n = recvfrom(fd, buf, sizeof buf - 1, 0, NULL, NULL);  /* 3. ★BLOCKS★ both phases wait here */"
        ],
        "    if (n < 0) die(\"recvfrom\");",
        "",
        [
          "    buf[n] = '\\0';                                        /* 4. 数据已在自己手里 */",
          "    buf[n] = '\\0';                                        /* 4. the data is now in our hands */"
        ],
        [
          "    printf(\"[应用] 收到 %zd 字节: %s\", n, buf);",
          "    printf(\"[app] received %zd bytes: %s\", n, buf);"
        ],
        "    close(fd);",
        "    return 0;",
        "}"
      ],
      "steps": [
        {
          "tag": "socket()",
          "short": {
            "zh": "创建 UDP socket",
            "en": "create a UDP socket"
          },
          "arrow": {
            "dir": "a2k",
            "label": "socket(AF_INET, SOCK_DGRAM, 0)"
          },
          "k": {
            "zh": "创建 struct socket 对象，挂进进程的 fd 表，返回 fd = 3",
            "en": "Create a struct socket, install it in the process's fd table, return fd = 3"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "应用请求内核创建一个 socket。此刻它只是一个<em>空的端点</em>：还没绑端口，也没有任何数据。",
            "en": "The application asks the kernel for a socket. Right now it is just an <em>empty endpoint</em>: no port bound, no data."
          },
          "line": 20
        },
        {
          "tag": "bind()",
          "short": {
            "zh": "绑定到 127.0.0.1:9101",
            "en": "bind to 127.0.0.1:9101"
          },
          "arrow": {
            "dir": "a2k",
            "label": "bind(fd, 127.0.0.1:9101)"
          },
          "k": {
            "zh": "登记本地地址，此后发往该端口的数据报都进这个 socket 的接收队列",
            "en": "Register the local address; datagrams sent to this port land in this socket's receive queue"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "绑定端口。现在内核对号入座：发往 9101 的数据报该投给这个 socket。",
            "en": "Bind a port. The kernel now knows where to deliver datagrams addressed to 9101."
          },
          "line": 28
        },
        {
          "tag": "printf()",
          "short": {
            "zh": "打印提示，下一行就是关键时刻",
            "en": "print a hint; the next line is the crucial one"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "下一行就是决定命运的那次系统调用。",
            "en": "The next line is the one that decides everything."
          },
          "line": 32
        },
        {
          "tag": "recvfrom()",
          "short": {
            "zh": "★ 进程被挂起，代码停在这一行",
            "en": "★ the process is parked; execution stays on this line"
          },
          "phase": "w1",
          "arrow": {
            "dir": "a2k",
            "label": "recvfrom(fd, buf, 128, ...)"
          },
          "k": {
            "zh": "接收队列为空 → 把进程挂到该 socket 的等待队列 → schedule() 切走",
            "en": "Receive queue is empty → park the process on the socket's wait queue → schedule() switches away"
          },
          "a": {
            "zh": "进入睡眠，不占 CPU，但什么也做不了",
            "en": "Asleep: uses no CPU, but can do nothing"
          },
          "st": {
            "proc": {
              "k": "blocked",
              "zh": "阻塞",
              "en": "Blocked"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>阶段一：等待数据。</strong>内核查看接收队列 —— <em>空的</em>。于是把进程挂到该 socket 的等待队列上，标记为可中断睡眠，然后调度器把它换下 CPU。",
            "en": "<strong>Phase 1: waiting for data.</strong> The kernel looks at the receive queue — <em>empty</em>. It parks the process on the socket's wait queue with an interruptible state, and the scheduler takes it off the CPU."
          },
          "line": 34
        },
        {
          "tag": {
            "zh": "…等待中…",
            "en": "…waiting…"
          },
          "short": {
            "zh": "时间流逝，进程仍在睡眠",
            "en": "time passes; the process still sleeps"
          },
          "phase": "w1",
          "k": {
            "zh": "没有任何事件发生，调度器不会唤醒它",
            "en": "Nothing happens; the scheduler will never wake it"
          },
          "st": {
            "proc": {
              "k": "blocked",
              "zh": "阻塞",
              "en": "Blocked"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "注意：这<strong>不是</strong> CPU 忙等，进程是真的睡着、不消耗 CPU —— 代价是这段时间里它对任何事情都无能为力。",
            "en": "Note that this is <strong>not</strong> a busy wait. The process is genuinely asleep and consumes no CPU — the price is that it can do nothing at all meanwhile."
          },
          "line": 34
        },
        {
          "tag": {
            "zh": "📦 数据到达",
            "en": "📦 data arrives"
          },
          "short": {
            "zh": "数据报进入内核接收队列",
            "en": "the datagram enters the kernel receive queue"
          },
          "phase": "w1",
          "arrow": {
            "dir": "n2k",
            "label": {
              "zh": "UDP 数据报 → 127.0.0.1:9101",
              "en": "UDP datagram → 127.0.0.1:9101"
            }
          },
          "k": {
            "zh": "数据入队 → 唤醒等待者 → 进程被放回运行队列",
            "en": "Data enqueued → wake the waiter → put the process back on the run queue"
          },
          "n": {
            "zh": "send.py 发出的那 31 字节",
            "en": "The 31 bytes sent by send.py"
          },
          "st": {
            "proc": {
              "k": "blocked",
              "zh": "阻塞",
              "en": "Blocked"
            },
            "rq": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "数据报到达网卡，内核协议栈逐层解析，最后把它放进该 socket 的<em>接收队列</em>，并唤醒睡在上面的进程。",
            "en": "The datagram arrives on the NIC, the kernel network stack parses it layer by layer, and finally places it in the socket's <em>receive queue</em>, waking the sleeping process."
          },
          "line": 34
        },
        {
          "tag": "memcpy",
          "short": {
            "zh": "内核把数据拷进用户缓冲区 buf",
            "en": "the kernel copies the data into the user buffer buf"
          },
          "phase": "w2",
          "k": {
            "zh": "copy_to_user()：数据搬进 buf",
            "en": "copy_to_user(): move the data into buf"
          },
          "a": {
            "zh": "buf 有数据了，但进程还没被唤醒",
            "en": "buf holds data now, but the process has not been woken yet"
          },
          "st": {
            "proc": {
              "k": "blocked",
              "zh": "阻塞",
              "en": "Blocked"
            },
            "rq": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>阶段二：拷贝数据。</strong>内核把数据从内核缓冲区<em>拷贝</em>到用户空间的 <code>buf</code>。这次拷贝不可省略 —— 两块内存本来就不在一起。",
            "en": "<strong>Phase 2: copying the data.</strong> The kernel <em>copies</em> the data from the kernel buffer into the user-space <code>buf</code>. That copy cannot be skipped — the two buffers are simply different memory."
          },
          "line": 34
        },
        {
          "tag": "return 31",
          "short": {
            "zh": "recvfrom 返回，进程恢复运行",
            "en": "recvfrom returns; the process resumes"
          },
          "phase": "w2",
          "arrow": {
            "dir": "k2a",
            "label": "return 31"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "recvfrom 返回字节数，进程重新被调度上 CPU，从第 4 步那一行继续往下走 —— 对它来说刚才那段漫长等待就像一瞬间。",
            "en": "recvfrom returns the byte count. The process is scheduled back onto the CPU and resumes at the same line from step 4 — to it, the long wait felt instantaneous."
          },
          "line": 34
        },
        {
          "tag": "buf[n] = 0",
          "short": {
            "zh": "数据已在应用自己的地址空间里",
            "en": "the data is in the application's own address space"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "数据已经在应用自己的地址空间里了，随便处理，这里没有任何系统调用。",
            "en": "The data now lives in the application's own address space; use it however you like. No system call is involved here."
          },
          "line": 37
        },
        {
          "tag": "printf()",
          "short": {
            "zh": "处理并打印，流程结束",
            "en": "process and print; done"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>从“等”到“拿”，进程全程被锁在这一个 fd 上。</strong>",
            "en": "<strong>From “wait” to “have”, the process is pinned to this single fd the whole time.</strong>"
          },
          "line": 38
        }
      ],
      "truth": {
        "zh": "这是最直观的模型，也是并发能力最差的：<b>一个线程只能伺候一个连接</b>。要支持 1 万连接就得 1 万个线程 —— 光线程栈就要几十 GB，调度器还会被上下文切换压垮。C10K 问题说的就是它。",
        "en": "This is the most intuitive model and the least scalable: <b>one thread serves exactly one connection</b>. Supporting 10k connections means 10k threads — tens of GB of stacks, and a scheduler crushed by context switches. This is exactly what the C10K problem is about."
      },
      "lineStep": [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        0,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        1,
        null,
        null,
        null,
        2,
        null,
        3,
        null,
        null,
        8,
        9,
        null,
        null,
        null
      ]
    },
    {
      "id": "nonblocking",
      "name": {
        "zh": "② 非阻塞 I/O",
        "en": "② Non-blocking I/O"
      },
      "file": "02_nonblocking.c",
      "tagline": {
        "zh": "进程不再睡眠，改成“不停地问”：没数据就立刻返回 EAGAIN",
        "en": "The process stops sleeping and starts asking: no data means an immediate EAGAIN"
      },
      "lines": [
        [
          "/* ② 非阻塞 I/O —— 系统调用立刻返回，没数据就报 EAGAIN，靠轮询“问到有为止”",
          "/* ② Non-blocking I/O — the system call returns at once; with no data it"
        ],
        [
          " *",
          " * reports EAGAIN and you poll until there is some."
        ],
        [
          " * 编译: make 02_nonblocking    运行: ./02_nonblocking",
          " *"
        ],
        [
          " * 发送: python3 send.py 9102",
          " * build: make 02_nonblocking     run: ./02_nonblocking"
        ],
        [
          " */",
          " * send:  python3 send.py 9102"
        ],
        "#define _GNU_SOURCE",
        "#include <stdio.h>",
        "#include <stdlib.h>",
        "#include <string.h>",
        "#include <unistd.h>",
        "#include <errno.h>",
        "#include <fcntl.h>",
        "#include <sys/socket.h>",
        "#include <netinet/in.h>",
        "#include <arpa/inet.h>",
        "",
        "#define PORT 9102",
        "",
        "static void die(const char *msg) { perror(msg); exit(1); }",
        "",
        "int main(void)",
        "{",
        "    int fd = socket(AF_INET, SOCK_DGRAM, 0);",
        "    if (fd < 0) die(\"socket\");",
        "",
        "    struct sockaddr_in addr;",
        "    memset(&addr, 0, sizeof addr);",
        "    addr.sin_family      = AF_INET;",
        "    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);",
        "    addr.sin_port        = htons(PORT);",
        "    if (bind(fd, (struct sockaddr *)&addr, sizeof addr) < 0)",
        "        die(\"bind\");",
        "",
        "    int flags = fcntl(fd, F_GETFL, 0);",
        [
          "    if (fcntl(fd, F_SETFL, flags | O_NONBLOCK) < 0)       /* 1. ★关键★ 设为非阻塞 */",
          "    if (fcntl(fd, F_SETFL, flags | O_NONBLOCK) < 0)       /* 1. ★the key line★ make it non-blocking */"
        ],
        "        die(\"fcntl\");",
        "",
        "    char buf[128];",
        [
          "    printf(\"[应用] socket 已设为非阻塞，开始轮询...\\n\");",
          "    printf(\"[app] socket is now non-blocking; starting to poll...\\n\");"
        ],
        "",
        "    for (int attempt = 1; ; attempt++) {",
        [
          "        ssize_t n = recvfrom(fd, buf, sizeof buf - 1, 0, NULL, NULL);  /* 2. 立刻返回，绝不挂起 */",
          "        ssize_t n = recvfrom(fd, buf, sizeof buf - 1, 0, NULL, NULL);  /* 2. returns at once, never parks */"
        ],
        "",
        [
          "        if (n >= 0) {                                     /* 3. 这次真有数据 */",
          "        if (n >= 0) {                                     /* 3. this time there really is data */"
        ],
        "            buf[n] = '\\0';",
        [
          "            printf(\"[应用] 第 %d 次尝试拿到 %zd 字节: %s\", attempt, n, buf);",
          "            printf(\"[app] attempt %d got %zd bytes: %s\", attempt, n, buf);"
        ],
        "            break;",
        "        }",
        "        if (errno != EAGAIN && errno != EWOULDBLOCK)",
        "            die(\"recvfrom\");",
        "",
        [
          "        printf(\"[应用] 第 %d 次尝试: 没数据(EAGAIN)，进程没阻塞，但 CPU 在空转\\n\", attempt);",
          "        printf(\"[app] attempt %d: no data (EAGAIN) — not blocked, but the CPU is spinning\\n\", attempt);"
        ],
        [
          "        usleep(200000);   /* 真实高并发代码里通常不 sleep —— 那就是 100% CPU 空转 */",
          "        usleep(200000);   /* real high-concurrency code usually does not sleep — that is a 100% CPU spin */"
        ],
        "    }",
        "",
        "    close(fd);",
        "    return 0;",
        "}"
      ],
      "steps": [
        {
          "tag": "socket()",
          "short": {
            "zh": "创建 UDP socket",
            "en": "create a UDP socket"
          },
          "arrow": {
            "dir": "a2k",
            "label": "socket(...)"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "先建 socket，这一步和阻塞模型完全一样。",
            "en": "Create the socket; identical to the blocking model so far."
          },
          "line": 22
        },
        {
          "tag": "bind()",
          "short": {
            "zh": "绑定到 127.0.0.1:9102",
            "en": "bind to 127.0.0.1:9102"
          },
          "arrow": {
            "dir": "a2k",
            "label": "bind(...)"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "绑定端口。",
            "en": "Bind the port."
          },
          "line": 30
        },
        {
          "tag": "fcntl(O_NONBLOCK)",
          "short": {
            "zh": "★ 全模型唯一的开关",
            "en": "★ the only switch in this model"
          },
          "arrow": {
            "dir": "a2k",
            "label": "fcntl(fd, F_SETFL, O_NONBLOCK)"
          },
          "k": {
            "zh": "在这个 fd 上打上 O_NONBLOCK 标记",
            "en": "Set the O_NONBLOCK flag on this fd"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>整个模型只有这一句是关键。</strong>从此这个 fd 上的读写调用<em>永不睡眠</em>：有数据就返回数据，没数据立刻返回 <code>-1</code> 并置 <code>errno = EAGAIN</code>。",
            "en": "<strong>The whole model hinges on this single line.</strong> From now on, reads and writes on this fd <em>never sleep</em>: data available → return the data; no data → return <code>-1</code> with <code>errno = EAGAIN</code> immediately."
          },
          "line": 34
        },
        {
          "tag": "printf()",
          "short": {
            "zh": "准备开始轮询",
            "en": "about to start polling"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "进入轮询循环。",
            "en": "Enter the polling loop."
          },
          "line": 38
        },
        {
          "tag": {
            "zh": "recvfrom() 第 1 次",
            "en": "recvfrom() attempt 1"
          },
          "short": {
            "zh": "立刻返回 EAGAIN，进程没睡",
            "en": "returns EAGAIN at once; the process never slept"
          },
          "phase": "w1",
          "arrow": {
            "dir": "a2k",
            "label": "recvfrom(fd, buf, 128, ...)"
          },
          "k": {
            "zh": "队列为空 + O_NONBLOCK → 立即 return -1，errno = EAGAIN",
            "en": "Queue empty + O_NONBLOCK → return -1 at once with errno = EAGAIN"
          },
          "a": {
            "zh": "没有睡眠，立刻拿到返回值",
            "en": "No sleep; the return value is available immediately"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "内核一看接收队列是空的，因为 fd 标了 <code>O_NONBLOCK</code>，它<strong>不能</strong>把进程挂起，只能立刻返回。进程确实没阻塞 —— 但这次<em>用户态↔内核态的往返开销是真实发生的</em>。",
            "en": "The kernel sees an empty receive queue; because the fd is marked <code>O_NONBLOCK</code> it <strong>cannot</strong> park the process and must return at once. The process really does not block — but the round trip into the kernel and back <em>does</em> cost something, every single time."
          },
          "line": 41
        },
        {
          "tag": "if (n >= 0)",
          "short": {
            "zh": "返回值为负，走错误分支",
            "en": "negative return → take the error branch"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "没拿到数据，进入错误分支。",
            "en": "No data — take the error branch."
          },
          "line": 43
        },
        {
          "tag": {
            "zh": "errno 检查",
            "en": "errno check"
          },
          "short": {
            "zh": "EAGAIN 不是错误，只是“还没好”",
            "en": "EAGAIN is not an error, just “not yet”"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "必须区分 <code>EAGAIN</code>（暂时没数据，正常）和真实错误（fd 非法等）。这是非阻塞编程的必备套路。",
            "en": "You must tell <code>EAGAIN</code> (nothing yet — normal) apart from a real error (bad fd, etc.). This is the standard non-blocking idiom."
          },
          "line": 48
        },
        {
          "tag": "printf()",
          "short": {
            "zh": "记一笔空转",
            "en": "log one wasted spin"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "真实的高并发代码不会打印，而是立刻再试 —— 那就是纯 CPU 空转。",
            "en": "Real high-concurrency code would not print here; it would retry immediately — that is a pure CPU spin."
          },
          "line": 51
        },
        {
          "tag": "usleep()",
          "short": {
            "zh": "睡 200ms 再试（真实代码往往不睡）",
            "en": "sleep 200 ms and retry (real code usually does not)"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "busy",
              "zh": "忙等",
              "en": "Busy-wait"
            }
          },
          "say": {
            "zh": "这里 sleep 200ms 只是<strong>为了演示不刷屏</strong>。低延迟程序通常不 sleep，疯狂重试，代价是 <em>CPU 100% 空转</em>。",
            "en": "The 200 ms sleep exists only <strong>to keep the demo from flooding the terminal</strong>. Low-latency programs usually do not sleep at all; they retry flat out, at the cost of <em>100% CPU</em>."
          },
          "line": 52
        },
        {
          "tag": {
            "zh": "recvfrom() 第 2 次",
            "en": "recvfrom() attempt 2"
          },
          "short": {
            "zh": "又一次 EAGAIN",
            "en": "another EAGAIN"
          },
          "arrow": {
            "dir": "a2k",
            "label": "recvfrom(...)"
          },
          "k": {
            "zh": "队列仍为空 → 再次立即返回 EAGAIN",
            "en": "Queue still empty → return EAGAIN immediately, again"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "每多试一次，就是一次完整的系统调用开销。",
            "en": "Every retry is one more full system call."
          },
          "line": 41
        },
        {
          "tag": {
            "zh": "📦 数据到达",
            "en": "📦 data arrives"
          },
          "short": {
            "zh": "数据报进入内核接收队列",
            "en": "the datagram enters the kernel receive queue"
          },
          "arrow": {
            "dir": "n2k",
            "label": {
              "zh": "UDP 数据报 → 127.0.0.1:9102",
              "en": "UDP datagram → 127.0.0.1:9102"
            }
          },
          "k": {
            "zh": "队列变为非空",
            "en": "Queue becomes non-empty"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "就在进程 sleep 的时候，数据到了。",
            "en": "While the process is sleeping, the data arrives."
          },
          "line": 52
        },
        {
          "tag": {
            "zh": "recvfrom() 第 3 次",
            "en": "recvfrom() attempt 3"
          },
          "short": {
            "zh": "这次拿到真数据",
            "en": "this time we get real data"
          },
          "phase": "w2",
          "arrow": {
            "dir": "a2k",
            "label": "recvfrom(...)"
          },
          "k": {
            "zh": "队列非空 → 立即 copy_to_user 到 buf 并返回 n",
            "en": "Queue non-empty → copy_to_user into buf immediately and return n"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "终于成功了。<em>注意：数据仍然是内核拷进 buf 的</em>，非阻塞只改变了“要不要睡”，没有改变“谁来拷”。",
            "en": "Success at last. <em>Note that the kernel still did the copy into buf</em> — non-blocking only changed whether we sleep, not who copies."
          },
          "line": 41
        },
        {
          "tag": "if (n >= 0)",
          "short": {
            "zh": "成功，跳出轮询",
            "en": "success — break out of the loop"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "跳出循环。",
            "en": "Break out of the loop."
          },
          "line": 43
        },
        {
          "tag": "printf()",
          "short": {
            "zh": "打印结果，结束",
            "en": "print the result; done"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "整个流程结束。",
            "en": "Done."
          },
          "line": 45
        }
      ],
      "truth": {
        "zh": "非阻塞 I/O 只是“不睡了”，并没有变聪明：它靠<b>你不停地问</b>来发现数据。连接数一多，“轮询次数 × 连接数”会直接把 CPU 烧光。但它真正的价值是<b>作为其他模型的基础零件</b> —— epoll 的边沿触发要求你读到 EAGAIN，Go 的 netpoller、Node 的 libuv 底下也全是非阻塞 fd。",
        "en": "Non-blocking I/O merely stops the sleeping; it does not get any smarter. It discovers data by <b>asking over and over</b>. With many connections, “retries × connections” burns the CPU flat. Its real value is as <b>the building block of every other model</b> — epoll's edge-triggered mode requires you to read until EAGAIN, and Go's netpoller and Node's libuv sit on non-blocking fds."
      },
      "lineStep": [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        0,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        1,
        null,
        null,
        null,
        2,
        null,
        null,
        null,
        3,
        null,
        null,
        4,
        null,
        5,
        null,
        13,
        null,
        null,
        6,
        null,
        null,
        7,
        8,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "multiplexing",
      "name": {
        "zh": "③ I/O 多路复用",
        "en": "③ I/O Multiplexing"
      },
      "file": "03_multiplexing.c",
      "tagline": {
        "zh": "一个线程用 select/epoll 同时等 N 个连接，任意一个就绪就返回",
        "en": "One thread waits on N connections with select/epoll and returns as soon as any of them is ready"
      },
      "lines": [
        [
          "/* ③ I/O 多路复用 —— 一个线程用 select 同时等 N 个 socket，任意一个就绪就返回",
          "/* ③ I/O multiplexing — one thread uses select() to wait on N sockets at"
        ],
        [
          " *",
          " * once and returns as soon as any one of them is ready."
        ],
        [
          " * 编译: make 03_multiplexing    运行: ./03_multiplexing",
          " *"
        ],
        [
          " * 发送: python3 send.py 9103   或   python3 send.py 9104",
          " * build: make 03_multiplexing     run: ./03_multiplexing"
        ],
        [
          " */",
          " * send:  python3 send.py 9103  (or 9104)"
        ],
        "#define _GNU_SOURCE",
        "#include <stdio.h>",
        "#include <stdlib.h>",
        "#include <string.h>",
        "#include <unistd.h>",
        "#include <sys/select.h>",
        "#include <sys/socket.h>",
        "#include <netinet/in.h>",
        "#include <arpa/inet.h>",
        "",
        "static void die(const char *msg) { perror(msg); exit(1); }",
        "",
        [
          "static int mkudp(int port)                                /* 建 socket + 绑定端口 */",
          "static int mkudp(int port)                                /* create a socket and bind a port */"
        ],
        "{",
        "    int fd = socket(AF_INET, SOCK_DGRAM, 0);",
        "    if (fd < 0) die(\"socket\");",
        "",
        "    struct sockaddr_in addr;",
        "    memset(&addr, 0, sizeof addr);",
        "    addr.sin_family      = AF_INET;",
        "    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);",
        "    addr.sin_port        = htons(port);",
        "    if (bind(fd, (struct sockaddr *)&addr, sizeof addr) < 0)",
        "        die(\"bind\");",
        "    return fd;",
        "}",
        "",
        "int main(void)",
        "{",
        [
          "    int fd1 = mkudp(9103);                                /* 1. 两个独立的 socket */",
          "    int fd1 = mkudp(9103);                                /* 1. two independent sockets */"
        ],
        "    int fd2 = mkudp(9104);",
        "",
        [
          "    fd_set rset;                                          /* 2. 告诉内核：我关心这两个 */",
          "    fd_set rset;                                          /* 2. tell the kernel: these two are what I care about */"
        ],
        "    FD_ZERO(&rset);",
        "    FD_SET(fd1, &rset);",
        "    FD_SET(fd2, &rset);",
        "    int maxfd = (fd1 > fd2 ? fd1 : fd2) + 1;",
        "",
        [
          "    printf(\"[应用] select 阻塞中，等待 9103 或 9104 任意一个有数据...\\n\");",
          "    printf(\"[app] select is blocking, waiting for data on 9103 or 9104...\\n\");"
        ],
        "",
        [
          "    int nready = select(maxfd, &rset, NULL, NULL, NULL);  /* 3. ★阻塞★ 但等的是“任意一个就绪” */",
          "    int nready = select(maxfd, &rset, NULL, NULL, NULL);  /* 3. ★BLOCKS★ but on “any one of them being ready” */"
        ],
        "",
        "    char buf[128];",
        [
          "    if (nready > 0 && FD_ISSET(fd1, &rset)) {             /* 4. 谁就绪读谁 —— 此时绝不阻塞 */",
          "    if (nready > 0 && FD_ISSET(fd1, &rset)) {             /* 4. read whichever is ready — it cannot block now */"
        ],
        "        ssize_t n = recvfrom(fd1, buf, sizeof buf - 1, 0, NULL, NULL);",
        [
          "        if (n > 0) { buf[n] = '\\0'; printf(\"[应用] 9103 就绪，收到: %s\", buf); }",
          "        if (n > 0) { buf[n] = '\\0'; printf(\"[app] 9103 is ready, received: %s\", buf); }"
        ],
        "    }",
        "    if (nready > 0 && FD_ISSET(fd2, &rset)) {",
        "        ssize_t n = recvfrom(fd2, buf, sizeof buf - 1, 0, NULL, NULL);",
        [
          "        if (n > 0) { buf[n] = '\\0'; printf(\"[应用] 9104 就绪，收到: %s\", buf); }",
          "        if (n > 0) { buf[n] = '\\0'; printf(\"[app] 9104 is ready, received: %s\", buf); }"
        ],
        "    }",
        "",
        "    close(fd1);",
        "    close(fd2);",
        "    return 0;",
        "}"
      ],
      "steps": [
        {
          "tag": "socket()+bind()",
          "short": {
            "zh": "建立第 1 个 socket（9103）",
            "en": "create socket #1 (9103)"
          },
          "k": {
            "zh": "创建并登记 fd1",
            "en": "Create and register fd1"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "建立第一个 socket，监听 9103。",
            "en": "Create the first socket, listening on 9103."
          },
          "line": 34
        },
        {
          "tag": "socket()+bind()",
          "short": {
            "zh": "建立第 2 个 socket（9104）",
            "en": "create socket #2 (9104)"
          },
          "k": {
            "zh": "创建并登记 fd2",
            "en": "Create and register fd2"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "再建第二个。",
            "en": "And a second one."
          },
          "line": 35
        },
        {
          "tag": "FD_SET(fd1)",
          "short": {
            "zh": "把 fd1 放进“关注集合”",
            "en": "put fd1 into the interest set"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "往关注集合里放第一个 fd。",
            "en": "Put the first fd into the interest set."
          },
          "line": 39
        },
        {
          "tag": "FD_SET(fd2)",
          "short": {
            "zh": "把 fd2 也放进去 —— 一个线程等两个 fd",
            "en": "add fd2 too — one thread, two fds"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>这个集合可以有成百上千个 fd</strong>，这就是它和前面两种模型最本质的区别：一次系统调用同时监视 N 个连接。",
            "en": "<strong>The set can hold hundreds or thousands of fds</strong> — this is the essential difference from the previous two models: one system call watches N connections at once."
          },
          "line": 40
        },
        {
          "tag": "select()",
          "short": {
            "zh": "★ 阻塞在“任意一个就绪”上",
            "en": "★ blocks on “any one of them ready”"
          },
          "phase": "w1",
          "arrow": {
            "dir": "a2k",
            "label": "select(maxfd+1, &rset, NULL, NULL, NULL)"
          },
          "k": {
            "zh": "登记这些 fd，一次性挂起进程；任意一个就绪就唤醒",
            "en": "Register these fds for this call and park the process once; wake up when any of them is ready"
          },
          "a": {
            "zh": "睡眠，但等的是一组 fd",
            "en": "Asleep — but waiting on a whole set of fds"
          },
          "st": {
            "proc": {
              "k": "blocked",
              "zh": "阻塞",
              "en": "Blocked"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>注意区别：</strong>阻塞 I/O 是阻塞在“<em>fd1 有没有数据</em>”上；select 是阻塞在“<em>这两个里面<strong>任意一个</strong>有没有数据</em>”上。一个线程 = N 个连接，这就是它能扛 C10K 的原因。",
            "en": "<strong>Mind the difference:</strong> blocking I/O blocks on “<em>does fd1 have data</em>”; select blocks on “<em>does <strong>any</strong> of these have data</em>”. One thread = N connections — that is why it scales to C10K."
          },
          "line": 45
        },
        {
          "tag": {
            "zh": "…等待中…",
            "en": "…waiting…"
          },
          "short": {
            "zh": "进程睡着，等任意一个 fd",
            "en": "the process sleeps, waiting on any fd"
          },
          "phase": "w1",
          "k": {
            "zh": "select 每次调用都要把整个 fd 集合拷进内核并线性扫描一遍 —— O(n)",
            "en": "select copies the entire fd set into the kernel and scans it linearly on every call — O(n)"
          },
          "st": {
            "proc": {
              "k": "blocked",
              "zh": "阻塞",
              "en": "Blocked"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "进程睡在这里。请记住这个缺陷：<strong>每次调用都要重新拷贝 + 扫描整个集合</strong>。epoll 把注册关系常驻内核（红黑树），才消掉了这一项。",
            "en": "The process sleeps here. Remember this flaw: <strong>every call re-copies and re-scans the whole set</strong>. epoll removed that cost by keeping the registration resident in the kernel (a red-black tree)."
          },
          "line": 45
        },
        {
          "tag": {
            "zh": "📦 数据到达",
            "en": "📦 data arrives"
          },
          "short": {
            "zh": "9104 收到数据（注意不是 fd1）",
            "en": "9104 receives data (note: not fd1)"
          },
          "phase": "w1",
          "arrow": {
            "dir": "n2k",
            "label": {
              "zh": "UDP 数据报 → 127.0.0.1:9104",
              "en": "UDP datagram → 127.0.0.1:9104"
            }
          },
          "k": {
            "zh": "fd2 变为可读 → 唤醒进程",
            "en": "fd2 becomes readable → wake the process"
          },
          "n": {
            "zh": "send.py 这次发往 9104",
            "en": "This time send.py targets 9104"
          },
          "st": {
            "proc": {
              "k": "blocked",
              "zh": "阻塞",
              "en": "Blocked"
            },
            "rq": {
              "k": "has_fd2",
              "zh": "有数据(fd2)",
              "en": "Has data (fd2)"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "数据报到达的是 <strong>9104</strong>，也就是 fd2。",
            "en": "The datagram arrives on <strong>9104</strong>, that is fd2 — not fd1."
          },
          "line": 45
        },
        {
          "tag": {
            "zh": "select() 返回",
            "en": "select() returns"
          },
          "short": {
            "zh": "返回 1，且只有 fd2 被置位",
            "en": "returns 1, with only fd2 set"
          },
          "phase": "w2",
          "arrow": {
            "dir": "k2a",
            "label": {
              "zh": "return 1（fd2 就绪）",
              "en": "return 1 (fd2 is ready)"
            }
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "has_fd2",
              "zh": "有数据(fd2)",
              "en": "Has data (fd2)"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "select 返回 <code>1</code>，并且<strong>只把就绪的 fd 在集合里置位</strong>：fd2 被置上，fd1 仍是 0。内核已经告诉你“是<em>谁</em>就绪了”，不用你自己去猜、也不用挨个去试。",
            "en": "select returns <code>1</code> and <strong>sets only the ready fd in the set</strong>: fd2 is set, fd1 stays 0. The kernel has already told you <em>which</em> one is ready — no guessing, no probing."
          },
          "line": 45
        },
        {
          "tag": "FD_ISSET(fd1)",
          "short": {
            "zh": "fd1 未就绪 → 跳过",
            "en": "fd1 not ready → skip"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "has_fd2",
              "zh": "有数据(fd2)",
              "en": "Has data (fd2)"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "检查 fd1：没被置位，跳过。<strong>这一步只在内存里查一个 bit，没有系统调用。</strong>",
            "en": "Check fd1: not set, skip. <strong>This is just a bit test in memory, no system call.</strong>"
          },
          "line": 48
        },
        {
          "tag": "FD_ISSET(fd2)",
          "short": {
            "zh": "fd2 就绪 → 处理它",
            "en": "fd2 ready → handle it"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "has_fd2",
              "zh": "有数据(fd2)",
              "en": "Has data (fd2)"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "检查 fd2：就绪。",
            "en": "Check fd2: ready."
          },
          "line": 52
        },
        {
          "tag": "recvfrom(fd2)",
          "short": {
            "zh": "此时读一定不会阻塞",
            "en": "this read cannot block"
          },
          "phase": "w2",
          "arrow": {
            "dir": "a2k",
            "label": "recvfrom(fd2, buf, 128, ...)"
          },
          "k": {
            "zh": "copy_to_user() 到 buf，立即返回",
            "en": "copy_to_user() into buf, returns immediately"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>阶段二：拷贝数据。</strong>因为 select 刚刚保证过 fd2 可读，<em>这次 recvfrom 绝不会阻塞</em> —— 这正是“就绪通知”模型的核心承诺。",
            "en": "<strong>Phase 2: copying the data.</strong> Because select just guaranteed fd2 was readable, <em>this recvfrom cannot block</em> — that is the core promise of any readiness model."
          },
          "line": 53
        },
        {
          "tag": "printf()",
          "short": {
            "zh": "处理数据，结束",
            "en": "process the data; done"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "整个流程结束。",
            "en": "Done."
          },
          "line": 54
        }
      ],
      "truth": {
        "zh": "select/poll 的硬伤是<b>每次调用都要把整个 fd 集合拷进内核并线性扫描</b>（O(n)），连接上万时光这一项就够呛。所以 Linux 2.6 有了 <b>epoll</b>：注册关系常驻内核，只返回就绪链表，复杂度变成 O(就绪数)。Go 的 netpoller、Node 的 libuv、Nginx、Redis 底下都是它。",
        "en": "The weak spot of select/poll is that <b>every call copies the whole fd set into the kernel and scans it linearly</b> (O(n)); with tens of thousands of connections that alone is too much. Hence <b>epoll</b> in Linux 2.6: the registration stays resident in the kernel and only the ready list is returned, making it O(ready). Go's netpoller, Node's libuv, Nginx and Redis all sit on it."
      },
      "lineStep": [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        0,
        1,
        null,
        null,
        null,
        2,
        3,
        null,
        null,
        null,
        null,
        4,
        null,
        null,
        8,
        null,
        null,
        null,
        9,
        10,
        11,
        null,
        null,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "signal",
      "name": {
        "zh": "④ 信号驱动 I/O",
        "en": "④ Signal-driven I/O"
      },
      "file": "04_signal_driven.c",
      "tagline": {
        "zh": "数据到达时内核主动打断进程，进程再去读 —— 只把“等待”交给了内核",
        "en": "The kernel interrupts the process when data arrives; the process then reads — only the waiting was delegated"
      },
      "lines": [
        [
          "/* ④ 信号驱动 I/O —— 数据到达时内核发 SIGIO 打断进程，进程再去读",
          "/* ④ Signal-driven I/O — when data arrives the kernel interrupts the"
        ],
        [
          " *",
          " * process with SIGIO, and the process then reads."
        ],
        [
          " * 编译: make 04_signal_driven    运行: ./04_signal_driven",
          " *"
        ],
        [
          " * 发送: python3 send.py 9105",
          " * build: make 04_signal_driven     run: ./04_signal_driven"
        ],
        [
          " */",
          " * send:  python3 send.py 9105"
        ],
        "#define _GNU_SOURCE",
        "#include <stdio.h>",
        "#include <stdlib.h>",
        "#include <string.h>",
        "#include <unistd.h>",
        "#include <fcntl.h>",
        "#include <signal.h>",
        "#include <sys/socket.h>",
        "#include <netinet/in.h>",
        "#include <arpa/inet.h>",
        "",
        "#define PORT 9105",
        "",
        "static void die(const char *msg) { perror(msg); exit(1); }",
        "",
        [
          "static volatile sig_atomic_t got = 0;      /* 处理器里只能置标志位，不能做复杂的事 */",
          "static volatile sig_atomic_t got = 0;      /* a handler may only set a flag; it cannot do real work */"
        ],
        "static char g_buf[128];",
        "",
        [
          "static void on_sigio(int sig, siginfo_t *si, void *uc)     /* ★被内核“打断”执行的就是这里 */",
          "static void on_sigio(int sig, siginfo_t *si, void *uc)     /* ★ this is where the kernel interrupts us */"
        ],
        "{",
        "    (void)sig; (void)uc;",
        [
          "    /* recvfrom 是 async-signal-safe 的，可以在这里调；printf 不行 */",
          "    /* recvfrom is async-signal-safe and allowed here; printf is not */"
        ],
        "    ssize_t n = recvfrom(si->si_fd, g_buf, sizeof g_buf - 1, 0, NULL, NULL);",
        "    if (n > 0) { g_buf[n] = '\\0'; got = 1; }",
        "}",
        "",
        "int main(void)",
        "{",
        "    int fd = socket(AF_INET, SOCK_DGRAM, 0);",
        "    if (fd < 0) die(\"socket\");",
        "",
        "    struct sockaddr_in addr;",
        "    memset(&addr, 0, sizeof addr);",
        "    addr.sin_family      = AF_INET;",
        "    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);",
        "    addr.sin_port        = htons(PORT);",
        "    if (bind(fd, (struct sockaddr *)&addr, sizeof addr) < 0)",
        "        die(\"bind\");",
        "",
        [
          "    struct sigaction sa;                                   /* 1. 先装好处理器 */",
          "    struct sigaction sa;                                   /* 1. install the handler first */"
        ],
        "    memset(&sa, 0, sizeof sa);",
        "    sa.sa_sigaction = on_sigio;",
        [
          "    sa.sa_flags     = SA_SIGINFO | SA_RESTART;             /* SA_SIGINFO: 才能拿到 si_fd */",
          "    sa.sa_flags     = SA_SIGINFO | SA_RESTART;             /* SA_SIGINFO: required in order to receive si_fd */"
        ],
        "    sigemptyset(&sa.sa_mask);",
        "    if (sigaction(SIGRTMIN + 2, &sa, NULL) < 0)",
        "        die(\"sigaction\");",
        "",
        [
          "    if (fcntl(fd, F_SETOWN, getpid()) < 0) die(\"F_SETOWN\");    /* 2. 谁来收这个信号 */",
          "    if (fcntl(fd, F_SETOWN, getpid()) < 0) die(\"F_SETOWN\");    /* 2. who receives this signal */"
        ],
        [
          "    if (fcntl(fd, F_SETSIG, SIGRTMIN + 2) < 0) die(\"F_SETSIG\");/* 3. 换实时信号：能带 si_fd，且会排队 */",
          "    if (fcntl(fd, F_SETSIG, SIGRTMIN + 2) < 0) die(\"F_SETSIG\");/* 3. switch to a real-time signal: carries si_fd, and it queues */"
        ],
        "    int flags = fcntl(fd, F_GETFL, 0);",
        [
          "    if (fcntl(fd, F_SETFL, flags | O_ASYNC | O_NONBLOCK) < 0)  /* 4. ★开关★ 打开信号驱动 */",
          "    if (fcntl(fd, F_SETFL, flags | O_ASYNC | O_NONBLOCK) < 0)  /* 4. ★the switch★ turn signal-driven I/O on */"
        ],
        "        die(\"F_SETFL\");",
        "",
        [
          "    printf(\"[应用] 注册完毕。主循环不阻塞在 recvfrom 上，开始干别的活...\\n\");",
          "    printf(\"[app] registered. The main loop is not blocked in recvfrom; getting on with other work...\\n\");"
        ],
        "",
        [
          "    while (!got) {                                         /* 5. 主循环做自己的事，随时可能被信号打断 */",
          "    while (!got) {                                         /* 5. the main loop does its own work, interruptible at any moment */"
        ],
        [
          "        printf(\"[应用] ... 干活中 ...\\n\");",
          "        printf(\"[app] ... working ...\\n\");"
        ],
        "        usleep(300000);",
        "    }",
        "",
        [
          "    printf(\"[应用] 信号处理函数已收走数据: %s\", g_buf);",
          "    printf(\"[app] the signal handler has taken the data: %s\", g_buf);"
        ],
        "    close(fd);",
        "    return 0;",
        "}"
      ],
      "steps": [
        {
          "tag": "sigaction()",
          "short": {
            "zh": "先装好信号处理器",
            "en": "install the signal handler first"
          },
          "arrow": {
            "dir": "a2k",
            "label": "sigaction(SIGRTMIN+2, &sa, NULL)"
          },
          "k": {
            "zh": "登记信号处理函数",
            "en": "Register the signal handler"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "先把处理器函数注册好。注意 <code>SA_SIGINFO</code> 这个 flag —— <strong>只有带上它，内核才能在信号里附带 si_fd，你才知道是哪个 socket 就绪了</strong>。",
            "en": "Install the handler first. Note the <code>SA_SIGINFO</code> flag — <strong>only with it can the kernel attach si_fd to the signal, which is how you learn which socket is ready</strong>."
          },
          "line": 46
        },
        {
          "tag": "F_SETOWN",
          "short": {
            "zh": "指定信号发给谁（本进程）",
            "en": "say who receives the signal (this process)"
          },
          "arrow": {
            "dir": "a2k",
            "label": "fcntl(fd, F_SETOWN, getpid())"
          },
          "k": {
            "zh": "把该 fd 的 owner 设为当前进程",
            "en": "Set the fd's owner to the current process"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "告诉内核：这个 fd 上的 I/O 信号该发给谁。",
            "en": "Tell the kernel who should receive I/O signals for this fd."
          },
          "line": 52
        },
        {
          "tag": "F_SETSIG",
          "short": {
            "zh": "改用实时信号",
            "en": "switch to a real-time signal"
          },
          "arrow": {
            "dir": "a2k",
            "label": "fcntl(fd, F_SETSIG, SIGRTMIN+2)"
          },
          "k": {
            "zh": "把 I/O 信号从默认的 SIGIO 换成 SIGRTMIN+2（实时信号）",
            "en": "Switch this fd's I/O signal from the default SIGIO to SIGRTMIN+2 (a real-time signal)"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "为什么必须换实时信号？① 标准 SIGIO <strong>不携带 fd 编号</strong>，你只能去轮询所有 socket；② 标准信号会被<strong>合并</strong>（100 个事件可能只投递 1 个），实时信号会<strong>排队</strong>。",
            "en": "Why must it be a real-time signal? ① Plain SIGIO <strong>carries no fd number</strong>, so you can only poll every socket you own; ② standard signals get <strong>coalesced</strong> (100 events may deliver 1 signal), whereas real-time signals <strong>queue</strong>."
          },
          "line": 53
        },
        {
          "tag": "O_ASYNC",
          "short": {
            "zh": "★ 真正的开关：打开信号驱动",
            "en": "★ the real switch: enable signal-driven I/O"
          },
          "arrow": {
            "dir": "a2k",
            "label": "fcntl(fd, F_SETFL, O_ASYNC|O_NONBLOCK)"
          },
          "k": {
            "zh": "在该 socket 上启用 fasync 机制",
            "en": "Enable the fasync mechanism on this socket"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>这一行才是开关。</strong>打开 <code>O_ASYNC</code> 后内核行为彻底变了：不再是“你问我答”，而是<em>数据到达时内核主动来通知你</em>。",
            "en": "<strong>This line is the switch.</strong> With <code>O_ASYNC</code> the kernel's behaviour changes completely: instead of “you ask, I answer”, <em>the kernel notifies you when data arrives</em>."
          },
          "line": 55
        },
        {
          "tag": "while (!got)",
          "short": {
            "zh": "主循环：不阻塞在任何 I/O 上",
            "en": "main loop: not blocked on any I/O"
          },
          "a": {
            "zh": "可以安心做业务逻辑",
            "en": "Free to do real work"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "进入主循环。请特别留意：<strong>这里没有 recvfrom，进程没有阻塞在任何 I/O 上。</strong>",
            "en": "Enter the main loop. Note in particular: <strong>there is no recvfrom here, and the process is not blocked on any I/O.</strong>"
          },
          "line": 60
        },
        {
          "tag": {
            "zh": "业务代码",
            "en": "business code"
          },
          "short": {
            "zh": "应用正常干活",
            "en": "the application works normally"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "应用在干自己的活……",
            "en": "The application is busy with its own work…"
          },
          "line": 61
        },
        {
          "tag": {
            "zh": "📦 数据到达",
            "en": "📦 data arrives"
          },
          "short": {
            "zh": "数据报进入内核接收队列",
            "en": "the datagram enters the kernel receive queue"
          },
          "arrow": {
            "dir": "n2k",
            "label": {
              "zh": "UDP 数据报 → 127.0.0.1:9105",
              "en": "UDP datagram → 127.0.0.1:9105"
            }
          },
          "k": {
            "zh": "该 fd 已是 fasync 模式 → 内核调用 kill_fasync()",
            "en": "The fd is in fasync mode → the kernel calls kill_fasync()"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "数据报进入内核接收队列。",
            "en": "The datagram lands in the kernel receive queue."
          },
          "line": 61
        },
        {
          "tag": {
            "zh": "⚡ SIGIO 到达",
            "en": "⚡ SIGIO arrives"
          },
          "short": {
            "zh": "★ 内核打断应用，跳进 handler",
            "en": "★ the kernel interrupts the app and jumps into the handler"
          },
          "phase": "w1",
          "arrow": {
            "dir": "k2a",
            "label": "SIGRTMIN+2（si_fd = 3）"
          },
          "k": {
            "zh": "投递实时信号，si_fd 告诉你是哪个 fd",
            "en": "Deliver the real-time signal; si_fd tells you which fd"
          },
          "a": {
            "zh": "执行流被打断，跳到文件上方的 on_sigio()",
            "en": "Execution is interrupted and jumps to on_sigio() near the top of the file"
          },
          "st": {
            "proc": {
              "k": "interrupted",
              "zh": "被信号打断",
              "en": "Interrupted"
            },
            "rq": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>关键一步：内核直接打断应用当前的执行流。</strong>控制流从主循环“跳”到文件上方的处理函数里 —— <em>代码的文字顺序 ≠ 执行顺序</em>，这是信号驱动最典型的特征。",
            "en": "<strong>The crucial step: the kernel interrupts the application's current flow of execution.</strong> Control jumps from the main loop to the handler near the top of the file — <em>textual order ≠ execution order</em>, the signature trait of signal-driven I/O."
          },
          "line": 27
        },
        {
          "tag": "recvfrom()",
          "short": {
            "zh": "在处理函数里把数据拷走",
            "en": "copy the data out inside the handler"
          },
          "phase": "w2",
          "k": "copy_to_user() → g_buf",
          "a": {
            "zh": "处理器里把数据读走",
            "en": "The handler reads the data out"
          },
          "st": {
            "proc": {
              "k": "interrupted",
              "zh": "被信号打断",
              "en": "Interrupted"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>阶段二：拷贝数据 —— 仍然是应用自己做的。</strong>信号驱动只是把“<em>等待数据</em>”交给了内核，<strong>“把数据拷进用户缓冲区”还得你自己在处理器里干</strong>。所以它是“半异步”。",
            "en": "<strong>Phase 2: copying the data — still done by the application.</strong> Signal-driven I/O only handed <em>waiting</em> to the kernel; <strong>copying the data into the user buffer is still your job, inside the handler</strong>. That makes it only “half asynchronous”."
          },
          "line": 27
        },
        {
          "tag": {
            "zh": "置标志位",
            "en": "set the flag"
          },
          "short": {
            "zh": "handler 里只能做最少的事",
            "en": "a handler can do only the bare minimum"
          },
          "a": {
            "zh": "只置一个 volatile sig_atomic_t 标志",
            "en": "Just sets a volatile sig_atomic_t flag"
          },
          "st": {
            "proc": {
              "k": "interrupted",
              "zh": "被信号打断",
              "en": "Interrupted"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "置个标志位就赶紧返回。<strong>信号处理器里只能调用 async-signal-safe 的函数</strong>（recvfrom 可以，printf 不行），所以复杂处理必须回主循环 —— 这又是一层心智负担。",
            "en": "Set a flag and get out. <strong>A signal handler may only call async-signal-safe functions</strong> (recvfrom is fine, printf is not), so any real work must go back to the main loop — one more thing to keep in your head."
          },
          "line": 28
        },
        {
          "tag": {
            "zh": "while 检查",
            "en": "while check"
          },
          "short": {
            "zh": "主循环发现标志位已置 → 退出",
            "en": "the main loop sees the flag set → exits"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "主循环回到条件判断，发现 <code>got</code> 已经为 1，退出。",
            "en": "The main loop re-evaluates the condition, sees <code>got</code> is now 1, and exits."
          },
          "line": 60
        },
        {
          "tag": "printf()",
          "short": {
            "zh": "打印结果，结束",
            "en": "print the result; done"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "从应用视角看：它从头到尾<strong>没有主动“等”过</strong>。",
            "en": "From the application's point of view it <strong>never actively waited</strong>."
          },
          "line": 65
        }
      ],
      "truth": {
        "zh": "信号驱动 I/O 天生<b>只有边沿触发</b>（没有水平触发可选），漏读一次事件就永久丢失；实时信号队列还有内核上限，<b>超限时内核会静默退回投递普通 SIGIO，而且投递给整个进程而不是指定线程</b>。加上信号是进程级全局命名空间（会被库抢走），所以它在高并发网络服务里基本绝迹 —— 只在 evdev 这类设备驱动场景还活着。",
        "en": "Signal-driven I/O is <b>edge-triggered only</b> (there is no level-triggered option), so one missed event is lost forever; real-time signal queues also have a kernel limit, and <b>when that limit is reached the kernel silently falls back to delivering plain SIGIO — to the whole process rather than the specific thread</b>. Add the fact that signals are a process-wide namespace (libraries can steal them) and it has all but vanished from high-concurrency network services — surviving only in device-driver territory such as evdev."
      },
      "lineStep": [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        7,
        9,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        0,
        null,
        null,
        null,
        null,
        null,
        1,
        2,
        null,
        3,
        null,
        null,
        null,
        null,
        4,
        5,
        null,
        null,
        null,
        11,
        null,
        null,
        null
      ]
    },
    {
      "id": "async",
      "name": {
        "zh": "⑤ 异步 I/O",
        "en": "⑤ Asynchronous I/O"
      },
      "file": "05_async.c",
      "tagline": {
        "zh": "提交请求后立刻返回：等数据、拷数据两件事，内核全包",
        "en": "Submit and return immediately: both the waiting and the copying are the kernel's job"
      },
      "lines": [
        [
          "/* ⑤ 异步 I/O —— 提交请求后立刻返回，连“把数据拷进用户缓冲区”都由内核完成",
          "/* ⑤ Asynchronous I/O — submitting the request returns immediately; even"
        ],
        [
          " *",
          " * copying the data into the user buffer is done by the kernel."
        ],
        [
          " * 注意：glibc 的 POSIX AIO 在 Linux 上是“用户态线程池”伪装的（Node 处理文件 I/O 用的是同一招）。",
          " *"
        ],
        [
          " *       真正的内核级异步 I/O 是 io_uring（Linux 5.1+）。这里演示的是 API 语义。",
          " * Note: on Linux glibc fakes POSIX AIO with a user-space thread pool (the"
        ],
        [
          " *",
          " * same trick Node uses for file I/O). Real kernel-level async I/O is"
        ],
        [
          " * 编译: make 05_async        运行: ./05_async",
          " * io_uring (Linux 5.1+). What is demonstrated here is the API semantics."
        ],
        [
          " * 发送: python3 send.py 9106",
          " *"
        ],
        [
          " */",
          " * build: make 05_async         run: ./05_async"
        ],
        "#define _GNU_SOURCE",
        "#include <stdio.h>",
        "#include <stdlib.h>",
        "#include <string.h>",
        "#include <unistd.h>",
        "#include <aio.h>",
        "#include <signal.h>",
        "#include <sys/socket.h>",
        "#include <netinet/in.h>",
        "#include <arpa/inet.h>",
        "",
        "#define PORT 9106",
        "",
        "static void die(const char *msg) { perror(msg); exit(1); }",
        "",
        "static volatile sig_atomic_t done = 0;",
        "static char buf[128];",
        "",
        "static void on_complete(int sig, siginfo_t *si, void *uc)",
        "{",
        "    (void)sig; (void)si; (void)uc;",
        [
          "    done = 1;                       /* 内核说：数据已经躺在 buf 里了 */",
          "    done = 1;                       /* the kernel says: the data is already sitting in buf */"
        ],
        "}",
        "",
        "int main(void)",
        "{",
        "    int fd = socket(AF_INET, SOCK_DGRAM, 0);",
        "    if (fd < 0) die(\"socket\");",
        "",
        "    struct sockaddr_in addr;",
        "    memset(&addr, 0, sizeof addr);",
        "    addr.sin_family      = AF_INET;",
        "    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);",
        "    addr.sin_port        = htons(PORT);",
        "    if (bind(fd, (struct sockaddr *)&addr, sizeof addr) < 0)",
        "        die(\"bind\");",
        "",
        "    struct sigaction sa;",
        "    memset(&sa, 0, sizeof sa);",
        "    sa.sa_sigaction = on_complete;",
        "    sa.sa_flags     = SA_SIGINFO;",
        "    sigemptyset(&sa.sa_mask);",
        "    if (sigaction(SIGRTMIN + 3, &sa, NULL) < 0)",
        "        die(\"sigaction\");",
        "",
        "    struct aiocb cb;",
        "    memset(&cb, 0, sizeof cb);",
        [
          "    cb.aio_fildes = fd;                                    /* 1. 描述“要做什么” */",
          "    cb.aio_fildes = fd;                                    /* 1. describe what to do */"
        ],
        [
          "    cb.aio_buf    = buf;                                   /*    直接指定用户缓冲区 */",
          "    cb.aio_buf    = buf;                                   /* point straight at the user buffer */"
        ],
        "    cb.aio_nbytes = sizeof buf - 1;",
        [
          "    cb.aio_sigevent.sigev_notify = SIGEV_SIGNAL;           /* 2. 完成后怎么通知我 */",
          "    cb.aio_sigevent.sigev_notify = SIGEV_SIGNAL;           /* 2. how to notify me on completion */"
        ],
        "    cb.aio_sigevent.sigev_signo  = SIGRTMIN + 3;",
        "",
        [
          "    if (aio_read(&cb) < 0) die(\"aio_read\");                /* 3. ★提交后立刻返回★ 一秒都不等 */",
          "    if (aio_read(&cb) < 0) die(\"aio_read\");                /* 3. ★returns at once after submitting★ no waiting at all */"
        ],
        "",
        [
          "    printf(\"[应用] 请求已提交。内核负责“等数据 + 拷贝”，我继续干别的...\\n\");",
          "    printf(\"[app] request submitted. The kernel handles waiting + copying; I carry on...\\n\");"
        ],
        "",
        [
          "    while (!done) {                                        /* 4. 主循环自己干活 */",
          "    while (!done) {                                        /* 4. the main loop does its own work */"
        ],
        [
          "        printf(\"[应用] ... 干活中 ...\\n\");",
          "        printf(\"[app] ... working ...\\n\");"
        ],
        "        usleep(300000);",
        "    }",
        "",
        "    if (aio_error(&cb) != 0) die(\"aio_error\");",
        [
          "    ssize_t n = aio_return(&cb);                           /* 5. 取返回值，数据早就在 buf 里了 */",
          "    ssize_t n = aio_return(&cb);                           /* 5. fetch the return value; the data has long been in buf */"
        ],
        "    buf[n] = '\\0';",
        [
          "    printf(\"[应用] 收到 %zd 字节: %s\", n, buf);",
          "    printf(\"[app] received %zd bytes: %s\", n, buf);"
        ],
        "",
        "    close(fd);",
        "    return 0;",
        "}"
      ],
      "steps": [
        {
          "tag": "aiocb",
          "short": {
            "zh": "填写“请求单”：读哪个 fd",
            "en": "fill in the order form: which fd to read"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "填一张<em>请求单</em>（aiocb）描述“要做什么”。这一行只填了 fd，还没有发起任何 I/O。",
            "en": "Fill in an <em>order form</em> (aiocb) describing what to do. This line only sets the fd — no I/O has been started yet."
          },
          "line": 55
        },
        {
          "tag": "aio_buf",
          "short": {
            "zh": "★ 直接指定<用户自己的>缓冲区",
            "en": "★ hand over your own user buffer"
          },
          "k": {
            "zh": "内核将直接对用户缓冲区寻址",
            "en": "The kernel will address the user buffer directly"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>这里是和前四种模型最本质的区别。</strong>你把自己的<em>用户缓冲区</em> <code>buf</code> 直接交给内核 —— 意味着“把数据拷进来”这件事，由内核替你完成。",
            "en": "<strong>This is the most fundamental difference from the previous four models.</strong> You hand your own <em>user buffer</em> <code>buf</code> to the kernel — which means the kernel will do the copying for you."
          },
          "line": 56
        },
        {
          "tag": "sigevent",
          "short": {
            "zh": "约定完成后怎么通知我",
            "en": "agree how to be notified on completion"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "约定完成通知方式：完成后给我发个信号（也可以选回调或轮询）。",
            "en": "Agree on how to be notified at completion: send me a signal (a callback or polling are also available)."
          },
          "line": 58
        },
        {
          "tag": "aio_read()",
          "short": {
            "zh": "★ 提交后立刻返回，一秒都不等",
            "en": "★ returns at once after submitting; no waiting at all"
          },
          "arrow": {
            "dir": "a2k",
            "label": "aio_read(&cb)"
          },
          "k": {
            "zh": "把请求放进异步 I/O 队列，立即 return 0",
            "en": "Queue the request for asynchronous I/O and return 0 at once"
          },
          "a": {
            "zh": "继续往下执行，不等",
            "en": "Keeps executing; no waiting"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>提交，然后立刻返回。</strong>对比第 ① 种模型：同样是读一个 socket，<code>recvfrom</code> 会把进程睡死在那里，而 <code>aio_read</code> 说完就回来 —— <strong>等数据、拷数据这两件事，内核全包了</strong>。",
            "en": "<strong>Submit, and return immediately.</strong> Compare with model ①: reading the same socket, <code>recvfrom</code> would put the process to sleep, whereas <code>aio_read</code> returns as soon as it has spoken — <strong>both the waiting and the copying are on the kernel now</strong>."
          },
          "line": 61
        },
        {
          "tag": "while (!done)",
          "short": {
            "zh": "主循环继续干活",
            "en": "the main loop keeps working"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "应用继续干自己的活。",
            "en": "The application gets on with its work."
          },
          "line": 65
        },
        {
          "tag": {
            "zh": "业务代码",
            "en": "business code"
          },
          "short": {
            "zh": "应用正常干活（此时 buf 归内核管）",
            "en": "the application works normally (buf belongs to the kernel now)"
          },
          "a": {
            "zh": "这段时间不能碰 buf",
            "en": "buf must not be touched during this window"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>额外的心智负担：这段时间里 <code>buf</code> 归内核所有，应用不能碰它</strong> —— 这是异步 I/O 特有的约束（Node/Go 的运行时替你管理了这件事）。",
            "en": "<strong>Extra mental burden: during this window <code>buf</code> belongs to the kernel and the application must not touch it</strong> — a constraint unique to asynchronous I/O (the Node and Go runtimes manage it for you)."
          },
          "line": 66
        },
        {
          "tag": {
            "zh": "📦 数据到达",
            "en": "📦 data arrives"
          },
          "short": {
            "zh": "数据报到达（应用无需参与）",
            "en": "the datagram arrives (no application involvement)"
          },
          "arrow": {
            "dir": "n2k",
            "label": {
              "zh": "UDP 数据报 → 127.0.0.1:9106",
              "en": "UDP datagram → 127.0.0.1:9106"
            }
          },
          "k": {
            "zh": "内核接管整个等待过程",
            "en": "The kernel takes over the whole wait"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "buf": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "数据到达，应用完全不知道。",
            "en": "Data arrives; the application knows nothing about it."
          },
          "line": 66
        },
        {
          "tag": {
            "zh": "内核拷贝",
            "en": "kernel copy"
          },
          "short": {
            "zh": "★ 内核直接把数据拷进用户缓冲区 buf",
            "en": "★ the kernel copies straight into the user buffer buf"
          },
          "phase": "w2",
          "k": {
            "zh": "copy_to_user() 直接写入用户缓冲区 buf",
            "en": "copy_to_user() writes straight into the user buffer buf"
          },
          "a": {
            "zh": "应用不参与，也不知道",
            "en": "The application neither participates nor knows"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "<strong>阶段二由内核完成，没有任何用户进程参与。</strong>数据被直接拷进 <code>buf</code>。这才是真正的“异步”：你提交了请求，然后彻底不管了。",
            "en": "<strong>Phase 2 is performed by the kernel, with no user process involved.</strong> The data is copied straight into <code>buf</code>. This is what “asynchronous” really means: you submit a request and then stop caring."
          },
          "line": 66
        },
        {
          "tag": {
            "zh": "⚡ 完成通知",
            "en": "⚡ completion notice"
          },
          "short": {
            "zh": "内核发信号：你的 buf 已经填好了",
            "en": "the kernel signals: your buf is filled"
          },
          "arrow": {
            "dir": "k2a",
            "label": {
              "zh": "SIGRTMIN+3（完成通知）",
              "en": "SIGRTMIN+3 (completion notice)"
            }
          },
          "a": {
            "zh": "收到通知：数据已经在 buf 里了",
            "en": "Notified: the data is already in buf"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "注意通知的语义：<strong>它说的是“已经做完了”，而不是“可以开始做了”</strong> —— 这就是<em>完成式（completion）</em>与<em>就绪式（readiness）</em>的分水岭。前面四种模型全是就绪式。",
            "en": "Mind the semantics of the notification: <strong>it says “it is already done”, not “you may start now”</strong> — this is the watershed between <em>completion</em> and <em>readiness</em>. The previous four models are all readiness-based."
          },
          "line": 70
        },
        {
          "tag": "aio_error()",
          "short": {
            "zh": "确认没有出错",
            "en": "confirm there was no error"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "检查一下有没有出错。",
            "en": "Check whether anything went wrong."
          },
          "line": 70
        },
        {
          "tag": "aio_return()",
          "short": {
            "zh": "取回返回值，数据早在 buf 里了",
            "en": "fetch the return value; the data is long since in buf"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "取回返回值。<strong>此刻数据早就在 <code>buf</code> 里了，这里没有任何拷贝发生。</strong>",
            "en": "Retrieve the return value. <strong>The data has been sitting in <code>buf</code> for a while; no copy happens here.</strong>"
          },
          "line": 71
        },
        {
          "tag": "printf()",
          "short": {
            "zh": "直接处理数据，结束",
            "en": "process the data directly; done"
          },
          "st": {
            "proc": {
              "k": "running",
              "zh": "运行",
              "en": "Running"
            },
            "rq": {
              "k": "empty",
              "zh": "空",
              "en": "Empty"
            },
            "buf": {
              "k": "has",
              "zh": "有数据",
              "en": "Has data"
            },
            "cpu": {
              "k": "idle",
              "zh": "空闲",
              "en": "Idle"
            }
          },
          "say": {
            "zh": "从提交到现在，应用<strong>一次都没有等待过</strong>。",
            "en": "From submission to now, the application <strong>never waited once</strong>."
          },
          "line": 73
        }
      ],
      "truth": {
        "zh": "这是五模型里的最高一级，但有两个坑：① <b>glibc 的 POSIX AIO 在 Linux 上是用用户态线程池伪装的</b>（Node 处理文件 I/O 用的是同一招），你写的是异步 API，底下跑的还是阻塞线程 —— 真正的内核级异步是 <b>io_uring（Linux 5.1+，2019）</b>；② 异步 I/O 要求你放弃“缓冲区随时可读写”的直觉，这是它最难被接受的地方。Windows 的 IOCP 早在 1994 年就是这个模型，Unix 世界直到 io_uring 才算补齐。",
        "en": "This is the highest tier of the five, but there are two traps: ① <b>glibc's POSIX AIO on Linux is a user-space thread pool in disguise</b> (exactly what Node does for file I/O) — the API is asynchronous but blocking threads run underneath. The genuine kernel-level asynchronous I/O is <b>io_uring (Linux 5.1+, 2019)</b>. ② Asynchronous I/O forces you to give up the intuition that a buffer is always readable and writable — the hardest part to accept. Windows IOCP was already this model back in 1994; the Unix world only caught up with io_uring."
      },
      "lineStep": [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        0,
        1,
        null,
        2,
        null,
        null,
        3,
        null,
        null,
        null,
        4,
        5,
        null,
        null,
        null,
        8,
        10,
        null,
        11,
        null,
        null,
        null,
        null
      ]
    },
    {
      "id": "compare",
      "name": {
        "zh": "📊 对比总结",
        "en": "📊 Comparison"
      },
      "tagline": {
        "zh": "五个模型，同一个功能，差别只在两个问题：谁在等？谁在拷？",
        "en": "Five models, one function — they differ on exactly two questions: who waits, and who copies."
      },
      "table": true,
      "cols": [
        {
          "zh": "模型",
          "en": "Model"
        },
        {
          "zh": "阶段一：谁在等数据",
          "en": "Phase 1: who waits for data"
        },
        {
          "zh": "阶段二：谁在做拷贝",
          "en": "Phase 2: who does the copy"
        },
        {
          "zh": "等待期间进程能干活吗",
          "en": "Can the process work while waiting?"
        },
        {
          "zh": "一个线程能管几个连接",
          "en": "Connections per thread"
        },
        {
          "zh": "主要缺点",
          "en": "Main drawback"
        }
      ],
      "rows": [
        [
          {
            "zh": "① 阻塞 I/O",
            "en": "① Blocking I/O"
          },
          {
            "zh": "进程自己（睡眠）",
            "en": "The process itself (asleep)"
          },
          {
            "zh": "内核→用户，进程被唤醒后才有数据",
            "en": "Kernel→user; data is available only after the wakeup"
          },
          {
            "zh": "<span class=\"n\">✗ 完全不能</span>",
            "en": "<span class=\"n\">✗ Not at all</span>"
          },
          {
            "zh": "<b>1 个</b>",
            "en": "<b>1</b>"
          },
          {
            "zh": "并发 = 线程数，1 万连接 = 1 万线程，C10K 直接崩",
            "en": "Concurrency = number of threads; 10k connections = 10k threads; C10K collapses"
          }
        ],
        [
          {
            "zh": "② 非阻塞 I/O",
            "en": "② Non-blocking I/O"
          },
          {
            "zh": "没人等，靠应用轮询",
            "en": "Nobody waits; the application polls"
          },
          {
            "zh": "同上",
            "en": "Same as above"
          },
          {
            "zh": "<span class=\"m\">△ 能，但要不停重试</span>",
            "en": "<span class=\"m\">△ Yes, but by retrying constantly</span>"
          },
          {
            "zh": "理论 N 个，实际被 CPU 卡死",
            "en": "N in theory, CPU-bound in practice"
          },
          {
            "zh": "CPU 空转 + 每次重试一次完整系统调用",
            "en": "Wasted CPU + one full system call per retry"
          }
        ],
        [
          {
            "zh": "③ I/O 多路复用",
            "en": "③ I/O Multiplexing"
          },
          {
            "zh": "进程自己睡在 select/epoll 上",
            "en": "The process sleeps in select/epoll"
          },
          {
            "zh": "同上",
            "en": "Same as above"
          },
          {
            "zh": "<span class=\"n\">✗ 等待期间不能</span>",
            "en": "<span class=\"n\">✗ Not while waiting</span>"
          },
          {
            "zh": "<b class=\"y\">N 个（核心优势）</b>",
            "en": "<b class=\"y\">N (the core advantage)</b>"
          },
          {
            "zh": "select/poll 每次 O(n) 拷贝+扫描；编程模型更复杂",
            "en": "select/poll copy and scan O(n) on every call; more complex programming model"
          }
        ],
        [
          {
            "zh": "④ 信号驱动",
            "en": "④ Signal-driven"
          },
          {
            "zh": "<b class=\"y\">内核</b>（进程不睡）",
            "en": "<b class=\"y\">The kernel</b> (the process does not sleep)"
          },
          {
            "zh": "应用自己在 handler 里做",
            "en": "The application itself, inside the handler"
          },
          {
            "zh": "<span class=\"y\">✓ 能（随时会被打断）</span>",
            "en": "<span class=\"y\">✓ Yes (interruptible at any time)</span>"
          },
          {
            "zh": "N 个，但只有边沿触发",
            "en": "N, but edge-triggered only"
          },
          {
            "zh": "只支持边沿触发、信号队列有上限、handler 里几乎不能干活",
            "en": "Edge-triggered only; signal queue limits; almost nothing may be done in a handler"
          }
        ],
        [
          {
            "zh": "⑤ 异步 I/O",
            "en": "⑤ Asynchronous I/O"
          },
          {
            "zh": "<b class=\"y\">内核</b>",
            "en": "<b class=\"y\">The kernel</b>"
          },
          {
            "zh": "<b class=\"y\">内核全包</b>",
            "en": "<b class=\"y\">The kernel does everything</b>"
          },
          {
            "zh": "<span class=\"y\">✓ 能，且不用管缓冲区</span>",
            "en": "<span class=\"y\">✓ Yes, and no buffer management</span>"
          },
          {
            "zh": "N 个",
            "en": "N"
          },
          {
            "zh": "API 复杂、缓冲区归属要小心、Linux 上真货（io_uring）来得太晚",
            "en": "Complex API; careful buffer ownership; the real thing (io_uring) reached Linux very late"
          }
        ],
        [
          {
            "zh": "<b>分水岭</b>",
            "en": "<b>The watershed</b>"
          },
          {
            "zh": "①②③④ 全部是 <b>就绪式 readiness</b>：“可以读了，你自己来”",
            "en": "①②③④ are all <b>readiness</b>: “it is readable, come and get it”"
          },
          {
            "zh": "⑤ 是 <b>完成式 completion</b>：“我已经读完了，结果放这了”",
            "en": "⑤ is <b>completion</b>: “I have already read it, the result is here”"
          },
          "——",
          "——",
          {
            "zh": "就绪式一定要配非阻塞 fd 才能批量处理；完成式天然没有这个问题",
            "en": "Readiness must be paired with non-blocking fds in order to batch; completion has no such problem"
          }
        ]
      ]
    }
  ]
};
