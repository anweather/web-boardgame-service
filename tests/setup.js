const { closeDatabase } = require('../src/database/init');

// Clean up database connections after tests
afterAll(async () => {
  await closeDatabase();
});