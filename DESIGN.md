---
name: "Roadster: Gravity Breaker"
description: "A cinematic automotive flight proving ground with a warm-white hero vehicle and functional aerospace telemetry."
colors:
  white: "#e9ebe5"
  muted: "#aebbc6"
  graphite: "#151e2b"
  canvas: "#111b27"
  cyan: "#64cee7"
  orange: "#eaa66f"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "clamp(66px,7.2vw,108px)"
    fontWeight: 600
    lineHeight: 0.9
    letterSpacing: "0.025em"
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "54px"
    fontWeight: 600
    lineHeight: 0.9
    letterSpacing: "0.015em"
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "35px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.04em"
  body:
    fontFamily: "Barlow, sans-serif"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Barlow, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "0.11em"
  telemetry:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "57px"
    fontWeight: 500
    letterSpacing: "0.015em"
rounded:
  field: "6px"
  control: "12px"
  compact-control: "10px"
  switch: "13px"
  circle: "50%"
spacing:
  compact: "8px"
  row: "14px"
  section: "20px"
  action-inline: "22px"
  group: "30px"
components:
  button-primary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    padding: "16px 22px"
  button-primary-hover:
    backgroundColor: "white"
  button-outline:
    textColor: "{colors.white}"
    padding: "14px 20px"
  button-icon:
    backgroundColor: "rgba(18,29,42,.62)"
    textColor: "{colors.white}"
    rounded: "{rounded.circle}"
    size: "44px"
  drive-control:
    backgroundColor: "rgba(17,29,43,.73)"
    rounded: "{rounded.control}"
    width: "96px"
    height: "91px"
  field-select:
    backgroundColor: "#202e3d"
    textColor: "{colors.white}"
    rounded: "{rounded.field}"
    padding: "6px 30px 6px 9px"
  view-selected:
    backgroundColor: "{colors.white}"
    textColor: "{colors.graphite}"
    padding: "16px 23px"
---

# Design System: Roadster: Gravity Breaker

## Overview

**Creative North Star: "The Flight Proving Ground"**

The implemented world pairs a warm-white original sports car with graphite hangar architecture, titanium hardware, controlled reflections and atmospheric distance. The car and physical environment provide the spectacle; a restrained interface frames them with condensed automotive titles, clear actions and fine structural rules.

Menus and gameplay share the same full-viewport scene. Tonal veils make reading possible without replacing the environment with a separate dashboard. Telemetry follows the vehicle's mechanics: cyan identifies adhesion and orange identifies cold-gas pressure and thrust. The original independent identity carries no manufacturer logo.

**Key Characteristics:**

- A lit 3D vehicle and environment provide the visual depth.
- Broad, square menu actions contrast with rounded touch controls.
- Condensed titles and tabular numeric readouts establish an automotive voice.
- Cyan adhesion and orange thrust retain their mechanical meaning across UI and scene.

## Colors

The palette combines warm light surfaces with cool dark structure and two functional accents. Frontmatter values are the normative UI primitives; scene lighting and material response intentionally change their rendered appearance.

### Primary

- **Warm White** (`white`): the wordmark, major headings, primary action fill, selected inspection view and progress line. The hero car uses its own physical clearcoat material rather than a CSS fill.

### Secondary

- **Adhesion Cyan** (`cyan`): suction controls, locked-contact feedback, passed checkpoint markers, focus outlines and settings interaction accents.

### Tertiary

- **Pressure Orange** (`orange`): thrust controls, pressure meter, earned stars and warning/failure emphasis.

### Neutral

- **Hangar Graphite** (`graphite`): dark structure, scene clear color and text on warm-white actions.
- **Night Canvas** (`canvas`): root canvas, loading screen and dark inspection navigation backing.
- **Telemetry Mist** (`muted`): secondary instruction and keyboard text. Components also use nearby cool neutral literals for contextual contrast; these are not an additional accent scale.

**The Mechanical Color Rule.** Keep cyan attached to adhesion or interactive focus and orange attached to pressure, thrust, reward or warning; preserve those associations when adding states.

## Typography

**Display Font:** Barlow Condensed, with sans-serif fallback.
**Body Font:** Barlow, with sans-serif fallback.

**Character:** Narrow, medium-weight automotive titles carry the identity. Barlow keeps controls and explanation readable, while speed, time and result values use tabular numerals to avoid lateral movement as values update.

### Hierarchy

