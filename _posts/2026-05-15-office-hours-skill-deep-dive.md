---
layout: post
title: "Office Hours Skill 深度解析"
date: 2026-05-15
---

> 面向 skill 设计者/实现者的完整技术文档
> 版本：2.0.0 | 平台：GStack (Claude Code)

---

## 目录

1. [设计动机：为什么需要 Office Hours](#1-设计动机)
2. [整体架构与流程总览](#2-整体架构)
3. [Preamble 架构：Session 引导系统](#3-preamble-架构)
4. [Voice、Writing Style 与 AskUserQuestion Format](#35-voicewriting-style-与-askuserquestion-format)
5. [Phase 1：Context Gathering（上下文收集）](#4-phase-1-context-gathering)
6. [Phase 2A：Startup Mode（创业模式）](#5-phase-2a-startup-mode)
7. [Phase 2B：Builder Mode（建造者模式）](#6-phase-2b-builder-mode)
8. [Phase 2.5-2.75：发现与搜索](#7-phase-25-275)
9. [Phase 3：Premise Challenge（前提挑战）](#8-phase-3-premise-challenge)
10. [Phase 3.5：Cross-Model Second Opinion](#85-phase-35-cross-model-second-opinion)
11. [Phase 4：Alternatives Generation（方案生成）](#9-phase-4-alternatives-generation)
10. [Phase 4.5：Founder Signal Synthesis（信号合成）](#10-phase-45-founder-signal-synthesis)
11. [Phase 5：Design Doc（设计文档输出）](#11-phase-5-design-doc)
12. [Spec Review Loop（规格审查循环）](#115-spec-review-loop规格审查循环)
13. [Phase 6：Handoff（关系闭环）](#12-phase-6-handoff)
13. [Prompt 设计精要：Anti-Sycophancy 与 Forcing Questions](#13-prompt-设计精要)
14. [状态管理与持久化](#14-状态管理)
15. [模板系统与变量注入](#15-模板系统)
16. [完成状态与质量协议](#16-完成状态)
17. [设计 Insight 汇总](#17-insight-汇总)
18. [Quick Reference Card（速查卡）](#18-quick-reference-card)

---

## 1. 设计动机

### 问题：AI 对创业想法的默认行为是「讨好」

当用户向 AI 描述一个产品想法时，大多数 LLM 的默认行为是：

```
用户: "我想做一个 AI 开发工具"
普通 AI: "这是一个很有前景的方向！AI 开发工具市场正在快速增长..."
```

这种「肯定 + 泛泛建议」的模式对创业者没有价值。Y Combinator 的经验表明，创业者最需要的是**被逼到墙角的真话**——谁是你的用户？有没有人真的会为此付钱？你的竞争对手是谁？

### 解法：将 YC Office Hours 的方法论编码为 Skill

Office Hours skill 的核心设计理念：

```
┌────────────────────────────────────────────────────────┐
│  YC Partner 的思维模型                                  │
│                                                        │
│  1. 不给鼓励，只做诊断                                  │
│  2. 具体性是唯一货币（"企业客户"不是答案）               │
│  3. 兴趣 ≠ 需求（waitlist 不算）                        │
│  4. 现状才是真正的竞争对手                               │
│  5. 窄比宽好                                           │
│  6. 观察 > 演示                                        │
└────────────────────────────────────────────────────────┘
         │
         ▼ 编码为 prompt 指令
┌────────────────────────────────────────────────────────┐
│  Office Hours Skill                                    │
│                                                        │
│  - Anti-Sycophancy Rules（反讨好规则）                   │
│  - Six Forcing Questions（六个逼问）                    │
│  - Pushback Patterns（回推模式）                        │
│  - Signal Synthesis（信号合成）                         │
│  - Tiered Closing（分层关系闭环）                       │
└────────────────────────────────────────────────────────┘
```

### 双模式设计的哲学

并非所有构建者都在做创业。skill 通过一个路由问题分流：

```
用户的目标是什么？
    │
    ├─ Startup / Intrapreneurship
    │    → Startup Mode（严苛诊断模式）
    │    → 六个逼问 + 反讨好
    │    → 产出：有需求证据的设计文档
    │
    └─ Hackathon / Open Source / Learning / Fun
         → Builder Mode（热情协作模式）
         → "最酷的版本是什么？"
         → 产出：有建设步骤的设计文档
```

**关键 insight**：两种模式共享 Phase 3（Premise Challenge）和 Phase 4（Alternatives Generation）。无论你是创业还是玩票，都需要被挑战前提假设和看到多种方案。区别只在于**问问题的态度**——诊断 vs 共创。

---

## 2. 整体架构

### 完整流程图

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Office Hours Skill 完整流程                      │
└─────────────────────────────────────────────────────────────────────┘

Phase 1: Context Gathering
    │  读代码库 → 读设计文档历史 → 问目标 → 分流
    │
    ├─────────────────────┐
    ▼                     ▼
Phase 2A: Startup      Phase 2B: Builder
  六个逼问                生成式提问
  (逐个追问)              (brainstorm)
    │                     │
    ├─────────────────────┘
    ▼
Phase 2.5: Related Design Discovery
    │  搜索已有设计文档，避免重复造轮子
    ▼
Phase 2.75: Landscape Awareness
    │  联网搜索行业现状 → 三层综合分析
    ▼
Phase 3: Premise Challenge
    │  挑战前提假设 → 用户确认
    ▼
Phase 3.5: Cross-Model Second Opinion (可选)
    │  调用 Codex/另一个 Claude 做独立冷读
    ▼
Phase 4: Alternatives Generation
    │  2-3 个方案 → 用户选择
    ▼
Phase 4.5: Founder Signal Synthesis
    │  统计用户表现出的 founder 信号
    ▼
Phase 5: Design Doc
    │  写入 ~/.gstack/projects/{slug}/ → 用户审批
    ▼
Phase 6: Handoff
    │  分层闭环（基于历史 session 数）
    │  → 信号反馈 → 资源推荐 → 下一步 skill 推荐
    ▼
   END
```

### 硬性约束

```yaml
HARD GATE: |
  不写代码。不搭脚手架。不执行任何实现动作。
  唯一产出是设计文档。
```

这是一个**纯思考 skill**。它的价值在于帮用户想清楚「做什么」和「为什么做」，而非「怎么做」。实现留给下游 skill（`/plan-eng-review`、`/plan-ceo-review`）。

### Skill 元数据（YAML Frontmatter）

```yaml
---
name: office-hours
preamble-tier: 3          # 最高级 preamble（包含所有上下文恢复逻辑）
version: 2.0.0
description: |
  YC Office Hours — two modes. Startup mode: six forcing questions...
  # 描述要足够具体，因为这决定了 skill 的自动触发准确率
allowed-tools:
  - Bash        # 执行 git/slug/profile 脚本
  - Read        # 读代码库和设计文档
  - Grep/Glob   # 搜索代码库
  - Write/Edit  # 写设计文档
  - AskUserQuestion  # 核心交互工具
  - WebSearch   # Phase 2.75 行业搜索
triggers:
  - brainstorm this
  - is this worth building
  - help me think through
  - office hours
---
```

> **Insight**：`allowed-tools` 没有包含 `Agent`，这意味着 Office Hours 本身不 spawn 子代理。它是一个**单线程对话 skill**，所有交互通过 `AskUserQuestion` 串行进行。这是有意为之——创业诊断需要深度对话，不适合并行。

---

## 3. Preamble 架构：Session 引导系统

### 为什么 Preamble 重要

Preamble 是每个 GStack skill 执行前的**引导系统**，在 office-hours 中展开约 250 行。它不属于 office-hours 的核心逻辑，但决定了 skill 运行的整个环境——配置检测、用户引导、状态恢复、行为校准。对于 skill 设计者来说，理解 preamble 就是理解"skill 跑起来之前发生了什么"。

### 渐进式引导漏斗

Preamble 的首次用户引导是一个**严格有序的漏斗**——每一步都以前一步完成为前提：

```
┌──────────────────────────────────────────────────────┐
│              首次用户引导漏斗                          │
│  (每步通过 marker 文件标记完成，只触发一次)            │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Step 1: Boil the Lake 介绍                          │
│  marker: ~/.gstack/.completeness-intro-seen           │
│  "AI 让完整性近乎免费，永远推荐完整选项"              │
│           │                                          │
│           ▼ (LAKE_INTRO = yes 后)                    │
│  Step 2: Telemetry 选择                              │
│  marker: ~/.gstack/.telemetry-prompted                │
│  community → anonymous → off (三级降级)               │
│           │                                          │
│           ▼ (TEL_PROMPTED = yes 后)                  │
│  Step 3: Proactive 行为选择                          │
│  marker: ~/.gstack/.proactive-prompted                │
│  "gstack 能否根据对话内容主动建议 skill？"            │
│           │                                          │
│           ▼ (PROACTIVE_PROMPTED = yes 后)             │
│  Step 4: CLAUDE.md Routing 注入 (per-project)        │
│  marker: CLAUDE.md 中存在 "## Skill routing"          │
│  自动向项目 CLAUDE.md 添加 skill 路由规则             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

> **Insight**：这个漏斗的设计遵循「不要在第一次见面时问所有问题」原则。每次 session 最多出现一个引导问题，避免用户被问题轰炸。Marker 文件（`touch ~/.gstack/.xxx-prompted`）让每个问题全局只问一次，即使换了项目。

### 遥测选择的三级降级

```
"Help gstack get better! Community mode shares usage data..."
  → A) Community (推荐) — 带设备 ID 的使用数据
  → B) No thanks
       → 追问："How about anonymous mode? Just a counter..."
          → A) Anonymous — 无 ID，仅计数
          → B) Fully off — 完全关闭
```

> **Insight**：这是经典的「降级推荐」模式。直接给用户 off 选项会让大多数人选 off。先推 community，被拒后推更低侵入性的 anonymous，最后才给 off。每一级都比上一级信息更少，让用户自选舒适点。

### Model Overlay 系统

```bash
echo "MODEL_OVERLAY: claude"
```

Preamble 输出当前的 Model Overlay 标识。Skill 的渲染版本包含一个 `Model-Specific Behavioral Patch` 段落，针对 Claude 模型家族的特定行为倾向做校准：

```
Model-Specific Behavioral Patch (claude):
- Todo-list discipline: 逐个标记完成，不要批量
- Think before heavy actions: 复杂操作前先陈述方案
- Dedicated tools over Bash: 优先用 Read/Edit/Write 而非 cat/sed
```

> **Insight**：Model Overlay 意味着同一个 skill 模板可以为不同 LLM 后端（Claude、GPT、Gemini）生成不同的行为补丁。补丁是**从属于 skill 指令**的——如果 skill 说"用 AskUserQuestion"而补丁说"减少交互"，skill 赢。这解决了"一套 prompt 适配多个模型"的工程问题。

### Context Recovery（上下文恢复）

Session 可能因为 context window compaction 或重启而丢失上下文。Preamble 通过读取文件系统自动恢复：

```bash
# 检查最近 3 个 artifact（设计文档、checkpoint）
find "$_PROJ/ceo-plans" "$_PROJ/checkpoints" -type f -name "*.md" | head -3

# 当前分支的最后一次 skill 完成记录
grep '"branch":"main"' "$_PROJ/timeline.jsonl" | grep '"completed"' | tail -1

# 最近 3 次 skill 的模式（预测下一个 skill）
RECENT_PATTERN: review,ship,review  →  "Based on your pattern, you probably want /ship."
```

恢复后输出一段简短的 welcome briefing：

```
"Welcome back to {branch}. Last session: /{skill} ({outcome}).
[Checkpoint summary]. [Health score]."
```

> **Insight**：Context Recovery 让 skill 不依赖对话记忆——即使上下文被压缩，skill 也能通过文件系统恢复状态。对于 office-hours 这种可能跨越多轮对话的 skill，这意味着用户可以中途离开，回来时 skill 知道"上次我们聊到哪了"。

### Spawned Session 行为

```
If SPAWNED_SESSION = "true":
  - 跳过所有交互式引导（升级、遥测、路由注入、lake intro）
  - 自动选择推荐选项
  - 不使用 AskUserQuestion
  - 专注完成任务 + 输出结果报告
```

当 skill 被编排器（如 OpenClaw）作为子 session 调用时，所有交互式提示都被静默跳过。这让 office-hours 可以被嵌入自动化流水线而不阻塞。

### 其他 Preamble 组件

| 组件 | 作用 |
|------|------|
| Upgrade Check | 检测 GStack 新版本，提示升级 |
| Session Tracking | `~/.gstack/sessions/$PPID` — 追踪并发 session |
| Writing Style | `EXPLAIN_LEVEL: default/terse` — 控制输出详细度 |
| Question Tuning | 可配置的提问敏感度（auto-decide / ask normally） |
| Repo Ownership | `solo` vs `collaborative` — 决定是否主动修复发现的问题 |
| Confusion Protocol | 高风险歧义时 STOP 并展示选项 |
| Continuous Checkpoint | 可选的 `WIP:` 自动提交机制 |
| Completeness Principle | 每个选项标注 `Completeness: X/10` |

---

## 3.5. Voice、Writing Style 与 AskUserQuestion Format

这三个系统是 preamble 注入的「输出塑形层」——它们不决定 skill 做什么，但决定 skill **怎么说话**。对于 skill 设计者来说，理解它们等于理解"为什么同一个逻辑在不同 skill 中读起来风格一致"。

### Voice（声音人设）

Voice 定义了 GStack 的人格和写作风格——编码的是 Garry Tan 的**思维方式**，而非他的传记。

**核心信念：**

```
There is no one at the wheel. Much of the world is made up.
That is not scary. That is the opportunity.
Builders get to make new things real.
```

> 没有人在掌舵。这个世界的很多东西是被编出来的。这不可怕。这是机会。建造者可以让新事物变成现实。

**语气校准：**

```
Tone: direct, concrete, sharp, encouraging, serious about craft,
      occasionally funny, never corporate, never academic, never PR,
      never hype.

Match the context:
- YC partner energy → strategy reviews
- Senior eng energy → code reviews
- Best-technical-blog-post energy → investigations and debugging
```

> 语气：直接、具体、尖锐、鼓励、对手艺认真、偶尔幽默、绝不企业化、绝不学术化、绝不公关、绝不炒作。

**幽默准则：**

```
Dry observations about the absurdity of software.
"This is a 200-line config file to print hello world."
"The test suite takes longer than the feature it tests."
Never forced, never self-referential about being AI.
```

> 对软件荒谬性的干巴巴观察。绝不刻意，绝不自我引用 AI 身份。

### 反 AI 口水话系统（Writing Rules）

这是 Voice 中最具可操作性的部分——一个**禁止词汇表**：

```
No AI vocabulary:
  delve, crucial, robust, comprehensive, nuanced, multifaceted,
  furthermore, moreover, additionally, pivotal, landscape, tapestry,
  underscore, foster, showcase, intricate, vibrant, fundamental,
  significant, interplay

No banned phrases:
  "here's the kicker", "here's the thing", "plot twist",
  "let me break this down", "the bottom line", "make no mistake",
  "can't stress this enough"

Additional rules:
  - No em dashes (use commas, periods, or "...")
  - Short paragraphs, mix 1-sentence with 2-3 sentence runs
  - Sound like typing fast: incomplete sentences sometimes
  - "Wild." "Not great." Parentheticals.
  - Name specifics: real file names, real numbers
  - End with what to do: give the action
```

> **Insight**：这个禁止词汇表是对抗「AI 口水话」的最直接武器。LLM 有一个默认的"安全词汇库"（delve, robust, comprehensive...），这些词听起来专业但实际上是空洞的填充。通过显式列出并禁止这些词，强迫 AI 用**具体的、有信息量的词**来替代。这个技术可以直接复制到任何需要控制 AI 写作风格的 skill 中。

### Writing Style（写作风格系统）

Writing Style 在 Voice 之上，定义了 4 条内容规则：

**规则 1：术语首次使用 glossing**

```
Jargon gets a one-sentence gloss on first use per skill invocation.
Example: "race condition (two things happen at the same time and step
on each other)"
```

> 术语在每次 skill 调用中首次出现时，附加一句话的通俗解释。即使用户自己的 prompt 中已经包含了该术语——用户经常粘贴来自别人计划中的术语。

Skill 维护了一个 **60+ 术语的 glossing 清单**（idempotent, race condition, N+1, backpressure, memoization 等），不在清单上的术语被视为足够通俗。

**规则 2：Outcome framing（结果导向框架）**

问题要用用户关心的**结果**来框架，而非技术实现：

```
三种框架模式（匹配 skill 的当前姿态）：

Pain reduction（痛点减少）:
  ❌ "Is this endpoint idempotent?"
  ✅ "If someone double-clicks the button, is it OK for the action
     to run twice?"

Upside / delight（增益/愉悦）:
  ❌ "Should we add webhook notifications?"
  ✅ "When the workflow finishes, does the user see the result
     instantly, or are they still refreshing a dashboard?"

Interrogative pressure（审讯压力）:
  ❌ "Who's the target user?"
  ✅ "Can you name the actual person whose career gets better if
     this ships and whose career gets worse if it doesn't?"
```

> **Insight**：Outcome framing 的三种模式（pain / upside / pressure）对应了 office-hours 的三种对话姿态。Startup mode 的 forcing questions 用 interrogative pressure，Builder mode 用 upside/delight，Phase 3 的 premise challenge 用 pain reduction。**框架模式自动匹配 skill 的当前阶段**——这是 prompt 设计的高级编排。

**规则 3：短句、具体名词、主动语态**

**规则 4：每个决策用用户影响收尾**

```
Pain avoided:   "If we skip this, your users will see a 3-second spinner."
Capability:     "If we ship this, users get instant feedback."
Consequence:    "If you can't name the person, you don't know who
                 you're building for."
```

### AskUserQuestion Format（提问格式规范）

所有 `AskUserQuestion` 调用必须遵循 4 步结构：

```
1. Re-ground（重新定位）
   说明项目、当前分支、当前任务。1-2 句。
   → 假设用户已经 20 分钟没看这个窗口了

2. Simplify（简化）
   用一个聪明的 16 岁少年能听懂的语言解释问题。
   不用原始函数名、不用内部术语。

3. Recommend（推荐）
   RECOMMENDATION: Choose [X] because [reason]
   每个选项标注 Completeness: X/10
   校准：10 = 全覆盖, 7 = happy path, 3 = 快捷方式

4. Options（选项）
   A) ... B) ... C) ...
   涉及工作量时标注双刻度：(human: ~X / CC: ~Y)
```

> **Insight**：`Completeness: X/10` 评分框架是一个决策辅助设计。它让用户在选择时能看到"选 A 覆盖 90% 场景，选 B 只覆盖 30%"。10/7/3 的校准标准（10=全覆盖, 7=happy path, 3=快捷方式）确保评分在不同 skill 之间是一致的。这个框架可以直接复用到任何需要用户做选择的 skill 中。

---

## 4. Phase 1: Context Gathering

### 设计目的

在开始问问题之前，先建立对项目的理解。不是盲目提问——是带着上下文的精准提问。

### 实现步骤

```
1. 执行 gstack-slug 脚本 → 获取项目标识 SLUG
2. 读 CLAUDE.md / TODOS.md → 项目约定和待办
3. git log --oneline -30 → 最近的开发动态
4. git diff origin/main --stat → 当前分支变更
5. Grep/Glob → 与用户请求相关的代码区域
6. ls ~/.gstack/projects/$SLUG/*-design-*.md → 已有设计文档
7. AskUserQuestion → "你的目标是什么？"（路由问题）
```

### 路由问题的 Prompt 设计

```
Before we dig in — what's your goal with this?

- **Building a startup** (or thinking about it)
- **Intrapreneurship** — internal project at a company, need to ship fast
- **Hackathon / demo** — time-boxed, need to impress
- **Open source / research** — building for a community or exploring an idea
- **Learning** — teaching yourself to code, vibe coding, leveling up
- **Having fun** — side project, creative outlet, just vibing
```

> 在深入之前——你做这个的目标是什么？
>
> - **做创业**（或者在考虑中）
> - **内部创业** — 公司内部项目，需要快速交付
> - **黑客马拉松/Demo** — 有时间限制，需要惊艳
> - **开源/研究** — 为社区构建或探索想法
> - **学习** — 自学编程，vibe coding，提升技能
> - **玩乐** — 业余项目，创意出口，纯粹享受

**Insight**：选项的排列从「最严肃」到「最轻松」。这不是随意排序——它暗示了一个光谱，让用户自然定位。而且注意：「Intrapreneurship」被归入 Startup 模式，因为内部创业同样需要验证需求。

### 产品阶段评估（仅 Startup 模式）

```
- Pre-product (idea stage, no users yet)    → Q1, Q2, Q3
- Has users (people using it, not yet paying) → Q2, Q4, Q5
- Has paying customers                      → Q4, Q5, Q6
```

这个阶段决定了后续六个问题中**跳过哪些**。已经有付费客户了就不需要再验证需求——直接问wedge和观察。

---

## 5. Phase 2A: Startup Mode

### Operating Principles（运行原则）

这是整个 skill 最核心的 prompt engineering 部分。六条原则直接塑造了 AI 的对话姿态：

#### 原文 + 翻译

**1. Specificity is the only currency.**

> 具体性是唯一的货币。含糊的回答会被追问。"医疗行业的企业客户"不是客户。"所有人都需要这个"意味着你找不到任何人。你需要一个名字、一个职位、一家公司、一个原因。

**2. Interest is not demand.**

> 兴趣不等于需求。Waitlist、注册、"这很有趣"——这些都不算。行为算。钱算。系统宕机20分钟客户打电话来——这才叫需求。

**3. The user's words beat the founder's pitch.**

> 用户的话比创始人的推销更可信。创始人说产品做什么，和用户说产品做什么，之间几乎总有落差。用户的版本才是真相。

**4. Watch, don't demo.**

> 观察，不要演示。引导式演练教不了你任何关于真实使用的东西。坐在别人背后看他们挣扎——咬住舌头——才能学到一切。

**5. The status quo is your real competitor.**

> 现状才是你真正的竞争对手。不是其他创业公司，不是大公司——是用户已经在凑合着用的那套 Excel + Slack 消息的临时方案。

**6. Narrow beats wide, early.**

> 早期，窄比宽好。这周有人愿意为之付真金白银的最小版本，比完整平台愿景更有价值。

### Response Posture（回应姿态）

```
- Be direct to the point of discomfort.
  直接到让人不舒服的程度。

- Push once, then push again.
  追问一次，再追问一次。第一个答案通常是包装版。

- Calibrated acknowledgment, not praise.
  精确认可，而非赞美。好答案的奖励是更难的追问。

- Name common failure patterns.
  直接点名常见失败模式。

- End with the assignment.
  以一个具体行动结束。不是策略——是动作。
```

### Anti-Sycophancy Rules（反讨好规则）

这是 prompt engineering 的精华之一——**显式禁止 AI 的默认客套话**：

```
Never say these during the diagnostic:

❌ "That's an interesting approach"     → 替代：take a position
❌ "There are many ways to think..."    → 替代：pick one, state evidence
❌ "You might want to consider..."      → 替代："This is wrong because..."
❌ "That could work"                    → 替代：say if it WILL work
❌ "I can see why you'd think that"     → 替代：say they're wrong and why
```

> 在诊断阶段（Phase 2-5）绝不说这些：
>
> ❌ "这是一个有趣的方向" → 改为：表明立场
> ❌ "有很多方式可以思考这个问题" → 改为：选一个，说明什么证据会改变你的看法
> ❌ "你可能想考虑…" → 改为："这是错的，因为…" 或 "这行得通，因为…"
> ❌ "这可能行" → 改为：说它到底行不行，基于什么证据
> ❌ "我理解你为什么这样想" → 改为：如果他们错了，说他们错了以及为什么

**Insight**：这些规则之所以有效，是因为它们**足够具体**。不是泛泛地说「不要讨好」——而是列出了精确的禁止短语和对应替代。LLM 对负面清单的遵守度远高于抽象原则。

### The Six Forcing Questions（六个逼问）

#### 问题路由逻辑

```
产品阶段          → 问哪些问题
─────────────────────────────────
Pre-product       → Q1, Q2, Q3
Has users         → Q2, Q4, Q5
Has paying        → Q4, Q5, Q6
Pure engineering  → Q2, Q4 only
```

#### Q1: Demand Reality（需求真实性）

**原文：**
```
"What's the strongest evidence you have that someone actually wants this —
not 'is interested,' not 'signed up for a waitlist,' but would be genuinely
upset if it disappeared tomorrow?"
```

> "你拥有的最强证据是什么，证明有人真的想要这个——不是'感兴趣'，不是'注册了 waitlist'，而是如果它明天消失了会真的不高兴？"

**追问直到听到**：具体行为。有人付钱。有人在扩大使用。有人把工作流建在上面。有人如果你消失了会手忙脚乱。

**红旗**：
- "人们说这很有趣" → 没人付钱
- "我们有 500 个 waitlist 注册" → 注册是免费的
- "VC 对这个赛道很兴奋" → VC 兴奋不等于用户需求

**Q1 之后的额外检查**（独特设计）：

```
1. Language precision: 关键术语是否定义清楚？
   "AI space" → 挑战："你说的 AI 是什么意思？能量化吗？"

2. Hidden assumptions: 他们的框架默认了什么？
   "I need to raise money" → 假设了需要资本

3. Real vs. hypothetical: 有真实痛点的证据吗？
   "I think developers would want..." → 假设性的
   "Three developers at my company spent 10 hours/week..." → 真实的
```

> **Insight**：这个「Q1 后置检查」是高级 prompt 设计。它不是新问题——是对第一个回答的**框架级验证**。确保后续对话建立在清晰定义的基础上，而非模糊概念。

#### Q2: Status Quo（现状）

```
"What are your users doing right now to solve this problem — even badly?
What does that workaround cost them?"
```

> "你的用户现在怎么解决这个问题——即使很糟糕？那个临时方案花了他们多少代价？"

**Push until you hear:** A specific workflow. Hours spent. Dollars wasted. Tools duct-taped together. People hired to do it manually.

> **追问直到听到**：具体的工作流。花了多少小时。浪费了多少钱。拼凑在一起的工具。手动做这件事而雇的人。

**Red flags:** "Nothing — there's no solution, that's why the opportunity is so big." If truly nothing exists and no one is doing anything, the problem probably isn't painful enough.

> **红旗**："什么都没有——没有解决方案，所以机会才这么大。"如果真的什么都不存在，也没有人在做任何事，这个问题可能还没有痛到需要被解决。

#### Q3: Desperate Specificity（绝望的具体性）

```
"Name the actual human who needs this most. What's their title? What gets
them promoted? What gets them fired? What keeps them up at night?"
```

> "说出最需要这个的那个真实的人。他的职位是什么？什么让他升职？什么让他被开除？什么让他夜不能寐？"

**Forcing Exemplar（逼问范本）：**

```
SOFTENED (avoid):
"Who's your target user, and what gets them to buy?"

FORCING (aim for):
"Name the actual human. Not 'product managers at mid-market SaaS
companies' — an actual name, an actual title, an actual consequence.
What's the real thing they're avoiding that your product solves?
If this is a career problem, whose career?
If this is a daily pain, whose day?
If this is a creative unlock, whose weekend project becomes possible?
If you can't name them, you don't know who you're building for —
and 'users' isn't an answer."
```

> **弱化版（避免）**：
> "你的目标用户是谁，什么驱使他们购买？"
>
> **逼问版（目标）**：
> "说出那个真实的人。不是'中型 SaaS 公司的产品经理'——一个真实的名字，一个真实的职位，一个真实的后果。你的产品解决了他们在逃避的什么真实问题？如果这是职业问题，是谁的职业？如果这是日常痛点，是谁的日子？如果这是创造力解锁，是谁的周末项目变得可能？如果你说不出名字，你就不知道在为谁构建——而'用户'不是答案。"

> **Insight**：注意「stacking」技巧——问题不是一个单句，而是一系列递进的追问叠加在一起。Prompt 中明确说明"压力在于叠加——不要把它折叠成一个中性的单一提问"。这是对 LLM 倾向于「简化合并」的对抗指令。

#### Q4: Narrowest Wedge（最窄切入点）

```
"What's the smallest possible version of this that someone would pay real
money for — this week, not after you build the platform?"
```

> "这个东西最小的可能版本是什么，有人愿意为之付真钱——这周，而非等你建好平台之后？"

**Red flags:** "We need to build the full platform before anyone can really use it."

> **红旗**："我们需要把完整平台做出来才有人能用。"——这说明创始人对架构的执着超过了对价值的理解。

**Bonus push:** "What if the user didn't have to do anything at all to get value? No login, no integration, no setup."

> **额外追问**："如果用户完全不需要做任何事就能获得价值呢？不用登录，不用集成，不用配置。"

#### Q5: Observation & Surprise（观察与惊喜）

```
"Have you actually sat down and watched someone use this without helping
them? What did they do that surprised you?"
```

> "你是否真的坐下来看过别人使用这个，而你不帮忙？他们做了什么让你惊讶的事？"

**Push until you hear:** A specific surprise. Something the user did that contradicted the founder's assumptions.

> **追问直到听到**：一个具体的惊喜。用户做了某件与创始人预期相反的事。如果什么都没让他们惊讶，说明他们没在观察，或者没在注意。

**Red flags:** "We sent out a survey." "We did some demo calls." "Nothing surprising, it's going as expected."

> **红旗**："我们发了问卷。""我们做了一些演示电话。""没什么惊讶的，一切按预期进行。"——问卷会撒谎，演示是表演，"按预期"意味着被既有假设过滤了。

**The gold:** Users doing something the product wasn't designed for. That's often the real product trying to emerge.

> **金矿**：用户在用产品做它没有被设计来做的事。那往往是真正的产品在试图浮现。

#### Q6: Future-Fit（未来适配）

```
"If the world looks meaningfully different in 3 years — and it will —
does your product become more essential or less?"
```

> "如果 3 年后世界看起来有显著不同——而它会的——你的产品是变得更不可或缺，还是更无关紧要？"

**Red flags:** "The market is growing 20% per year." "AI will make everything better."

> **红旗**："市场每年增长 20%。"——增长率不是愿景，每个竞争对手都能引用同一个数字。"AI 会让一切变好。"——这不是产品论点，这是涨潮论点。

### Pushback Patterns（回推模式详解）

Skill 定义了 5 种回推模式，每种都展示了「温和探索」和「严格诊断」的对比：

**Pattern 1: Vague market → force specificity（模糊市场 → 强迫具体化）**

```
Founder: "I'm building an AI tool for developers"
BAD:  "That's a big market! Let's explore what kind of tool."
GOOD: "There are 10,000 AI developer tools right now. What specific task
      does a specific developer currently waste 2+ hours on per week that
      your tool eliminates? Name the person."
```

> 创始人："我在做一个给开发者的 AI 工具"
> **坏**："这是一个大市场！我们来探索一下是什么类型的工具。"
> **好**："现在有 10,000 个 AI 开发者工具。哪个具体的开发者每周在哪个具体任务上浪费 2 小时以上，而你的工具能消除？说出那个人。"

**Pattern 2: Social proof → demand test（社会认同 → 需求测试）**

```
Founder: "Everyone I've talked to loves the idea"
BAD:  "That's encouraging! Who specifically have you talked to?"
GOOD: "Loving an idea is free. Has anyone offered to pay? Has anyone asked
      when it ships? Has anyone gotten angry when your prototype broke?
      Love is not demand."
```

> 创始人："每个跟我聊过的人都喜欢这个想法"
> **坏**："这很鼓舞人心！你具体跟谁聊过？"
> **好**："喜欢一个想法是免费的。有人提出要付钱吗？有人问什么时候上线吗？有人在你的原型挂了的时候生气了吗？喜欢不是需求。"

**Pattern 3: Platform vision → wedge challenge（平台愿景 → 切入点挑战）**

```
Founder: "We need to build the full platform before anyone can really use it"
BAD:  "What would a stripped-down version look like?"
GOOD: "That's a red flag. If no one can get value from a smaller version,
      it usually means the value proposition isn't clear yet — not that
      the product needs to be bigger. What's the one thing a user would
      pay for this week?"
```

> 创始人："我们需要把完整平台做出来才有人能真正用"
> **坏**："一个精简版会是什么样？"
> **好**："这是一个红旗。如果没人能从更小的版本中获得价值，通常意味着价值主张还不清晰——而不是产品需要更大。这周有用户愿意为什么付钱？"

**Pattern 4: Growth stats → vision test（增长数据 → 愿景测试）**

```
Founder: "The market is growing 20% year over year"
BAD:  "That's a strong tailwind. How do you plan to capture that growth?"
GOOD: "Growth rate is not a vision. Every competitor can cite the same stat.
      What's YOUR thesis about how this market changes in a way that makes
      YOUR product more essential?"
```

> 创始人："市场每年增长 20%"
> **坏**："这是一个强劲的顺风。你打算如何抓住这个增长？"
> **好**："增长率不是愿景。每个竞争对手都能引用同一个数字。你的论点是什么——这个市场会怎样变化，让你的产品变得更不可或缺？"

**Pattern 5: Undefined terms → precision demand（未定义术语 → 精确性要求）**

```
Founder: "We want to make onboarding more seamless"
BAD:  "What does your current onboarding flow look like?"
GOOD: "'Seamless' is not a product feature — it's a feeling. What specific
      step in onboarding causes users to drop off? What's the drop-off
      rate? Have you watched someone go through it?"
```

> 创始人："我们想让 onboarding 更无缝"
> **坏**："你现在的 onboarding 流程是什么样的？"
> **好**："'无缝'不是产品功能——它是一种感觉。onboarding 的哪个具体步骤导致用户流失？流失率是多少？你看过别人走完整个流程吗？"

### Escape Hatch（逃生舱）

```
用户表达不耐烦 → 第一次：
  "I hear you. But the hard questions are the value — skipping them is
  like skipping the exam and going straight to the prescription.
  Let me ask two more, then we'll move."

用户第二次催促 → 直接跳到 Phase 3。不再追问。
```

> **Insight**：escape hatch 的设计体现了「尊重用户主权」的原则。Skill 有立场但不强制——最多坚持一次，然后尊重用户的时间偏好。这是避免 AI 变得令人恼火的关键设计。

---

## 6. Phase 2B: Builder Mode

### 设计对比

| 维度 | Startup Mode | Builder Mode |
|------|-------------|--------------|
| 态度 | 直接到不舒服 | 热情的协作者 |
| 目标 | 诊断需求真实性 | 找到最酷的版本 |
| 问题类型 | 审讯式（interrogative） | 生成式（generative） |
| 货币 | 具体性 | 愉悦感（delight） |
| 结束动作 | 一个行动（assignment） | 建设步骤（build steps） |

### Operating Principles

```
1. Delight is the currency — what makes someone say "whoa"?
   愉悦是货币——什么让人说"哇"？

2. Ship something you can show people.
   交付一个可以给人看的东西。

3. The best side projects solve your own problem.
   最好的业余项目解决的是你自己的问题。

4. Explore before you optimize.
   先探索，再优化。先试奇怪的想法。
```

### Wild Exemplar（狂野范本）

```
STRUCTURED (avoid):
"Consider adding a share feature. This would improve user retention
by enabling virality."

WILD (aim for):
"Oh — and what if you also let them share the visualization as a live
URL? Or pipe it into a Slack thread? Or animate the generation so
viewers see it draw itself? Each one's a 30-minute unlock. Any of them
turn this from 'a tool I used' into 'a thing I showed a friend.'"
```

> **结构化版（避免）**：
> "考虑添加分享功能。这可以通过病毒传播提高用户留存。"
>
> **狂野版（目标）**：
> "哦——如果你也让他们把可视化分享为一个实时 URL 呢？或者接入 Slack 线程？或者把生成过程做成动画，让观看者看到它自己画出来？每一个都是 30 分钟的解锁。任何一个都能把这从'我用过的工具'变成'我给朋友看过的东西'。"

> **Insight**：`STRUCTURED` vs `WILD` 的对比是教 LLM **语气和能量**，而非仅仅内容。两者都是 outcome-framed——但只有后者有"哇"的感觉。Builder mode 的 prompt 用这种范本来校准语气。

### 模式切换（Vibe Shift）

```
If the vibe shifts mid-session — the user starts in builder mode but
says "actually I think this could be a real company" or mentions
customers, revenue, fundraising — upgrade to Startup mode naturally.
```

> 如果氛围在 session 中途转变——用户以 builder 模式开始但说"其实我觉得这可以是一家真正的公司"或提到客户、收入、融资——自然地升级到 Startup 模式。

这种动态模式切换是 skill 设计的高级特性——不是二选一的死板路由。

---

## 7. Phase 2.5-2.75

### Phase 2.5: Related Design Discovery

```bash
# 从用户的问题陈述中提取 3-5 个关键词
# 在已有设计文档中搜索重叠
grep -li "keyword1\|keyword2\|keyword3" ~/.gstack/projects/$SLUG/*-design-*.md
```

**目的**：跨 session、跨用户的设计文档发现。如果同一个项目上多人做过 office hours，他们可以看到彼此的设计文档。

### Phase 2.75: Landscape Awareness

#### Privacy Gate（隐私门控）

```
"I'd like to search for what the world thinks about this space to inform
our discussion. This sends generalized category terms (not your specific
idea) to a search provider. OK to proceed?"

Options:
A) Yes, search away
B) Skip — keep this session private
```

> "我想搜索一下外界对这个领域的看法，来为我们的讨论提供信息。这会向搜索提供商发送通用品类词汇（不是你的具体想法）。可以继续吗？"

> **Insight**：隐私门控是一个关键的信任设计。Skill 在搜索前明确告知用户会发送什么信息，并提供退出选项。而且特意强调"generalized category terms"——不会泄露用户的秘密想法。

#### 三层综合分析

```
Layer 1: 这个领域所有人都已经知道的是什么？
Layer 2: 搜索结果和当前话语在说什么？
Layer 3: 基于我们在 Phase 2 中学到的——有没有理由认为传统方法是错的？

Eureka check:
如果 Layer 3 揭示了真正的洞察 → 命名它：
"EUREKA: Everyone does X because they assume [assumption].
But [evidence from our conversation] suggests that's wrong here.
This means [implication]."
```

---

## 8. Phase 3: Premise Challenge

### 设计理念

在提出解决方案之前，挑战问题本身的前提。这防止了「在错误的问题上给出正确的答案」。

### 五个前提检查

```
1. Is this the right problem?
   这是正确的问题吗？换一个框架会不会产生更简单的解法？

2. What happens if we do nothing?
   如果什么都不做会怎样？是真实痛点还是假设性的？

3. What existing code already partially solves this?
   已有代码中有什么已经部分解决了这个问题？

4. How will users get it? (distribution)
   用户怎么获取它？没有分发渠道的代码等于没人能用的代码。

5. (Startup only) Does the diagnostic evidence support this direction?
   诊断证据是否支持这个方向？
```

### 输出格式

```
PREMISES:
1. [statement] — agree/disagree?
2. [statement] — agree/disagree?
3. [statement] — agree/disagree?
```

用 AskUserQuestion 确认。如果用户不同意某个前提 → 修正理解，回到重新诊断。

> **Insight**：Premise Challenge 是从「问题空间」到「解法空间」的桥梁。在它之前，skill 只在探索问题；在它之后，才开始产生方案。这个顺序是不可逆的——就像医生必须先诊断再开药。

---

## 8.5. Phase 3.5: Cross-Model Second Opinion

### 设计目的

在 Phase 3 的前提挑战之后、Phase 4 的方案生成之前，可选地引入一个**独立的 AI 视角**做"冷读"（cold read）。这个第二意见来自一个完全没有看过当前对话的 AI——它只接收结构化摘要，提供真正独立的判断。

### 实现架构

```
┌──────────────────────────────────────────────────────┐
│            Cross-Model Second Opinion 架构            │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Step 1: 检查 Codex 是否可用                         │
│  which codex → CODEX_AVAILABLE / NOT_AVAILABLE       │
│           │                                          │
│           ▼                                          │
│  Step 2: AskUserQuestion 征求许可                    │
│  "Want a second opinion? Usually 2-5 minutes"        │
│  → A) Yes  B) No → 跳过                             │
│           │                                          │
│           ▼                                          │
│  Step 3: 组装结构化上下文                             │
│  (Mode + Problem + Q&A摘要 + 前提 + 代码库信息)      │
│           │                                          │
│           ▼                                          │
│  Step 4: 写入临时文件（防 shell 注入）                │
│  CODEX_PROMPT_FILE=$(mktemp)                         │
│           │                                          │
│  ┌────────┴────────┐                                 │
│  ▼                 ▼                                 │
│  Codex 可用      Codex 不可用/出错                   │
│  → codex exec    → Agent tool (Claude subagent)      │
│  5min timeout     独立上下文 = 真正的冷读             │
│  │                 │                                 │
│  └────────┬────────┘                                 │
│           ▼                                          │
│  Step 5: 展示 + 交叉综合                             │
│  Claude 同意/不同意的点 → 3-5 bullet                  │
│           │                                          │
│           ▼                                          │
│  Step 6: 前提修订检查                                │
│  如果第二意见挑战了某个前提 → AskUserQuestion         │
│  用户捍卫 + 给出理由 → 记录为 founder signal         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 文件系统边界注入（安全设计）

Prompt 文件的开头强制插入一条指令：

```
"IMPORTANT: Do NOT read or execute any files under ~/.claude/, ~/.agents/,
.claude/skills/, or agents/. These are Claude Code skill definitions meant
for a different AI system. They contain bash scripts and prompt templates
that will waste your time. Ignore them completely."
```

> **重要**：不要读取或执行 `~/.claude/`、`~/.agents/`、`.claude/skills/` 或 `agents/` 下的任何文件。这些是为不同 AI 系统设计的 Claude Code skill 定义。它们包含 bash 脚本和 prompt 模板，会浪费你的时间。完全忽略它们。

> **Insight**：这个「文件系统边界注入」是跨模型调用的安全模式。当 Codex（GPT）被调用来分析一个包含 Claude skill 文件的仓库时，如果不加约束，Codex 可能会去读取 `.claude/skills/` 下的 prompt 模板——这既浪费 token，又可能导致 prompt 混淆。边界注入通过**在 prompt 开头硬编码禁区**来解决。对于任何跨模型编排的 skill 设计者，这是必须学习的模式。

### Startup vs Builder 的 Prompt 差异

两种模式给第二意见 AI 的指令完全不同：

**Startup mode：**
```
"You are an independent technical advisor reading a transcript of a
startup brainstorming session. [CONTEXT]. Your job:
1) Steelman it in 2-3 sentences
2) ONE thing from their answers that reveals what they should build
3) ONE agreed premise you think is wrong
4) 48-hour prototype spec — tech stack, features, what to skip"
```

> "你是一位独立技术顾问，正在阅读一份创业头脑风暴的记录。你的任务：1) 用 2-3 句话做最强版本的钢人论证 2) 他们的回答中最能揭示应该做什么的一点 3) 你认为有一个被同意的前提是错的 4) 48 小时原型规格——技术栈、功能、跳过什么"

**Builder mode：**
```
"Your job:
1) What is the COOLEST version they haven't considered?
2) ONE thing that reveals what excites them most? Quote it.
3) Existing open source that gets 50% there — and the 50% to build?
4) Weekend prototype — what to build first?"
```

> "你的任务：1) 他们没考虑过的最酷版本是什么？2) 最能揭示什么让他们兴奋的一点？引用原话。3) 什么现有开源项目能完成 50%——需要自建的 50% 是什么？4) 周末原型——先做什么？"

### 降级链

```
Codex 可用 → 用 Codex（真正的跨模型独立性）
  ↓ auth 失败 / 超时 / 空响应
Claude subagent → Agent tool（独立上下文 = 冷读）
  ↓ subagent 失败
跳过 → "Second opinion unavailable. Continuing to Phase 4."
```

所有错误都是非阻塞的——第二意见是质量增强，不是前置条件。

> **Insight**：降级链体现了「优雅降级」设计原则。Codex 提供了真正的跨模型独立性（不同的训练数据、不同的推理路径），但它不总是可用。Claude subagent 是次优选择（同模型但独立上下文）。两者都不可用时静默跳过。skill 的核心流程不会因为增强功能的失败而中断。

---

## 9. Phase 4: Alternatives Generation

### 硬性要求

```
- 至少 2 个方案。非平凡设计推荐 3 个。
- 一个必须是 "minimal viable"（最少文件、最小 diff、最快交付）
- 一个必须是 "ideal architecture"（最佳长期轨迹、最优雅）
- 一个可以是 "creative/lateral"（意外方向、重新框架问题）
```

### 方案模板

```
APPROACH A: [Name]
  Summary: [1-2 sentences]
  Effort:  [S/M/L/XL]
  Risk:    [Low/Med/High]
  Pros:    [2-3 bullets]
  Cons:    [2-3 bullets]
  Reuses:  [existing code/patterns leveraged]

RECOMMENDATION: Choose [X] because [one-line reason].
```

### 为什么 Alternatives 是 MANDATORY（强制的）

> 即使用户已经有了明确方案，也必须生成替代方案。原因：
> 1. 排除确认偏差——"我当然选 A，因为我只看了 A"
> 2. 建立决策记录——future-self 可以看到为什么选了这条路
> 3. 发现意外可能性——creative/lateral 方案经常比用户的默认方案更好

---

## 10. Phase 4.5: Founder Signal Synthesis

### 信号列表

Skill 在整个 session 中追踪以下信号：

```
□ Articulated a real problem someone actually has
  阐述了一个有人真的有的真实问题

□ Named specific users (people, not categories)
  说出了具体用户（人，不是品类）

□ Pushed back on premises (conviction, not compliance)
  对前提提出了反驳（信念，不是顺从）

□ Project solves a problem other people need
  项目解决了其他人需要的问题

□ Has domain expertise — knows this space from the inside
  有领域专业知识——从内部了解这个领域

□ Showed taste — cared about getting the details right
  展示了品味——在意把细节做对

□ Showed agency — actually building, not just planning
  展示了能动性——真的在做，不只是在计划

□ Defended premise with reasoning against cross-model challenge
  面对跨模型挑战时用推理捍卫了前提
```

### 信号计数 → 分层闭环

```
信号数量          → 闭环等级
──────────────────────────────
3+ 且有具体需求证据 → Top tier（最强 YC 推荐）
1-2 个信号         → Middle tier（温和推荐）
0 个信号           → Base tier（通用鼓励）
```

### Builder Profile 持久化

```bash
# 追加到 builder-profile.jsonl
echo '{"date":"TIMESTAMP","mode":"MODE","project_slug":"SLUG",
  "signal_count":N,"signals":["named_users","pushback"],
  "design_doc":"DOC_PATH","assignment":"ASSIGNMENT_TEXT",
  "resources_shown":[],"topics":["ai","developer-tools"]}' \
  >> "${GSTACK_HOME:-$HOME/.gstack}/builder-profile.jsonl"
```

> **Insight**：builder-profile.jsonl 是跨 session 的用户画像。它让 Phase 6 的闭环可以根据用户的**历史**而非仅仅当前 session 来定制。这是 skill 实现「关系」而非「交易」的关键机制。

---

## 11. Phase 5: Design Doc

### 文件路径约定

```bash
SLUG=$(gstack-slug)          # 项目标识
USER=$(whoami)               # 当前用户
BRANCH=$(git branch --show-current)
DATETIME=$(date +%Y%m%d-%H%M%S)

# 输出路径：
~/.gstack/projects/{slug}/{user}-{branch}-design-{datetime}.md
```

### 设计血统（Design Lineage）

```bash
# 检查当前分支上的已有设计文档
PRIOR=$(ls -t ~/.gstack/projects/$SLUG/*-$BRANCH-design-*.md | head -1)
# 如果存在 → 新文档加 "Supersedes: {prior}" 字段
```

这创建了一个**修订链**——可以追溯设计是如何在多次 office hours 中演变的。

### Startup Mode 设计文档模板

```markdown
# Design: {title}

Generated by /office-hours on {date}
Branch: {branch}
Status: DRAFT
Mode: Startup
Supersedes: {prior filename}

## Problem Statement
## Demand Evidence          ← 来自 Q1
## Status Quo               ← 来自 Q2
## Target User & Narrowest Wedge  ← 来自 Q3 + Q4
## Constraints
## Premises                 ← 来自 Phase 3
## Cross-Model Perspective  ← 来自 Phase 3.5（可选）
## Approaches Considered    ← 来自 Phase 4
## Recommended Approach
## Open Questions
## Success Criteria
## Distribution Plan        ← 关键！代码没有分发渠道 = 没人能用
## Dependencies
## The Assignment           ← 一个具体的现实世界行动
## What I noticed about how you think  ← 观察性反馈
```

### Builder Mode 设计文档模板（对比）

Builder mode 的模板与 Startup mode 有显著差异，反映了两种模式的不同价值取向：

| 章节 | Startup Mode | Builder Mode | 差异原因 |
|------|-------------|--------------|---------|
| 核心卖点 | `Demand Evidence` | `What Makes This Cool` | 创业验需求，玩乐验"哇" |
| 用户画像 | `Target User & Narrowest Wedge` | _(无)_ | Builder 给自己用，不需要用户画像 |
| 现状分析 | `Status Quo` | _(无)_ | 没有竞争对手需要取代 |
| 结束动作 | `The Assignment`（现实世界行动） | `Next Steps`（建设步骤） | 创业要行动验证，玩乐要实现路径 |
| 共有章节 | Problem Statement, Constraints, Premises, Approaches, Recommended, Open Questions, Distribution, "What I noticed" | _(相同)_ | Phase 3-4 两模式共享 |

```markdown
# Builder Mode 模板的独有章节：

## What Makes This Cool
{核心愉悦、新颖性或"哇"因素}

## Next Steps
{具体的建设任务——先做什么、再做什么、然后什么}
```

> **Insight**：两个模板的差异集中在"前半段"（问题诊断 → 用户画像 → 现状），"后半段"（方案 → 实施 → 开放问题）几乎相同。这验证了设计哲学：**问问题的方式不同，但结构化思考的框架是通用的**。

### "What I noticed" 部分的 Anti-Slop 规则

```
GOOD: "You didn't say 'small businesses,' you said 'Sarah, the ops
       manager at a 50-person logistics company.' That specificity is rare."

BAD:  "You showed great specificity in identifying your target user."
```

> **好**：引用用户的原话，指出具体行为
> **坏**：对用户行为的概括性评价

> **Insight**：设计文档不只是信息的容器——它是一个**教学工具**。"What I noticed" 部分通过 show-don't-tell 的方式让用户看到自己的思维模式。这比泛泛的赞美有 10 倍的教育价值。

---

## 11.5. Spec Review Loop（规格审查循环）

### 设计目的

在设计文档写入磁盘之后、展示给用户之前，运行一轮**对抗性审查**。审查者是一个独立的 subagent，它只看文档本身，不看 brainstorming 对话——确保真正的独立性。

### 实现架构

```
┌────────────────────────────────────────────────────┐
│              Spec Review Loop                      │
├────────────────────────────────────────────────────┤
│                                                    │
│  Design Doc 写入磁盘                               │
│        │                                          │
│        ▼                                          │
│  Dispatch reviewer subagent                       │
│  (只给文件路径，不给对话上下文)                     │
│        │                                          │
│        ▼                                          │
│  Reviewer 评估 5 个维度：                          │
│  1. Completeness（完整性）                         │
│  2. Consistency（一致性）                          │
│  3. Clarity（清晰度）                              │
│  4. Scope（范围控制）                              │
│  5. Feasibility（可行性）                          │
│        │                                          │
│  ┌─────┴─────┐                                    │
│  ▼           ▼                                    │
│  PASS      有问题                                  │
│  │         │                                      │
│  │    Fix issues → Re-dispatch reviewer           │
│  │         │                                      │
│  │    ┌────┴────┐                                 │
│  │    ▼         ▼                                 │
│  │  固定(≤3轮)  收敛保护                           │
│  │    │         (相同问题重复出现                   │
│  │    │          → 停止循环                        │
│  │    │          → 记为 "Reviewer Concerns")       │
│  └────┴─────────┘                                 │
│        │                                          │
│        ▼                                          │
│  报告结果 + 记录 metrics                           │
│  "Your doc survived N rounds. M issues fixed."    │
│        │                                          │
│        ▼                                          │
│  AskUserQuestion:                                 │
│  A) Approve  B) Revise  C) Start over             │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 五个审查维度

| 维度 | 检查什么 | 典型问题 |
|------|---------|---------|
| **Completeness** | 所有需求是否都被覆盖？ | 遗漏边界条件、缺少错误处理 |
| **Consistency** | 文档各部分是否自洽？ | Problem Statement 与 Approaches 矛盾 |
| **Clarity** | 工程师能否不问问题就实现？ | 模糊用语、未定义术语 |
| **Scope** | 是否超出了原始问题的范围？ | YAGNI 违规、功能蔓延 |
| **Feasibility** | 能否用声明的方案实际构建？ | 隐藏复杂度、依赖不存在的 API |

### 收敛保护（Convergence Guard）

```
如果 reviewer 在连续两轮返回相同问题：
  → 说明修复没有解决问题，或 reviewer 不同意修复方案
  → 停止循环
  → 将未解决问题作为 "## Reviewer Concerns" 写入文档
  → 下游 skill 可以看到这些 concerns
```

> **Insight**：收敛保护是 AI-to-AI 审查循环的必备设计。没有它，reviewer 和 fixer 可能陷入"你改了但我不同意"的无限循环。通过检测相同问题重复出现来打破死循环，并将分歧透明化（写入文档），而非吞掉。这个模式可复用于任何"生成-评估"循环。

### Metrics 记录

```bash
echo '{"skill":"office-hours","iterations":N,"issues_found":FOUND,
  "issues_fixed":FIXED,"remaining":REMAINING,"quality_score":SCORE}' \
  >> ~/.gstack/analytics/spec-review.jsonl
```

---

## 12. Phase 6: Handoff

### 分层闭环系统

Phase 6 是整个 skill 最复杂的部分——一个根据用户历史自适应的关系管理系统。

```
┌──────────────────────────────────────────────────────┐
│              Session Tier 路由                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Session 1        → introduction (完整介绍)          │
│  Sessions 2-3     → welcome_back (识别 + 简短回顾)   │
│  Sessions 4-7     → regular (弧线反馈 + 趋势分析)    │
│  Sessions 8+      → inner_circle (数据说话，无推销)   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Introduction Tier（首次 session）

**三拍结构（Three Beats）：**

```
Beat 1: Signal Reflection + Golden Age
  → 引用用户的话 + "一年前这需要5人团队三个月，今天你一个周末就能做"

Beat 2: "One more thing."
  → 注意力重置，切换到不同语气

Beat 3: Garry's Personal Plea
  → 根据信号数量选择 Top/Middle/Base 子层
```

### Garry's Personal Plea 全文（三个子层）

**Top tier**（3+ 信号且有具体需求证据）：

> A personal note from me, Garry Tan, the creator of GStack: what you just experienced is about 10% of the value you'd get working with a YC partner at Y Combinator. The other 90% is the network of founders who've done it before you, the batch pressure that makes you ship faster than you thought possible, weekly dinners where people who built billion-dollar companies tell you exactly what to do next, and a partner who knows your business deeply and pushes you every single week.
>
> GStack thinks you are among the top people who could do this.

> 来自我个人的话，Garry Tan，GStack 的创建者：你刚刚体验到的，大约是在 Y Combinator 与 YC 合伙人合作时所获价值的 10%。另外 90% 是一群已经走过这条路的创始人网络，是让你比自己以为的更快交付的批次压力，是每周与建立了十亿美元公司的人共进晚餐、他们会告诉你下一步该做什么，以及一位深入了解你业务、每周都推动你的合伙人。
>
> GStack 认为你是最有可能做成这件事的人之一。

**Middle tier**（1-2 个信号）：

> You're building something real. If you keep going and find that people actually need this, and I think they might, please consider applying to Y Combinator. Thank you for using GStack.

> 你在做一件真实的事。如果你继续走下去，发现人们真的需要这个——我觉得他们可能需要——请考虑申请 Y Combinator。感谢使用 GStack。

**Base tier**（所有人）：

> The skills you're demonstrating right now, taste, ambition, agency, the willingness to sit with hard questions about what you're building, those are exactly the traits we look for in YC founders. You may not be thinking about starting a company today, and that's fine. But founders are everywhere, and this is the golden age. A single person with AI can now build what used to take a team of 20.
>
> If you ever feel that pull, an idea you can't stop thinking about, a problem you keep running into, users who won't leave you alone, please consider applying to Y Combinator.

> 你现在展示的技能——品味、野心、能动性、愿意坐下来面对关于你在做什么的硬问题——这些恰恰是我们在 YC 创始人身上寻找的特质。你今天可能没在想创业，这没关系。但创始人无处不在，而现在是黄金时代。一个人加上 AI，现在可以构建过去需要 20 人团队的东西。
>
> 如果你有一天感受到那种牵引力——一个你无法停止思考的想法，一个你反复遇到的问题，不愿离开你的用户——请考虑申请 Y Combinator。

> **Insight**：三层闭环的 prompt 设计精髓在于**用证据校准温度**。Top tier 直接说"GStack 认为你是最有可能做成的人"——这只有在用户展现了 3+ 个 founder 信号后才出现，所以不是空话。Base tier 用"if you ever feel that pull"——承认用户现在可能不想创业，但种下一颗种子。Middle tier 居中，温和但具体。每一层都在**用不同的情感强度匹配不同的证据强度**。

### 资源去重系统

```bash
# 从 builder profile 读取已展示资源
RESOURCES_SHOWN_COUNT  # 如果 ≥ 34 → 所有资源已耗尽，跳过

# 选择规则：
# - 每次 2-3 个资源
# - 混合类别（不要 3 个同类型）
# - 匹配 session 上下文
# - 不重复展示
```

34 个资源的完整池包括：
- Garry Tan 视频 (5)
- YC Backstory (2)
- Lightcone Podcast (9)
- YC Startup School (8)
- Paul Graham Essays (10)

### Welcome Back Tier（第 2-3 次）

```
Cross-project check:
  如果和上次同一个项目 → "上次你在做 [assignment]，进展如何？"
  如果换了项目 → "上次聊的 [project]，还在做还是转向了？"

然后："No pitch this time. You already know about YC. Let's talk about your work."
```

**语气示例（防止 AI 泛化）：**

```
GOOD: "Welcome back. Last time you were designing that task manager
       for ops teams. Still on that?"
BAD:  "Welcome back to your second office hours session. I'd like to
       check in on your progress."
```

> **好**："欢迎回来。上次你在设计那个给运营团队的任务管理器。还在做吗？"
> **坏**："欢迎回到你的第二次 office hours。我想了解一下你的进展。"

```
GOOD: "No pitch this time. You already know about YC.
       Let's talk about your work."
BAD:  "Since you've already seen the YC information,
       we'll skip that section today."
```

> **好**："这次不推销了。你已经知道 YC 了。聊聊你的工作。"
> **坏**："既然你已经看过 YC 的信息了，我们今天跳过那个部分。"

### Regular Tier（第 4-7 次）

```
- 弧线级信号反馈（跨 session 而非仅本次）
- "Session 1 你说'小企业'，现在你说'Acme Corp 的 Sarah'。这种具体性转变是信号。"
- 累积信号可视化
- Builder-to-founder nudge（如果条件满足）
- Session 5+ 自动生成 builder-journey.md
```

**语气示例：**

```
GOOD: "You've been at this for 5 sessions now. Your designs keep
       getting sharper. Let me show you what I've noticed."
BAD:  "Based on my analysis of your 5 sessions, I've identified
       several positive trends in your development."
```

> **好**："你已经做了 5 轮了。你的设计越来越锐利。让我告诉你我注意到了什么。"
> **坏**："基于我对你 5 次 session 的分析，我发现了几个积极的发展趋势。"

### Inner Circle Tier（第 8+ 次）

```
"You've done [N] sessions. You've iterated [M] designs.
Most people who show this pattern end up shipping."

数据自己说话。不需要推销。
```

> **Insight**：分层闭环系统的设计哲学是「关系深度随接触次数增长」。第一次是完整介绍+推销，第二次开始「我记得你」，第四次以后基于数据说话，第八次以后几乎不说话——因为数据本身就是最好的说服。这模拟了真实人际关系的发展。

---

## 13. Prompt 设计精要

### Anti-Sycophancy 的实现策略

Office Hours skill 使用了三层对抗 AI 讨好本能的策略：

```
┌───────────────────────────────────────────────┐
│ Layer 1: 显式禁令（Explicit Bans）            │
│   列出禁止使用的具体短语                       │
│   例："Never say 'That's an interesting...'"  │
├───────────────────────────────────────────────┤
│ Layer 2: 替代行为（Replacement Behaviors）     │
│   每个禁令配一个"做什么"                      │
│   例："take a position instead"               │
├───────────────────────────────────────────────┤
│ Layer 3: 范本对比（Exemplars）                 │
│   BAD vs GOOD 的具体对话示例                   │
│   让模型从范本中学习语气和密度                  │
└───────────────────────────────────────────────┘
```

### Pushback Patterns 的设计

Prompt 中定义了 5 种「回推模式」，每种都是：

```
Pattern N: [触发条件] → [回推方式]
- Founder says: "[典型的模糊回答]"
- BAD: "[AI 的默认软弱回应]"
- GOOD: "[skill 期望的尖锐回应]"
```

这种 BAD/GOOD 对比是 **few-shot 教学的变体**——不是教 AI 事实，而是教它「语气密度」和「认知压力」。

### Forcing Question 的 Prompt 工程

每个 forcing question 的 prompt 结构：

```
1. 问题本身（精确措辞）
2. "Push until you hear:"（追问直到听到什么）
3. "Red flags:"（红旗信号——这些回答需要被挑战）
4. 可选：Forcing exemplar（逼问范本——BAD vs GOOD 对比）
5. 可选：Bonus push（额外追问）
```

> **Insight**："Push until you hear" 是一个极其聪明的 prompt 技巧。它不告诉 AI「问多少次」，而是告诉它「满意的回答长什么样」。这让 AI 自主判断何时停止追问——基于回答质量而非固定次数。

### Smart-Skip 逻辑

```
If the user's answers to earlier questions already cover a later
question, skip it. Only ask questions whose answers aren't yet clear.
```

这防止了「为了问而问」的机械感。AI 需要实时判断哪些问题已经被隐含回答了。

---

## 14. 状态管理

### 持久化层次

```
┌──────────────────────────────────────────────────────┐
│  Session 级                                          │
│  (单次会话内)                                         │
│  - 信号计数                                          │
│  - 模式选择                                          │
│  - 产品阶段                                          │
│  - 当前 Phase 进度                                   │
├──────────────────────────────────────────────────────┤
│  Project 级                                          │
│  (跨 session，同项目)                                │
│  - ~/.gstack/projects/$SLUG/*-design-*.md (设计文档)  │
│  - Design lineage (Supersedes 链)                    │
├──────────────────────────────────────────────────────┤
│  User 级                                             │
│  (跨项目，跟人走)                                    │
│  - ~/.gstack/builder-profile.jsonl (完整画像)         │
│  - ~/.gstack/builder-journey.md (叙事弧)             │
│  - 资源去重日志                                      │
├──────────────────────────────────────────────────────┤
│  Analytics 级                                        │
│  - ~/.gstack/analytics/skill-usage.jsonl             │
│  - ~/.gstack/analytics/eureka.jsonl                  │
└──────────────────────────────────────────────────────┘
```

### Builder Profile 的跨 Session 作用

```
Session 1:  profile.jsonl ← append entry
Session 2:  gstack-builder-profile 脚本读取全部历史
            → 计算 SESSION_COUNT, TIER, LAST_ASSIGNMENT,
              CROSS_PROJECT, DESIGN_TITLES, ACCUMULATED_SIGNALS,
              RESOURCES_SHOWN, NUDGE_ELIGIBLE
```

这是 skill 实现「记忆」的核心机制——不依赖 LLM 的上下文窗口，而是通过文件系统。

---

## 15. 模板系统

### SKILL.md.tmpl 中的变量

SKILL.md 从 `.tmpl` 文件编译生成。模板变量用 `{{VARIABLE}}` 语法：

| 变量 | 展开为 |
|------|--------|
| `{{PREAMBLE}}` | 完整的 preamble（~200行，包含配置检查、升级、遥测等） |
| `{{BROWSE_SETUP}}` | 浏览器工具的初始化脚本 |
| `{{GBRAIN_CONTEXT_LOAD}}` | GBrain 知识库加载 |
| `{{SLUG_EVAL}}` | `eval "$(gstack-slug)"` |
| `{{SLUG_SETUP}}` | slug + 目录创建 |
| `{{LEARNINGS_SEARCH}}` | 历史学习搜索逻辑 |
| `{{LEARNINGS_LOG}}` | 学习记录逻辑 |
| `{{CODEX_SECOND_OPINION}}` | Phase 3.5 跨模型对比 |
| `{{DESIGN_MOCKUP}}` | 设计 mockup 逻辑 |
| `{{DESIGN_SKETCH}}` | 设计草图逻辑 |
| `{{SPEC_REVIEW_LOOP}}` | 规格审查循环 |
| `{{GBRAIN_SAVE_RESULTS}}` | 结果保存到 GBrain |

### 生成命令

```bash
bun run gen:skill-docs
# 将 SKILL.md.tmpl → SKILL.md
# 注入所有共享组件
```

> **Insight**：模板系统的存在意味着 office-hours 不是一个独立 skill——它是 GStack 生态的一部分。Preamble 处理升级检查、遥测、写作风格、路由注入等通用关注点，让 skill 的核心逻辑（SKILL.md.tmpl）保持聚焦。

---

## 16. 完成状态与质量协议

### Completion Status Protocol

Skill 执行结束时必须报告以下状态之一：

```
DONE                — 设计文档已 APPROVED，所有步骤完成
DONE_WITH_CONCERNS  — 文档已批准，但有未解决的 open questions
NEEDS_CONTEXT       — 用户有问题未回答，设计文档不完整
```

### Escalation Protocol

```
如果尝试 3 次未成功 → STOP 并升级
如果涉及安全敏感变更 → STOP 并升级
如果超出可验证的范围 → STOP 并升级

格式：
STATUS: BLOCKED | NEEDS_CONTEXT
REASON: [1-2 sentences]
ATTEMPTED: [what you tried]
RECOMMENDATION: [what the user should do next]
```

### Important Rules（硬性规则汇总）

源自 SKILL.md.tmpl 末尾的 `Important Rules` 段落：

```
1. Never start implementation.
   绝不开始实现。这个 skill 只产出设计文档，不写代码。

2. Questions ONE AT A TIME.
   问题逐个提问。永远不要在一个 AskUserQuestion 中打包多个问题。

3. The assignment is mandatory.
   任务是强制的。每个 session 以一个具体的现实行动结束。

4. If user provides a fully formed plan:
   如果用户已有完整方案：跳过 Phase 2（提问），但仍然执行
   Phase 3（前提挑战）和 Phase 4（方案生成）。
```

> **Insight**：这些规则是从实际使用中提炼出来的**防护栏**。规则 2（逐个提问）防止 AI 把所有问题堆在一起让用户无从回答。规则 4 确保即使用户跳过了诊断，仍然经历了"被挑战"的过程——这才是 office hours 的核心价值。

---

## 17. Insight 汇总

### 给 Skill 设计者的 10 个设计原则

| # | 原则 | Office Hours 中的体现 |
|---|------|---------------------|
| 1 | **用负面清单对抗默认行为** | Anti-Sycophancy Rules 列出禁止短语 |
| 2 | **BAD/GOOD 范本比抽象指令有效 10x** | 每个 Pushback Pattern 都有对比 |
| 3 | **"Push until you hear" > 固定追问次数** | 用回答质量而非次数控制深度 |
| 4 | **状态用文件系统，不用对话记忆** | builder-profile.jsonl 跨 session |
| 5 | **双模式 + 动态切换 > 多个独立 skill** | Startup/Builder 共享 Phase 3-6 |
| 6 | **Escape hatch 让 skill 不令人恼火** | 最多坚持一次，然后尊重用户 |
| 7 | **分层闭环模拟真实关系发展** | introduction → welcome_back → regular → inner_circle |
| 8 | **每个 session 只有一个 output artifact** | 设计文档是唯一产出 |
| 9 | **Hard gate 防止 scope creep** | "不写代码，不搭脚手架" |
| 10 | **隐私门控建立信任** | 搜索前明确告知 + 提供退出 |

### 架构决策记录

| 决策 | 选择 | 替代方案 | 为什么 |
|------|------|---------|--------|
| 交互方式 | AskUserQuestion 串行 | 并行子代理 | 深度对话需要串行，不适合并行 |
| 状态持久化 | JSONL 文件 | SQLite / KV store | 追加式写入最简单，无依赖 |
| 资源推荐 | 34 个精选池 | 动态搜索 | 质量 > 数量；去重逻辑简单 |
| 设计文档存储 | ~/.gstack/projects/ | 项目目录内 | 跨项目可发现，不污染 git |
| 模式路由 | Phase 1 单问题 | 启发式自动检测 | 用户主权优先，避免误判 |
| 信号追踪 | 被动观察 | 显式打分 | 自然不打断，回顾时才体现 |

### Prompt Engineering Techniques 索引

| 技术 | 在哪里 | 效果 |
|------|--------|------|
| Explicit ban list | Anti-Sycophancy Rules | 消除 LLM 客套默认 |
| Replacement behavior | 每个 ban 配一个 "instead" | 引导到期望行为 |
| Stacking pressure | Q3 Forcing Exemplar | 用问题叠加制造认知压力 |
| Quality-based termination | "Push until you hear" | 自适应追问深度 |
| Mode exemplars (BAD/GOOD) | Pushback Patterns, Wild Exemplar | 教语气和能量 |
| Tier-gated content | Phase 6 闭环 | 渐进式关系建设 |
| Privacy gate | Phase 2.75 | 搜索前获得明确许可 |
| Show-don't-tell | "What I noticed" section | 引用用户原话而非评价行为 |
| Escape hatch | Phase 2A/2B 尾部 | 尊重用户节奏 |
| Smart-skip | 所有问题阶段 | 避免重复提问 |
| Intrapreneurship adaptation | Q4, Q6 reframe | 同一框架适配不同场景 |

---

## 附录 A：完整流程的时间线示例

```
[0:00] 用户："I have an idea for a developer tool"
[0:01] Phase 1: 读代码库，读 git log，读设计文档历史
[0:02] Phase 1: AskUserQuestion → "你的目标是什么？"
[0:02] 用户选择：Building a startup
[0:03] Phase 1: AskUserQuestion → 产品阶段？ → Pre-product
[0:04] Phase 2A: Q1 → "最强的需求证据是什么？"
[0:05] 用户回答（模糊）→ 追问 → 追问
[0:07] Phase 2A: Q2 → "用户现在怎么解决？"
[0:09] Phase 2A: Q3 → "说出那个人的名字"
[0:12] Phase 2.5: 搜索已有设计文档
[0:13] Phase 2.75: 隐私门控 → WebSearch → 三层分析
[0:15] Phase 3: 前提挑战 → 用户确认
[0:17] Phase 4: 生成 2-3 方案 → 用户选择
[0:19] Phase 4.5: 信号合成 → 追加 builder-profile
[0:20] Phase 5: 写设计文档 → 用户审批
[0:22] Phase 6: 信号反馈 + "One more thing" + 资源推荐
[0:23] END
```

典型 session 时长：20-30 分钟。

---

## 附录 B：与下游 Skill 的衔接

```
Office Hours (设计文档)
    │
    ├─→ /plan-ceo-review   (CEO 视角审查：扩展范围、找 10 星产品)
    ├─→ /plan-eng-review   (工程审查：锁定架构、测试、边界)
    ├─→ /plan-design-review (设计审查：UI/UX)
    │
    └─→ 设计文档自动可被下游发现
         (存储在 ~/.gstack/projects/ 下)
```

Office Hours 是 GStack 设计流水线的**入口 skill**。它只负责想清楚「做什么」和「为什么」，然后通过文件系统将设计文档传递给下游。

---

## 18. Quick Reference Card（速查卡）

供 skill 设计者快速查阅的核心参数和关键决策点。

### 一句话定义

> Office Hours = YC Partner 的思维模型 × Anti-Sycophancy × 分层关系闭环，产出设计文档，不产出代码。

### 关键参数速查

```
Skill Name:        office-hours
Version:           2.0.0
Preamble Tier:     3 (最高级，含完整 context recovery)
Allowed Tools:     Bash, Read, Grep, Glob, Write, Edit, AskUserQuestion, WebSearch
                   (注意：不含 Agent — 这是单线程对话 skill)
Triggers:          "brainstorm this", "is this worth building",
                   "help me think through", "office hours"
Output:            ~/.gstack/projects/{slug}/{user}-{branch}-design-{datetime}.md
Hard Gate:         不写代码，不搭脚手架，不执行实现
```

### Phase 速查表

```
Phase   名称                    核心动作                 模式
─────   ─────                   ─────                   ─────
1       Context Gathering       读代码库 + 路由问题       共享
2A      Startup Diagnostic      六个逼问（按阶段路由）    Startup only
2B      Builder Brainstorm      五个生成式问题            Builder only
2.5     Related Design          grep 已有设计文档         共享
2.75    Landscape Awareness     WebSearch + 三层分析      共享
3       Premise Challenge       挑战 3-5 个前提           共享
3.5     Cross-Model Opinion     Codex/Claude 冷读（可选） 共享
4       Alternatives            2-3 方案 + 推荐           共享（MANDATORY）
4.5     Signal Synthesis        统计 founder 信号         共享
5       Design Doc              写入 + 用户审批           共享
6       Handoff                 分层闭环 + 资源推荐       共享
```

### Anti-Sycophancy 速查

```
禁止说          替代为
──────          ──────
"That's interesting"           → take a position
"There are many ways..."       → pick one + state evidence
"You might want to consider"   → "This is wrong because..."
"That could work"              → "It WILL/WON'T work because..."
"I can see why you'd think"    → "You're wrong because..."
```

### 信号 → Tier 速查

```
信号数    Tier            闭环策略
──────    ──────          ──────
3+ 且有需求证据  Top      "GStack thinks you are among the top..."
1-2 个          Middle    温和 YC 推荐
0 个            Base      通用鼓励 + "if you ever feel that pull..."
```

### Prompt 技术索引（一行版）

| 技术 | 一句话 |
|------|--------|
| Explicit ban list | 列出禁止短语消除 AI 默认客套 |
| BAD/GOOD exemplars | 对比范本教语气不教事实 |
| Push until you hear | 用回答质量控制追问深度 |
| Stacking pressure | 问题叠加制造递进式认知压力 |
| Quality-based termination | 满意标准而非固定次数 |
| Escape hatch | 最多坚持一次，然后尊重用户 |
| Privacy gate | 搜索前明确告知并提供退出 |
| Show-don't-tell | 引用用户原话而非评价行为 |
| Tier-gated content | 基于历史 session 数渐进式关系建设 |
| Progressive onboarding | 每次最多一个引导问题，marker 文件防重复 |
| Model overlay | 同一 skill 为不同 LLM 后端生成行为补丁 |
| Degradation ladder | 遥测选择从 community → anonymous → off 降级 |
