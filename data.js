/* ===========================================================================
   页面的全部内容都在这个文件里。改完跑 `node build.mjs` 重新生成 index.html。

   为什么要有这一步：卡片如果由浏览器端 JS 渲染，页面源码里就只有一个空
   <ul>，四个站点的名字、额度、倍率一个字都进不了 HTML。Google 会执行 JS
   但优先级低，百度基本不执行，GPTBot / ClaudeBot / PerplexityBot 这类
   抓取器多数只读原始 HTML。所以卡片必须在构建期就展开成静态标签。
=========================================================================== */

export const SITE = {
  // 结尾的斜杠要留着，canonical 和 sitemap 都按这个拼
  url: "https://jliushi.github.io/ai-relay/",
  repo: "https://github.com/jliushi/ai-relay",
  author: "https://github.com/jliushi",
  authorName: "jliushi",

  /* IndexNow 的密钥：仓库根目录那个 <key>.txt 文件的内容就是这串，两处必须一致。
     .github/workflows/indexnow.yml 每次 push 会拿它去通知 Bing / Yandex 重新抓取。
     换 key 就同时改这里、改那个 txt 文件名和内容。留空则跳过 IndexNow 通知。 */
  indexNowKey: "5274d490c7073e9630ce4cc455bb9c41",

  brand: "AI 公益站清单",
  // 搜索结果里中文标题大约 30 字截断，关键词往前放。「大全」「清单」都留着 ——
  // 实测这两个词的搜索结果是两拨人（大全偏导航站，清单偏具体对比），都要覆盖。
  title: "AI 公益站大全 — Claude Code / Codex 免费额度实测清单",
  description:
    "实测可用的 AI 公益站（中转站）清单：注册即送免费额度，覆盖 Claude Opus 5、Opus 4.8 与 GPT-5.6，可接入 Claude Code 和 Codex。逐站记录赠额、倍率、注册条件、邀请规则和实测日期，附最小配置方法。",
  keywords: [
    "公益站",
    "公益站大全",
    "AI 公益站",
    "AI 公益站大全",
    "AI 中转站",
    "Claude Code 公益站",
    "Claude Code 中转站",
    "Claude Code 免费",
    "白嫖 Claude Code",
    "Codex 公益站",
    "Codex 中转站",
    "opus 5 免费额度",
    "claude 镜像站",
    "免费 API 额度",
    "New API 中转站",
    "AgentRouter",
    "kktoken",
    "tabitoken",
    "justwoker",
  ],

  /* 首屏只回答三件事：这是什么、能拿到多少、怎么开始。
     H1 第二行（「N 个实测公益站，注册送 $x–$y」）由 build.mjs 按 RELAYS 算，不写死。 */
  heroTitle: "Claude Code / Codex 免费额度",
  heroLead:
    "公益站是第三方搭的 API 中转：注册就送一笔额度，把 key 填进 Claude Code 或 Codex 就能用 Opus 5 / GPT-5.6。清单已按等效额度排好序，点「注册」直达。",
  contactText: "联系作者",

  /* 搜索引擎的所有权验证码。删掉就会掉验证状态，Search Console / 百度资源平台
     会停止收数据，所以验证通过之后也得一直留着。没有的留空字符串，build 会
     跳过那一行，不会往页面里塞空标签。 */
  googleVerification: "X5psQCpL0MgNS2SGTUDBeddNupFq2alnYJaO9CkGnkI",
  baiduVerification: "",
};

/* ---------------------------------------------------------------------------
   站点清单。每一项对应页面上一张卡片。

   维护规则（这些数字是第三方服务的当前状态，代码没法校验，过期得很快）：
   1. 任何一条数字（倍率 / 额度 / 邀请）变了，必须同时更新 verifiedAt。
   2. verifiedAt 距今超过三个月，卡片会自动挂一条「信息可能已变化」的提示。
      这条提示由浏览器按访问当天的日期算，不是构建日期 —— 会自己越线。
      看到了就重新实测改日期，或者把该项删掉，不要只改日期不实测。
   3. invite 没有就删掉这一行，卡片会跳过这一块，别脑补一个数字。
   4. aff 整条贴站点给你的邀请链接。各站注册路径不一样（/register 和
      /sign-up 都有），照抄，不要套别家的路径。
   5. tools 是接入说明，eligibility 是注册观察，不要把模型列表当作客户端兼容性实测。
      门槛记录只说明该账号曾注册成功，不代表其他账号一定不能注册。
   6. 链接里没有 aff= 的项，页脚不会显示返利披露，按钮也会变成「前往注册」。
--------------------------------------------------------------------------- */