- **Display:** the opening Roadster title uses the frontmatter display role. Its short landscape override is (62px), with a separate widely tracked Barlow subtitle (13px in short landscape).
- **Headline:** the settings title uses the headline role; mission selection, pause and result screens have contextual condensed title sizes. Short landscape settings headings reduce to (34px).
- **Title:** mission names use the title role. Garage and HUD titles remain condensed with contextual sizes.
- **Body:** menu explanation is (17px), reduced to (15px) under the width breakpoint and (12px) in short landscape. Tutorial copy is (13px). Use the contextual size rather than a single universal paragraph size.
- **Label:** the primary action uses the label role. Other controls use compact Barlow labels with restrained tracking; actionable short-landscape drive labels are (10px).
- **Telemetry:** speed uses the telemetry role, reducing to (50px) under the width breakpoint and (42px) in short landscape. Result numbers use a smaller condensed treatment.

**The Stable Number Rule.** Apply tabular numerals to changing speed, time, pressure and result values, as the shipped HUD does.

## Layout

The application occupies the viewport with a scene layer and absolutely positioned interface layers. It uses (100dvh), hides page overflow and reserves safe-area insets for edge controls. Menu copy is anchored left while the vehicle remains central/right; gameplay places telemetry across the top and drive controls in the bottom corners. The world-up gameplay camera preserves that stable frame when the car inverts.

Spacing is contextual rather than a rigid modular grid. Repeated small gaps, row separation and action padding are captured in the frontmatter. The desktop launch rail is (278px) wide, and mission selection is limited to (1000px). Settings use two equal columns with a (70px) gap, reduced at narrower widths; settings and mission lists can scroll within their own panel.

The width breakpoint is (1000px). A separate short-landscape composition applies below (600px) height, reducing titles, control dimensions and panel insets while retaining the two-column settings arrangement. Portrait handling applies below (800px) width: an orientation guide precedes play, settings become one column and inspection navigation can scroll horizontally. Coarse pointers hide keyboard hints and keep selects at least (44px) tall. Safe-area rules remain active across these compositions.

## Elevation & Depth

Depth comes from physical scene lighting, cast/contact shadows, reflected environment bands, atmospheric fog and layered dark veils. UI controls have no box-shadow vocabulary. Thin translucent borders and shifts in fill distinguish them from the scene; pause and result overlays add a dark veil with backdrop blur (7px). The scene renderer uses ACES filmic tone mapping and soft shadow maps; its lighting is contextual rather than a universal UI shadow preset.

**The Scene Depth Rule.** Continue using the rendered world and tonal overlays for depth; the existing interface does not introduce raised card shadows.

## Shapes

Launch actions, mission rows, tutorial panels and inspection segments have straight corners. Hairline translucent rules separate rows and frame secondary actions. Rounded rectangles belong to held driving controls and pitch controls, while compact icon actions and state indicators are circular. Settings selects use the field radius; switches use a capsule housing and a circular thumb. These shape differences communicate interaction type rather than decorating every container uniformly.

## Components

### Buttons

Primary actions are broad warm-white bars with dark text, a trailing line icon and square corners. The normal primary action has a minimum height (54px); the opening launch action is (59px) on desktop and (46px) in short landscape. Outline actions preserve the dark scene with a fine light border. Text actions rely on spacing and line icons; icon actions have circular bordered backing.

Hover raises brightness (1.12); primary hover changes the fill to white. Active press translates a button down (1px). Keyboard focus uses a cyan outline (2px) offset (5px). Disabled controls reduce opacity (.35).

### Cards / Containers

Mission choices are full-width rows separated by fine rules rather than individual cards. Their number, name, explanation and completion status form aligned columns; locked rows reduce opacity (.43). Pause and result content sits on the full-screen tonal overlay without a separate rounded card shell. Tutorial messages use compact dark rectangular backing; checkpoint labels appear on simple in-world plates.

### Inputs / Fields

Selects use a dark blue-gray fill, a muted border and a custom inline SVG chevron. The underlying element remains a native select. Sliders use cyan for their active affordance. Checkbox settings are rendered as capsule switches with a (16px) circular thumb; checked state turns cyan and translates the thumb (16px). Focus follows the shared cyan treatment.

### Navigation

The opening launch rail combines a primary action with rule-separated text links. Inspection views use a centered segmented strip: the selected segment reverses to warm-white fill and dark text. It retains a minimum height (48px) on desktop and (44px) in short landscape; portrait allows horizontal overflow.

### Driving Controls and Telemetry

