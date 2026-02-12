const Papa = require('papaparse');

function parseCsvBuffer(buffer) {
  return new Promise((resolve, reject) => {
    Papa.parse(buffer.toString('utf8'), {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        if (results.errors && results.errors.length) {
          return reject(new Error(results.errors[0].message));
        }
        // Expect at least: name, phone, and any additional columns as custom variables
        const data = results.data.map(row => {
          const { name, phone, ...rest } = row;
          return {
            name: name || null,
            phone: phone,
            custom_variables: rest
          };
        });
        resolve(data);
      },
      error: err => reject(err)
    });
  });
}

module.exports = { parseCsvBuffer };
