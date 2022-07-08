module.exports = {
  roots: ['<rootDir>/test'],
  testMatch: [
    '*/**/?(*.)+(spec|test).+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/{!(logging),}.(ts|tsx|js)'],
};