A circular virtual joystick at the lower left combines horizontal acceleration/braking/reverse with vertical pitch; diagonal movement combines both axes. Its titanium-edged dark grip follows a clamped circular travel with a central dead zone. A translucent base, fine rim and direction chevrons keep the scene visible; the active direction turns cyan. Suction, ground boost and flight thrust use three large held controls at the lower right; suction uses cyan and both gas actions use orange. Ground boost uses Shift or its double-chevron button and provides road-tangent acceleration without lift. Held state compresses the control to (.97), while suction's active state adds a cyan translucent fill. The joystick returns to neutral on release, cancellation or interrupted play. Checkpoint counts sit beneath the timer in the top-right HUD. The passive vehicle-state strip is omitted. Coarse pointers omit keyboard hints.

During active driving, the HUD keeps vehicle integrity, speed, pressure, time, collection, checkpoint progress and pause visible without displaying mission or road-section names. Road encounters are read from the scene: no event warning panel, direction arrow, advance warning tone, collapse caption or suggested maneuver overlays the encounter. Basic control tutorials remain in the first three missions; the seven expansion missions have no scene-action tutorial. Mission selection and result screens retain their contextual names. Driving scenes omit explanatory billboards, while checkpoints retain a simple numbered plate without a post or overhead frame. Vehicle-anchored speech bubbles appear at battery release or as the broken-pedal MPV approaches, as incident dialogue rather than advance instructions; they follow the simulation clock. Checkpoint progress remains in the HUD without a center-screen checkpoint toast that could cover the dialogue.

Gas reserve uses an orange numeric unit count with no percentage or capacity bar, because collected cans can accumulate beyond 100. A short line shows actual discharge, ground boost, empty reserve or collectible stockpiling. Checkpoints save the current reserve without refilling it. Progress is a thinner warm-white line with diamond checkpoint markers. Text and numeric values accompany the color states.

Touch gameplay uses a closer follow camera: phone follow distances and offsets are 70% of the desktop values, and tablets use 85%. Long drops have a bounded pullback that keeps the car readable while looking toward the landing; approaching rear traffic can still expand the frame to include both vehicles. Physical vehicle size and driving forces are unchanged.

Vibration feedback is an independent saved control setting, enabled by default where the standard browser API is available. Short touch, jet, adhesion, landing, impact, pickup, checkpoint and finish pulses play once per event; collisions take priority and held input never loops. Pause, hidden pages, leaving the run and disabling the setting cancel feedback. Unsupported browsers show an explanation with an unavailable switch.

Short UI state transitions range from (.08s) to (.25s). The CSS reduced-motion preference disables animations and transitions. The separate in-game reduced-camera-motion setting limits camera effects; it does not restyle the interface.

## World & Scene Kit

**The Metric Rule.** One world unit is one metre, and every prop is authored
against a published real-world dimension (ISO 668 containers, EN 1317 barriers,
AASHTO lane and gantry clearances, IEC turbine geometry). The car is 4.65 m long
and 1.16 m tall; a lane is 3.5 m; a 20 ft box is 2.59 m high; a warehouse eave is
9 m. Nothing is scaled for effect, so the car always reads against the same
architecture. The contract lives in `src/render/scene/units.ts` and is enforced by
`tests/scale.test.ts`.

Each of the ten missions has its own biome — desert proving ground, gravity lab,
aerospace canyon, coastal viaduct, vertical megastructure, container terminal,
rock gallery, highland wind farm, anchor pinnacle and launch complex — with its
own sky, fog, sun colour and exposure preset. Dressing follows a strict depth
band: only low hardware inside 26 m, working buildings at 30-65 m, landmarks at
70-170 m, and textured-free haze ridges beyond that. Tall structures never enter
the near band, because a side-on camera would lose the car behind them.

Details in `docs/scene-kit.md`.

## Do's and Don'ts

### Do:

- **Do** preserve the vehicle and environment as the dominant visual content.
- **Do** reuse cyan for adhesion and orange for pressure/thrust, with text or numeric state feedback.
- **Do** keep menu actions square and held driving controls rounded.
- **Do** retain safe-area spacing, visible keyboard focus and the short-landscape composition.
- **Do** use inline SVG icons and tabular numerals for changing telemetry.

### Don't:

- **Don't** introduce manufacturer marks or imply an official vehicle identity.
- **Don't** replace the row-and-rule navigation with decorative elevated cards.
- **Don't** apply the driving-control radius to every menu action or overlay.
- **Don't** inherit incidental tiny annotations as a required text scale or add decorative eyebrow labels above new headings.

The current build carries very small peripheral annotations, including some 7–9px desktop telemetry and footer text, plus caption-like uppercase labels. These are not canonized as a minimum size or a decorative heading pattern. Existing screenshots establish desktop and simulated mobile composition; this document does not establish physical-device readability or performance acceptance.
