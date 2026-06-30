import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreMatch, scorePrediction } from "./scoring.ts";

describe("scoreMatch (regulation)", () => {
  it("awards 3 for exact score", () => {
    assert.equal(scoreMatch([2, 1], [2, 1]), 3);
  });

  it("awards 2 for winner and margin", () => {
    assert.equal(scoreMatch([2, 1], [3, 2]), 2);
  });
});

describe("scorePrediction (penalty shootouts)", () => {
  const actual = { ftScore: [1, 1] as [number, number], pkWinner: "away" as const };

  it("exact tied score + correct PK = 3", () => {
    assert.equal(
      scorePrediction({ home: 1, away: 1, pkWinner: "away" }, actual),
      3,
    );
  });

  it("exact tied score + wrong PK = 2", () => {
    assert.equal(
      scorePrediction({ home: 1, away: 1, pkWinner: "home" }, actual),
      2,
    );
  });

  it("other tied score + correct PK = 2", () => {
    assert.equal(
      scorePrediction({ home: 2, away: 2, pkWinner: "away" }, actual),
      2,
    );
  });

  it("other tied score + wrong PK = 1", () => {
    assert.equal(
      scorePrediction({ home: 0, away: 0, pkWinner: "home" }, actual),
      1,
    );
  });

  it("non-tied prediction when match went to PKs = 0 (+1 if PK picked correctly without tie)", () => {
    assert.equal(
      scorePrediction({ home: 2, away: 1, pkWinner: null }, actual),
      0,
    );
  });

  it("caps at 3 points", () => {
    assert.equal(
      scorePrediction({ home: 1, away: 1, pkWinner: "away" }, actual),
      3,
    );
  });

  it("uses standard scoring when match did not go to PKs", () => {
    assert.equal(
      scorePrediction(
        { home: 2, away: 1, pkWinner: null },
        { ftScore: [2, 1], pkWinner: null },
      ),
      3,
    );
  });
});
