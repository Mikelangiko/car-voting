import {
  calculateLab3,
  evaluatePermutation,
  normalizeLab3Input,
  type Lab3CalculationResult,
  type Lab3Input,
  type Lab3NormalizedExpert,
  type Lab3NormalizedInput,
  type Lab3Object,
  type Lab3PermutationRow,
} from "../lab3/index.ts";

export type Lab4ProcessorMode = 1 | 10;

export type Lab4SelectionState = {
  selectedObjectIds: number[];
  selectedObjects: Lab3Object[];
  activeExpertsCount: number;
  permutationsCount: number;
  processorsCount: number;
  isFullSelection: boolean;
  canRun: boolean;
  error: string | null;
};

export type Lab4WorkerTask = {
  type: "start";
  workerId: number;
  fixedFirstObjectId: number | null;
  fixedFirstObjectLabel: string;
  objectIds: number[];
  experts: Lab3NormalizedExpert[];
};

export type Lab4WorkerProgressMessage = {
  type: "progress";
  workerId: number;
  processed: number;
  total: number;
  fixedFirstObjectId: number | null;
};

export type Lab4WorkerDoneMessage = {
  type: "done";
  workerId: number;
  result: Lab4WorkerLocalResult;
};

export type Lab4WorkerErrorMessage = {
  type: "error";
  workerId: number;
  error: string;
};

export type Lab4WorkerMessage =
  | Lab4WorkerProgressMessage
  | Lab4WorkerDoneMessage
  | Lab4WorkerErrorMessage;

export type Lab4WorkerLocalResult = {
  workerId: number;
  fixedFirstObjectId: number | null;
  fixedFirstObjectLabel: string;
  permutationsEvaluated: number;
  minSum: number;
  minMax: number;
  bestBySum: number[][];
  bestByMax: number[][];
  durationMs: number;
};

export type Lab4ComparableResult = {
  permutationsEvaluated: number;
  minSum: number;
  minMax: number;
  bestBySum: number[][];
  bestByMax: number[][];
};

export type Lab4DistributedResult = {
  input: Lab3NormalizedInput;
  selection: Lab4SelectionState;
  workers: Lab4WorkerLocalResult[];
  permutationsEvaluated: number;
  minSum: number;
  minMax: number;
  durationMs: number;
  bestBySum: Lab3PermutationRow[];
  bestByMax: Lab3PermutationRow[];
  comparable: Lab4ComparableResult;
};

export type Lab4SerialResult = {
  input: Lab3NormalizedInput;
  selection: Lab4SelectionState;
  permutationsEvaluated: number;
  minSum: number;
  minMax: number;
  bestBySum: Lab3PermutationRow[];
  bestByMax: Lab3PermutationRow[];
  comparable: Lab4ComparableResult;
};

export type Lab4VerificationResult = {
  mode: "full";
  matches: boolean;
  comparedAgainst: string;
  summary: string;
  details: {
    permutationsEvaluated: boolean;
    minSum: boolean;
    minMax: boolean;
    bestBySum: boolean;
    bestByMax: boolean;
  };
};

export type Lab4SatisfactionMatrix = {
  compromiseOrderingIds: number[];
  compromiseOrderingLabels: string[];
  expertLabels: string[];
  objectRows: Array<{
    objectId: number;
    objectName: string;
    values: Array<number | null>;
  }>;
  sumRow: number[];
  penaltyRow: number[];
  totalDistanceRow: number[];
  satisfactionRow: number[];
  maxDistancePerExpert: number;
};

export const LAB4_DEFAULT_PROCESSOR_MODE: Lab4ProcessorMode = 10;
export const LAB4_PROCESSOR_MODE_OPTIONS: Lab4ProcessorMode[] = [1, 10];

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
  left: Pick<Lab3PermutationRow, "orderingIds" | "sum" | "max">,
  right: Pick<Lab3PermutationRow, "orderingIds" | "sum" | "max">
) {
  return left.sum - right.sum || left.max - right.max || compareOrdering(left.orderingIds, right.orderingIds);
}

function compareByMax(
  left: Pick<Lab3PermutationRow, "orderingIds" | "sum" | "max">,
  right: Pick<Lab3PermutationRow, "orderingIds" | "sum" | "max">
) {
  return left.max - right.max || left.sum - right.sum || compareOrdering(left.orderingIds, right.orderingIds);
}

