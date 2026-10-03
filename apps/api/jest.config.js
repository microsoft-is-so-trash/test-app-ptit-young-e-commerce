/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  // Một test e2e lỗi ở beforeAll sau khi Redis/Prisma đã kết nối thì app chưa được gán nên
  // afterAll không đóng được kết nối; không có forceExit thì jest không thoát và CI treo tới
  // hết giờ mà không in log lỗi (I1.0).
  forceExit: true,
};
