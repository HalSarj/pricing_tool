module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.js'],
  verbose: true,
  collectCoverageFrom: ['src/**/*.js', '!**/node_modules/**'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/testHelpers.js']
}
