const Sequelize = require("sequelize");

const database = "lms_db";
const username = "postgres";
const password = "Vinayak";
const sequelize = new Sequelize(database, username, password, {
  host: "localhost",
  dialect: "postgres",
});

const connect = async () => {
  return sequelize.authenticate();
}

module.exports = {
  connect,
  sequelize
}
