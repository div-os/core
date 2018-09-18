let express = require('express');
let wsMiddleware = require('express-ws');

let fsMiddleware = require('./fsMiddleware');
let globMiddleware = require('./globMiddleware');
let termMiddleware = require('./termMiddleware');

let app = express();
let port = process.env.PORT || 3200;

wsMiddleware(app);

fsMiddleware.register(app);
globMiddleware.register(app);
termMiddleware.register(app);

app.use('/backend', express.static('/'));
app.use('/node_modules', express.static('node_modules'));
app.use(express.static(`${__dirname}/public`));

app.listen(port);
console.log(`Listening on port ${port}.`);
