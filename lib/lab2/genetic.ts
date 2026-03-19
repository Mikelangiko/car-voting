export type RankedCar = {
  id: number;
  name: string;
  year: number | null;
  points: number;
};

export type ImportanceIndexRow = RankedCar & {
  rank: number;
  importanceIndex: number;
};

export type GeneticRatingRow = {
  setId: number;
  fitness: number;
  bestCarId: number;
  bestCarName: string;
  top3: string[];
  scores: number[];
};

export type GeneticResult = {
  importanceTable: ImportanceIndexRow[];
  generatedRatings: GeneticRatingRow[];
};

type Chromosome = {
  genes: number[];
  fitness: number;
};

const POPULATION_SIZE = 40;
const GENERATIONS = 18;
const ELITE_COUNT = 8;
const MUTATION_RATE = 0.14;

function createSeed(cars: RankedCar[]) {
  let seed = 0x9e3779b9;

  for (const car of cars) {
    const text = `${car.id}:${car.name}:${car.year ?? ""}:${car.points}`;
    for (let i = 0; i < text.length; i += 1) {
      seed = Math.imul(seed ^ text.charCodeAt(i), 2654435761) >>> 0;
    }
  }

  return seed >>> 0;
}

function createRng(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function buildImportanceTable(cars: RankedCar[]): ImportanceIndexRow[] {
  const maxPoints = Math.max(...cars.map((car) => car.points), 1);

  return cars.map((car, index) => ({
    ...car,
    rank: index + 1,
    importanceIndex: round2((car.points / maxPoints) * 100),
  }));
}

function evaluateFitness(genes: number[], target: number[]) {
  let alignment = 0;
  let distancePenalty = 0;
  let orderPenalty = 0;

  for (let i = 0; i < genes.length; i += 1) {
    alignment += genes[i] * target[i];
    distancePenalty += Math.abs(genes[i] - target[i]);
  }

  for (let i = 0; i < genes.length; i += 1) {
    for (let j = i + 1; j < genes.length; j += 1) {
      if (target[i] > target[j] && genes[i] < genes[j]) {
        orderPenalty += target[i] - target[j];
      }
    }
  }

  return round2(alignment - distancePenalty * 8 - orderPenalty * 3);
}

function createChromosome(target: number[], rng: () => number): Chromosome {
  const genes = target.map((value) => {
    const noise = (rng() - 0.5) * 24;
    const scale = 0.92 + rng() * 0.2;
    return round2(clamp(value * scale + noise, 0, 100));
  });

  return {
    genes,
    fitness: evaluateFitness(genes, target),
  };
}

function crossover(a: Chromosome, b: Chromosome, rng: () => number, target: number[]) {
  const genes = a.genes.map((gene, index) => {
    const mix = 0.35 + rng() * 0.3;
    const blended = gene * mix + b.genes[index] * (1 - mix);
    const drift = (rng() - 0.5) * 8;
    return round2(clamp(blended + drift, 0, 100));
  });

  return {
    genes,
    fitness: evaluateFitness(genes, target),
  };
}

function mutate(chromosome: Chromosome, rng: () => number, target: number[]) {
  const genes = chromosome.genes.map((gene, index) => {
    if (rng() > MUTATION_RATE) {
      return gene;
    }

    const attraction = (target[index] - gene) * (0.2 + rng() * 0.4);
    const mutation = (rng() - 0.5) * 18;
    return round2(clamp(gene + attraction + mutation, 0, 100));
  });

  return {
    genes,
    fitness: evaluateFitness(genes, target),
  };
}

function pickParent(population: Chromosome[], rng: () => number) {
  const tournamentSize = 4;
  let best = population[Math.floor(rng() * population.length)];

  for (let i = 1; i < tournamentSize; i += 1) {
    const candidate = population[Math.floor(rng() * population.length)];
    if (candidate.fitness > best.fitness) {
      best = candidate;
    }
  }

  return best;
}

export function runGeneticAlgorithm(cars: RankedCar[], seedOverride?: number): GeneticResult {
  const importanceTable = buildImportanceTable(cars);
  const target = importanceTable.map((item) => item.importanceIndex);
  const rng = createRng(seedOverride ?? createSeed(cars));

  let population = Array.from({ length: POPULATION_SIZE }, () => createChromosome(target, rng)).sort(
    (a, b) => b.fitness - a.fitness
  );

  for (let generation = 0; generation < GENERATIONS; generation += 1) {
    const nextPopulation = population.slice(0, ELITE_COUNT);

    while (nextPopulation.length < POPULATION_SIZE) {
      const parentA = pickParent(population, rng);
      const parentB = pickParent(population, rng);
      const child = mutate(crossover(parentA, parentB, rng, target), rng, target);
      nextPopulation.push(child);
    }

    population = nextPopulation.sort((a, b) => b.fitness - a.fitness);
  }

  const generatedRatings = population.map((chromosome, index) => {
    const sortedCars = chromosome.genes
      .map((score, geneIndex) => ({
        score,
        car: importanceTable[geneIndex],
      }))
      .sort((a, b) => b.score - a.score || a.car.rank - b.car.rank);

    return {
      setId: index + 1,
      fitness: chromosome.fitness,
      bestCarId: sortedCars[0].car.id,
      bestCarName: sortedCars[0].car.name,
      top3: sortedCars.slice(0, 3).map((item) => item.car.name),
      scores: chromosome.genes,
    };
  });

  return {
    importanceTable,
    generatedRatings,
  };
}
