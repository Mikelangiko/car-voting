export type IndependentObject = {
  id: number;
  name: string;
};

export type IndependentSolution = {
  rank: number;
  ordering: string[];
  generationFound: number;
  k1Value: number;
  k2Value: number;
};

export type IndependentSolutionsView = {
  objects: IndependentObject[];
  expertRankings: {
    expertId: number;
    ranking: string[];
  }[];
  k1Solutions: IndependentSolution[];
  k2Solutions: IndependentSolution[];
  meta: {
    seed: number;
    expertsCount: number;
    objectsCount: number;
    populationSize: number;
    generations: number;
    distanceName: string;
  };
};

type Candidate = {
  orderingIds: number[];
  signature: string;
  generationFound: number;
  k1Value: number;
  k2Value: number;
};

type Criterion = "k1" | "k2";

const OBJECTS: IndependentObject[] = [
  { id: 1, name: "Audi R8 V10 Performance (2023)" },
  { id: 2, name: "Ferrari F8 Tributo (2022)" },
  { id: 3, name: "Porsche 911 Turbo S (2024)" },
  { id: 4, name: "Chevrolet Corvette Z06 (2024)" },
  { id: 5, name: "BMW M4 Competition (2024)" },
  { id: 6, name: "Aston Martin DBS Superleggera (2022)" },
  { id: 7, name: "Nissan GT-R Nismo (2024)" },
  { id: 8, name: "Toyota GR Supra (2024)" },
  { id: 9, name: "Aston Martin Vantage (2024)" },
  { id: 10, name: "Ford Mustang Shelby GT500 (2022)" },
];

const SEED = 20260409;
const EXPERTS_COUNT = 20;
const POPULATION_SIZE = 72;
const GENERATIONS = 60;
const ELITE_COUNT = 10;
const TOURNAMENT_SIZE = 4;
const MUTATION_RATE = 0.34;
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

function rotateLeft(items: number[], shift: number) {
  const offset = ((shift % items.length) + items.length) % items.length;
  return items.slice(offset).concat(items.slice(0, offset));
}

function buildSignature(ordering: number[]) {
  return ordering.join("-");
}

function positionsMap(ordering: number[]) {
  const positions = new Map<number, number>();
  ordering.forEach((id, index) => positions.set(id, index));
  return positions;
}

function distanceBetween(first: number[], second: number[]) {
  const secondPositions = positionsMap(second);
  let distance = 0;

  first.forEach((id, index) => {
    distance += Math.abs(index - (secondPositions.get(id) ?? index));
  });

  return distance;
}

function evaluate(ordering: number[], expertRankings: number[][]) {
  const distances = expertRankings.map((expert) => distanceBetween(ordering, expert));
  return {
    k1Value: distances.reduce((sum, value) => sum + value, 0),
    k2Value: Math.max(...distances),
  };
}

function compare(first: Candidate, second: Candidate, criterion: Criterion) {
  if (criterion === "k1") {
    return (
      first.k1Value - second.k1Value ||
      first.k2Value - second.k2Value ||
      first.signature.localeCompare(second.signature)
    );
  }

  return (
    first.k2Value - second.k2Value ||
    first.k1Value - second.k1Value ||
    first.signature.localeCompare(second.signature)
  );
}

