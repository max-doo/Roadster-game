# 游戏背景音乐

本游戏使用 Alexander Ehlers（OpenGameArt 用户 tricksntraps）的 **T & T Free Cyberpunk Pack 2**。该作品页面标注 CC0 1.0 Universal，允许免费使用、修改和商业分发，无强制署名要求。游戏设置页保留作者信息。

- 作品来源：https://opengameart.org/content/t-t-free-cyberpunk-pack-2
- 授权说明：https://creativecommons.org/publicdomain/zero/1.0/
- 授权全文：`public/licenses/music-CC0-1.0.txt`
- 核实与下载日期：2026-10-18

| 场景 | 曲目 | 时长 | 发布文件 |
| --- | --- | --- | --- |
| 主菜单、关卡选择、车辆展示 | Night Club Chill | 5:02 | `night-club-chill.mp3` |
| 第一关 Ignition | Jumping Cyborg | 4:24 | `jumping-cyborg.mp3` |
| 第二关 Inversion | New Factory | 2:10 | `new-factory.mp3` |
| 第三关 Skyfall | System Overload | 3:23 | `system-overload.mp3` |

原始 OGG 与下载时的作品页面保存在 `artifacts/music-source/`。发布文件放在 `public/audio/music/`，经 FFmpeg 转码为 44.1 kHz、双声道、128 kbps MP3，并使用 loudnorm 单遍处理，目标为 -20 LUFS、-2 dBTP、LRA 9。目标响度不是各曲目输出精确相等的测量结论。原曲未剪辑，来源与文件 SHA-256 见同目录 `sources.json`。

首次用户交互后启动音频，只加载当前场景曲目。原有持续合成背景音已移除，电机、风、路面、制动、吸附、喷气和事件音效保留。切换曲目后淡入；同关重试保留播放进度。暂停、设置页、页面隐藏及静音停止音乐播放，恢复时继续原位置。失败与完成页降低音乐音量。总音量和音乐音量沿用现有设置，音效独立控制。音乐文件本地分发，不依赖运行时连接 OpenGameArt。

整首曲目通过浏览器原生循环播放。作者页面未承诺无缝循环，本次没有把曲目编辑为无缝循环，也没有验证主观听感、循环接缝或真实手机扬声器表现。

验证：`npm test` 53/53 通过，`npx playwright test tests/browser/music.spec.ts` 覆盖四场景实际加载和播放、暂停续播、重试、音量、静音、真实音频信号、曲尾循环、页面隐藏状态与释放资源。证据见 `artifacts/music/`。此项自动化证明播放链路和控制行为，不能代替人的听感评价。

生产构建及 Chromium 生产冒烟已通过，无页面错误、HTTP 错误或非预期请求失败。切歌导致的音乐媒体 net::ERR_ABORTED 单独记录为预期取消。当前 dist 包含配乐和授权文件，旧发行 ZIP 未重新打包。
