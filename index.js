#!/usr/bin/env node

const chokidar = require("chokidar");
const createIO = require("socket.io");
const debug = require("debug")("cli");
const express = require("express");
const fs = require("fs");
const getPort = require("get-port");
const http = require("http");
const path = require("path");
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
    const content = fs.readFileSync(file, { encoding: "utf8" });
    const fileName = path.basename(file);

    const doEmit = id => {
      sockets[id].emit("content", content);
      sockets[id].emit("fileName", fileName);
    };

    if (id) {
      doEmit(id);
    } else {
      Object.keys(sockets).forEach(id => doEmit(id));
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

  console.log(`defn-cli running on: http://localhost:${port}/`);
};

getPort({ port }).then(port => start({ port, file }));
