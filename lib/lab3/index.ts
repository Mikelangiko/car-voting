export type Lab3Object = {
  id: number;
  name: string;
  year?: number | null;
};

export type Lab3ExpertInput = {
  expertId: number;
  first: number | null;
  second: number | null;
  third: number | null;
};

export type Lab3Input = {
  objects: Lab3Object[];
  experts: Lab3ExpertInput[];
};

export type Lab3NormalizedExpert = {
  expertId: number;
  first: number;
  second: number;
  third: number;
};

export type Lab3NormalizedInput = {
  objects: Lab3Object[];
  experts: Lab3NormalizedExpert[];
};

export type Lab3SurveyMatrix = {
  labels: string[];
  rows: {
    label: string;
    values: number[];
  }[];
};

export type Lab3RankMatrixRow = {
  objectId: number;
  objectName: string;
  values: number[];
};

export type Lab3PermutationRow = {
  orderingIds: number[];
  orderingLabels: string[];
  distances: number[];
  sum: number;
  max: number;
};

export type Lab3WorkedExample = {
  title: string;
  description: string;
  row: Lab3PermutationRow;
};

export type Lab3CalculationResult = {
  input: Lab3NormalizedInput;
  surveyMatrix: Lab3SurveyMatrix;
  rankMatrix: Lab3RankMatrixRow[];
  summary: {
    objectsCount: number;
    expertsCount: number;
    permutationsEvaluated: number;
    minSum: number;
    minMax: number;
    durationMs: number;
  };
  bestBySum: Lab3PermutationRow[];
  bestByMax: Lab3PermutationRow[];
  topBySum: Lab3PermutationRow[];
  topByMax: Lab3PermutationRow[];
  workedExamples: Lab3WorkedExample[];
};

export const LAB3_OBJECTS_COUNT = 10;
export const LAB3_DEFAULT_EXPERTS_COUNT = 16;

const SAMPLE_EXPERT_TRIPLES: Array<[number, number, number]> = [
  [1, 2, 3],
  [1, 4, 2],
  [2, 1, 5],
  [3, 2, 1],
  [4, 5, 2],
  [5, 4, 6],
  [6, 3, 4],
  [7, 6, 5],
  [8, 7, 6],
  [9, 8, 7],
  [10, 9, 8],
  [3, 6, 9],
  [2, 7, 10],
  [5, 8, 1],
  [4, 10, 3],
  [6, 1, 7],
];

const WORKED_EXAMPLE_EXPERTS: Array<[number, number, number]> = [
  [1, 2, 3],
  [2, 5, 7],
  [4, 3, 2],
  [1, 3, 5],
  [7, 3, 5],
  [4, 2, 7],
  [6, 4, 3],
  [3, 1, 6],
  [2, 5, 4],
  [2, 3, 1],
  [3, 2, 1],
  [3, 1, 6],
  [4, 1, 6],
  [6, 5, 7],
  [6, 5, 7],
  [7, 5, 2],
];

