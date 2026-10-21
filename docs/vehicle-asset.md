# Roadster vehicle asset

The current car is an original reconstruction of the white October 2026 Roadster exterior, authored in `src/render/vehicle.ts`. Its seven photographic references and the screening of older downloadable models are recorded in [the reference review](vehicle-reference-review-2026-10-18.md). No third-party vehicle mesh or photographic texture is embedded in the game.

## Exterior construction

The hood centre, outer fenders, front bumper cheeks, slab sides, upper shoulders, rear quarter and tail are separate authored surfaces. The front fascia has a sealed dark upper band and an independent recessed lower inlet. Its painted cheeks and light strip share the hood's actual forward boundary. The undertray stops behind the inlet, avoiding the previous intersection through its floor. Wheel wells have opaque inner back walls; the tail light channel and diffuser have backing geometry.

The central windscreen/roof/backlight and the two side panes share a bronze coated-glass material but are separate skins. The side-window lower boundary is defined by its photographed height progression, while the surrounding painted shoulders and pillars use the same surface as the glazing. Roof seals, quarter-glass seams, door shut lines, handles and reflectors follow these surfaces.

Both front corners contain deployed triangular headlamps, following the [front reference with exposed lights](references/2026-refresh/front-headlights-deployed.jpg). The painted fenders have actual matching cutouts. Each lamp has a tapered dark floor, recessed return walls, a narrow gasket, seven scalloped reflector cells, separate emissive LED faces and an upper light rail beneath a clear lens. The lens is transparent and does not cast an opaque raster shadow over the emitters. The headlamps remain exposed and lit in the rest pose and GLB; there is no deployment control.

Five black Y spokes sit above sculpted silver infill panels in each wheel. The rim has multiple machined lips, a dark barrel, separate rotor and caliper, drilled rotor details, hub hardware and tire tread. Sidewall lettering and the RDSTR plate are actual extruded geometry, using Three.js's Helvetiker font data under the bundled [MgOpen notice](../public/licenses/Helvetiker-MgOpen.txt). The industrial-design and brand details are reference interpretation, not manufacturer-supplied geometry.

The underside retains the game's two ducted fan assemblies, suspension structure and lift outlets. Their construction is an artistic engineering interpretation because the exterior photographs do not establish the complete underside. Main thrust and attitude outlets remain aligned with `src/render/thrusters.ts`. The upper attitude outlets and lower lift bank are concealed at rest and shown when their corresponding game effect operates.

## Coordinates and animation

Front is +X, up is +Y and width is Z. Physical gameplay tuning and contact rays are unchanged. Visual wheel centres are X ±1.55, Z ±0.94, with rest Y -0.317 and a maximum visual tire radius of 0.395. The previous oversized tire was reduced by 0.067 and the visual hub lowered by the same amount, retaining the tire's ground-contact height. During simulation the visual hub follows `clamp(-0.457 + compression * 0.20, -0.472, -0.267)`.

Wheel roll follows longitudinal velocity, suspension follows each axle's compression, and the sprung shell has restrained acceleration and contact motion. The rear wing extends above its rest position in response to speed, braking and flight; its supports follow the wing. Suction rotates the turbines and changes the status rings. Main and attitude exhaust use the game's state and rotate with the body. `reset()` restores all transforms, idle lighting and concealed-port visibility.

## Export and verification

The source rig contains **220,352 triangles and 92 mesh nodes**, including hidden outlets and wing supports. The rebuild's targeted construction guard is 240,000 triangles and 100 meshes; additional geometry supports the closer views requested for this reconstruction. Material batching retains the functional pivots. This count is not a fidelity score or a mobile-performance measurement.

`assets/roadster-2026.glb` is the exported visible rest pose: **12,598,592 bytes**, SHA-256 `682d95b90626249f8d2679cb4a64fe92bb3fb453dc54eca2f00da56d0abb6e68`. Round-trip loading with Three.js's GLTFLoader succeeds, retaining the main canopy, wing, wheels, rear bank and both headlamps. The visible GLB has 75 meshes and 214,496 triangles; the exporter omits concealed outlets and idle-hidden supports, and it does not bake the procedural game animation. The exporter normalizes three normal attributes while writing the file. The [headlamp export inspection](../artifacts/vehicle-headlights/glb-verification.json) records the retained lamp components and lens/emitter material properties.

