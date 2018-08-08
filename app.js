let express = require('express');

let globMiddleware = require('./globMiddleware');

let app = express();
let port = process.env.PORT || 6000;

globMiddleware.register(app);

app.listen(port);
console.log(`Listening on port ${port}.`);
