import type { Card, CardCost, CardEffect, CardType, RoleCard } from "../types";
import { investigationV2Roles } from "./roles";

type LegacyRoleBridge = {
  roleId: string;
  legacyId: string;
  faction: RoleCard["faction"];
  pollutedType?: RoleCard["pollutedType"];
  cardIds: [string, string, string];
};

const legacyRoleBridges: LegacyRoleBridge[] = [
  {
    roleId: "role-01-edwin",
    legacyId: "01-old-watchman",
    faction: "investigator",
    cardIds: ["01-info", "01-utility", "01-artifact"],
  },
  {
    roleId: "role-02-lyle",
    legacyId: "02-magician",
    faction: "unknown",
    cardIds: ["02-info", "02-utility", "02-artifact"],
  },
  {
    roleId: "role-03-austen",
    legacyId: "03-punisher-officer",
    faction: "investigator",
    cardIds: ["03-info", "03-utility", "03-artifact"],
  },
  {
    roleId: "role-04-cecilia",
    legacyId: "04-aurora-infiltrator",
    faction: "unknown",
    cardIds: ["04-info", "04-utility", "04-ritual"],
  },
  {
    roleId: "role-05-devlin",
    legacyId: "05-church-doctor",
    faction: "investigator",
    cardIds: ["05-info", "05-utility", "05-artifact"],
  },
  {
    roleId: "role-06-elias",
    legacyId: "06-unstable-one",
    faction: "unknown",
    cardIds: ["06-info", "06-utility", "06-ritual"],
  },
];

const cardPlans: Record<
  string,
  Array<{
    id: string;
    type: CardType;
    effect: CardEffect;
    rarity: Card["rarity"];
  }>
> = {
  "role-01-edwin": [
    { id: "01-info", type: "info", effect: "gain_clue", rarity: "common" },
    { id: "01-utility", type: "utility", effect: "purify", rarity: "common" },
    { id: "01-artifact", type: "utility", effect: "shield", rarity: "artifact" },
  ],
  "role-02-lyle": [
    { id: "02-info", type: "info", effect: "gain_clue", rarity: "common" },
    { id: "02-utility", type: "utility", effect: "shield", rarity: "rare" },
    { id: "02-artifact", type: "utility", effect: "shield", rarity: "rare" },
  ],
  "role-03-austen": [
    { id: "03-info", type: "info", effect: "gain_clue", rarity: "common" },
    { id: "03-utility", type: "utility", effect: "purify", rarity: "rare" },
    { id: "03-artifact", type: "utility", effect: "shield", rarity: "artifact" },
  ],
  "role-04-cecilia": [
    { id: "04-info", type: "info", effect: "peek_corruption", rarity: "common" },
    { id: "04-utility", type: "utility", effect: "purify", rarity: "rare" },
    { id: "04-ritual", type: "utility", effect: "peek_corruption", rarity: "rare" },
  ],
  "role-05-devlin": [
    { id: "05-info", type: "info", effect: "peek_corruption", rarity: "common" },
    { id: "05-utility", type: "utility", effect: "purify", rarity: "common" },
    { id: "05-artifact", type: "utility", effect: "recycle", rarity: "artifact" },
  ],
  "role-06-elias": [
    { id: "06-info", type: "info", effect: "gain_clue", rarity: "common" },
    { id: "06-utility", type: "utility", effect: "peek_corruption", rarity: "rare" },
    { id: "06-ritual", type: "utility", effect: "shield", rarity: "artifact" },
  ],
};

function parseCost(costText: string): CardCost {
  const match = costText.match(/(\d+)/);
  return { spirituality: match ? Number(match[1]) : 0 };
}

function roleBridge(roleId: string): LegacyRoleBridge {
  const bridge = legacyRoleBridges.find((entry) => entry.roleId === roleId);
  if (!bridge) {
    throw new Error(`Missing legacy bridge for role: ${roleId}`);
  }
  return bridge;
}

function toLegacyCards(roleId: string) {
  const role = investigationV2Roles.find((entry) => entry.id === roleId);
  if (!role) {
    throw new Error(`Missing investigation role: ${roleId}`);
  }

  const plans = cardPlans[roleId];
  if (!plans) {
    throw new Error(`Missing card plan for role: ${roleId}`);
  }

  return role.signatureCards.map((seed, index) => {
    const plan = plans[index];
    return {
      id: plan.id,
      name: seed.name,
      type: plan.type,
      effect: plan.effect,
      cost: parseCost(seed.costText),
      description: seed.rulesText,
      rarity: plan.rarity,
      tags: [seed.category, role.publicName],
      sideEffect: seed.why,
    } satisfies Card;
  });
}

export const ROLES: RoleCard[] = legacyRoleBridges.map((bridge) => {
  const role = investigationV2Roles.find((entry) => entry.id === bridge.roleId);
  if (!role) {
    throw new Error(`Missing investigation role: ${bridge.roleId}`);
  }

  return {
    id: bridge.legacyId,
    name: role.realName,
    title: role.publicName,
    pathway: role.pathway as RoleCard["pathway"],
    faction: bridge.faction,
    pollutedType: bridge.pollutedType,
    ability: role.trait,
    cards: bridge.cardIds,
    initialAttrs: {
      maxSpirituality: role.startStats.maxSpirituality,
      startCorruption: role.startStats.startCorruption * 10,
      startClues: role.startStats.startClues,
      startHand: role.startStats.startHand,
    },
  };
});

export const CARDS: Card[] = [
  ...toLegacyCards("role-01-edwin"),
  ...toLegacyCards("role-02-lyle"),
  ...toLegacyCards("role-03-austen"),
  ...toLegacyCards("role-04-cecilia"),
  ...toLegacyCards("role-05-devlin"),
  ...toLegacyCards("role-06-elias"),
];

export const ROLE_BRIDGE_MAP = Object.fromEntries(
  legacyRoleBridges.map((bridge) => [bridge.legacyId, bridge.roleId])
);