function compareOrderingRows(left: number[], right: number[]) {
  return compareOrdering(left, right);
}

function cloneOrderingRows(rows: number[][]) {
  return rows.map((row) => [...row]);
}

function toOrderingRows(rows: Array<number[] | Pick<Lab3PermutationRow, "orderingIds">>) {
  return rows.map((row) => ("orderingIds" in row ? [...row.orderingIds] : [...row]));
}

function sortOrderingRows(rows: number[][]) {
  return cloneOrderingRows(rows).sort(compareOrderingRows);
}

function dedupeOrderingRows(rows: number[][]) {
  const unique = new Map<string, number[]>();

  for (const row of rows) {
    unique.set(row.join("-"), [...row]);
  }

  return Array.from(unique.values()).sort(compareOrderingRows);
}

function buildPermutationRow(orderingIds: number[], input: Lab3NormalizedInput): Lab3PermutationRow {
  const labels = new Map(input.objects.map((object) => [object.id, object.name]));
  const evaluation = evaluatePermutation(orderingIds, input.experts);

  return {
    orderingIds: [...orderingIds],
    orderingLabels: orderingIds.map((id) => labels.get(id) ?? `Об'єкт ${id}`),
    distances: evaluation.distances,
    sum: evaluation.sum,
    max: evaluation.max,
  };
}

export function factorial(value: number) {
  if (value <= 1) {
    return 1;
  }

  let result = 1;

  for (let index = 2; index <= value; index += 1) {
    result *= index;
  }

  return result;
}

function getNormalizedLab4Input(input: Lab3Input) {
  return normalizeLab3Input(input, {
    expectedObjectsCount: 10,
  });
}

function assertSupportedProcessorsCount(objectsCount: number, processorsCount: number) {
  if (processorsCount !== 1 && processorsCount !== objectsCount) {
    throw new Error(`Підтримуються лише режими 1 потік або ${objectsCount} потоків.`);
  }
}

export function getLab4SelectionState(input: Lab3Input, processorsCount: number): Lab4SelectionState {
  const normalizedInput = getNormalizedLab4Input(input);
  assertSupportedProcessorsCount(normalizedInput.objects.length, processorsCount);

  return {
    selectedObjectIds: normalizedInput.objects.map((object) => object.id),
    selectedObjects: normalizedInput.objects,
    activeExpertsCount: normalizedInput.experts.length,
    permutationsCount: factorial(normalizedInput.objects.length),
    processorsCount,
    isFullSelection: true,
    canRun: true,
    error: null,
  };
}

export function createLab4WorkerTasks(input: Lab3Input, processorsCount: number) {
  const normalizedInput = getNormalizedLab4Input(input);
  assertSupportedProcessorsCount(normalizedInput.objects.length, processorsCount);
  const objectIds = normalizedInput.objects.map((object) => object.id);
  const tasks: Lab4WorkerTask[] =
    processorsCount === 1
      ? [
          {
            type: "start",
            workerId: 1,
            fixedFirstObjectId: null,
            fixedFirstObjectLabel: "Усі перестановки",
            objectIds,
            experts: normalizedInput.experts,
          },
        ]
      : normalizedInput.objects.map((object, index) => ({
          type: "start" as const,
          workerId: index + 1,
          fixedFirstObjectId: object.id,
          fixedFirstObjectLabel: object.name,
          objectIds,
          experts: normalizedInput.experts,
        }));

  return {
    selection: getLab4SelectionState(input, processorsCount),
    input: normalizedInput,
    tasks,
  };
}

function evaluateOrdering(orderingIds: number[], experts: Lab3NormalizedExpert[]) {
  const positions = new Array<number>(Math.max(...orderingIds) + 1).fill(-1);

  for (let index = 0; index < orderingIds.length; index += 1) {
    positions[orderingIds[index]] = index;
  }

  let sum = 0;
  let max = 0;

  for (const expert of experts) {
    const distance =
      Math.abs(positions[expert.first] - 0) +
      Math.abs(positions[expert.second] - 1) +
      Math.abs(positions[expert.third] - 2);

    sum += distance;
    if (distance > max) {
      max = distance;
    }
  }

  return { sum, max };
}

