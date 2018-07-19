const io = require("socket.io-client");
const { start } = require("@thi.ng/hdom");

const createDefHandler = require("./def-handler");
const defHandler = createDefHandler();

const isValidTagName = input =>
  typeof input === "string" &&
  document.createElement(input).toString() !== "[object HTMLUnknownElement]";

const isObject = input => input === Object(input);

const isDate = input => input instanceof Date;

const renderObject = obj => {
  return [
    "div",
    Object.keys(obj).map(key => {
      return ["span", key];
    })
  ];
};

const app = () => {
  return [
    "div",
    defHandler.get().map(({ id, hash, value, error }) => {
      const head = ["div", { key: hash }];

      // console.log(value);

      if (error) {
        return [...head, `${id} error: ${error}`];
      }

      if (Array.isArray(value)) {
        if (isValidTagName(value[0])) {
          return [...head, `${id}:`, value];
        }

        return [...head, `${id}:`, value.join(", ")];
      }

      if (isDate(value)) {
        return [...head, `${id}: ${value.toString()}`];
      }

      if (isObject(value)) {
        return [...head, `${id}:`, renderObject(value)];
      }

      return [...head, `${id}: ${value}`];
    })
  ];
};

start(document.body, app);

// sockets
const SOCKET_URL = document.location.origin;

const socket = io(SOCKET_URL);

socket.on("content", content => {
  defHandler.update(content);
});
