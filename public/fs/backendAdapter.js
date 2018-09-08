let Vinyl = require('vinyl');
let qs = require('qs');
let through2 = require('through2');

div.fs.backend = exports;

exports.src = (glob, opt) => {
  let ret = through2.obj();

  (async () => {
    let res = await fetch(
      `/api/glob?pattern=${glob}&${qs.stringify(opt || {})}`,
    );

    if (!res.ok) {
      if (res.status === 404) {
        ret.end();
        return;
      }

      ret.destroy(new Error(
        `Backend error response: ` +
        `${res.status} ${res.statusText}`,
      ));
    }

    let lineBuffer = '';

    function flush(ctx) {
      if (!['streaming', 'done'].includes(ctx)) {
        throw new Error(
          `backendAdapter / flush: ctx must be ` +
          `'streaming' or 'done'`,
        );
      }

      if (!lineBuffer) {
        return;
      }

      let fileProps;

      try {
        fileProps = JSON.parse(lineBuffer);
      } catch (err) {
        if (ctx === 'streaming') {
          return;
        }

        throw err;
      }

      let contents = through2();
      let originalRead = contents.read;
      let requested = false;

      contents.read = (...args) => {
        if (!requested) {
          getContentsStream(fileProps.path)
            .then(s => s.pipe(contents))
            .catch(err => s.destroy(err));

          requested = true;
        }

        return originalRead.call(contents, ...args);
      };

      if (fileProps.stat) {
        let { stat } = fileProps;

        for (let k of [
          'isDirectory',
        ]) {
          stat[k] = () => stat[`_${k}`];
        }
      }

      fileProps.contents = contents;
      ret.push(new Vinyl(fileProps));

      lineBuffer = '';
    }

    res.body.pipeTo(new WritableStream({
      write(bytes) {
        let decoder = new TextDecoder('utf-8');
        let data = decoder.decode(bytes);

        for (let l of data.split('\n')) {
          flush('streaming');

          lineBuffer += l;
        }
      },

      abort(err) {
        flush('done');
        ret.destroy(err);
      },

      close() {
        flush('done');
        ret.end();
      },
    }));
  })();

  return ret;
};

// Support stuff.
async function getContentsStream(filePath) {
  let res = await fetch(`/api/fs${filePath}`);

  if (!res.ok) {
    throw new Error(
      `Backend error response: ` +
      `${res.status} ${res.statusText}`,
    );
  }

  let ret = through2();

  res.body.pipeTo(new WritableStream({
    write(data) {
      ret.push(data);
    },

    abort(err) {
      ret.destroy(err);
    },

    close() {
      ret.end();
    },
  }));

  return ret;
}
