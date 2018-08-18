let express = require('express');

let fsMiddleware = require('./fsMiddleware');
let globMiddleware = require('./globMiddleware');

let app = express();
let port = process.env.PORT || 3200;

fsMiddleware.register(app);
globMiddleware.register(app);

app.use('/backend', express.static('/'));
app.use(express.static(`${__dirname}/public`));

app.listen(port);
console.log(`Listening on port ${port}.`);
