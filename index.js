const chokidar = require("chokidar");
const createIO = require("socket.io");
const debug = require("debug")("cli");
const express = require("express");
const fs = require("fs");
const getPort = require("get-port");
const http = require("http");
const { argv } = require("yargs");

const port = argv.port || process.env.PORT || 3000;
const file = argv._ && argv._[0];

if (!file) {
  debug({ argv });
  console.log("pass filename as argument");
  process.exit(0);
}

const start = ({ port, file }) => {
  const app = express();
  const server = http.createServer(app);
  const io = createIO(server);

  const sockets = {};

  const emitContent = id => {
    const content = fs.readFileSync(FILE, { encoding: "utf8" });

    if (id) {
      sockets[id].emit("content", content);
    } else {
      Object.keys(sockets).forEach(id => {
        sockets[id].emit("content", content);
      });
    }
  };

  chokidar.watch(file).on("change", () => {
    debug("file updated, pushing to client(s)");
    emitContent();
  });

  io.on("connection", socket => {
    const { id } = socket;
    sockets[id] = socket;

    emitContent(id);

    socket.on("disconnect", () => delete sockets[id]);
  });

  app.use(express.static("public"));

  server.listen(port);

  console.log(`running on: http://localhost:${port}/`);
};

getPort({ port }).then(port => start({ port, file }));
