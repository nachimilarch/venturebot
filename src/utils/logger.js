/* Simple console logger (replace with Winston in real prod if needed) */
const log = (...args) => console.log(new Date().toISOString(), '-', ...args);

module.exports = { log };
