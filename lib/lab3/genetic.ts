import type { Lab3NormalizedExpert, Lab3Object } from "./index";

export type Lab3GeneticExpertChoice = {
  expertId: number;
  choiceIds: number[];
};

export type Lab3GeneticSolution = {
  orderingIds: number[];
  orderingLabels: string[];
  sum: number;
  max: number;
  fitness: number;
};

export type Lab3GeneticResult = {
  expertRankings: Lab3GeneticExpertChoice[];
  minSum: number;
  minMax: number;
  bestBySum: Lab3GeneticSolution[];
  bestByMax: Lab3GeneticSolution[];
  meta: {
    seed: number;
    rankingsCount: number;
    populationSize: number;
    generations: number;
  };
};

type GeneticCandidate = {
  orderingIds: number[];
  sum: number;
  max: number;
  fitness: number;
};

type Criterion = "sum" | "max";

const POPULATION_SIZE = 72;
const GENERATIONS = 80;
const ELITE_COUNT = 12;
const MUTATION_RATE = 0.28;
const TOURNAMENT_SIZE = 4;
const MAX_SOLUTIONS = 8;

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

function buildSignature(orderingIds: number[]) {
  return orderingIds.join("-");
}

function compareOrdering(first: number[], second: number[]) {
  const length = Math.min(first.length, second.length);

  for (let index = 0; index < length; index += 1) {
    if (first[index] !== second[index]) {
      return first[index] - second[index];
    }
  }

  return first.length - second.length;
}

function compareBySum(left: GeneticCandidate, right: GeneticCandidate) {
  return left.sum - right.sum || left.max - right.max || compareOrdering(left.orderingIds, right.orderingIds);
}

function compareByMax(left: GeneticCandidate, right: GeneticCandidate) {
  return left.max - right.max || left.sum - right.sum || compareOrdering(left.orderingIds, right.orderingIds);
}

function evaluateTop3Distance(orderingIds: number[], expert: Lab3NormalizedExpert) {
  const positions = new Array<number>(orderingIds.length + 1).fill(-1);

  for (let index = 0; index < orderingIds.length; index += 1) {
    positions[orderingIds[index]] = index;
  }

  return (
    Math.abs(positions[expert.first] - 0) +
    Math.abs(positions[expert.second] - 1) +
    Math.abs(positions[expert.third] - 2)
  );
}

function evaluateCandidate(orderingIds: number[], experts: Lab3NormalizedExpert[], criterion: Criterion) {
  const distances = experts.map((expert) => evaluateTop3Distance(orderingIds, expert));
  const sum = distances.reduce((total, value) => total + value, 0);
  const max = Math.max(...distances);
  const objective = criterion === "sum" ? sum : max;
  const tieBreaker = criterion === "sum" ? max : sum;
  const fitness = -(objective * 1000 + tieBreaker);

  return {
    orderingIds: [...orderingIds],
    sum,
    max,
    fitness,
  };
}

function crossover(first: number[], second: number[], rng: () => number) {
  const start = Math.floor(rng() * first.length);
  const end = start + Math.floor(rng() * (first.length - start));
  const child = new Array<number>(first.length).fill(-1);
  const used = new Set<number>();

  for (let index = start; index <= end; index += 1) {
    child[index] = first[index];
    used.add(first[index]);
  }

  let secondIndex = 0;
  for (let index = 0; index < child.length; index += 1) {
    if (child[index] !== -1) {
      continue;
    }

    while (used.has(second[secondIndex])) {
      secondIndex += 1;
    }

    child[index] = second[secondIndex];
    used.add(second[secondIndex]);
  }

  return child;
}

function mutate(orderingIds: number[], rng: () => number) {
  const next = [...orderingIds];

  if (rng() < MUTATION_RATE) {
    const left = Math.floor(rng() * next.length);
    const right = Math.floor(rng() * next.length);
    [next[left], next[right]] = [next[right], next[left]];
  }

  if (rng() < MUTATION_RATE / 2) {
    const from = Math.floor(rng() * next.length);
    const to = Math.floor(rng() * next.length);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
  }

  if (rng() < MUTATION_RATE / 2) {
    const start = Math.floor(rng() * next.length);
    const end = start + Math.floor(rng() * (next.length - start));
    const slice = next.slice(start, end + 1).reverse();
    next.splice(start, slice.length, ...slice);
  }

  return next;
}

