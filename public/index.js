const css = require("sheetify");
const io = require("socket.io-client");
const { EventBus } = require("@thi.ng/interceptors/event-bus");
const { start } = require("@thi.ng/hdom");
const { valueSetter } = require("@thi.ng/interceptors/interceptors");

const { EV_SET_VALUE, FX_DISPATCH_NOW } = require("@thi.ng/interceptors/api");

const {
  EV_SET_DEFS,
  EV_SET_META,
  EV_SET_GLOBAL_ERROR,
  EV_CLEAR_META,
  SOCKET_URL
} = require("./consts");

const createDefHandler = require("./def-handler");

css("tachyons");

const isValidTagName = input =>
  typeof input === "string" &&
  document.createElement(input).toString() !== "[object HTMLUnknownElement]";

const isObject = input => input === Object(input);

const isDate = input => input instanceof Date;

const isElement = input => input instanceof Element;

const MAX_LEN = 17;

let renderBasicValue;

const renderArrayWithDelimiters = (arr, delimiters, depth) => {
  const renderItem = item => [
    "span.pl1.mid-gray",
    renderBasicValue(item, depth + 1)
  ];

  let items = [];

  if (arr.length < MAX_LEN) {
    items = [
      delimiters[0],
      ...arr.map((item, idx) => [
        "span",
        renderItem(item),
        idx < arr.length - 1 ? "," : ""
      ]),
      ["span.pl1", delimiters[1]]
    ];
  } else {
    const sliceSize = Math.floor(MAX_LEN / 3);

    items = [
      delimiters[0],
      ...arr.slice(0, sliceSize).map(item => ["span", renderItem(item), ","]),
      renderItem("..."),
      ",",
      ...arr
        .slice(arr.length - sliceSize, arr.length)
        .map((item, idx) => [
          "span",
          renderItem(item),
          idx < sliceSize - 1 ? "," : ""
        ]),
      ["span.pl1", delimiters[1]]
    ];
  }

  return items;
};

const renderObject = (obj, depth) => {
  const items =
    depth === 0
      ? renderArrayWithDelimiters(Object.keys(obj).sort(), ["{", "}"], depth)
      : [];

  return [[`span.mid-gray${depth === 0 ? ".pr2" : ""}`, `Object()`], ...items];
};

const renderArray = (arr, depth) => {
  const items =
    depth === 0 ? renderArrayWithDelimiters(arr, ["[", "]"], depth) : [];

  return [
    [`span.mid-gray${depth === 0 ? ".pr2" : ""}`, `Array(${arr.length})`],
    ...items
  ];
};

const renderElement = (bus, id) => {
  return {
    init: (el, _, args) => {
      el.appendChild(args);
      bus.dispatch([EV_SET_META, [id, el]]);
    },

    render: (x, args) => {
      const { meta } = bus.deref();

      if (
        meta &&
        meta[id] &&
        meta[id].el &&
        !meta[id].el.firstChild.isEqualNode(args)
      ) {
        meta[id].el.innerHTML = "";
        meta[id].el.appendChild(args);
      }

      return ["div"];
    },

    release: () => {
      bus.dispatch([EV_CLEAR_META, id]);
    }
  };
};

renderBasicValue = (value, depth = 0) => {
  if (Array.isArray(value)) {
    if (isValidTagName(value[0])) {
      return value;
    }

    return renderArray(value, depth);
  }

  if (isDate(value)) {
    return value.toString();
  }

  if (isObject(value)) {
    return renderObject(value, depth);
  }

  return `${value}`;
};

const renderValue = (bus, id, value) => {
  if (isElement(value)) {
    return [renderElement(bus, id), value];
  }

  return renderBasicValue(value);
};

const renderDef = (id, value, { isError } = { isError: false }) => {
  const color = isError ? "dark-red" : "dark-gray";

  return [
    "div.flex.f7.lh-title.mv2",
    [`div.b.w-20.tr.pr2.br.bw1.${color}.b--${color}`, id],
    [`div.ml2.gray.w-80.flex.flex-wrap.${color}`, value]
  ];
};

const events = {
  [EV_SET_DEFS]: valueSetter("defs"),

  [EV_SET_GLOBAL_ERROR]: valueSetter("globalError"),

  [EV_SET_META]: (_, [__, [id, el]]) => ({
    [FX_DISPATCH_NOW]: [EV_SET_VALUE, [["meta", id, "el"], el]]
  }),

  [EV_CLEAR_META]: (_, [__, [id]]) => ({
    [FX_DISPATCH_NOW]: [EV_SET_VALUE, [id, undefined]]
  })
};

const createApp = () => {
  // setup
  const bus = new EventBus(null, events);
  const defHandler = createDefHandler({ bus });
  const socket = io(SOCKET_URL);

  socket.on("content", content => {
    defHandler.update(content);
  });

  socket.on("fileName", fileName => {
    document.title = `defn-cli: ${fileName}`;
  });

  // start
  bus.dispatch([EV_SET_DEFS, []]);

  const root = () => {
    const { defs, globalError } = bus.deref();

    return [
      "div.w-100.mw10.center.pa2.code",

      globalError && renderDef("compile error", globalError, { isError: true }),

      defs.map(({ id, value, error }) =>
        renderDef(id, error || renderValue(bus, id, value), {
          isError: error
        })
      )
    ];
  };

  // app, refreshes only when needed
  return () => {
    if (bus.processQueue()) {
      return root;
    }
  };
};

start(document.body, createApp());