function buildCandidate(ordering: number[], expertRankings: number[][], generationFound: number): Candidate {
  const metrics = evaluate(ordering, expertRankings);
  return {
    orderingIds: ordering,
    signature: buildSignature(ordering),
    generationFound,
    ...metrics,
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

function mutate(ordering: number[], rng: () => number) {
  const next = [...ordering];

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

  return next;
}

function pickParent(population: Candidate[], rng: () => number, criterion: Criterion) {
  let best = population[Math.floor(rng() * population.length)];

  for (let index = 1; index < TOURNAMENT_SIZE; index += 1) {
    const candidate = population[Math.floor(rng() * population.length)];
    if (compare(candidate, best, criterion) < 0) {
      best = candidate;
    }
  }

  return best;
}

function createExpertRankings(seed: number) {
  const rng = createRng(seed ^ 0xa5a5a5);
  const ids = OBJECTS.map((item) => item.id);
  const signatures = new Set<string>();
  const expertRankings: number[][] = [];

  while (expertRankings.length < EXPERTS_COUNT) {
    const ordering = shuffle(ids, rng);
    const signature = buildSignature(ordering);

    if (signatures.has(signature)) {
      continue;
    }

    signatures.add(signature);
    expertRankings.push(ordering);
  }

  return expertRankings;
}

function initialPopulation(expertRankings: number[][], rng: () => number) {
  const ids = OBJECTS.map((item) => item.id);
  const seeds: number[][] = [[...ids], [...ids].reverse()];

  for (let index = 0; index < ids.length; index += 1) {
    seeds.push(rotateLeft(ids, index));
  }

  for (const expert of expertRankings) {
    seeds.push([...expert]);
  }

  while (seeds.length < POPULATION_SIZE) {
    seeds.push(shuffle(ids, rng));
  }

  return seeds.slice(0, POPULATION_SIZE);
}

function solveForCriterion(expertRankings: number[][], criterion: Criterion, seed: number) {
  const rng = createRng(seed ^ (criterion === "k1" ? 0x1234ab : 0xfedc55));
  const seen = new Map<string, Candidate>();
  let population = initialPopulation(expertRankings, rng).map((ordering) =>
    buildCandidate(ordering, expertRankings, 0)
  );

  const collect = (generation: number) => {
    for (const item of population) {
      if (seen.has(item.signature)) {
        continue;
      }

      seen.set(item.signature, { ...item, generationFound: generation });
    }
  };

  population.sort((first, second) => compare(first, second, criterion));
  collect(0);

  for (let generation = 1; generation <= GENERATIONS; generation += 1) {
    const nextPopulation = population.slice(0, ELITE_COUNT).map((item) => ({
      ...item,
      orderingIds: [...item.orderingIds],
    }));

    while (nextPopulation.length < POPULATION_SIZE) {
      const parentA = pickParent(population, rng, criterion);
      const parentB = pickParent(population, rng, criterion);
      const child = mutate(crossover(parentA.orderingIds, parentB.orderingIds, rng), rng);
      nextPopulation.push(buildCandidate(child, expertRankings, generation));
    }

    population = nextPopulation.sort((first, second) => compare(first, second, criterion));
    collect(generation);
  }

  const sorted = Array.from(seen.values()).sort((first, second) => compare(first, second, criterion));

  if (sorted.length === 0) {
    return [];
  }

  const bestValue = criterion === "k1" ? sorted[0].k1Value : sorted[0].k2Value;

  return sorted.filter((item) => (criterion === "k1" ? item.k1Value === bestValue : item.k2Value === bestValue));
}

export function getIndependentSolutionsView(seed = SEED): IndependentSolutionsView {
  const objectMap = new Map(OBJECTS.map((item) => [item.id, item.name]));
  const expertRankings = createExpertRankings(seed);
  const k1Solutions = solveForCriterion(expertRankings, "k1", seed);
  const k2Solutions = solveForCriterion(expertRankings, "k2", seed);

  const toView = (candidate: Candidate, rank: number): IndependentSolution => ({
    rank,
    ordering: candidate.orderingIds.map((id) => objectMap.get(id) ?? `Об'єкт ${id}`),
    generationFound: candidate.generationFound,
    k1Value: candidate.k1Value,
    k2Value: candidate.k2Value,
  });

  return {
    objects: OBJECTS,
    expertRankings: expertRankings.map((ordering, index) => ({
      expertId: index + 1,
      ranking: ordering.map((id) => objectMap.get(id) ?? `Об'єкт ${id}`),
    })),
    k1Solutions: k1Solutions.map((candidate, index) => toView(candidate, index + 1)),
    k2Solutions: k2Solutions.map((candidate, index) => toView(candidate, index + 1)),
    meta: {
      seed,
      expertsCount: EXPERTS_COUNT,
      objectsCount: OBJECTS.length,
      populationSize: POPULATION_SIZE,
      generations: GENERATIONS,
      distanceName: "Сума модулів різниць рангів",
    },
  };
}
