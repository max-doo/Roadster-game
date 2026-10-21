# 玩法扩展与三关改版验收

日期：2026 年 10 月 18 日。

## 当前结果

三关已增加道路事件和独立收集目标：第一关加入事故车辆与装卸坡道，第二关加入高处奖励路线与升降道闸，第三关加入真正可承载车辆的水平集装箱和升降货台。原有断桥、重力环、倒立释放和主动空中转正仍保留。

每关有三枚可选挑战星和少量气压罐。挑战星在检查点重试中保留，整关完成后累计保存；气压罐不会通过倒车反复领取。结算表现使用奖牌，与挑战星区分。旧路线的最佳成绩保留归档，既有解锁、语言与操作设置保留。

## 验证结果

| 检查 | 结果 | 覆盖范围 |
| --- | --- | --- |
| `npm test` | 50 项通过 | 33 项物理、10 项新增玩法与存档、4 项输入、3 项车辆几何与动画 |
| `npm run test:e2e` | 19 项全部通过；无跳过、无 flaky | 完整菜单、三关输入重放、桌面和手机横屏全收集、暂停、复活、翻覆恢复、键盘、多点触摸、双语、存档、音频及气流 |
| `npm run build` | 通过 | TypeScript 与生产静态构建；保留 Three.js／Rapier 分块超过 500 KB 的既有提示 |
| 生产浏览器检查 | 通过 | 正常输入达到 68 km/h；无页面错误、无失败资源请求；生产构建不暴露开发调试接口 |
| ZIP 校验 | 通过 | 归档内每个文件的 SHA-256 与 `dist/` 对应文件一致 |
| 视觉检查 | 已执行 | 查看桌面与 844×390 横屏截图；修正结算文字模糊、手机结算超高及升降平台过早起升的问题后确认 |

完整浏览器测试的汇总保存在 [browser-suite.json](../artifacts/gameplay-expansion/browser-suite.json)。生产结果保存在 [production-smoke.json](../artifacts/gameplay-expansion/production-smoke.json)。

自动重放只向游戏发送正常玩家输入，不写入车辆变换、检查点、气压或完成状态。桌面与手机横屏的全收集结果一致：

| 关卡 | 完成时间 | 挑战星 | 结算 | 剩余生命 |
| --- | --- | --- | --- | --- |
| 点火 | 25.91 秒 | 3／3 | 金牌 | 81 |
| 倒置 | 20.57 秒 | 3／3 | 金牌 | 72 |
| 天降 | 59.62 秒 | 3／3 | 金牌 | 100 |

第三关重放中有 1099 个物理帧记录到移动平台接触，实际完成横移随行、升降接驳与离开。单元测试另验证车辆在完整移动周期内保持承载、恢复下层道路后重新驶入码头，以及没有任何收集物时三关仍能完成。

输入与状态证据：[桌面全收集](../artifacts/gameplay-expansion/replays-desktop.json)、[手机横屏全收集](../artifacts/gameplay-expansion/replays-mobile.json)。这些时间属于自动反馈策略的一条路线，不能解释为真人平均用时。

## 已修正的问题

- 新增坡道附近的复活点移到固定、无遮挡的安全道路上，全部检查点均验证了无输入静止恢复。
- 障碍伤害依据实际物理接触，修正进入粗略距离框就被扣血的擦边飞越问题。
- 移动平台、碰撞、悬挂、收集物和画面共用模拟时钟；暂停时停止，复活时恢复检查点对应运动阶段。悬挂与落地计算使用相对平台的速度。
- 升降货台低处停留时间增加，避免车辆未完全驶入时被快速抬起。确认截图中车辆可以平稳随平台上升。
- 结算层取消会影响文字清晰度的入场模糊，手机横屏改为紧凑双列布局；测试同时检查整个结算面板位于视口内。
- 结算显示累计已通关的挑战星身份；普通检查点与伤害消息定时消退，避免长时间遮挡道路。
- 浏览器回归中的旧姿态按钮选择器更新为当前摇杆操作；通关重放截图写入独立目录，避免旧截图文件写入冲突。

## 截图与交付

截图均来自实际运行场景，未使用概念图替代验收：

- [桌面总览](../artifacts/gameplay-expansion/contact-desktop.png)、[手机横屏总览](../artifacts/gameplay-expansion/contact-mobile.png)。
- [事故车辆](../artifacts/gameplay-expansion/1-accident-desktop.png)、[装卸坡道](../artifacts/gameplay-expansion/1-loading-ramp-desktop.png)。
- [奖励路线](../artifacts/gameplay-expansion/2-star-route-desktop.png)、[升降道闸](../artifacts/gameplay-expansion/2-clearance-gate-desktop.png)。
- [横移集装箱](../artifacts/gameplay-expansion/3-cargo-ferry-desktop.png)、[升降货台](../artifacts/gameplay-expansion/3-cargo-lift-desktop.png)、[手机结算](../artifacts/gameplay-expansion/3-complete-mobile.png)。

生产包为 [roadster-gravity-breaker-web.zip](../artifacts/roadster-gravity-breaker-web.zip)，逐文件清单见 [release-manifest.json](../artifacts/release-manifest.json)。旧生产 ZIP 和修改前源码分别保留为 `artifacts/roadster-gravity-breaker-web-before-gameplay-expansion.zip` 与 `artifacts/before-gameplay-expansion-2026-10-18.zip`。

## 验收边界

本轮验证包含本机 Chromium 浏览器、桌面键盘、浏览器手机横屏模拟和自动多点触摸，不包含真实 iPhone／Android 设备、iOS Safari、主观听感或长时间设备运行。本轮没有重新执行历史 WebKit 与性能采样，不将旧结果描述为新增移动机关的当前验收。

本次完成驾驶、收集、路线与动态平台优化；自由搭桥、材料铺路、多人交通和车辆性能升级仍属于后续实验，不是当前游戏中已经具备的功能。
