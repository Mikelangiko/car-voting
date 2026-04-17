(function () {
  function dedupeOrderingRows(rows) {
    const unique = new Map();

    for (const row of rows) {
      unique.set(row.join("-"), row.slice());
    }

    return Array.from(unique.values()).sort(compareOrdering);
  }

  function compareOrdering(first, second) {
    const length = Math.min(first.length, second.length);

    for (let index = 0; index < length; index += 1) {
      if (first[index] !== second[index]) {
        return first[index] - second[index];
      }
    }

    return first.length - second.length;
  }

  function factorial(value) {
    if (value <= 1) {
      return 1;
    }

    let result = 1;

    for (let index = 2; index <= value; index += 1) {
      result *= index;
    }

    return result;
  }

  function evaluateOrdering(orderingIds, experts) {
    let maxId = 0;

    for (let index = 0; index < orderingIds.length; index += 1) {
      if (orderingIds[index] > maxId) {
        maxId = orderingIds[index];
      }
    }

    const positions = new Array(maxId + 1).fill(-1);

    for (let index = 0; index < orderingIds.length; index += 1) {
      positions[orderingIds[index]] = index;
    }

    let sum = 0;
    let max = 0;

    for (let index = 0; index < experts.length; index += 1) {
      const expert = experts[index];
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

  function executeTask(task) {
    const startedAt = Date.now();
    const remainingIds =
      task.fixedFirstObjectId === null
        ? task.objectIds.slice()
        : task.objectIds.filter(function (id) {
            return id !== task.fixedFirstObjectId;
          });
    const total = factorial(remainingIds.length);
    const bestBySum = [];
    const bestByMax = [];
    let permutationsEvaluated = 0;
    let minSum = Number.POSITIVE_INFINITY;
    let minMax = Number.POSITIVE_INFINITY;
    let lastReportedAt = Date.now();

    function reportProgress(force) {
      const now = Date.now();
      if (!force && now - lastReportedAt < 80) {
        return;
      }

      lastReportedAt = now;
      self.postMessage({
        type: "progress",
        workerId: task.workerId,
        processed: permutationsEvaluated,
        total: total,
        fixedFirstObjectId: task.fixedFirstObjectId,
      });
    }

    function visit(current, rest) {
      if (rest.length === 0) {
        const orderingIds =
          task.fixedFirstObjectId === null ? current.slice() : [task.fixedFirstObjectId].concat(current);
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

        reportProgress(permutationsEvaluated === total);
        return;
      }

      for (let index = 0; index < rest.length; index += 1) {
        const next = rest[index];
        const nextRest = rest.slice(0, index).concat(rest.slice(index + 1));
        current.push(next);
        visit(current, nextRest);
        current.pop();
      }
    }

    reportProgress(true);
    visit([], remainingIds);

    return {
      workerId: task.workerId,
      fixedFirstObjectId: task.fixedFirstObjectId,
      fixedFirstObjectLabel: task.fixedFirstObjectLabel,
      permutationsEvaluated: permutationsEvaluated,
      minSum: minSum,
      minMax: minMax,
      bestBySum: dedupeOrderingRows(bestBySum),
      bestByMax: dedupeOrderingRows(bestByMax),
      durationMs: Date.now() - startedAt,
    };
  }

  self.onmessage = function (event) {
    const task = event.data;

    if (!task || task.type !== "start") {
      return;
    }

    try {
      const result = executeTask(task);
      self.postMessage({
        type: "done",
        workerId: task.workerId,
        result: result,
      });
    } catch (error) {
      self.postMessage({
        type: "error",
        workerId: task.workerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
})();
