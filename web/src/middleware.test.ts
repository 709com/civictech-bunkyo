import { describe, expect, it } from "vitest";
import { isValidDifficultyLevel } from "./middleware";

describe("isValidDifficultyLevel", () => {
  it("should return true for 'normal'", () => {
    expect(isValidDifficultyLevel("normal")).toBe(true);
  });

  it("should return true for 'hard'", () => {
    expect(isValidDifficultyLevel("hard")).toBe(true);
  });

  it("should return false for invalid value", () => {
    expect(isValidDifficultyLevel("easy")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isValidDifficultyLevel("")).toBe(false);
  });

  it("should return false for null", () => {
    expect(isValidDifficultyLevel(null)).toBe(false);
  });
});
