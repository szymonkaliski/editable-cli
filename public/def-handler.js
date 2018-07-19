const crypto = require("crypto");
const getParameterNames = require("get-parameter-names");
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
  const library = new Library();
  const runtime = new Runtime(library);
  const mod = runtime.module();

  const runningDefs = {};

  let seenDefs = {};
  let idx = 0;

  const def = (id, impl) => {
    seenDefs[id] = true;

    if (!impl) {
      impl = id;
      id = undefined;
    }

    const hash = md5(impl.toString());

    if (!id) {
      id = hash;
    }

    const defIdx = idx;
    idx = idx + 1;

    let tmpDef = {
      idx: defIdx,
      id,
      impl,
      hash
    };

    if (runningDefs[id]) {
      const runningDef = runningDefs[id];

      runningDef.idx = defIdx;

      if (hash === runningDef.hash) {
        return;
      } else {
        runningDef.variable.delete();
        delete runningDef.variable;
      }
    }

    runningDefs[id] = tmpDef;
  };

  const cleanNonExistingsDefs = () => {
    Object.keys(runningDefs)
      .filter(runningId => !seenDefs[runningId])
      .forEach(deletedDefId => {
        if (runningDefs[deletedDefId].variable) {
          runningDefs[deletedDefId].variable.delete();
        }

        delete runningDefs[deletedDefId];
      });
  };

  const startVariables = () => {
    Object.keys(runningDefs).map(id => {
      const runningDef = runningDefs[id];

      if (runningDef.variable) {
        return;
      }

      runningDef.inputs = getParameterNames(runningDef.impl).filter(
        param =>
          runningDefs[param] !== undefined || library[param] !== undefined
      );

      runningDef.variable = mod.variable({
        fulfilled: value => {
          if (value !== undefined) {
            runningDef.value = value;
          }
        },
        rejected: error => {
          runningDef.error = error;
        }
      });

      runningDef.variable.define(id, runningDef.inputs, runningDef.impl);
    });
  };

  return {
    update: codeStr => {
      idx = 0;
      seenDefs = {};

      try {
        eval(codeStr);
        cleanNonExistingsDefs();
        startVariables();
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
