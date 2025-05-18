module.exports = {
  ...require('./jest.config'),
  // CI-specific overrides
  testTimeout: 30000, // Longer timeout for CI environments
  maxWorkers: 2, // Limit parallel test execution in CI
  collectCoverage: true,
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'reports',
      outputName: 'jest-junit.xml',
    }],
  ],
};
