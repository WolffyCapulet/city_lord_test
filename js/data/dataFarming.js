export const farmingDefs = {
  wheatSeed: {
    id: "wheatSeed",
    name: "小麥",
    duration: 60,
    yields: {
      wheat: [12, 18]
    },
    skill: "farming",
    fixedSeedReturn: [1, 3]
  },

  mushroomSpore: {
    id: "mushroomSpore",
    name: "蘑菇",
    duration: 75,
    yields: {
      mushroom: [5, 8]
    },
    skill: "farming",
    returnBase: 0.25
  },

  appleSeed: {
    id: "appleSeed",
    name: "蘋果樹",
    duration: 180,
    yields: {
      apple: [4, 8],
      wood: [2, 4],
      branch: [3, 6],
      leaf: [4, 8]
    },
    skill: "farming",
    returnBase: 0.5
  },

  cottonSeed: {
    id: "cottonSeed",
    name: "棉花",
    duration: 95,
    yields: {
      cotton: [6, 10]
    },
    skill: "farming",
    returnBase: 0.32
  },

  carrotSeed: {
    id: "carrotSeed",
    name: "蘿蔔",
    duration: 80,
    yields: {
      carrot: [8, 12]
    },
    skill: "farming",
    returnBase: 0.35
  }
};

export const farmPlotRules = {
  basePlotCap: 4,
  townCenterPlotBonusPerLevel: 2,

  baseBuildCost: {
    gold: 10,
    resources: {
      planks: 2,
      dirt: 6,
      stone: 4
    }
  },

  goldCostPerBuiltPlot: 4,
  dirtCostPerBuiltPlot: 2,
  stoneCostEveryTwoPlots: 1,
  plankCostEveryThreePlots: 1
};
