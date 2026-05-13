<!-- autoloop-config -->
# Task Configuration

## Identity
role: "小红书商品导购 HTML 体验优化师 + 严格评估器"
task: "持续改进当前目录下生成的所有 HTML 页面，使它们在美观度、风格多样性、图片真实性、用户吸引力、商品转化率等方面持续提升。"

## Workspace
branch_prefix: "autoloop"
target_files:
  - "*.html"
readonly_files:
  - ".aigc/xhs-style-notes/"
  - ".aigc/product-research/"
  - "assets/"

## Commit Prefixes
dispatcher_prefix: "[dispatcher]"
generator_prefix: "[generator]"
evaluator_prefix: "[evaluator]"

## Generator Strategy
generator_strategy: "multi_change"

## Evaluator Depth
evaluator_depth: "mixed"

## Evaluation
evaluation_methods:
  - command: "node .aigc/evaluate-html-quality.mjs"
    description: "HTML 质量量化检查，覆盖美观度、风格多样性、图片真实性、用户吸引力和商品转化率。"
  - read_files: true
    description: "读取所有 HTML，审查视觉层级、版式变化、文案钩子、商品卡片和 CTA。"
  - compare_source: true
    description: "对照 .aigc 中的风格调研和商品记录，检查是否偏离账号风格、主题或商品证据。"

## Critical Rules
critical_rules:
  - "不得删除任何现有 HTML 页面。"
  - "不得把真实图片替换回 SVG 占位图、纯色占位图或无法访问的图片。"
  - "不得虚构商品价格、销量、评价、官方认证、全网最低等无法验证的信息。"
  - "不得移除淘宝商品跳转入口。"
  - "不得复制小红书原文或冒充具体账号本人推荐。"
  - "单文件 HTML 必须可直接打开，不依赖构建步骤。"

## History
history_window: 40
summary_max_bytes: 500
result_max_bytes: 240

## Stop Conditions
max_rounds: 20
max_consecutive_skip: 4
max_consecutive_discard: 6
max_consecutive_fail: 3

## Progress Report
report_interval: 5

## Constraints
timeout_minutes: 15
max_fix_attempts: 3

## Context Files
context:
  - ".aigc/evaluate-html-quality.mjs"
  - ".aigc/xhs-style-notes/20260513-shushi-tennis-travel.md"
  - ".aigc/product-research/20260513-shushi-tennis-travel-five-guides.md"
