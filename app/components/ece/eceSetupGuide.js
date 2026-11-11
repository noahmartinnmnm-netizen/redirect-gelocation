export const SETUP_STEPS = [
  { id: "goal", label: "Choose a goal", hint: "Decide where visitors go", icon: "flag" },
  { id: "activation", label: "Turn it on", hint: "Enable it in your theme", icon: "eye" },
  { id: "check", label: "Check setup", hint: "Confirm everything works", icon: "check" },
];

export function hasRedirectGoal(rules) {
  return Array.isArray(rules) && rules.length > 0;
}

export function hasBlockerGoal(blocker) {
  const countries = blocker?.blockedCountries;
  return Array.isArray(countries) && countries.length > 0;
}

export function isGoalComplete({ rules, blocker }) {
  return hasRedirectGoal(rules) || hasBlockerGoal(blocker);
}

/** Step 2 is done when Auto redirect, Geolocation popup, or Floating selector is on. */
export function isActivationComplete(embeds) {
  return (embeds || []).some((embed) => Boolean(embed?.active));
}

export function setupGuideProgress({ rules = [], blocker = null, embeds = [] } = {}) {
  const goalDone = isGoalComplete({ rules, blocker });
  const activationDone = goalDone && isActivationComplete(embeds);
  // Step 3 completes automatically once theme activation is done.
  const checkDone = activationDone;
  const completed =
    (goalDone ? 1 : 0) + (activationDone ? 1 : 0) + (checkDone ? 1 : 0);
  const total = SETUP_STEPS.length;
  const percent = Math.round((completed / total) * 100);
  const currentStep = !goalDone ? "goal" : !activationDone ? "activation" : "check";
  const visibleStepIds = SETUP_STEPS.filter((step) => {
    if (step.id === "goal") return true;
    if (step.id === "activation") return goalDone;
    if (step.id === "check") return activationDone;
    return false;
  }).map((step) => step.id);

  return {
    goalDone,
    activationDone,
    checkDone,
    allDone: checkDone,
    completed,
    total,
    percent,
    currentStep,
    visibleStepIds,
  };
}
