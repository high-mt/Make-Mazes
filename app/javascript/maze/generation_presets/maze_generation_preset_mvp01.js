export const MAZE_GENERATION_PRESET_MVP01 = {
  presetId: "mvp01",
  label: "MVP Default",
  fakeRouteConfig: {
    maxBranchLevel: 4,
    selectionStrategy: "hierarchy-priority",
    generationStrategy: "straight-hierarchical",
    trunkBranchRules: {
      straightChance: 0.26,
      turnChance: 0.42,
      terminalChance: 0.24,
      straightNearbyMinGap: 2,
      straightNearbyKeepChance: 0.18
    },
    terminalSproutRules: {
      1: { required: true, singleChance: 1, doubleChance: 0.30 },
      2: { required: true, singleChance: 1, doubleChance: 0.20 },
      3: { required: false, singleChance: 0.45, doubleChance: 0.10 },
      4: { required: false, singleChance: 0, doubleChance: 0 }
    },
    levelLengthRules: {
      1: { minLength: 3, randomExtraMax: 3 },
      2: { minLength: 3, randomExtraMax: 3 },
      3: { minLength: 2, randomExtraMax: 2 },
      4: { minLength: 2, randomExtraMax: 1 }
    },
    graftTreeRules: {
      preferStraightChance: 0.82
    }
  }
}