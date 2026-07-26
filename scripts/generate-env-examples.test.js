const fs = require("fs");
const path = require("path");
const { runEnvGenerator, parseExistingEnvFile, compareVariables, generateEnvExampleContent } = require("./generate-env-examples");
const { ENV_DEFINITIONS } = require("./env-definitions");

// Mock fs to avoid touching real files in tests
jest.mock("fs");

describe("generate-env-examples.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parseExistingEnvFile", () => {
    it("returns exists: false when file doesn't exist", () => {
      fs.existsSync.mockReturnValue(false);
      const result = parseExistingEnvFile("/nonexistent/.env.example");
      expect(result.exists).toBe(false);
      expect(result.variables.size).toBe(0);
    });

    it("parses environment variables from existing file", () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(`NODE_ENV=development\nPORT=3000\n# Comment\nDB_HOST=localhost`);
      const result = parseExistingEnvFile("/test/.env.example");
      expect(result.exists).toBe(true);
      expect(result.variables.get("NODE_ENV")).toBe("development");
      expect(result.variables.get("PORT")).toBe("3000");
      expect(result.variables.get("DB_HOST")).toBe("localhost");
    });
  });

  describe("compareVariables", () => {
    const canonicalDefs = [
      { key: "NODE_ENV", example: "development", description: "Env" },
      { key: "PORT", example: "3000", description: "Port" },
    ];

    it("finds missing variables", () => {
      const existing = new Map([["NODE_ENV", "development"]]);
      const issues = compareVariables(existing, canonicalDefs);
      expect(issues.some(i => i.type === "missing" && i.key === "PORT")).toBe(true);
    });

    it("finds mismatched values", () => {
      const existing = new Map([["NODE_ENV", "production"], ["PORT", "3000"]]);
      const issues = compareVariables(existing, canonicalDefs);
      expect(issues.some(i => i.type === "mismatch" && i.key === "NODE_ENV")).toBe(true);
    });

    it("finds extra variables", () => {
      const existing = new Map([["NODE_ENV", "development"], ["PORT", "3000"], ["EXTRA_VAR", "value"]]);
      const issues = compareVariables(existing, canonicalDefs);
      expect(issues.some(i => i.type === "extra" && i.key === "EXTRA_VAR")).toBe(true);
    });

    it("returns no issues when all variables match", () => {
      const existing = new Map([["NODE_ENV", "development"], ["PORT", "3000"]]);
      const issues = compareVariables(existing, canonicalDefs);
      expect(issues.length).toBe(0);
    });
  });

  describe("generateEnvExampleContent", () => {
    it("generates properly formatted content with sections", () => {
      const defs = [
        { key: "NODE_ENV", example: "development", description: "Server env" },
        { key: "DB_HOST", example: "localhost", description: "DB host" },
      ];
      const content = generateEnvExampleContent(defs);
      expect(content).toContain("# Server");
      expect(content).toContain("NODE_ENV=development");
      expect(content).toContain("# Database");
      expect(content).toContain("DB_HOST=localhost");
    });
  });

  describe("runEnvGenerator", () => {
    it("detects out-of-sync files", () => {
      // Mock backend file exists but is missing a variable
      fs.existsSync.mockImplementation((p) => p.includes("backend"));
      fs.readFileSync.mockReturnValue("NODE_ENV=development");
      
      const result = runEnvGenerator({ validate: true, fix: false });
      expect(result.ok).toBe(false);
      expect(result.results.some(r => r.service === "backend" && r.needsUpdate)).toBe(true);
    });
  });
});