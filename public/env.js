div.env = exports;

exports.get = async k => {
  let fullEnv = await (async () => {
    let res = await fetch(`/api/env`);

    if (!res.ok) {
      if (res.status === 404) {
        return {
          USER: 'guest',
          HOME: '/browser/home/guest',
        };
      }

      throw new Error(
        `Server error response: ` +
        `${res.status} ${res.statusText}`,
      );
    }

    return await res.json();
  })();

  if (k) {
    return fullEnv[k];
  }

  return fullEnv;
};