The final `npm run build` succeeds, and `npx vitest run tests/vehicle.test.ts tests/physics.test.ts` passes all **37 tests**. The targeted asset checks cover finite geometry, construction budget, rear-face winding, visual tire contact height and width, exhaust positions, wheel/wing animation and full rest-pose restoration. The headlamp check verifies two exposed assemblies, transparent lenses, emissive cells and recessed floors; a ray through an LED face reaches the lens first rather than an uncut painted fender. The physics suite includes complete player-input mission paths. Vite retains its large-chunk advisory.

The headless render fixture reuses the runtime model, materials and GameRenderer, but substitutes an isolated floor, studio lighting and inspection cameras. It records no page script errors across whole-car and close-up views at 1800×1100. Perspective front/rear views and orthographic silhouette views aid comparison; their cameras and lighting are approximate, not photogrammetrically calibrated. These captures establish the implementation's visible appearance, not physical-device acceptance or a measured sustained frame rate.

- [Reference versus rebuilt side view](../artifacts/vehicle-rebuild/side-comparison.png)
- [Front three-quarter](../artifacts/vehicle-rebuild/front.png), [side](../artifacts/vehicle-rebuild/side.png), [rear three-quarter](../artifacts/vehicle-rebuild/rear.png) and [top](../artifacts/vehicle-rebuild/top.png)
- [Front](../artifacts/vehicle-rebuild/front-direct.png) and [rear](../artifacts/vehicle-rebuild/rear-direct.png) silhouette views
- [Wheel](../artifacts/vehicle-rebuild/wheel.png), [glazing](../artifacts/vehicle-rebuild/glazing.png) and [tail](../artifacts/vehicle-rebuild/tail.png) close-ups
- [Deployed mechanical state](../artifacts/vehicle-rebuild/deployed.png) and [render results](../artifacts/vehicle-rebuild/render-results.json)

The headlamp revision additionally records five runtime views and two views of the round-trip GLB, without page script errors. The close-up and high front view of the GLB were visually inspected as well as the runtime captures.

- [Headlamp close-up](../artifacts/vehicle-headlights/headlamp.png), [front](../artifacts/vehicle-headlights/front-direct.png) and [high front](../artifacts/vehicle-headlights/front-high.png)
- Exported GLB: [headlamp close-up](../artifacts/vehicle-headlights/glb-headlamp.png) and [high front](../artifacts/vehicle-headlights/glb-front-high.png)
- [Headlamp render results](../artifacts/vehicle-headlights/render-results.json)

Run `node artifacts/vehicle-headlights/render.mjs` while Vite serves this project on port 5182 to reproduce the current headlamp captures. The older rebuild captures above document the body before the headlamps were added; `node artifacts/vehicle-rebuild/render.mjs` reproduces those camera views with the current source. The distribution ZIP was not repackaged.

## Fidelity limits and recovery

This reconstruction has not established the user's requested near-flawless close-up fidelity. The exact compound curvature, glass coating, unphotographed headlight deployment mechanisms, underside layout and dimensions are not validated against factory CAD or a calibrated scan. The visible headlamp internals are authored from the deployed photograph rather than manufacturer optical data. The glass and paint also respond differently under the game's lighting than in Tesla's photographs. The exterior has been rebuilt and inspected at closer distances, but these limitations must not be replaced by a claim of 1:1 accuracy.

Pre-rebuild [vehicle source](../artifacts/vehicle-rebuild/vehicle-previous.ts.txt), [exhaust source](../artifacts/vehicle-rebuild/thrusters-previous.ts.txt) and [GLB](../artifacts/vehicle-rebuild/roadster-previous.glb) are preserved. Restore those three together if rolling back, so visible outlet locations and particle origins stay aligned. Earlier revision evidence remains under `artifacts/vehicle-reference-revision/`.

The immediate pre-headlamp [vehicle source](../artifacts/vehicle-headlights/vehicle-before.ts.txt) and [GLB](../artifacts/vehicle-headlights/roadster-before.glb) are also preserved. This lamp-only rollback does not require changing the exhaust source.
