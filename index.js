const chokidar = require("chokidar");
const createIO = require("socket.io");
const express = require("express");
const fs = require("fs");
const http = require("http");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const FILE = "./test/notebook.js"; // TODO: read from argv

app.use(express.static("public"));

const io = createIO(server);
const sockets = {};

const emitContent = id => {
  console.log(new Date(), "file updated, pushing"); // TODO: nicer logs

  const content = fs.readFileSync(FILE, { encoding: "utf8" });

  if (id) {
    sockets[id].emit("content", content);
  } else {
    Object.keys(sockets).forEach(id => {
      sockets[id].emit("content", content);
    });
  }
};

chokidar.watch(FILE).on("change", () => emitContent());

io.on("connection", socket => {
  const { id } = socket;

  sockets[id] = socket;

  emitContent(id);

  socket.on("disconnect", () => {
    delete sockets[id];
  });
});

console.log(`server listening on ${PORT}`);

server.listen(PORT);
