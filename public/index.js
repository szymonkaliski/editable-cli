const crypto = require("crypto");
const io = require("socket.io-client");
const { Atom } = require("@thi.ng/atom");
const { Runtime, Library } = require("@observablehq/notebook-runtime");
const { start } = require("@thi.ng/hdom");

const md5 = str =>
  crypto
    .createHash("md5")
    .update(str)
    .digest("hex");

// observable
const runtime = new Runtime(new Library());
const mod = runtime.module();

// const defs = new Map();
const state = new Atom({
  defs: []
});
let defIdx = 0;
let currentDefs = {};

const getEqProp = (array, prop, propValue) => {
  return array.find(obj => obj[prop] === propValue);
};

const getEqPropIdx = (array, prop, propValue) => {
  return array.findIndex(obj => obj[prop] === propValue);
};

const def = (id, inputs, definition) => {
  if (!definition) {
    definition = inputs;
    inputs = [];
  }

  state.swapIn("defs", defs => {
    let def = getEqProp(defs, "id", id);
    const defArrayIdx = getEqPropIdx(defs, "id", id);
    const idx = defIdx++;

    currentDefs[id] = true;

    if (def) {
      const newValueHash = md5(definition.toString());
      const oldValueHash = md5(def.str);

      if (newValueHash === oldValueHash && defArrayIdx === idx) {
        return defs;
      }

      def.variable.delete();
    } else {
      def = {};
      defs.push(def);
    }

    const variable = mod.variable({
      fulfilled: value => {
        if (value !== undefined) {
          def.value = value;
        }
      },
      rejected: error => {
        def.error = error;
      }
    });

    variable.define(id, inputs, definition);

    def.id = id;
    def.idx = idx;
    def.variable = variable;
    def.str = definition.toString();

    return defs;
  });
};

const app = () => {
  return [
    "div",
    state.addView("defs", defs => {
      return [
        "div",
        defs.sort((a, b) => a.idx - b.idx).map(def => {
          if (def.error) {
            return ["div", `${def.id} error: ${def.error}`];
          }

          return ["div", `${def.id}: ${def.value}`];
        })
      ];
    })
  ];
};

const cleanUp = () => {
  state.swapIn("defs", defs => {
    return defs
      .map(def => {
        if (!currentDefs[def.id]) {
          def.variable.delete();
          return undefined;
        }

        return def;
      })
      .filter(def => def !== undefined);
  });
};

start(document.body, app);

// sockets
const SOCKET_URL = document.location.origin;

const socket = io(SOCKET_URL);

socket.on("content", content => {
  defIdx = 0;
  currentDefs = {};

  // FIXME: not awesome since it has access to everything in scope
  eval(content);

  cleanUp();
});