function pickParent(population: GeneticCandidate[], rng: () => number) {
  let best = population[Math.floor(rng() * population.length)];

  for (let index = 1; index < TOURNAMENT_SIZE; index += 1) {
    const candidate = population[Math.floor(rng() * population.length)];
    if (candidate.fitness > best.fitness) {
      best = candidate;
    }
  }

  return best;
}

function buildSeedOrdering(ids: number[], expert: Lab3NormalizedExpert) {
  const top = [expert.first, expert.second, expert.third];
  const used = new Set(top);
  return top.concat(ids.filter((id) => !used.has(id)));
}

function createInitialPopulation(
  objects: Lab3Object[],
  experts: Lab3NormalizedExpert[],
  rng: () => number,
  criterion: Criterion
) {
  const ids = objects.map((object) => object.id);
  const seeds: number[][] = [[...ids], [...ids].reverse(), ...experts.map((expert) => buildSeedOrdering(ids, expert))];

  while (seeds.length < POPULATION_SIZE) {
    seeds.push(shuffle(ids, rng));
  }

  return seeds
    .slice(0, POPULATION_SIZE)
    .map((orderingIds) => evaluateCandidate(orderingIds, experts, criterion))
    .sort((left, right) => right.fitness - left.fitness);
}

function collectBestSolutions(candidates: GeneticCandidate[], objects: Lab3Object[], criterion: Criterion): Lab3GeneticSolution[] {
  const objectMap = new Map(objects.map((object) => [object.id, object.name]));
  const sorted = [...candidates].sort(criterion === "sum" ? compareBySum : compareByMax);
  const bestValue = criterion === "sum" ? sorted[0]?.sum ?? Number.POSITIVE_INFINITY : sorted[0]?.max ?? Number.POSITIVE_INFINITY;

  return sorted
    .filter((candidate) => (criterion === "sum" ? candidate.sum === bestValue : candidate.max === bestValue))
    .slice(0, MAX_SOLUTIONS)
    .map((candidate) => ({
      orderingIds: [...candidate.orderingIds],
      orderingLabels: candidate.orderingIds.map((id) => objectMap.get(id) ?? `Об'єкт ${id}`),
      sum: candidate.sum,
      max: candidate.max,
      fitness: candidate.fitness,
    }));
}

function runForCriterion(objects: Lab3Object[], experts: Lab3NormalizedExpert[], criterion: Criterion, seed: number) {
  const rng = createRng(seed ^ (criterion === "sum" ? 0x13579bdf : 0x2468ace0));
  let population = createInitialPopulation(objects, experts, rng, criterion);
  const seen = new Map<string, GeneticCandidate>();

  for (const candidate of population) {
    seen.set(buildSignature(candidate.orderingIds), candidate);
  }

  for (let generation = 0; generation < GENERATIONS; generation += 1) {
    const nextPopulation = population.slice(0, ELITE_COUNT).map((candidate) => ({
      ...candidate,
      orderingIds: [...candidate.orderingIds],
    }));

    while (nextPopulation.length < POPULATION_SIZE) {
      const parentA = pickParent(population, rng);
      const parentB = pickParent(population, rng);
      const childIds = mutate(crossover(parentA.orderingIds, parentB.orderingIds, rng), rng);
      const child = evaluateCandidate(childIds, experts, criterion);
      nextPopulation.push(child);
      seen.set(buildSignature(child.orderingIds), child);
    }

    population = nextPopulation.sort((left, right) => right.fitness - left.fitness);
  }

  return collectBestSolutions(Array.from(seen.values()), objects, criterion);
}

export function runLab3GeneticAlgorithm(
  objects: Lab3Object[],
  experts: Lab3NormalizedExpert[],
  seed: number
): Lab3GeneticResult {
  const bestBySum = runForCriterion(objects, experts, "sum", seed);
  const bestByMax = runForCriterion(objects, experts, "max", seed);

  return {
    expertRankings: experts.map((expert) => ({
      expertId: expert.expertId,
      choiceIds: [expert.first, expert.second, expert.third],
    })),
    minSum: bestBySum[0]?.sum ?? Number.POSITIVE_INFINITY,
    minMax: bestByMax[0]?.max ?? Number.POSITIVE_INFINITY,
    bestBySum,
    bestByMax,
    meta: {
      seed,
      rankingsCount: experts.length,
      populationSize: POPULATION_SIZE,
      generations: GENERATIONS,
    },
  };
}
