import lab3InputJson from "../../data/lab3/input.json" with { type: "json" };

import type { Lab3ExpertInput, Lab3Input, Lab3Object } from "./index";
import type { Lab3FullExpertRanking } from "./genetic";

function createRng(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function buildExpertVotes(objects: Lab3Object[], expertsCount: number, seed: number): Lab3ExpertInput[] {
  const rng = createRng(seed);
  const ids = objects.map((object) => object.id);
  const signatures = new Set<string>();
  const experts: Lab3ExpertInput[] = [];

  while (experts.length < expertsCount) {
    const [first, second, third] = shuffle(ids, rng).slice(0, 3);
    const signature = `${first}-${second}-${third}`;

    if (signatures.has(signature)) {
      continue;
    }

    signatures.add(signature);
    experts.push({
      expertId: experts.length + 1,
      first,
      second,
      third,
    });
  }

  return experts;
}

export function generateLab3Input(seed = 20260410, expertsCount = 16): Lab3Input {
  const source = lab3InputJson as Lab3Input;
  const objects = source.objects.map((object) => ({
    id: object.id,
    name: object.name,
    year: object.year ?? null,
  }));

  return {
    objects,
    experts: buildExpertVotes(objects, expertsCount, seed),
  };
}

export function generateLab3InputJson(seed = 20260410, expertsCount = 16) {
  return JSON.stringify(generateLab3Input(seed, expertsCount), null, 2);
}

export function generateFullExpertRankings(
  seed = 20260410,
  count = 10,
  objects?: Lab3Object[]
): Lab3FullExpertRanking[] {
  const sourceObjects =
    objects ??
    ((lab3InputJson as Lab3Input).objects.map((object) => ({
      id: object.id,
      name: object.name,
      year: object.year ?? null,
    })) as Lab3Object[]);

  const rng = createRng(seed ^ 0x5a5a5a5a);
  const ids = sourceObjects.map((object) => object.id);
  const signatures = new Set<string>();
  const rankings: Lab3FullExpertRanking[] = [];

  while (rankings.length < count) {
    const orderingIds = shuffle(ids, rng);
    const signature = orderingIds.join("-");

    if (signatures.has(signature)) {
      continue;
    }

    signatures.add(signature);
    rankings.push({
      expertId: rankings.length + 1,
      orderingIds,
    });
  }

  return rankings;
}