function coerceRank(value: number | null | undefined) {
  if (value === null || value === undefined || value === 0) {
    return null;
  }

  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.trunc(value);
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

function compareBySum(
  left: Pick<Lab3PermutationRow, "sum" | "max" | "orderingIds">,
  right: Pick<Lab3PermutationRow, "sum" | "max" | "orderingIds">
) {
  return left.sum - right.sum || left.max - right.max || compareOrdering(left.orderingIds, right.orderingIds);
}

function compareByMax(
  left: Pick<Lab3PermutationRow, "sum" | "max" | "orderingIds">,
  right: Pick<Lab3PermutationRow, "sum" | "max" | "orderingIds">
) {
  return left.max - right.max || left.sum - right.sum || compareOrdering(left.orderingIds, right.orderingIds);
}

function insertSorted(
  rows: Lab3PermutationRow[],
  row: Lab3PermutationRow,
  limit: number,
  comparator: (left: Lab3PermutationRow, right: Lab3PermutationRow) => number
) {
  if (rows.some((item) => item.orderingIds.length === row.orderingIds.length && compareOrdering(item.orderingIds, row.orderingIds) === 0)) {
    return;
  }

  let insertIndex = rows.findIndex((item) => comparator(row, item) < 0);

  if (insertIndex === -1) {
    insertIndex = rows.length;
  }

  rows.splice(insertIndex, 0, row);

  if (rows.length > limit) {
    rows.length = limit;
  }
}

function buildPermutationRow(
  orderingIds: number[],
  distances: number[],
  sum: number,
  max: number,
  objectMap: Map<number, string>
): Lab3PermutationRow {
  return {
    orderingIds: [...orderingIds],
    orderingLabels: orderingIds.map((id) => objectMap.get(id) ?? `Об'єкт ${id}`),
    distances: [...distances],
    sum,
    max,
  };
}

function buildWorkedExamples(
  bestBySum: Lab3PermutationRow[],
  bestByMax: Lab3PermutationRow[],
  topBySum: Lab3PermutationRow[]
): Lab3WorkedExample[] {
  const unique = new Map<string, Lab3PermutationRow>();

  for (const row of [...bestBySum, ...bestByMax, ...topBySum]) {
    const key = row.orderingIds.join("-");
    if (!unique.has(key)) {
      unique.set(key, row);
    }
  }

  const rows = Array.from(unique.values()).slice(0, 3);

  return rows.map((row, index) => ({
    title:
      index === 0
        ? "Приклад 1: найкраща перестановка за сумою"
        : index === 1
        ? "Приклад 2: альтернатива для порівняння"
        : "Приклад 3: ще один сильний варіант",
    description: "Показує відстані до кожного експерта, їхню суму та максимум для однієї перестановки.",
    row,
  }));
}

export function createDefaultLab3Input(): Lab3Input {
  return {
    objects: Array.from({ length: LAB3_OBJECTS_COUNT }, (_, index) => ({
      id: index + 1,
      name: `Об'єкт ${index + 1}`,
    })),
    experts: Array.from({ length: LAB3_DEFAULT_EXPERTS_COUNT }, (_, index) => ({
      expertId: index + 1,
      first: null,
      second: null,
      third: null,
    })),
  };
}

export function createSampleLab3Input(): Lab3Input {
  return {
    objects: Array.from({ length: LAB3_OBJECTS_COUNT }, (_, index) => ({
      id: index + 1,
      name: `Об'єкт ${index + 1}`,
    })),
    experts: SAMPLE_EXPERT_TRIPLES.map(([first, second, third], index) => ({
      expertId: index + 1,
      first,
      second,
      third,
    })),
  };
}

export function createWorkedExampleInput(): Lab3Input {
  return {
    objects: Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      name: `Об'єкт ${index + 1}`,
    })),
    experts: WORKED_EXAMPLE_EXPERTS.map(([first, second, third], index) => ({
      expertId: index + 1,
      first,
      second,
      third,
    })),
  };
}

