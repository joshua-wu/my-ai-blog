---
title: "千万级大表加索引不锁表？你可能踩了Online DDL的两个坑"
date: 2026-05-12
cover: "/assets/images/big-table-index-fig_1_highway.png"
---
美团二面，面试官问："千万级大表建索引要注意什么？"

你回答了 B+Tree 结构、回表代价、最左前缀……面试官点点头，追了一句："你在生产环境做过吗？"

沉默。

这道题的考点从来不是索引原理。面试官真正想知道的是——**你有没有在凌晨三点被电话叫醒，因为一条 ALTER TABLE 把线上数据库干趴了。**

## 加索引不是一条 SQL 的事

很多人以为，给表加索引就是敲一行 DDL：

```sql
ALTER TABLE orders ADD INDEX idx_user_id (user_id);
```

表里一百条数据，这确实是一瞬间的事。但当这张表有 3000 万行、占了 20GB 磁盘空间呢？

直接执行这条语句，MySQL 需要扫描全表、排序、写入索引文件。在早期版本中，整个过程会锁表——所有写操作排队等待。3000 万行的表，锁 10 分钟很正常。**10 分钟内，你的订单系统所有写入全部超时，等于业务停摆。**

你可能会说："我用的是 MySQL 8.0，不是有 Online DDL 吗？"

没错，但这里面有两个坑，很多人踩过才知道。

## Online DDL 的两个隐藏陷阱

**陷阱一：Instant DDL 对加索引无效。**

MySQL 8.0 引入了 Instant DDL，加一列确实可以秒级完成。但加索引不在 Instant 支持的操作列表里。你依然需要走完整的 Online DDL 流程——copy 或 inplace 方式重建索引。

**陷阱二：Online DDL 并不是真的"不锁表"。**

InnoDB 的 Online DDL 在执行主体阶段确实允许 DML 并发，但在开始和结束阶段需要获取元数据锁（MDL）。如果此时有一个慢查询或者未提交的事务占着 MDL 读锁，你的 ALTER TABLE 就会卡在"Waiting for table metadata lock"。

更要命的是，后续所有访问这张表的查询都会排在 ALTER TABLE 后面等锁。一个没提交的事务 → ALTER TABLE 等锁 → 所有后续请求排队 → **连接池打满 → 服务雪崩。**

这就是为什么"给正在跑业务的大表动手术"和"给空表加索引"是完全不同的两件事。

## 高速公路加车道：gh-ost 的思路

![给高速公路加车道](/assets/images/big-table-index-fig_1_highway.png)

想象一条繁忙的高速公路需要加一条车道。你有两个选择：

**方案 A：封路施工。** 把车全拦下来，施工完再放行。这就是直接 ALTER TABLE——简单粗暴，但业务停摆。

**方案 B：旁边修一条新路，修好后瞬间切换。** 这就是 gh-ost 的影子表（ghost table）策略：

1. 创建一张和原表结构一样的影子表
2. 在影子表上加好索引
3. 后台慢慢把原表数据复制到影子表（通过 binlog 同步增量变更）
4. 数据追平后，原子性 rename 切换——旧表变 `_old`，影子表变正式表

整个过程中，原表始终正常服务读写。业务无感知。

gh-ost 相比老牌的 pt-osc 有一个关键优势：它不使用触发器，而是直接消费 binlog。这意味着对原表的性能影响更小，也不会遇到触发器的各种兼容性问题。

## 安全三步法：评估 → 演练 → 执行

![安全三步法](/assets/images/big-table-index-fig_2_three_steps.png)

### Step 1：评估（别上来就干）

```bash
# 确认表大小和行数
SELECT table_name, table_rows, data_length/1024/1024 AS data_mb,
       index_length/1024/1024 AS index_mb
FROM information_schema.tables
WHERE table_schema = 'your_db' AND table_name = 'orders';

# 检查是否有长事务（避免 MDL 锁等待）
SELECT * FROM information_schema.innodb_trx
WHERE TIME_TO_SEC(TIMEDIFF(NOW(), trx_started)) > 60;
```

评估要点：表多大、预估耗时多久、当前有没有长事务、从库延迟是多少。

### Step 2：从库演练（确认耗时和 IO 影响）

先在从库上跑一遍相同操作，记录：
- 耗时多少分钟
- 磁盘 IO 峰值多少
- 从库延迟增加了多少

如果从库跑了 40 分钟，主库大概率也需要这个量级。这个数据决定了你的执行窗口需要多长。

### Step 3：gh-ost 执行（低峰期 + 自动限速）

![gh-ost 命令模板](/assets/images/big-table-index-fig_3_ghost_command.png)

```bash
gh-ost \
  --host=127.0.0.1 \
  --port=3306 \
  --user="ghost_user" \
  --password="your_password" \
  --database="your_db" \
  --table="orders" \
  --alter="ADD INDEX idx_user_id (user_id)" \
  --max-load="Threads_running=30" \
  --critical-load="Threads_running=50" \
  --chunk-size=1000 \
  --max-lag-millis=1500 \
  --switch-to-rbr \
  --cut-over=default \
  --exact-rowcount \
  --concurrent-rowcount \
  --default-retries=120 \
  --panic-flag-file=/tmp/ghost.panic.flag \
  --postpone-cut-over-flag-file=/tmp/ghost.postpone.flag \
  --execute
```

几个关键参数说明：
- `--max-load="Threads_running=30"`：当活跃线程超过 30，自动暂停复制，等负载降下来再继续
- `--critical-load="Threads_running=50"`：超过 50 直接中止，保护生产环境
- `--max-lag-millis=1500`：从库延迟超过 1.5 秒就暂停
- `--panic-flag-file`：紧急情况创建这个文件，gh-ost 立即中止
- `--postpone-cut-over-flag-file`：创建这个文件可以推迟最终切换，等你手动确认

执行完成后，检查索引是否生效：

```bash
# 确认索引已创建
SHOW INDEX FROM orders WHERE Key_name = 'idx_user_id';

# 检查慢查询日志，对比前后
mysqldumpslow -s t /var/log/mysql/slow.log | head -20
```

## 面试怎么答？

回到开头那个面试题。最好的回答不是背原理，而是这样说：

"千万级大表建索引，我上次在生产环境是这样操作的：先评估表大小和长事务情况，然后在从库演练确认耗时，最后用 gh-ost 在凌晨低峰期执行，设了 max-load 阈值做自动限速。整个过程业务零感知。"

面试官要的就是这种答案——**不是你知道什么，而是你做过什么。**

一条 ALTER TABLE 语句谁都会写。但在 3000 万行的生产表上安全执行它，中间隔着的是工程判断力——**对风险的预判、对工具的掌控、对回滚方案的敬畏。**

这种能力没有捷径。下次有机会做线上 DDL 的时候，别怕，按这个三步法来。做完之后，你就有故事可以讲了。
