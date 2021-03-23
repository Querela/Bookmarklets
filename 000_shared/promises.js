(function() {
  // ------------------------------------
  // https://stackoverflow.com/a/39538518
  function delay(t, v) {
    return new Promise(function(resolve) { 
      setTimeout(resolve.bind(null, v), t)
    });
  }

  Promise.prototype.delay = function(t) {
    return this.then(function(v) {
      return delay(t, v);
    });
  }

  // ------------------------------------
  // https://stackoverflow.com/a/30506051
  // https://stackoverflow.com/a/30507964
  function waitFor(cond, timeout, value) {
    return new Promise(function (resolve, reject) {
      (function waitForCondition(){
        if (cond()) {
          return resolve(value);
        }
        setTimeout(waitForCondition, timeout);
      })();
    });
  }

  function waitForTimed(cond, delay, timeout, value) {
    var start = Date.now();
    return new Promise(function (resolve, reject) {
      (function waitForCondition(){
        if (cond()) {
          return resolve(value);
        } else if (timeout && (Date.now() - start) >= timeout) {
          reject(new Error("timeout"));
        }
        setTimeout(waitForCondition, delay);
      })();
    });
  }

  Promise.prototype.waitFor = function(c, t) {
    return this.then(function(v) {
      return waitFor(c, t, v);
    });
  }

  Promise.prototype.waitForTimed = function(c, d, t) {
    return this.then(function(v) {
      return waitForTimed(c, d, t, v);
    });
  }

  // ------------------------------------
})();
