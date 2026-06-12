/*
  Diagnostic helper to test MongoDB Atlas connectivity from the runtime.
  Usage (local):
    MONGODB_URI="your_uri" node scripts/test-atlas.js

  On Render: open the service "Shell" and run:
    node scripts/test-atlas.js

  The script prints node/OpenSSL versions and a detailed error stack for troubleshooting.
*/

const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');

async function run() {
  try {
    console.log('Node version:', process.version);
    console.log('OpenSSL version:', process.versions.openssl);

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI is not set in environment. Set it and re-run this script.');
      process.exit(2);
    }

    // Mask the URI for logging (do not print credentials)
    const masked = uri.replace(/(mongodb\+srv:\/\/)(.*@)?(.+)/, (m, p1, p2, p3) => `${p1}${p2 ? '***@' : ''}${p3}`);
    console.log('Using MONGODB_URI (masked):', masked);

    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      tls: true,
      serverSelectionTimeoutMS: 10000
    };

    console.log('Attempting native MongoClient.connect()...');
    try {
      const client = await MongoClient.connect(uri, opts);
      console.log('MongoClient connected successfully. Databases:');
      const admin = client.db().admin();
      const dbs = await admin.listDatabases();
      console.log(dbs);
      await client.close();
    } catch (err) {
      console.error('MongoClient.connect() failed:');
      console.error(err && err.stack ? err.stack : err);
    }

    console.log('Attempting mongoose.connect()...');
    try {
      await mongoose.connect(uri, opts);
      console.log('Mongoose connected successfully');
      await mongoose.disconnect();
    } catch (err) {
      console.error('mongoose.connect() failed:');
      console.error(err && err.stack ? err.stack : err);
    }

    console.log('Diagnostic run complete.');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error in diagnostic script:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

run();
