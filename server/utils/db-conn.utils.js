const mongoose = require('mongoose');

const dbHost = process.env.DB_HOST || "localhost";
// const dbPort = process.env.DB_PORT || 27017;
const dbName = process.env.DB_NAME || "hackoverflow";
const dbUser = process.env.DB_USER || "";
const dbPass = process.env.DB_PASSWORD || "";

const dbConn = {
  connect: () => {
    const url = `mongodb+srv://${dbUser}:${dbPass}@${dbHost}/${dbName}`;

    // const url = "mongodb+srv://tushar:4O4m3y4anjLSwS7B@formcluster.70ocf.mongodb.net/hackoverflow";
    return mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  },
  safeConnect: async () => {
    try {
      await dbConn.connect();
      console.log(`Connected to database: ${dbName} at ${dbHost}`);
    } catch (error) {
      console.log('Connection to database failed. Error: ', error);
      console.log('Closing application');
      process.exit();
    }
  },
};

module.exports = dbConn;