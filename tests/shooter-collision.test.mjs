import assert from "node:assert/strict";
import test from "node:test";
import {
  createShooterEnemyHurtbox,
  createShooterGuitarCollisionGeometry,
  createShooterProjectileHitbox,
  solveShooterIntercept,
  sweepCircleAgainstMovingEllipse,
} from "../src/shooter/collision.js";

test("swept projectile catches a target crossed between frames", () => {
  const hit = sweepCircleAgainstMovingEllipse({
    start: { x: 0, y: 50 },
    end: { x: 120, y: 50 },
    projectileRadius: 5,
    targetStart: { x: 60, y: 50 },
    targetEnd: { x: 60, y: 50 },
    targetRadiusX: 14,
    targetRadiusY: 12,
  });

  assert.ok(hit);
  assert.ok(hit.ratio > 0 && hit.ratio < 1);
  assert.ok(Math.abs(hit.collisionPoint.x - 46) < 0.001);
  assert.equal(hit.collisionPoint.y, 50);
});

test("swept projectile ignores a visible near miss", () => {
  const hit = sweepCircleAgainstMovingEllipse({
    start: { x: 0, y: 20 },
    end: { x: 120, y: 20 },
    projectileRadius: 4,
    targetStart: { x: 60, y: 50 },
    targetEnd: { x: 60, y: 55 },
    targetRadiusX: 14,
    targetRadiusY: 12,
  });

  assert.equal(hit, null);
});

test("moving-target sweep calculates the first surface contact", () => {
  const hit = sweepCircleAgainstMovingEllipse({
    start: { x: 50, y: 100 },
    end: { x: 50, y: 0 },
    projectileRadius: 4,
    targetStart: { x: 50, y: 45 },
    targetEnd: { x: 50, y: 55 },
    targetRadiusX: 13,
    targetRadiusY: 10,
  });

  assert.ok(hit);
  assert.ok(hit.collisionPoint.y > hit.targetCenter.y);
  assert.ok(Math.abs(hit.collisionPoint.y - (hit.targetCenter.y + 10)) < 0.001);
});

test("guitar collision geometry rotates body, neck, head, and muzzle together", () => {
  const geometry = createShooterGuitarCollisionGeometry({
    pivotX: 100,
    pivotY: 200,
    width: 60,
    height: 140,
    angleDeg: 30,
  });

  assert.equal(geometry.body.type, "ellipse");
  assert.equal(geometry.neck.type, "capsule");
  assert.equal(geometry.head.type, "ellipse");
  assert.ok(geometry.muzzlePoint.x > geometry.pivot.x);
  assert.ok(geometry.muzzlePoint.y < geometry.head.center.y);
  assert.ok(geometry.body.radiusX < 30);
});

test("enemy and pick shapes stay inside their rendered boxes", () => {
  const enemy = createShooterEnemyHurtbox({
    centerX: 100,
    centerY: 80,
    width: 52,
    height: 52,
    difficulty: "easy",
  });
  const pick = createShooterProjectileHitbox({ centerX: 10, centerY: 20, width: 40, height: 52 });

  assert.ok(enemy.radiusX < 26);
  assert.ok(enemy.radiusY < 26);
  assert.ok(pick.radius < 20);
});

test("intercept solver leads a falling target", () => {
  const intercept = solveShooterIntercept({
    start: { x: 50, y: 500 },
    target: { x: 120, y: 120 },
    targetVelocity: { x: 0, y: 0.12 },
    projectileSpeed: 0.9,
    maxTimeMs: 1000,
  });

  assert.ok(intercept.timeMs > 0 && intercept.timeMs < 1000);
  assert.ok(intercept.point.y > 120);
});
