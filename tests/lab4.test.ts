import assert from "node:assert/strict";

import lab3InputJson from "../data/lab3/input.json" with { type: "json" };
import { calculateLab3, generatePermutations, normalizeLab3Input, type Lab3Input } from "../lib/lab3/index.ts";
import {
  aggregateLab4WorkerResults,
  buildLab4SatisfactionMatrix,
  buildLab4VerificationResult,
  calculateLab4SerialResult,
  createLab4ComparableResultFromLab3,
  createLab4WorkerTasks,
  executeLab4WorkerTask,
  factorial,
  getLab4SelectionState,
  type Lab4WorkerTask,
} from "../lib/lab4/index.ts";

function run() {
  const smallInput: Lab3Input = {
    objects: [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
      { id: 3, name: "C" },
      { id: 4, name: "D" },
    ],
    experts: [
      { expertId: 1, first: 1, second: 2, third: 3 },
      { expertId: 2, first: 2, second: 3, third: 4 },
      { expertId: 3, first: 4, second: 2, third: 1 },
    ],
  };

  const normalizedSmallInput = normalizeLab3Input(smallInput);
  const objectIds = normalizedSmallInput.objects.map((object) => object.id);
  const splitTasks: Lab4WorkerTask[] = normalizedSmallInput.objects.map((object, index) => ({
    type: "start",
    workerId: index + 1,
    fixedFirstObjectId: object.id,
    fixedFirstObjectLabel: object.name,
    objectIds,
    experts: normalizedSmallInput.experts,
  }));
  const singleTask: Lab4WorkerTask = {
    type: "start",
    workerId: 1,
    fixedFirstObjectId: null,
    fixedFirstObjectLabel: "Усі перестановки",
    objectIds,
    experts: normalizedSmallInput.experts,
  };
  const groupedPermutations = new Map<number, number>();
  const allPermutations = generatePermutations(objectIds);

  for (const permutation of allPermutations) {
    groupedPermutations.set(permutation[0], (groupedPermutations.get(permutation[0]) ?? 0) + 1);
  }

  assert.equal(splitTasks.length, objectIds.length);
  assert.deepEqual(
    splitTasks.map((task) => task.fixedFirstObjectId),
    objectIds
  );
  assert.equal(allPermutations.length, factorial(objectIds.length));
  assert.deepEqual(
    Array.from(groupedPermutations.values()).sort((left, right) => left - right),
    Array.from({ length: objectIds.length }, () => factorial(objectIds.length - 1))
  );

  const splitResults = splitTasks.map((task) => executeLab4WorkerTask(task));
  const splitDistributed = aggregateLab4WorkerResults(
    normalizedSmallInput,
    {
      selectedObjectIds: objectIds,
      selectedObjects: normalizedSmallInput.objects,
      activeExpertsCount: normalizedSmallInput.experts.length,
      permutationsCount: factorial(objectIds.length),
      processorsCount: objectIds.length,
      isFullSelection: true,
      canRun: true,
      error: null,
    },
    splitResults,
    0
  );
  const singleDistributed = aggregateLab4WorkerResults(
    normalizedSmallInput,
    {
      selectedObjectIds: objectIds,
      selectedObjects: normalizedSmallInput.objects,
      activeExpertsCount: normalizedSmallInput.experts.length,
      permutationsCount: factorial(objectIds.length),
      processorsCount: 1,
      isFullSelection: true,
      canRun: true,
      error: null,
    },
    [executeLab4WorkerTask(singleTask)],
    0
  );

  assert.equal(splitDistributed.permutationsEvaluated, factorial(objectIds.length));
  assert.equal(singleDistributed.permutationsEvaluated, factorial(objectIds.length));
  assert.deepEqual(splitDistributed.comparable, singleDistributed.comparable);

  const fullInput = lab3InputJson as Lab3Input;
  const selectionOne = getLab4SelectionState(fullInput, 1);
  const selectionTen = getLab4SelectionState(fullInput, 10);
  assert.equal(selectionOne.permutationsCount, 3628800);
  assert.equal(selectionOne.processorsCount, 1);
  assert.equal(selectionTen.permutationsCount, 3628800);
  assert.equal(selectionTen.processorsCount, 10);

  const fullTasksOne = createLab4WorkerTasks(fullInput, 1);
  const fullTasksTen = createLab4WorkerTasks(fullInput, 10);
  assert.equal(fullTasksOne.tasks.length, 1);
  assert.equal(fullTasksOne.tasks[0].fixedFirstObjectId, null);
  assert.equal(fullTasksTen.tasks.length, 10);
  assert.deepEqual(
    fullTasksTen.tasks.map((task) => task.fixedFirstObjectId),
    fullInput.objects.map((object) => object.id)
  );

  const fullLab4 = calculateLab4SerialResult(fullInput);
  const satisfactionMatrix = buildLab4SatisfactionMatrix(fullLab4.input, fullLab4.bestBySum[0].orderingIds);
  assert.equal(satisfactionMatrix.objectRows.length, 10);
  assert.equal(satisfactionMatrix.expertLabels.length, fullLab4.input.experts.length);
  assert.equal(satisfactionMatrix.maxDistancePerExpert, 21);
  assert.equal(satisfactionMatrix.totalDistanceRow.length, fullLab4.input.experts.length);
  assert.ok(satisfactionMatrix.satisfactionRow.every((value) => value >= 0 && value <= 100));
  const fullLab3 = calculateLab3(fullInput, {
    expectedObjectsCount: 10,
    topLimit: 10,
  });
  const verification = buildLab4VerificationResult({
    actual: fullLab4.comparable,
    expected: createLab4ComparableResultFromLab3(fullLab3),
    comparedAgainst: "Лаба 3",
  });

  assert.equal(verification.matches, true);
  assert.equal(verification.mode, "full");
  assert.ok(Object.values(verification.details).every(Boolean));

  console.log("lab4 tests passed");
}

run();
