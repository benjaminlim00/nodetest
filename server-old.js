const logEvents = require("./logEvents");
const EventEmitter = require("events");
const http = require("http");
const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;

class Emitter extends EventEmitter {}

// initialize an instance of Emitter
const myEmitter = new Emitter();
myEmitter.on("log", (msg, fileName) => logEvents(msg, fileName));
const PORT = process.env.PORT || 3500;

const serveFile = async (filePath, contentType, res) => {
  try {
    const rawData = await fsPromises.readFile(filePath, "utf8");
    const data =
      contentType === "application/json"
        ? JSON.stringify(JSON.parse(rawData))
        : rawData;
    res.writeHead(filePath.endsWith("404.html") ? 404 : 200, {
      "Content-Type": contentType,
    });
    res.end(data);
  } catch (err) {
    console.log(err);
    myEmitter.emit("log", `${err.name} - ${err.message}`, "errLog.txt");

    res.statusCode = 500;
    res.end();
  }
};

const server = http.createServer(async (req, res) => {
  console.log(req.url, req.method);

  myEmitter.emit(
    "log",
    `Request made to ${req.url} using ${req.method}`,
    "reqLog.txt"
  );

  const extension = path.extname(req.url);
  let contentType;

  switch (extension) {
    case ".html":
      contentType = "text/html";
      break;
    case ".css":
      contentType = "text/css";
      break;
    case ".json":
      contentType = "application/json";
    default:
      contentType = "text/html";
      break;
  }

  let filePath =
    contentType === "text/html" && req.url === "/"
      ? path.join(__dirname, "views", "index.html")
      : contentType === "text/html"
      ? path.join(__dirname, "views", req.url)
      : path.join(__dirname, req.url);

  // makes .html extension optional
  if (!extension && !req.url.endsWith("/")) {
    filePath += ".html";
  }
  // console.log(
  //   "🚀 - BEN | file: server.js:49 | server | contentType:",
  //   contentType
  // );

  const fileExists = fs.existsSync(filePath);
  // console.log(
  //   "🚀 - BEN | file: server.js:60 | server | fileExists:",
  //   fileExists
  // );
  console.log("🚀 - BEN | file: server.js:60 | server | filePath:", filePath);

  if (fileExists) {
    //serve the file
    serveFile(filePath, contentType, res);
  } else {
    switch (path.parse(filePath).base) {
      case "old-page.html":
        res.writeHead(301, {
          Location: "/new-page.html",
        });
        res.end();
        break;
      case "www-page.html":
        res.writeHead(301, {
          Location: "/",
        });
        res.end();
        break;
      default:
        serveFile(path.join(__dirname, "views", "404.html"), "text/html", res);
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
