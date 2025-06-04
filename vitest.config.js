export default {
  test: {
    testTimeout: 45000,
    hookTimeout: 30000,
    include: ["tests/**/*.test.js"],
    exclude: ["examples/**"],
    // pool: "vmForks",
  },
};
