/**
 * Metric contract for the whole world.
 *
 * One world unit is one metre. Every prop in `props.ts` is authored against the
 * figures below, so a car, a lane, a container and a warehouse always read at
 * the same scale. All values are real-world referenced dimensions:
 *
 *  - ISO 668 / ISO 1496-1 freight containers (20 ft and 40 ft).
 *  - EN 1317 / NCHRP 350 roadside hardware (Jersey barrier, W-beam rail).
 *  - AASHTO Green Book lane and shoulder widths, bridge clearances.
 *  - IEC 61400-1 wind turbine classes, typical 2-3 MW onshore geometry.
 *  - Typical European/US industrial buildings, ports and launch complexes.
 *
 * The hero vehicle is authored in `vehicle.ts` from its surface stations; its
 * footprint is repeated here so tests and props can be validated against it
 * without importing three.js.
 */

export const CAR = {
  /** Nose-to-tail body length, from the authored body stations. */
  length: 4.65,
  /** Widest body station, mirrored across the centre line. */
  width: 2.13,
  /** Roof height above the road contact patch. */
  height: 1.16,
  wheelbase: 3.1,
  track: 1.88,
  /** 395 mm section radius -> 790 mm tyre diameter, a 21-inch performance fitment. */
  tyreDiameter: 0.79,
} as const;

export const ROAD = {
  /** Two 3.5 m lanes plus edge line: the shipped track width. */
  width: 7,
  laneWidth: 3.5,
  /** Dashed centre line: 3 m mark / 9 m gap is the European motorway norm. */
  laneMarkLength: 3,
  laneMarkGap: 9,
  /** Structural deck thickness, matching the physics samples. */
  deckThickness: 0.78,
  shoulder: 0.75,
  /** Minimum clearance under gantries and tunnel bores. */
  clearance: 5.5,
} as const;

export const CONTAINER = {
  /** 20 ft ISO: 6.058 x 2.438 x 2.591 m. */
  ft20: {length: 6.06, width: 2.44, height: 2.59},
  /** 40 ft ISO: 12.192 x 2.438 x 2.591 m. */
  ft40: {length: 12.19, width: 2.44, height: 2.59},
  pallet: {length: 1.2, width: 0.8, height: 0.144},
} as const;

export const ROADSIDE = {
  /** EN 1317 H2 containment barrier, 3 m precast segments. */
  jerseyBarrier: {length: 3, height: 0.81, base: 0.61, top: 0.24},
  /** W-beam guardrail: rail top at 0.75 m, posts every 3.8 m. */
  guardrail: {postSpacing: 3.8, railTop: 0.75, postHeight: 0.9},
  /** Flexible delineator post, 1.07 m above the surface. */
  delineator: 1.07,
  /** Traffic cone, 750 mm. */
  cone: 0.75,
  /** Overhead sign gantry: 5.5 m clearance, 0.9 m deep truss. */
  signGantry: {clearance: 5.5, trussDepth: 1.1, signWidth: 4.2, signHeight: 1.9},
  /** High-mast lighting: 12 m pole, 2.4 m outreach. */
  lightMast: {height: 12, outreach: 2.4},
  /** Wood/concrete utility pole with three crossarms. */
  utilityPole: {height: 10.5, crossarm: 2.4},
  /** Lattice transmission pylon, 38 m class. */
  pylon: {height: 38, base: 7.5, armSpan: 12},
} as const;

export const BUILDING = {
  /** Distribution warehouse: 60 x 24 m, 9 m eaves, 12 m ridge. */
  warehouse: {length: 60, width: 24, eaves: 9, ridge: 12, dockHeight: 1.2},
  /** Two-storey site office / gatehouse. */
  office: {length: 18, width: 10, floor: 3.9, floors: 2},
  /** Arched maintenance hangar, 42 m clear span. */
  hangar: {span: 42, depth: 30, height: 17, doorWidth: 34, doorHeight: 13},
  /** Air-traffic / launch control tower. */
  controlTower: {shaft: 6, height: 32, cab: 11, cabHeight: 5},
  /** Cement or grain silo, 6 m diameter, 18 m barrel. */
  silo: {diameter: 6, height: 18, cone: 3.2},
  /** Bulk fuel tank, 15 m diameter, 12 m shell. */
  tank: {diameter: 15, height: 12, berm: 1.4},
  /** Elevated water tower for launch cooling. */
  waterTower: {legHeight: 22, tankDiameter: 10, tankHeight: 8},
  /** Mid-rise office slab used to give megastructure scenes a human scale. */
  tower: {length: 32, width: 22, floor: 3.4},
} as const;