export const RELAYS = [
  {
    id: "agentrouter",
    name: "AgentRouter 公益站",
    host: "agentrouter.org",
    aff: "https://agentrouter.org/register?aff=76NE",
    rate: "1x 倍率",
    signup: "注册即得 $100 额度",
    invite: "每邀请一位新用户：新用户获得 $50 额度，邀请人获得 $100 额度。",
    models: ["gpt-5.6", "opus 5"],
    tools: "Claude Code / Codex：接入兼容性待核对",
    eligibility: "GitHub 老账号（2026 年前注册）曾通过",
    tested: "用 2026 年之前注册的 GitHub 老账号注册通过。",
    notes: ["不需要加群，注册完就能用", "使用 GitHub 账号注册"],
    tips: [
      "拉取模型列表可能失败。取不到就直接手填模型名：gpt-5.6-sol、claude-opus-5。",
      "每日签到需要重新登录一次，可领 25 额度。",
    ],
    verifiedAt: "2026-09-04",
  },
  {
    id: "justwoker",
    name: "justwoker 公益站",
    host: "api.justwoker.icu",
    aff: "https://api.justwoker.icu/register?aff=XiYg",
    rate: "0.65x 倍率",
    signup: "通过邀请链接注册即得 $70 额度",
    models: ["opus 4.8", "opus 5"],
    tools: "Claude Code 待核对 · Codex 未确认",
    eligibility: "注册满一年的 GitHub 账号曾通过",
    tested: "用注册满一年以上的 GitHub 账号注册通过。",
    notes: ["有 opus-4.8 和 opus-5", "可以签到"],
    verifiedAt: "2026-09-04",
  },
  {
    id: "kktoken",
    name: "kktoken 公益站",
    host: "kktoken.cc",
    aff: "https://kktoken.cc/sign-up?aff=8Zqi",
    rate: "1x 倍率",
    signup: "注册即得 $100 额度",
    invite: "每邀请一位新用户获得 $25 额度。",
    models: ["opus 5"],
    tools: "Claude Code 待核对 · Codex 未确认",
    eligibility: "注册门槛未记录，请向站点确认",
    tested: "实测可用。",
    notes: ["只有 opus 5", "需要科学上网"],
    tips: ["正常使用有机会获得平台赠送 $500 额度。"],
    verifiedAt: "2026-09-04",
  },
  {
    id: "tabitoken",
    name: "tabitoken 公益站",
    host: "tabitoken.com",
    aff: "https://tabitoken.com/sign-up?aff=C8EJ",
    rate: "1x 倍率",
    signup: "注册即得 $20 额度",
    invite: "每邀请一位新用户：新用户获得 $20 额度，邀请人获得 $20 额度。",
    models: ["opus 4.8", "opus 5"],
    tools: "仅 Claude Code · 不支持 Codex",
    eligibility: "GitHub 账号曾通过；账号年龄未记录",
    tested: "用 GitHub 账号注册通过。",
    notes: ["不需要加群，注册完就能用", "使用 GitHub 账号注册", "只支持 Claude Code"],
    verifiedAt: "2026-09-04",
  },
];

/* ---------------------------------------------------------------------------
   配置方法。这一块不是为了凑字数：搜「公益站大全」的人拿到 key 之后下一步就卡
   在这里，而收录站几乎都只给链接不给配置，所以这是本页能提供、别人没提供的东西。

   写这里的东西要能被验证。环境变量名和 config.toml 的字段名是各自工具文档里的
   稳定写法；各站自己的 base_url 具体路径不往这里写死 —— 站点会改，写死了就是
   埋一个过期信息，让读者去看站点文档反而更准。
--------------------------------------------------------------------------- */

