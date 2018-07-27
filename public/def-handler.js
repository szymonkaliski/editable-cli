const crypto = require("crypto");
const getParameterNames = require("get-parameter-names");
const { Runtime, Library } = require("@observablehq/notebook-runtime");

const { EV_SET_DEFS, EV_SET_GLOBAL_ERROR } = require("./consts");

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

module.exports = ({ bus }) => {
  const library = new Library();
  const runtime = new Runtime(library);
  const mod = runtime.module();

  const runningDefs = {};

  let seenDefs = {};
  let idx = 0;

  const def = (id, impl) => {
    seenDefs[id] = true;

    if (!impl) {
      return;
    }

    const hash = md5(impl.toString());

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

  // we're not being smart here, updating everything in state, always
  const updateAllDefs = () => {
    const defs = Object.keys(runningDefs)
      .map(id => runningDefs[id])
      .sort((a, b) => a.idx - b.idx)
      .map(def => pick(def, ["id", "value", "error", "hash"]));

    bus.dispatch([EV_SET_DEFS, defs]);
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
            runningDef.error = undefined;
            runningDef.value = value;
            updateAllDefs();
          }
        },
        rejected: error => {
          runningDef.error = error;
          updateAllDefs();
        }
      });

      runningDef.variable.define(id, runningDef.inputs, runningDef.impl);
    });
  };

  return {
    update: codeStr => {
      idx = 0;
      seenDefs = {};

      let evaled = false;

      try {
        eval(codeStr);
        evaled = true;
      } catch (e) {
        bus.dispatch([EV_SET_GLOBAL_ERROR, e]);
      }

      if (evaled) {
        cleanNonExistingsDefs();
        startVariables();
        updateAllDefs();
        bus.dispatch([EV_SET_GLOBAL_ERROR, undefined]);
      }
    }
  };
};
