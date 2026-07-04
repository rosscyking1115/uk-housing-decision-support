// Seed data from the design handoff (Greater Manchester). Used to build and
// review the UI offline; swap for the live API (adapt `Area` from api.ts) later.

import type { Area } from "./model";

export const SEARCH_REGION = "Greater Manchester";

export const FIXTURE_AREAS: Area[] = [
  {
    id: "chorlton", name: "Chorlton", region: "M21", epc: "C",
    scores: { aff: 58, crime: 64, energy: 71, flood: 88, transit: 76 },
    raw: { aff: "£262k · 5.8× income", crime: "104 /1k", energy: "EPC C", flood: "0.9% in zone", transit: "9 min to centre" },
  },
  {
    id: "didsbury", name: "Didsbury West", region: "M20", epc: "C",
    scores: { aff: 46, crime: 72, energy: 68, flood: 84, transit: 70 },
    raw: { aff: "£398k · 8.1× income", crime: "78 /1k", energy: "EPC C", flood: "1.2% in zone", transit: "13 min to centre" },
  },
  {
    id: "levenshulme", name: "Levenshulme", region: "M19", epc: "D",
    scores: { aff: 74, crime: 55, energy: 63, flood: 79, transit: 81 },
    raw: { aff: "£248k · 5.1× income", crime: "128 /1k", energy: "EPC D", flood: "1.8% in zone", transit: "8 min to centre" },
  },
  {
    id: "sale", name: "Sale", region: "M33", epc: "C",
    scores: { aff: 61, crime: 78, energy: 74, flood: 66, transit: 72 },
    raw: { aff: "£312k · 6.4× income", crime: "64 /1k", energy: "EPC C", flood: "3.1% in zone", transit: "16 min to centre" },
  },
  {
    id: "prestwich", name: "Prestwich", region: "M25", epc: "C",
    scores: { aff: 66, crime: 70, energy: 66, flood: 90, transit: 74 },
    raw: { aff: "£289k · 5.9× income", crime: "82 /1k", energy: "EPC C", flood: "0.4% in zone", transit: "12 min to centre" },
  },
  {
    id: "stretford", name: "Stretford", region: "M32", epc: "C",
    scores: { aff: 71, crime: 58, energy: 69, flood: 72, transit: 79 },
    raw: { aff: "£256k · 5.3× income", crime: "118 /1k", energy: "EPC C", flood: "2.4% in zone", transit: "10 min to centre" },
  },
  {
    id: "urmston", name: "Urmston", region: "M41", epc: "C",
    scores: { aff: 64, crime: 80, energy: 72, flood: 54, transit: 68 },
    raw: { aff: "£278k · 5.7× income", crime: "58 /1k", energy: "EPC C", flood: "4.8% in zone", transit: "18 min to centre" },
  },
  {
    id: "whalley", name: "Whalley Range", region: "M16", epc: "D",
    scores: { aff: 69, crime: 61, energy: 60, flood: 86, transit: 83 },
    raw: { aff: "£265k · 5.4× income", crime: "112 /1k", energy: "EPC D", flood: "0.7% in zone", transit: "7 min to centre" },
  },
  {
    id: "oldtrafford", name: "Old Trafford", region: "M16", epc: "C",
    scores: { aff: 72, crime: null, energy: 67, flood: 81, transit: 85 },
    raw: { aff: "£251k · 5.2× income", crime: "no data", energy: "EPC C", flood: "1.1% in zone", transit: "6 min to centre" },
  },
];