export const SETUP = {
  lead: "拿到 key 之后要做的事只有一件：把请求指到公益站，而不是官方地址。Claude Code 靠两个环境变量，Codex 靠一段 config.toml。下面是两边的最小可用配置。",
  steps: [
    {
      title: "Claude Code",
      body: "两个环境变量就够。BASE_URL 指到站点的 Anthropic 兼容端点，AUTH_TOKEN 填站点给的 key（会以 Bearer 形式发出去，多数公益站认这个而不是 x-api-key）。",
      code: [
        "export ANTHROPIC_BASE_URL=\"https://<站点给的地址>\"",
        "export ANTHROPIC_AUTH_TOKEN=\"<站点给的 key>\"",
        "export ANTHROPIC_MODEL=\"claude-opus-5\"   # 拉不到模型列表时手动指定",
        "",
        "claude",
      ].join("\n"),
      note: "想固定下来就写进 shell 配置，或者放进 ~/.claude/settings.json 的 env 块。别把 key 提交进仓库。",
    },
    {
      title: "Codex",
      body: "Codex 走自定义 provider：在 ~/.codex/config.toml 里声明一个 provider，key 用 env_key 指向环境变量名，不直接写在文件里。",
      code: [
        "model = \"gpt-5.6\"",
        "model_provider = \"relay\"",
        "",
        "[model_providers.relay]",
        "name = \"relay\"",
        "base_url = \"https://<站点给的地址>/v1\"",
        "env_key = \"RELAY_API_KEY\"",
        "wire_api = \"chat\"",
      ].join("\n"),
      note: "然后 export RELAY_API_KEY=\"<站点给的 key>\"。wire_api 先试 chat —— 公益站转出来的多数只是 chat completions，responses 那套接口不一定有。",
    },
  ],
  /* 这几条都是实际踩过的，不是通用的「请检查你的配置」。 */
  pitfalls: [
    "base_url 结尾要不要 /v1，看端点类型：Anthropic 兼容的一般不带（Claude Code 自己会拼 /v1/messages），OpenAI 兼容的一般要带。填错的表现是 404，不是 401 —— 按状态码区分是配置错还是 key 错。",
    "模型名照站点给的抄。拉取模型列表失败很常见，取不到就手填，例如 AgentRouter 上是 gpt-5.6-sol 和 claude-opus-5。",
    "标了「只支持 Claude Code」的站不要接 Codex。它只转了 Anthropic 那套接口，接上只会拿到一串报错。",
    "401 / 403 通常是 key 写错或额度用完，429 是站点在限流 —— 后者换一个站就好，别反复重试。",
    "key 不要写进仓库，也不要写进会被提交的配置文件。用环境变量，或者站点支持的话用系统钥匙串。",
  ],
};

/* 常驻风险说明。build.mjs 会把这份内容同时写进页面和 llms.txt。
   不用弹窗打断阅读，也不把重要限制藏在悬停层里。 */
export const RISKS = {
  title: "使用前，先划清边界",
  lead: "收录只代表某个时间点实测能用，不构成任何形式的担保或推荐承诺。",
  items: [
    {
      head: "额度、倍率、邀请规则随时会变",
      body: "站点也可能限流、跑路或直接关停。卡片上标了实测日期，超过三个月请以站点自己的公告为准。",
    },
    {
      head: "公益站能看到你发过去的全部请求内容",
      body: "涉密代码、生产环境凭据、客户数据不要经第三方中转，这跟用哪一家无关。",
    },
    {
      head: "公益站按「随时可能停」来规划",
      body: "别把它当主力，更别让它成为唯一的路。",
    },
    {
      head: "无法保证上游来源与模型一致性",
      body: "本站未持续审计上游渠道、模型路由或响应质量。模型名称与渠道声明不等于独立验证，不提供「绝不掺水」保证。",
    },
  ],
};

/* ---------------------------------------------------------------------------
   常见问题。这一块同时干三件事：给读者答疑、把可索引正文从几百字撑到两千字
   出头、以及生成 FAQPage 结构化数据（搜索结果的问答富摘要和 AI 引用都吃这个
   格式）。答案要给得出具体信息，别写成关键词堆砌 —— 堆关键词现在只会掉权重。
--------------------------------------------------------------------------- */

