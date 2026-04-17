import assert from "node:assert/strict";

import { buildRankMatrix, calculateLab3, distanceToExpert, generatePermutations, type Lab3Input } from "../lib/lab3/index.ts";
import { runLab3GeneticAlgorithm } from "../lib/lab3/genetic.ts";
import { generateFullExpertRankings, generateLab3Input } from "../lib/lab3/generateInput.ts";

function run() {
  const rankMatrix = buildRankMatrix(
    [
      { id: 1, name: "Об'єкт 1" },
      { id: 2, name: "Об'єкт 2" },
      { id: 3, name: "Об'єкт 3" },
      { id: 4, name: "Об'єкт 4" },
    ],
    [{ expertId: 1, first: 2, second: 4, third: 1 }]
  );

  assert.deepEqual(
    rankMatrix.map((row) => row.values[0]),
    [3, 1, 0, 2]
  );

  assert.equal(
    distanceToExpert([1, 2, 3, 4], {
      expertId: 1,
      first: 2,
      second: 4,
      third: 1,
    }),
    5
  );

  const permutations = generatePermutations([1, 2, 3]);
  assert.equal(permutations.length, 6);
  assert.deepEqual(permutations[0], [1, 2, 3]);
  assert.ok(permutations.some((row) => row.join("-") === "3-2-1"));

  const input: Lab3Input = {
    objects: [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
      { id: 3, name: "C" },
      { id: 4, name: "D" },
    ],
    experts: [
      { expertId: 1, first: 1, second: 2, third: 3 },
      { expertId: 2, first: 2, second: 3, third: 4 },
      { expertId: 3, first: 1, second: 3, third: 4 },
    ],
  };

  const result = calculateLab3(input, {
    expectedObjectsCount: 4,
    topLimit: 5,
  });

  assert.equal(result.summary.permutationsEvaluated, 24);
  assert.equal(result.summary.minSum, 5);
  assert.equal(result.summary.minMax, 3);
  assert.deepEqual(result.bestBySum[0].orderingIds, [1, 2, 3, 4]);

  const invalidInput: Lab3Input = {
    objects: Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      name: `Об'єкт ${index + 1}`,
    })),
    experts: [{ expertId: 1, first: 1, second: 1, third: 3 }],
  };

  assert.throws(() => {
    calculateLab3(invalidInput, {
      expectedObjectsCount: 10,
      topLimit: 3,
    });
  }, /не може вибирати один і той самий об'єкт/);

  const objects = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    name: `Object ${index + 1}`,
  }));

  const expertRankings = generateFullExpertRankings(12345, 10, objects);
  assert.equal(expertRankings.length, 10);
  assert.ok(
    expertRankings.every((ranking) => ranking.orderingIds.length === 10 && new Set(ranking.orderingIds).size === 10)
  );
  const top3ExpertRankings = expertRankings.map((ranking) => ({
    expertId: ranking.expertId,
    first: ranking.orderingIds[0],
    second: ranking.orderingIds[1],
    third: ranking.orderingIds[2],
  }));

  const geneticA = runLab3GeneticAlgorithm(objects, top3ExpertRankings, 12345);
  const geneticB = runLab3GeneticAlgorithm(objects, top3ExpertRankings, 12345);

  assert.equal(geneticA.meta.rankingsCount, 10);
  assert.ok(geneticA.bestBySum.length > 0);
  assert.ok(geneticA.bestByMax.length > 0);
  assert.ok(Number.isFinite(geneticA.minSum));
  assert.ok(Number.isFinite(geneticA.minMax));
  assert.deepEqual(geneticA.bestBySum, geneticB.bestBySum);
  assert.deepEqual(geneticA.bestByMax, geneticB.bestByMax);
  assert.ok(geneticA.bestBySum.every((row) => row.orderingIds.length === 10 && new Set(row.orderingIds).size === 10));
  assert.ok(geneticA.bestByMax.every((row) => row.orderingIds.length === 10 && new Set(row.orderingIds).size === 10));

  const variantInput = generateLab3Input(20260410, 8, 11);
  const geneticVariant = runLab3GeneticAlgorithm(
    variantInput.objects,
    variantInput.experts.map((expert) => ({
      expertId: expert.expertId,
      first: expert.first ?? 0,
      second: expert.second ?? 0,
      third: expert.third ?? 0,
    })),
    20260410
  );

  assert.equal(variantInput.objects.length, 11);
  assert.equal(variantInput.experts.length, 8);
  assert.ok(variantInput.objects.every((object) => Number.isInteger(object.id)));
  assert.ok(
    variantInput.experts.every(
      (expert) =>
        expert.first !== null &&
        expert.second !== null &&
        expert.third !== null &&
        new Set([expert.first, expert.second, expert.third]).size === 3
    )
  );
  assert.ok(geneticVariant.bestBySum.length > 0);
  assert.ok(geneticVariant.bestByMax.length > 0);
  assert.ok(geneticVariant.bestBySum.every((row) => row.orderingIds.length === 11 && new Set(row.orderingIds).size === 11));
  assert.ok(geneticVariant.bestByMax.every((row) => row.orderingIds.length === 11 && new Set(row.orderingIds).size === 11));

  console.log("lab3 tests passed");
}

run();
