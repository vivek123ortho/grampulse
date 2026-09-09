module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  verbose: true,
  testTimeout: 20000, // AI calls and mongodb-memory-server startup can be slow
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
};
