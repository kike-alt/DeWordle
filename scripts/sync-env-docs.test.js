const fs = require("fs");
const path = require("path");
const { runDocsSync, extractEnvMentions, generateEnvironmentReference } = require("./sync-env-docs");

// Mock fs to avoid touching real files in tests
jest.mock("fs");

describe("sync-env-docs.js", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("extractEnvMentions", () => {
    it("extracts environment variables from markdown content", () => {
      const content = "Use `process.env.NODE_ENV` to set the environment, and `PORT` for the port.";
      const mentions = extractEnvMentions(content);
      expect(mentions.has("NODE_ENV")).toBe(true);
      expect(mentions.has("PORT")).toBe(true);
    });

    it("handles bare env var mentions", () => {
      const content = "Set `JWT_SECRET` in your environment.";
      const mentions = extractEnvMentions(content);
      expect(mentions.has("JWT_SECRET")).toBe(true);
    });
  });

  describe("generateEnvironmentReference", () => {
    it("generates markdown reference with all variables", () => {
      const content = generateEnvironmentReference();
      expect(content).toContain("# Environment Variables Reference");
      expect(content).toContain("## Backend");
      expect(content).toContain("## Frontend");
      expect(content).toContain("NODE_ENV");
      expect(content).toContain("NEXT_PUBLIC_API_URL");
    });
  });

  describe("runDocsSync", () => {
    it("detects missing reference file", () => {
      fs.existsSync.mockReturnValue(false);
      fs.readdirSync.mockReturnValue([]);
      
      const result = runDocsSync({ validate: true, fix: false, generateReference: false });
      expect(result.issues.some(i => i.type === "reference-missing")).toBe(true);
    });
  });
});