export const FAQ = [
  {
    q: "这么多公益站，到底该挑哪个？",
    a: "先排除用不了的：要接 Codex 就别选标了「仅 Claude Code」的站；有的站要求 GitHub 老账号，账号不满足就跳过。剩下的按等效可用量（注册赠额 ÷ 倍率）挑，页面顶部的清单已经按它排好序——0.65x 送 $70 约等于 1x 下的 $107.7。这个折算只在各站计费基准一致时成立，不是实际 token 数。",
  },
  {
    q: "AI 公益站是什么？和官方 API 有什么区别？",
    a: "公益站是第三方搭的 API 中转服务，把 Claude、GPT 这类模型的接口转出来给人用，通常注册就送一笔额度。区别在于它不是官方渠道：额度由站方发放，倍率、赠额和邀请规则由站方定，站点也可能随时改规则、限流或关停。好处是有免费额度、不需要国外支付方式。",
  },
  {
    q: "倍率是什么意思？0.65x 和 1x 差在哪？",
    a: "倍率是站点标示的计费系数，基准价格需向站点核对。只有模型、基准单价、输入输出与缓存计费口径一致时，1x 与 0.65x 才能直接比较；在这些前提下，0.65x 按基准价的 65% 扣额度。等效可用量只作额度参考，不保证实际 token 数。",
  },
  {
    q: "注册即得的额度能用多久？",
    a: "取决于你的用量，没法给准数。额度是按 token 计费扣的，用 Claude Code 跑长上下文的活消耗很快，几十美元的赠额可能几天就见底。清单里几家有每日签到能补一点，具体数额写在各张卡片的「使用提示」里。",
  },
  {
    q: "这些公益站能用在 Claude Code 或 Codex 里吗？怎么配？",
    a: "可以，它们提供的是兼容接口。Claude Code 设两个环境变量就行：ANTHROPIC_BASE_URL 指到站点地址，ANTHROPIC_AUTH_TOKEN 填站点给的 key。Codex 要在 ~/.codex/config.toml 里加一个自定义 provider，用 base_url 和 env_key 两个字段。页面上「配置方法」那一节有可以直接抄的最小配置和几个常见坑。标了「只支持 Claude Code」的站点不要拿去接 Codex。",
  },
  {
    q: "用公益站安全吗？可以拿来跑公司代码吗？",
    a: "公益站能看到你发过去的全部请求内容。涉密代码、生产环境凭据、客户数据不要经第三方中转，这跟用哪一家无关。个人项目、开源代码、写 demo 这类无所谓。",
  },
  {
    q: "站点突然用不了了怎么办？",
    a: "按「随时可能停」来规划，别把某一家当唯一的路，手上多备一两个入口。充值、封号、限流这类站点自身的问题只能找站点的支持渠道，本页只做信息汇总。每张卡片都标了实测日期，超过三个月页面会自己挂出提示。",
  },
  {
    q: "注册完了，为什么后台余额是 0 / 看不到赠额？",
    a: "多数公益站的额度是在登录那一刻结算的，注册完立刻看常常是 $0。先退出登录再重新登录一次，赠额一般就到账了；有的站还要在控制台手动点一次「领取」或「签到」额度才生效。刷新几次仍是 0，再去站点的公告或支持渠道确认，别急着重复注册。",
  },
  {
    q: "Claude Code / Codex 报 401 Unauthorized 怎么排查？",
    a: "401 是鉴权没过，跟地址填没填对是两回事——地址错通常报 404。按这个顺序查：① key 有没有复制全（末尾少一位就会 401）；② 赠额是不是已经用完；③ 用的模型名在这个站点的可用清单里吗，不在也可能被拒；④ 少数站认的是 x-api-key 而不是 Bearer，换一种试。403 同理，多半是额度或权限；429 则是限流，不是 key 的问题，换个站或等一会儿。",
  },
  {
    q: "请求返回 400 / content blocked 是怎么回事？",
    a: "这不是你配置错了，是站点上游做了内容或语言风控。常见于提示词里混入了它不放行的语言，或触发了上游的敏感内容拦截。换一种表达、把语言统一成中文或英文再试；反复触发就说明这个站的上游管得严，换一个站更省事。",
  },
  {
    q: "用过公益站之后，怎么切回官方 Claude 订阅？",
    a: "Claude Code 里环境变量的优先级高于订阅登录，所以只要设了 ANTHROPIC_BASE_URL，它就一直走公益站。想切回官方就把这几个变量取消掉：unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL，然后重开一个终端。如果是写进了 shell 配置或 ~/.claude/settings.json 的 env 块，要去那里删掉对应行，光在当前终端 unset 下次开机又会回来。",
  },
  {
    q: "国内不挂梯子能用这些公益站吗？",
    a: "看具体站点。有的站自带国内可直连的镜像域名，有的必须科学上网，卡片的「须知」里标了「需要科学上网」的就是后者。镜像地址各站不一样、也经常换，本页不写死——以站点自己的公告为准，填错镜像地址反而会扣费或连不上。",
  },
];

