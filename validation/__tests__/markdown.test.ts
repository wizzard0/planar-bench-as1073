import { describe, it, expect } from "bun:test";
import { extractBlock } from "../markdown";

describe("extractBlock", () => {
  it("returns only the last fenced code block", () => {
    const text = [
      "```",
      "first", 
      "```",
      "", 
      "some text",
      "```",
      "second", 
      "third", 
      "```",
    ].join("\n");
    expect(extractBlock(text)).toEqual(["second", "third"]);
  });

  it("trims surrounding blank lines", () => {
    const text = [
      "```",
      "", // leading blank line
      "line1",
      "",
      "line2",
      "", // trailing blank line
      "```",
    ].join("\n");
    expect(extractBlock(text)).toEqual(["line1", "line2"]);
  });
});

