// Prints js/data.js as JSON. Usage: node export_data.js > data.json
const fs = require("fs"), path = require("path"), vm = require("vm");
const w = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "data.js"), "utf8"), { window: w });
process.stdout.write(JSON.stringify(w.CLANCY_DATA));
