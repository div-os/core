let express = require('express');

let app = express();
let port = process.env.PORT || 6000;

app.listen(port);
console.log(`Listening on port ${port}.`);
