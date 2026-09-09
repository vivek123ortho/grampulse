// tests/setup.js
//
// Runs before every test file. Connects to a test database so tests never
// touch your real/dev data.
//
// Two modes, controlled by TEST_DB_MODE in .env (or shell env):
//   "memory" (default) — uses mongodb-memory-server, an in-process MongoDB
//     binary. Zero setup, but the FIRST run needs internet access to download
//     the MongoDB binary (a few hundred MB) from fastdl.mongodb.org. If your
//     network blocks that (e.g. a locked-down CI runner or sandbox), switch
//     to "local" mode instead.
//   "local" — connects to a real local/dev MongoDB instance at
//     TEST_MONGODB_URI (defaults to mongodb://localhost:27017/grampulse_test).
//     Requires `mongod` running locally or a MongoDB Atlas test cluster, but
//     needs no binary download.
//
// Most contributors should just use the default "memory" mode on a normal
// dev machine with internet access — this fallback exists for restricted
// environments only.

const mongoose = require("mongoose");

const mode = process.env.TEST_DB_MODE || "memory";
let mongoServer;

beforeAll(async () => {
  if (mode === "local") {
    const uri = process.env.TEST_MONGODB_URI || "mongodb://localhost:27017/grampulse_test";
    await mongoose.connect(uri);
  } else {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }
});

afterEach(async () => {
  // Clean all collections between tests so tests don't leak state into each other
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
});
