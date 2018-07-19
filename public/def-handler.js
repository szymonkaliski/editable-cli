const crypto = require("crypto");
const { Runtime, Library } = require("@observablehq/notebook-runtime");

const pick = (obj, props) => {
  let out = {};

  props.forEach(prop => (out[prop] = obj[prop]));

  return out;
};

const md5 = str =>
  crypto
    .createHash("md5")
    .update(str)
    .digest("hex");

module.exports = () => {
  const runtime = new Runtime(new Library());
  const mod = runtime.module();

  const runningDefs = {};

  let seenDefs = {};
  let idx = 0;

  const def = (id, inputs, impl) => {
    seenDefs[id] = true;

    if (!impl) {
      impl = inputs;
      inputs = [];
    }

    const hash = md5(impl.toString());

    const defIdx = idx;
    idx = idx + 1;

    let tmpDef = {
      idx: defIdx,
      id,
      inputs,
      hash
    };

    if (runningDefs[id]) {
      const runningDef = runningDefs[id];

      runningDef.idx = defIdx;

      if (hash === runningDef.hash) {
        return;
      } else {
        runningDef.variable.delete();
      }
    }

    tmpDef.variable = mod.variable({
      fulfilled: value => {
        if (value !== undefined) {
          tmpDef.value = value;
        }
      },
      rejected: error => {
        tmpDef.error = error;
      }
    });

    tmpDef.variable.define(id, inputs, impl);

    runningDefs[id] = tmpDef;
  };

  const cleanupDefs = () => {
    Object.keys(runningDefs)
      .filter(runningId => !seenDefs[runningId])
      .forEach(deletedDefId => {
        runningDefs[deletedDefId].variable.delete();
        delete runningDefs[deletedDefId];
      });
  };

  return {
    update: codeStr => {
      idx = 0;
      seenDefs = {};

      try {
        eval(codeStr);
        cleanupDefs();
      } catch (e) {
        console.error(e);
      }
    },

    get: () => {
      return Object.keys(runningDefs)
        .map(id => runningDefs[id])
        .sort((a, b) => a.idx - b.idx)
        .map(def => pick(def, ["id", "value", "error", "hash"]));
    }
  };
};