export function executeLab4WorkerTask(task: Lab4WorkerTask): Lab4WorkerLocalResult {
  const startedAt = Date.now();
  const remainingIds =
    task.fixedFirstObjectId === null ? [...task.objectIds] : task.objectIds.filter((id) => id !== task.fixedFirstObjectId);
  const bestBySum: number[][] = [];
  const bestByMax: number[][] = [];
  let permutationsEvaluated = 0;
  let minSum = Number.POSITIVE_INFINITY;
  let minMax = Number.POSITIVE_INFINITY;

  const visit = (current: number[], rest: number[]) => {
    if (rest.length === 0) {
      const orderingIds =
        task.fixedFirstObjectId === null ? [...current] : [task.fixedFirstObjectId, ...current];
      const evaluation = evaluateOrdering(orderingIds, task.experts);

      permutationsEvaluated += 1;

      if (evaluation.sum < minSum) {
        minSum = evaluation.sum;
        bestBySum.length = 0;
        bestBySum.push(orderingIds);
      } else if (evaluation.sum === minSum) {
        bestBySum.push(orderingIds);
      }

      if (evaluation.max < minMax) {
        minMax = evaluation.max;
        bestByMax.length = 0;
        bestByMax.push(orderingIds);
      } else if (evaluation.max === minMax) {
        bestByMax.push(orderingIds);
      }

      return;
    }

    for (let index = 0; index < rest.length; index += 1) {
      const next = rest[index];
      const nextRest = rest.slice(0, index).concat(rest.slice(index + 1));
      current.push(next);
      visit(current, nextRest);
      current.pop();
    }
  };

  visit([], remainingIds);

  return {
    workerId: task.workerId,
    fixedFirstObjectId: task.fixedFirstObjectId,
    fixedFirstObjectLabel: task.fixedFirstObjectLabel,
    permutationsEvaluated,
    minSum,
    minMax,
    bestBySum: dedupeOrderingRows(bestBySum),
    bestByMax: dedupeOrderingRows(bestByMax),
    durationMs: Date.now() - startedAt,
  };
}

export function aggregateLab4WorkerResults(
  input: Lab3NormalizedInput,
  selection: Lab4SelectionState,
  workerResults: Lab4WorkerLocalResult[],
  durationMs: number
): Lab4DistributedResult {
  const sortedWorkers = [...workerResults].sort((left, right) => left.workerId - right.workerId);
  const permutationsEvaluated = sortedWorkers.reduce((total, worker) => total + worker.permutationsEvaluated, 0);
  const minSum = Math.min(...sortedWorkers.map((worker) => worker.minSum));
  const minMax = Math.min(...sortedWorkers.map((worker) => worker.minMax));
  const bestBySumOrderings = dedupeOrderingRows(
    sortedWorkers
      .filter((worker) => worker.minSum === minSum)
      .flatMap((worker) => worker.bestBySum)
  );
  const bestByMaxOrderings = dedupeOrderingRows(
    sortedWorkers
      .filter((worker) => worker.minMax === minMax)
      .flatMap((worker) => worker.bestByMax)
  );
  const bestBySum = bestBySumOrderings.map((orderingIds) => buildPermutationRow(orderingIds, input)).sort(compareBySum);
  const bestByMax = bestByMaxOrderings.map((orderingIds) => buildPermutationRow(orderingIds, input)).sort(compareByMax);
  const comparable = createLab4ComparableResult({
    permutationsEvaluated,
    minSum,
    minMax,
    bestBySum,
    bestByMax,
  });

  return {
    input,
    selection,
    workers: sortedWorkers,
    permutationsEvaluated,
    minSum,
    minMax,
    durationMs,
    bestBySum,
    bestByMax,
    comparable,
  };
}

export function createLab4ComparableResult(params: {
  permutationsEvaluated: number;
  minSum: number;
  minMax: number;
  bestBySum: Array<number[] | Pick<Lab3PermutationRow, "orderingIds">>;
  bestByMax: Array<number[] | Pick<Lab3PermutationRow, "orderingIds">>;
}): Lab4ComparableResult {
  return {
    permutationsEvaluated: params.permutationsEvaluated,
    minSum: params.minSum,
    minMax: params.minMax,
    bestBySum: sortOrderingRows(toOrderingRows(params.bestBySum)),
    bestByMax: sortOrderingRows(toOrderingRows(params.bestByMax)),
  };
}

