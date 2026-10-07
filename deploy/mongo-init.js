const appDatabaseName = process.env.MONGO_APP_DATABASE || 'tailoros';
const appDatabase = db.getSiblingDB(appDatabaseName);

appDatabase.createUser({
  user: process.env.MONGO_APP_USER,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: appDatabaseName }],
});