export const PORT = {
  /** Ship-to-shore gantry crane: 40 m lift height, 48 m outreach, 16 m rail gauge. */
  stsCrane: {lift: 40, outreach: 48, railGauge: 16, legHeight: 18, boomDepth: 3.2},
  /** Rubber-tyred gantry crane straddling six container rows. */
  rtgCrane: {span: 23, height: 18, legHeight: 16},
  /** Container ship: 210 m length, 32 m beam, deck 14 m above water. */
  ship: {length: 210, beam: 32, deckHeight: 14, hull: 11},
  /** Quay crane rail and bollard spacing. */
  bollardSpacing: 30,
  /** Breakwater armour unit, 4 m class. */
  armourUnit: 4,
} as const;

export const ENERGY = {
  /** Onshore 2.5 MW turbine: 90 m hub, 58 m blade, 4.2 m base diameter. */
  turbine: {hub: 90, blade: 58, baseDiameter: 4.2, topDiameter: 2.6, nacelle: {length: 10, width: 4, height: 4}},
  /** Meteorological mast beside the wind farm. */
  metMast: 60,
  /** Substation transformer bay. */
  transformer: {length: 8, width: 4.5, height: 5},
  /** High-voltage catenary sag fraction between pylons. */
  catenarySag: 0.06,
} as const;

export const TUNNEL = {
  /** Two-lane highway bore: 10.5 m excavated diameter, 8.2 m road. */
  bore: 10.5,
  roadWidth: 8.2,
  /** Jet fan: 1.0 m diameter, hung at 4.9 m. */
  jetFan: {diameter: 1, mount: 4.9, length: 3.4},
  /** Emergency cross-passage door. */
  escape: {width: 1.2, height: 2.2},
  liningRing: 2,
  /** Cable tray level. */
  tray: 5.3,
  /** Tunnel portal headwall extends 4 m past the bore. */
  portalMargin: 4,
} as const;

export const NATURE = {
  /** Mature conifer: 14 m tall, 3.4 m crown radius. */
  conifer: {height: 14, radius: 3.4},
  /** Broadleaf: 11 m tall, 4.5 m crown. */
  broadleaf: {height: 11, radius: 4.5},
  shrub: {height: 1.4, radius: 1.8},
  grassTuft: 0.35,
  /** Boulders used as near-field scatter, 0.8-3 m. */
  boulder: {min: 0.8, max: 3.2},
  /** Cliff/mesa relief band heights used by the biome backdrop. */
  cliffHeight: 26,
} as const;

/** Human-scale figures keep architecture honest; 1.75 m is used throughout. */
export const HUMAN = {
  height: 1.75,
  shoulder: 0.45,
} as const;

/**
 * Ratios that must always hold, used by the scale test and by runtime checks in
 * development. Each entry documents the physical relationship it protects.
 */
export const SCALE_INVARIANTS: {label: string; actual: number; min: number; max: number; note: string}[] = [
  {label: 'lane / car width', actual: ROAD.laneWidth / CAR.width, min: 1.5, max: 1.8, note: 'A car occupies roughly two thirds of a 3.5 m lane.'},
  {label: 'road / car width', actual: ROAD.width / CAR.width, min: 3.1, max: 3.5, note: 'Two lanes plus edge line.'},
  {label: 'container height / car height', actual: CONTAINER.ft20.height / CAR.height, min: 2.1, max: 2.4, note: 'A 2.59 m box towers over a 1.16 m sports car.'},
  {label: 'container length / car length', actual: CONTAINER.ft20.length / CAR.length, min: 1.25, max: 1.4, note: 'One 20 ft box is longer than the car.'},
  {label: 'barrier / car height', actual: ROADSIDE.jerseyBarrier.height / CAR.height, min: 0.6, max: 0.75, note: 'A Jersey barrier reaches the top of the front wing.'},
  {label: 'guardrail / car height', actual: ROADSIDE.guardrail.railTop / CAR.height, min: 0.6, max: 0.7, note: 'W-beam rail sits at bonnet height.'},
  {label: 'gantry clearance / car height', actual: ROADSIDE.signGantry.clearance / CAR.height, min: 4.5, max: 5.2, note: 'Trucks pass under, the car does not.'},
  {label: 'tunnel bore / car width', actual: TUNNEL.bore / CAR.width, min: 4.6, max: 5.2, note: 'Two lanes plus walkways inside one bore.'},
  {label: 'warehouse eaves / car height', actual: BUILDING.warehouse.eaves / CAR.height, min: 7, max: 8.5, note: 'Eaves clear a loaded lorry.'},
  {label: 'turbine hub / car length', actual: ENERGY.turbine.hub / CAR.length, min: 18, max: 21, note: 'A 90 m hub is a full order above the car.'},
  {label: 'human / car height', actual: HUMAN.height / CAR.height, min: 1.45, max: 1.65, note: 'A person is taller than the roofline.'},
];
