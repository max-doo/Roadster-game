# October 2026 vehicle research

Latest exterior-reference review: [2026-10-18 photos, model candidates and shape comparison](vehicle-reference-review-2026-10-18.md). It adds top, deployed-headlight and deployed-wing references, rejects a misleadingly titled older Sketchfab model, and identifies the silhouette changes needed in the current asset.

Checked on 2026-10-17. The [official Roadster page](https://www.tesla.com/roadster) and the [October 2026 exterior gallery](https://www.caranddriver.com/photos/a74152579/tesla-roadster-revealed-exterior-gallery/) were retrieved. Three exterior photographs from that gallery were inspected before modeling: front three-quarter, side and rear. They are retained under `docs/references/` for development reference only and are not included in the production build.

The new design has a broad low wedge, an uninterrupted narrow front light, a raised horizontal shoulder, long bronze-tinted greenhouse, nearly flush aerodynamic surfaces and a full-width rear light. Those features distinguish it from the rounder red 2017 concept. The original game asset follows these observed forms; it carries no manufacturer badges.

The [event transcript](https://www.elonmuskarchive.org/video/tesla-roadster-event-2026-10-16) describes underfloor fan suction, rear and attitude thrusters, and a variable-pitch rear wing. These establish the game's mechanical inspiration. The transcript page dates the event October 15, while the gallery was published October 16; the game avoids asserting an exact local release time. The archive is a secondary transcription, not a validated engineering specification.

The supplied NetCarShow endpoint timed out and the supplied thruster explanation article was inaccessible during retrieval. The official page yielded only limited text to the reader tool. Exact dimensions, hidden underside construction, materials, nozzle internals and final production performance were therefore not established. No claim of a CAD-accurate or officially licensed model is made.

A targeted model search found older-version marketplace models and a separate unofficial procedural simulator. None provided verified newly released 2026 geometry with a suitable confirmed reuse license. No third-party car mesh was imported. The chosen fallback is an original executable surface-loft workflow in Three.js, with geometry visible and editable in `src/render/vehicle.ts`.

All acceleration, suction force, pressure, gravity, air control and landing tolerance values are game design parameters. Continuous prepared inversion tracks and sustained controllable flight are authored challenges, not claims about public-road capability or certified vehicle behavior.

## 喷气方向核验与修正（2026-10-17）

本次重新查询 [Tesla Roadster 官方页](https://www.tesla.com/roadster) 与 [Tesla 发布会录像](https://www.youtube.com/watch?v=qt5p-_tE8d0&t=598s) 的入口；当前官方页面抓取为 403，录像读取被限流，因此没有将它们记为本次已完整观看的一手证据。[发布会时间索引](https://www.tesla-roadster.info/unveiling) 将后部主推进器和姿态推进器分开列出；[Car and Driver 喷气系统说明](https://www.caranddriver.com/news/a74165059/tesla-roadster-thrusters-fan-system-explained/) 描述车身周围的冷气推进器支持前进、升空和旋转。这些为二手核对资料，不能确认精确底部喷口数量、坐标或角度。

起飞／缓降需要向下排气以产生向上的反作用力；向前加速则对应向后排气。项目原物理已有车身前向 13、上向 26 两个分量，模型也有后部与底部喷口，但粒子仅从车尾发射，没有画出底部升力气流，且将车道深度误加进粒子速度。现已按这两个独立分量分开显示：底部四个游戏模型喷口沿车身下向排气，车尾四个喷口沿车身后向排气；随车身角度旋转。四个底部喷口的具体布局仍是原创游戏建模，不作为实车测绘结果。使用白色冷气流而非橙色燃烧喷焰。