/* ---------------------------------------------------------------------------
   跑路保底：官方 / 大厂自己的免费层。
   公益站随时可能改规则或关站，这一节给的是模型厂商或云厂商官方的免费额度——
   注册即用、长期有效、请求不经第三方中转。和风险提示里「别把公益站当唯一入口」
   是一条线：真断供了，这些是能立刻顶上的保底。
   刻意不写死额度数字（会过期），只给一句定位 + 官方链接，具体以官方为准。
--------------------------------------------------------------------------- */
export const OFFICIAL_FREE = {
  title: "备用入口：官方与平台免费层",
  lead: "公益站之外，也可以查看模型厂商或平台的免费层。它们并不都提供相同模型，也不都由模型厂商直接运营（例如 OpenRouter 是聚合平台）。可用地区、数据政策、额度和限流规则请逐项核对，不保证长期免费或随时可用。",
  items: [
    { name: "Google AI Studio", note: "Gemini 系列，免费额度大、上下文长，提供 OpenAI 兼容端点。", url: "https://aistudio.google.com/" },
    { name: "Groq", note: "推理速度极快的免费层，OpenAI 兼容，适合要低延迟的场景。", url: "https://console.groq.com/" },
    { name: "OpenRouter", note: "聚合多家模型，有一批标 :free 的免费模型，一个 key 全用。", url: "https://openrouter.ai/" },
    { name: "Cloudflare Workers AI", note: "每天有免费额度，跑在边缘节点，适合接进自己的应用。", url: "https://developers.cloudflare.com/workers-ai/" },
    { name: "ModelScope 魔搭（阿里）", note: "国内直连、免梯子，每日有免费调用额度，模型偏国产。", url: "https://modelscope.cn/" },
    { name: "智谱开放平台（GLM）", note: "GLM 系列有免费模型，国内直连，中文场景强。", url: "https://open.bigmodel.cn/" },
  ],
  source: "更全的官方免费额度目录（含数十家 provider）见 itsfree.ai。",
  sourceUrl: "https://itsfree.ai/",
};

