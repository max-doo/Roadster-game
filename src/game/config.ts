/** Game-tuned SI units. These are not manufacturer specifications. */
export const PHYSICS = {
  fixedStep: 1 / 120, gravity: 18, mass: 1, inertia: 3.6,
  wheelBase: 3.1, axleY: -.25, wheelRadius: .46,
  suspensionRest: .60, suspensionReach: .91, spring: 850, damping: 31,
  acceleration: 15, maxSpeed: 32, brake: 25,
  airDrag: .008, rollingDrag: .28,
  suctionAcceleration: 110, suctionReach: 1.10,
  thrustForward: 13, thrustLift: 26, pressureUse: 23,
  boostAcceleration: 32, boostPressureUse: 18, boostGrip: 16,
  pitchTorque: 16, airDamping: 2.9, landingAssist: 3.5,
  recoveryTorque: 65, stuckTimeout: 6,
  maxLandingSpeed: 24, maxLandingAngle: .90,
} as const;