export function normalizeLab3Input(
  input: Lab3Input,
  options?: {
    expectedObjectsCount?: number;
  }
): Lab3NormalizedInput {
  const objects = (input.objects ?? []).map((object, index) => ({
    id: Number.isFinite(object.id) ? Math.trunc(object.id) : index + 1,
    name: object.name?.trim() || `Об'єкт ${index + 1}`,
    year: object.year ?? null,
  }));

  const expectedObjectsCount = options?.expectedObjectsCount;
  if (expectedObjectsCount !== undefined && objects.length !== expectedObjectsCount) {
    throw new Error(`Очікується рівно ${expectedObjectsCount} об'єктів.`);
  }

  const uniqueObjectIds = new Set(objects.map((object) => object.id));
  if (uniqueObjectIds.size !== objects.length) {
    throw new Error("Ідентифікатори об'єктів повинні бути унікальними.");
  }

  const objectIds = new Set(objects.map((object) => object.id));
  const experts: Lab3NormalizedExpert[] = [];

  for (const expert of input.experts ?? []) {
    const first = coerceRank(expert.first);
    const second = coerceRank(expert.second);
    const third = coerceRank(expert.third);
    const values = [first, second, third];
    const filledValues = values.filter((value): value is number => value !== null);

    if (filledValues.length === 0) {
      continue;
    }

    if (filledValues.length !== 3) {
      throw new Error(`Експерт ${expert.expertId} має заповнити всі 3 позиції.`);
    }

    if (new Set(filledValues).size !== 3) {
      throw new Error(`Експерт ${expert.expertId} не може вибирати один і той самий об'єкт кілька разів.`);
    }

    for (const value of filledValues) {
      if (!objectIds.has(value)) {
        throw new Error(`Експерт ${expert.expertId} посилається на неіснуючий об'єкт ${value}.`);
      }
    }

    experts.push({
      expertId: expert.expertId,
      first: filledValues[0],
      second: filledValues[1],
      third: filledValues[2],
    });
  }

  if (experts.length === 0) {
    throw new Error("Потрібно заповнити хоча б одного експерта.");
  }

  return { objects, experts };
}

export function buildSurveyMatrix(experts: Lab3NormalizedExpert[]): Lab3SurveyMatrix {
  return {
    labels: experts.map((expert) => `Експерт ${expert.expertId}`),
    rows: [
      { label: "1 місце", values: experts.map((expert) => expert.first) },
      { label: "2 місце", values: experts.map((expert) => expert.second) },
      { label: "3 місце", values: experts.map((expert) => expert.third) },
    ],
  };
}

export function buildRankMatrix(objects: Lab3Object[], experts: Lab3NormalizedExpert[]): Lab3RankMatrixRow[] {
  return objects.map((object) => ({
    objectId: object.id,
    objectName: object.name,
    values: experts.map((expert) => {
      if (expert.first === object.id) {
        return 1;
      }
      if (expert.second === object.id) {
        return 2;
      }
      if (expert.third === object.id) {
        return 3;
      }
      return 0;
    }),
  }));
}

export function generatePermutations(ids: number[]): number[][] {
  const rows: number[][] = [];
  forEachPermutation(ids, (ordering) => {
    rows.push([...ordering]);
  });
  return rows;
}

export function forEachPermutation(ids: number[], callback: (ordering: number[]) => void) {
  const working = [...ids];

  const walk = (index: number) => {
    if (index === working.length - 1) {
      callback(working);
      return;
    }

    for (let swapIndex = index; swapIndex < working.length; swapIndex += 1) {
      [working[index], working[swapIndex]] = [working[swapIndex], working[index]];
      walk(index + 1);
      [working[index], working[swapIndex]] = [working[swapIndex], working[index]];
    }
  };

  walk(0);
}

export function distanceToExpert(ordering: number[], expert: Lab3NormalizedExpert) {
  const positions = new Map<number, number>();
  ordering.forEach((id, index) => positions.set(id, index));

  return (
    Math.abs((positions.get(expert.first) ?? 0) - 0) +
    Math.abs((positions.get(expert.second) ?? 0) - 1) +
    Math.abs((positions.get(expert.third) ?? 0) - 2)
  );
}

export function evaluatePermutation(ordering: number[], experts: Lab3NormalizedExpert[]) {
  const distances = experts.map((expert) => distanceToExpert(ordering, expert));
  const sum = distances.reduce((total, value) => total + value, 0);
  const max = Math.max(...distances);

  return { distances, sum, max };
}