/* ---------------------------------------------------------------------------
   独立教程页（guide.html）的内容。build.mjs 会用它单独生成一页，复用主页的
   全部样式。这一页专门吃「Claude Code / Codex 中转站怎么配」这类高检索意图的
   长尾词，逐步走一遍，比主页的「配置方法」更详细，并从两头互相内链。
   易过期的具体数字仍不写死，配置字段名是各工具文档里的稳定写法。
--------------------------------------------------------------------------- */
export const GUIDE = {
  slug: "guide.html",
  title: "Claude Code / Codex 中转站配置教程 — 从拿 key 到跑通（附避坑）",
  description:
    "手把手教你用 AI 公益站 / 中转站的 key 配置 Claude Code 和 Codex：环境变量、settings.json、config.toml 的最小可用配置，以及 401/404、base_url 要不要加 /v1、content blocked、怎么切回官方订阅这些常见报错怎么排查。",
  keywords: [
    "Claude Code 中转站配置",
    "Claude Code 公益站教程",
    "Codex 中转站配置",
    "Claude Code 环境变量",
    "ANTHROPIC_BASE_URL",
    "Claude Code 401",
    "Codex config.toml",
  ],
  intro:
    "这一页把「拿到公益站的 key 之后怎么接进 Claude Code 和 Codex」从头走一遍，包含最小可用配置和几个真会遇到的报错。还没有 key 的，先去" +
    "首页的清单挑一个站注册——那边按等效可用量排好序、每条标了实测日期。",
  eyebrow: "配置教程",
  breadcrumb: "配置教程",
  outro:
    '配好了就回<a href="./#stations">首页清单</a>挑个站开跑；拿不准挑哪个，首页顶部的<a href="./#pick">清单</a>已按等效可用量排好序。公益站随时可能变，别把某一家当唯一入口。',
  sections: [
    {
      h: "一、公益站是什么？先把风险讲清楚",
      body: [
        "公益站（也叫中转站）是第三方搭的 API 中转服务，把 Claude、GPT 这类模型的接口转出来给人用，注册通常送一笔额度，好处是有免费额度、不需要国外支付方式。区别在于它不是官方渠道：额度、倍率、邀请规则都由站方定，站点也可能随时改规则、限流甚至关停。",
        "配之前先记住一条：公益站能看到你发过去的全部请求内容。个人项目、开源代码、写 demo 无所谓；涉密代码、生产环境凭据、客户数据不要经任何第三方中转，这跟用哪一家无关。也别把某一家当唯一入口，手上多备一两个。",
      ],
    },
    {
      h: "二、先拿到一个站点的 key",
      body: [
        "去首页清单挑一个站，用它支持的方式（多为 GitHub 或邮箱）注册登录，在后台「令牌 / API Keys」里新建一个 key。清单按等效可用量（赠额÷倍率）排好了序，每条标了实测日期。",
        "登录后余额显示 0 是常事——多数站在登录那一刻才结算额度，退出重登一次一般就到账。同时记下这个站的「接口地址（Base URL）」，配置时要用。",
      ],
    },
    {
      h: "三、配置 Claude Code",
      body: [
        "Claude Code 认两个环境变量：BASE_URL 指到站点地址，AUTH_TOKEN 填站点给的 key（以 Bearer 形式发出，多数公益站认这个而不是 x-api-key）。拉不到模型列表时再手动指定模型名。",
      ],
      code:
        'export ANTHROPIC_BASE_URL="https://<站点给的地址>"\n' +
        'export ANTHROPIC_AUTH_TOKEN="<站点给的 key>"\n' +
        'export ANTHROPIC_MODEL="claude-opus-5"   # 拉不到模型列表时手动指定\n\n' +
        "claude",
      after:
        "想固定下来，写进 shell 配置，或放进 ~/.claude/settings.json 的 env 块。别把 key 提交进仓库。",
    },
    {
      h: "四、配置 Codex",
      body: [
        "Codex 走自定义 provider：在 ~/.codex/config.toml 里声明一个 provider，key 用 env_key 指向环境变量名，不直接写进文件。",
      ],
      code:
        'model = "gpt-5.6"\n' +
        'model_provider = "relay"\n\n' +
        "[model_providers.relay]\n" +
        'name = "relay"\n' +
        'base_url = "https://<站点给的地址>/v1"\n' +
        'env_key = "RELAY_API_KEY"\n' +
        'wire_api = "chat"',
      after:
        '然后 export RELAY_API_KEY="<站点给的 key>"。wire_api 先试 chat——公益站转出来的多数只是 chat completions。标了「只支持 Claude Code」的站不要接 Codex。',
    },
    {
      h: "五、验证配好了没",
      body: [
        "配完开一个新终端（让环境变量生效），进任意项目目录跑起来，问一句「你好」。能正常回复就成了。报错就对着下一节按状态码排查——先看是 4xx 还是超时，能最快分清是配置、key、额度还是网络的问题。",
      ],
    },
    {
      h: "六、常见报错怎么排查",
      list: [
        "401 Unauthorized：鉴权没过。查 key 有没有复制全、额度是不是用完、模型名在不在这个站的可用清单里。地址错通常是 404，不是 401。",
        "base_url 要不要加 /v1：Anthropic 兼容的一般不加（Claude Code 自己会拼 /v1/messages），OpenAI 兼容的一般要加。填错表现是 404。",
        "400 / content blocked：站点上游做了语言或内容风控，换成纯中文或英文重试；反复触发就换个站。",
        "429：站点在限流，换个站或等窗口刷新，别反复重试。",
        "想切回官方订阅：环境变量优先级高于订阅登录，unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL 再重开终端。",
      ],
    },
  ],
};

