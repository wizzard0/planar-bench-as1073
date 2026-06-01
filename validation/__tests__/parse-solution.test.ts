import { describe, it, expect } from "bun:test";
import { findHorizontalPairs } from "../parse-solution.ts";

describe("findHorizontalPairs", () => {
  it("returns each same-row node pair exactly once", () => {
    expect(findHorizontalPairs({
      A: [0, 0],
      B: [2, 0],
      C: [4, 0],
      D: [0, 1],
    })).toEqual([
      ["A", "B"],
      ["A", "C"],
      ["B", "C"],
    ]);
  });
});