export function calculateLab3(
  input: Lab3Input,
  options?: {
    expectedObjectsCount?: number;
    topLimit?: number;
  }
): Lab3CalculationResult {
  const startedAt = Date.now();
  const normalized = normalizeLab3Input(input, {
    expectedObjectsCount: options?.expectedObjectsCount,
  });
  const objectMap = new Map(normalized.objects.map((object) => [object.id, object.name]));
  const ids = normalized.objects.map((object) => object.id);
  const topLimit = options?.topLimit ?? 25;

  const surveyMatrix = buildSurveyMatrix(normalized.experts);
  const rankMatrix = buildRankMatrix(normalized.objects, normalized.experts);
  let permutationsEvaluated = 0;
  let minSum = Number.POSITIVE_INFINITY;
  let minMax = Number.POSITIVE_INFINITY;

  const bestBySum: Lab3PermutationRow[] = [];
  const bestByMax: Lab3PermutationRow[] = [];
  const topBySum: Lab3PermutationRow[] = [];
  const topByMax: Lab3PermutationRow[] = [];

  forEachPermutation(ids, (ordering) => {
    const positions = new Array<number>(ids.length + 1).fill(-1);
    for (let index = 0; index < ordering.length; index += 1) {
      positions[ordering[index]] = index;
    }

    const distances = new Array<number>(normalized.experts.length).fill(0);
    let sum = 0;
    let max = 0;

    for (let index = 0; index < normalized.experts.length; index += 1) {
      const expert = normalized.experts[index];
      const distance =
        Math.abs(positions[expert.first] - 0) +
        Math.abs(positions[expert.second] - 1) +
        Math.abs(positions[expert.third] - 2);

      distances[index] = distance;
      sum += distance;
      if (distance > max) {
        max = distance;
      }
    }

    permutationsEvaluated += 1;

    const shouldUpdateBestSum = sum < minSum;
    const shouldAppendBestSum = sum === minSum;
    const shouldUpdateBestMax = max < minMax;
    const shouldAppendBestMax = max === minMax;
    const shouldTrackTopSum =
      topBySum.length < topLimit ||
      compareBySum(
        { orderingIds: ordering, sum, max },
        topBySum[topBySum.length - 1]
      ) < 0;
    const shouldTrackTopMax =
      topByMax.length < topLimit ||
      compareByMax(
        { orderingIds: ordering, sum, max },
        topByMax[topByMax.length - 1]
      ) < 0;

    if (
      !shouldUpdateBestSum &&
      !shouldAppendBestSum &&
      !shouldUpdateBestMax &&
      !shouldAppendBestMax &&
      !shouldTrackTopSum &&
      !shouldTrackTopMax
    ) {
      return;
    }

    const row = buildPermutationRow(ordering, distances, sum, max, objectMap);

    if (shouldUpdateBestSum) {
      minSum = sum;
      bestBySum.length = 0;
      bestBySum.push(row);
    } else if (shouldAppendBestSum) {
      bestBySum.push(row);
    }

    if (shouldUpdateBestMax) {
      minMax = max;
      bestByMax.length = 0;
      bestByMax.push(row);
    } else if (shouldAppendBestMax) {
      bestByMax.push(row);
    }

    if (shouldTrackTopSum) {
      insertSorted(topBySum, row, topLimit, compareBySum);
    }

    if (shouldTrackTopMax) {
      insertSorted(topByMax, row, topLimit, compareByMax);
    }
  });

  bestBySum.sort(compareBySum);
  bestByMax.sort(compareByMax);

  return {
    input: normalized,
    surveyMatrix,
    rankMatrix,
    summary: {
      objectsCount: normalized.objects.length,
      expertsCount: normalized.experts.length,
      permutationsEvaluated,
      minSum,
      minMax,
      durationMs: Date.now() - startedAt,
    },
    bestBySum,
    bestByMax,
    topBySum,
    topByMax,
    workedExamples: buildWorkedExamples(bestBySum, bestByMax, topBySum),
  };
}

export function getWorkedExampleScenario() {
  const input = createWorkedExampleInput();
  const result = calculateLab3(input, {
    expectedObjectsCount: 7,
    topLimit: 10,
  });

  return {
    input,
    result,
  };
}
