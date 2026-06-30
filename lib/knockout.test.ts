import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isKnockoutMatch, pkWinnerFromPenalties } from "./knockout.ts";

describe("isKnockoutMatch", () => {
  it("treats group matchdays as not knockout", () => {
    assert.equal(isKnockoutMatch("Matchday 3", "Group B"), false);
  });

  it("treats knockout rounds without groups as knockout", () => {
    assert.equal(isKnockoutMatch("Round of 32", ""), true);
    assert.equal(isKnockoutMatch("Final", ""), true);
  });
});

describe("pkWinnerFromPenalties", () => {
  it("returns home or away from pens tally", () => {
    assert.equal(pkWinnerFromPenalties([4, 3]), "home");
    assert.equal(pkWinnerFromPenalties([2, 3]), "away");
    assert.equal(pkWinnerFromPenalties([3, 3]), null);
  });
});
