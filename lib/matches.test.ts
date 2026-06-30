import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIRST_MATCH_GRACE_MS } from "./config.ts";
import {
  firstMatchGraceId,
  graceEndsAt,
  hydrateMatch,
  isLocked,
  type Match,
} from "./matches.ts";
import { isKnockoutMatch } from "./knockout.ts";

function sampleMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: "m1",
    round: "Matchday 1",
    group: "Group A",
    team1: "A",
    team2: "B",
    flag1: null,
    flag2: null,
    status: "upcoming",
    isKnockout: false,
    score: null,
    pkWinner: null,
    liveMinute: null,
    kickoff: 1_000_000,
    ground: "",
    ...overrides,
  };
}

describe("first-match grace window", () => {
  const kickoff = 1_000_000;
  const day = [
    sampleMatch({ id: "first", kickoff }),
    sampleMatch({ id: "second", kickoff: kickoff + 3_600_000 }),
  ];

  it("allows edits for 10 minutes after kickoff on the first match", () => {
    const duringGrace = kickoff + 5 * 60_000;
    const graceId = firstMatchGraceId(day, duringGrace);
    assert.equal(graceId, "first");
    assert.equal(
      isLocked(day[0], duringGrace, { graceMatchId: graceId }),
      false,
    );
    assert.equal(
      isLocked(day[1], duringGrace, { graceMatchId: graceId }),
      false,
    );
  });

  it("locks the first match after grace expires", () => {
    const afterGrace = kickoff + FIRST_MATCH_GRACE_MS + 1;
    assert.equal(firstMatchGraceId(day, afterGrace), null);
    assert.equal(isLocked(day[0], afterGrace), true);
  });

  it("reports grace end time", () => {
    const duringGrace = kickoff + 60_000;
    assert.equal(graceEndsAt(day, duringGrace), kickoff + FIRST_MATCH_GRACE_MS);
  });
});

describe("hydrateMatch", () => {
  it("recomputes isKnockout on cached rows missing the flag", () => {
    const raw = {
      id: "72",
      round: "Round of 32",
      group: "",
      team1: "Germany",
      team2: "Paraguay",
      flag1: null,
      flag2: null,
      status: "upcoming" as const,
      score: null,
      pkWinner: null,
      liveMinute: null,
      kickoff: 1,
      ground: "",
    };
    const hydrated = hydrateMatch({ ...raw, isKnockout: false });
    assert.equal(hydrated.isKnockout, true);
    assert.equal(isKnockoutMatch(hydrated.round, hydrated.group), true);
  });
});
