let pty = require('node-pty');
let prefix = '/api/terms';

let terms = exports.terms = {};

exports.register = app => {
  app.post(prefix, (req, res) => {
    let cols = Number(req.query.cols);
    let rows = Number(req.query.rows);

    let env = { ...process.env };

    // Workaround an nvm warning.
    delete env.npm_config_prefix;

    let proc = pty.spawn('bash', [], {
      name: 'xterm-color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: process.env.PWD,
      env,
    });

    let term = terms[proc.pid] = {
      proc,
      initialData: '',
    };

    proc.on('data', d => {
      if (term.socketConnected) {
        return;
      }

      term.initialData += d;
    });

    console.log(`Spawned pty (PID: ${proc.pid}).`);

    res.send(String(proc.pid));
  });

  app.post(`${prefix}/:pid/size`, (req, res) => {
    let pid = Number(req.params.pid);
    let cols = Number(req.query.cols);
    let rows = Number(req.query.rows);

    let term = terms[pid];

    term.resize(cols, rows);
    res.end();
  });

  app.ws(`${prefix}/:pid`, (ws, req) => {
    let pid = Number(req.params.pid);
    let term = terms[pid];

    ws.send(term.initialData);
    delete term.initialData;

    let { proc } = term;

    proc.on('data', d => {
      try {
        ws.send(d);
      }
      catch (err) {
        // The socket is closed; ignore.
      }
    });

    ws.on('message', d => {
      proc.write(d);
    });

    ws.on('close', () => {
      proc.kill();
      delete terms[pid];

      console.log(`Killed pty (PID: ${pid}).`);
    });

    console.log(
      `WebSocket connected to pty (PID: ${pid}).`,
    );
  });
};