/* ---------------------------------------------------------------------------
   科普/解释页（what-is-ai-relay.html）。和教程页(how-to)、首页(清单)错开意图：
   这一页吃「公益站是什么 / 中转站和官方 API 区别 / 倍率是什么 / 公益站安全吗」这类
   信息类搜索。build.mjs 用同一套 pageHTML 渲染，articleType 标成 Article。
--------------------------------------------------------------------------- */
export const EXPLAINER = {
  slug: "what-is-ai-relay.html",
  articleType: "Article",
  title: "AI 公益站是什么？和官方 API、中转站的区别，倍率与风险讲清楚",
  description:
    "一次讲清 AI 公益站（中转站）是什么、和官方 API 及镜像站有什么区别、倍率和等效可用量怎么算、免费额度能用多久、安全吗能不能跑公司代码，以及怎么判断一个公益站靠不靠谱。",
  keywords: [
    "AI 公益站是什么",
    "中转站是什么",
    "公益站和官方 API 区别",
    "倍率是什么",
    "等效可用量",
    "公益站安全吗",
    "Claude 中转站",
  ],
  intro:
    "这一页不讲怎么配（那是教程页的事），只把「AI 公益站到底是什么、值不值得用、怎么看倍率、安不安全」这些概念一次讲清楚。想直接上手的，去首页清单挑站、去教程页照着配。",
  eyebrow: "科普",
  breadcrumb: "公益站是什么",
  outro:
    '概念清楚了，就去<a href="./#stations">首页清单</a>按等效可用量挑一个，照<a href="guide.html">配置教程</a>接进 Claude Code 或 Codex。记住：公益站是省钱的备用渠道，不是主力。',
  sections: [
    {
      h: "AI 公益站 / 中转站是什么？",
      body: [
        "AI 公益站（也叫中转站）是第三方搭的 API 中转服务：它在中间接住你的请求，转发给 Claude、GPT 这类模型的接口，再把结果传回来。因为夹在中间，所以能做到官方做不到的两件事——注册就送一笔免费额度、不需要国外的手机号和支付方式。",
        "代价是它不是官方渠道：额度由站方发放，能用哪些模型、扣多少、送多少、邀请怎么算，全由站方定，也随时可能改。「公益」多是站长自掏腰包或用各种渠道的额度补贴，撑不撑得住看站长，跑路很常见。",
      ],
    },
    {
      h: "和官方 API、镜像站有什么区别？",
      body: [
        "官方 API 是模型厂商自己的接口，稳定、按官方价付费、要国外支付方式。镜像站通常只是把官方接口换个域名做反代，解决的是「连不上」，计费和额度还是官方那套。公益站则是自己发额度、自己定倍率的一层中转——省钱和免注册门槛靠的就是它，稳定性和长期性也牺牲在这里。",
      ],
    },
    {
      h: "倍率是什么？等效可用量怎么算？",
      body: [
        "倍率是站点标示的计费系数，基准价格需要向站点核对。只有模型、基准单价、输入输出与缓存计费口径一致，1x 与 0.65x 才能直接比较。在这些前提下，0.65x 按基准价的 65% 扣额度。",
        "等效可用量 = 注册赠额 ÷ 倍率。举例：送 $70、0.65x 的站，等效约 $107.7 的 1x 基准额度。这只是基准价格可比时的额度折算，不是实际 token 数、可提现金额或耐用程度保证。首页顶部的清单按这个参考值排序，注册条件与工具兼容性应优先核对。",
      ],
    },
    {
      h: "免费额度能用多久？安全吗？能跑公司代码吗？",
      body: [
        "能用多久取决于用量：额度按 token 计费扣，用 Claude Code 跑长上下文消耗很快，几十美元可能几天就见底；有每日签到的站能小幅续命。",
        "安全上记住一条：公益站能看到你发过去的全部请求内容。个人项目、开源代码、写 demo 无所谓；涉密代码、生产环境凭据、客户数据不要经任何第三方中转，这跟用哪一家无关。",
      ],
    },
    {
      h: "怎么判断一个公益站靠不靠谱？",
      list: [
        "有没有明确的注册/额度规则，还是全靠群里口口相传——规则含糊的谨慎。",
        "倍率和模型是否公开可查，别信「无限额度」这种话术。",
        "社区口碑：高峰期是不是频繁 429、有没有跑路记录（Linux.do 这类社区能搜到）。",
        "别把某一家当唯一入口，手上多备一两个，切换成本几乎为零。",
        "看实测日期：信息超过三个月大概率已经变了，以站点当前公告为准。",
      ],
    },
  ],
};

