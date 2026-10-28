const Database = require("better-sqlite3");

const db = new Database("banco.db", { verbose: console.log });

module.exports = db;
