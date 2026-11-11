import assert from "node:assert/strict";
import test from "node:test";
import {
  hasBlockerGoal,
  hasRedirectGoal,
  isActivationComplete,
  isGoalComplete,
  setupGuideProgress,
} from "./eceSetupGuide.js";

test("goal stays incomplete until a redirect or country blocker rule exists", () => {
  assert.equal(hasRedirectGoal([]), false);
  assert.equal(hasBlockerGoal(null), false);
  assert.equal(hasBlockerGoal({ blockedCountries: [] }), false);
  assert.equal(isGoalComplete({ rules: [], blocker: null }), false);

  assert.equal(hasRedirectGoal([{ id: "r1" }]), true);
  assert.equal(hasBlockerGoal({ blockedCountries: ["US"] }), true);
  assert.equal(isGoalComplete({ rules: [{ id: "r1" }], blocker: null }), true);
  assert.equal(
    isGoalComplete({ rules: [], blocker: { blockedCountries: ["FR"] } }),
    true,
  );
});

test("activation completes when any storefront embed is on", () => {
  assert.equal(isActivationComplete([]), false);
  assert.equal(
    isActivationComplete([
      { id: "ece-embed-popup", active: false },
      { id: "ece-embed-auto", active: false },
      { id: "ece-embed-switcher", active: false },
    ]),
    false,
  );
  assert.equal(
    isActivationComplete([
      { id: "ece-embed-popup", active: false },
      { id: "ece-embed-auto", active: true },
    ]),
    true,
  );
});

test("setup guide reveals steps only after prior steps are complete", () => {
  const empty = setupGuideProgress({ rules: [], blocker: null, embeds: [] });
  assert.equal(empty.goalDone, false);
  assert.equal(empty.activationDone, false);
  assert.equal(empty.currentStep, "goal");
  assert.deepEqual(empty.visibleStepIds, ["goal"]);
  assert.equal(empty.completed, 0);
  assert.equal(empty.percent, 0);

  const afterGoal = setupGuideProgress({
    rules: [{ id: "r1" }],
    blocker: null,
    embeds: [{ id: "ece-embed-popup", active: false }],
  });
  assert.equal(afterGoal.goalDone, true);
  assert.equal(afterGoal.activationDone, false);
  assert.equal(afterGoal.currentStep, "activation");
  assert.deepEqual(afterGoal.visibleStepIds, ["goal", "activation"]);
  assert.equal(afterGoal.completed, 1);
  assert.equal(afterGoal.percent, 33);

  const afterActivation = setupGuideProgress({
    rules: [],
    blocker: { blockedCountries: ["DE"] },
    embeds: [{ id: "ece-embed-switcher", active: true }],
  });
  assert.equal(afterActivation.goalDone, true);
  assert.equal(afterActivation.activationDone, true);
  assert.equal(afterActivation.checkDone, true);
  assert.equal(afterActivation.allDone, true);
  assert.equal(afterActivation.currentStep, "check");
  assert.deepEqual(afterActivation.visibleStepIds, [
    "goal",
    "activation",
    "check",
  ]);
  assert.equal(afterActivation.completed, 3);
  assert.equal(afterActivation.percent, 100);
});
