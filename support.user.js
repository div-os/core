// ==UserScript==
// @name divOS Support
// @match http://*/*
// @match https://*/*
// ==/UserScript==

let postMessage = data => parent.postMessage(
  data, 'http://localhost:3200',
);

let lastDataStr;

let monitor = () => {
    requestAnimationFrame(monitor);

    let data = {
        docLocation: location.href,
        docTitle: document.title,
    };

    let dataStr = JSON.stringify(data);

    if (dataStr === lastDataStr) {
        return;
    }

    lastDataStr = dataStr;
    postMessage(data);
};

monitor();
