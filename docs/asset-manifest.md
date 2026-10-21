# Asset provenance

| Asset | Origin | Runtime use and limits |
|---|---|---|
| Roadster mesh and mechanical groups | Original parametric geometry in `src/render/vehicle.ts`, made for this project after inspecting the October 2026 photos | Runtime 3D asset. Original mesh authorship does not establish rights in the underlying vehicle design. No Tesla logos or badges. |
| Track, hangar, laboratory, terrain, buildings and cloud geometry | Original code in `src/render/environment.ts` | Runtime assets; no downloaded third-party mesh. |
| Accident cars, vans, trailers, moving cargo decks, clearance gate, collectible stars and pressure cans | Original procedural geometry in `src/render/roadObjects.ts` | Shared dimensions and motion with gameplay physics; no imported mesh or texture. |
| Sky, concrete surface variation, soft glazing reflection field, particle sprite and contact shadow | Original runtime shaders / generated canvas textures | No stock image or AI-generated plate; source code is the provenance. |
| UI icons and independent R / GB mark | Original small SVG paths and CSS | No manufacturer identity. |
| Motor, road contact, braking, fan, jet, ground/air wind, adhesion-loss warning, impacts, UI, milestone tones and ambient pad | Original Web Audio synthesis in `src/game/audio.ts` | No source video or recorded manufacturer audio. |
| Barlow and Barlow Condensed | `@fontsource/barlow` and `@fontsource/barlow-condensed` npm packages | SIL Open Font License; bundled font license copied to `public/licenses/`. |
| Vehicle sidewall and plate lettering | Three.js Helvetiker font data; letters extruded into geometry | MgOpen font permission notice in `public/licenses/Helvetiker-MgOpen.txt`. No photographic lettering texture. |
| Three.js / React / Vite / Rapier | npm dependencies, pinned by package-lock.json | Open-source licenses retained in dependencies and summarized in `public/licenses/THIRD-PARTY.txt`. |
| Seven vehicle reference photos | Tesla photographs hosted in the linked Car and Driver October 2026 gallery; four complementary views added in the 2026-10-18 review | Research-only `docs/references/`; sources retained beside the new images, not included in `dist/` or used as game art. The older Sketchfab candidate preview is screening evidence, not a geometry source. |
| Acceptance screenshots | Original captures of the running application in `artifacts/` | Evidence of implementation, not replacement assets or concept renders. |

This is an independent fan-made game. It does not claim Tesla endorsement or authorization. Public commercial distribution requires a separate assessment of vehicle design and trademark permissions; the project has no such license on file. No marketplace vehicle asset with an unclear license was used.


## 交通货车（2026-10-19）

`public/models/traffic/box-truck.glb` 为 Innerscene 原创厢式货车，CC0 1.0。已用于静态车障与占道事件。来源与 SHA-256 记录在同目录 source.json；精确梗车型的筛选状态见 [traffic-model-research.md](traffic-model-research.md)。

货车车漆在加载后按关卡与车次使用十种配色，原始 GLB 保留不变，灯具、玻璃和金属材质仍使用原资源。弹射电池 SUV 的细化模型为本项目原创参数化几何，来源为 `src/render/trafficSuv.ts`，未使用新的第三方网格或纹理。近景渲染证据位于 `artifacts/boost-gameplay/suv-detail.png`，它是该实际模型的原始截图。