export function createLab4ComparableResultFromLab3(result: Pick<
  Lab3CalculationResult,
  "summary" | "bestBySum" | "bestByMax"
>) {
  return createLab4ComparableResult({
    permutationsEvaluated: result.summary.permutationsEvaluated,
    minSum: result.summary.minSum,
    minMax: result.summary.minMax,
    bestBySum: result.bestBySum,
    bestByMax: result.bestByMax,
  });
}

export function calculateLab4SerialResult(input: Lab3Input): Lab4SerialResult {
  const normalizedInput = getNormalizedLab4Input(input);
  const calculation = calculateLab3(input, {
    expectedObjectsCount: 10,
  });
  const comparable = createLab4ComparableResultFromLab3(calculation);

  return {
    input: normalizedInput,
    selection: getLab4SelectionState(input, 1),
    permutationsEvaluated: calculation.summary.permutationsEvaluated,
    minSum: calculation.summary.minSum,
    minMax: calculation.summary.minMax,
    bestBySum: calculation.bestBySum,
    bestByMax: calculation.bestByMax,
    comparable,
  };
}

export function compareLab4ComparableResults(left: Lab4ComparableResult, right: Lab4ComparableResult) {
  return {
    permutationsEvaluated: left.permutationsEvaluated === right.permutationsEvaluated,
    minSum: left.minSum === right.minSum,
    minMax: left.minMax === right.minMax,
    bestBySum: JSON.stringify(left.bestBySum) === JSON.stringify(right.bestBySum),
    bestByMax: JSON.stringify(left.bestByMax) === JSON.stringify(right.bestByMax),
  };
}

export function buildLab4VerificationResult(params: {
  actual: Lab4ComparableResult;
  expected: Lab4ComparableResult;
  comparedAgainst: string;
}): Lab4VerificationResult {
  const details = compareLab4ComparableResults(params.actual, params.expected);
  const matches = Object.values(details).every(Boolean);

  return {
    mode: "full",
    matches,
    comparedAgainst: params.comparedAgainst,
    summary: matches
      ? "Результати повністю співпали."
      : "Виявлено розбіжність між розподіленим та еталонним результатом.",
    details,
  };
}

export function buildLab4SatisfactionMatrix(
  input: Lab3NormalizedInput,
  compromiseOrderingIds: number[]
): Lab4SatisfactionMatrix {
  const objectMap = new Map(input.objects.map((object) => [object.id, object.name]));
  const compromisePositions = new Map<number, number>();

  compromiseOrderingIds.forEach((objectId, index) => {
    compromisePositions.set(objectId, index);
  });

  const objectRows = input.objects.map((object) => ({
    objectId: object.id,
    objectName: object.name,
    values: input.experts.map((expert) => {
      if (expert.first === object.id) {
        return Math.abs((compromisePositions.get(object.id) ?? 0) - 0);
      }

      if (expert.second === object.id) {
        return Math.abs((compromisePositions.get(object.id) ?? 0) - 1);
      }

      if (expert.third === object.id) {
        return Math.abs((compromisePositions.get(object.id) ?? 0) - 2);
      }

      return null;
    }),
  }));
  const penaltyPerRemovedObject = Math.max(0, input.objects.length - 3);
  const sumRow = input.experts.map((_, expertIndex) =>
    objectRows.reduce((total, row) => total + (row.values[expertIndex] ?? 0), 0)
  );
  const penaltyRow = input.experts.map(() => 0);
  const totalDistanceRow = sumRow.map((value, index) => value + penaltyRow[index]);
  const maxDistancePerExpert = penaltyPerRemovedObject * 3;
  const satisfactionRow = totalDistanceRow.map((distance) =>
    Number((((maxDistancePerExpert - distance) / maxDistancePerExpert) * 100).toFixed(2))
  );

  return {
    compromiseOrderingIds: [...compromiseOrderingIds],
    compromiseOrderingLabels: compromiseOrderingIds.map((objectId) => objectMap.get(objectId) ?? `Об'єкт ${objectId}`),
    expertLabels: input.experts.map((expert) => `E.${expert.expertId}`),
    objectRows,
    sumRow,
    penaltyRow,
    totalDistanceRow,
    satisfactionRow,
    maxDistancePerExpert,
  };
}
