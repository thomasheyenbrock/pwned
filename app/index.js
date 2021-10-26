const bodyParser = require("body-parser");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const express = require("express");
const fs = require("fs");
const { MongoClient } = require("mongodb");
const path = require("path");

const config = require("./config");
const filterNotes = require("./filterNotes");

const indexTemplate = fs.readFileSync(
  path.join(__dirname + "/index.html"),
  "utf8"
);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

const port = 3000;

async function findOneUser(username) {
  return client.db("pwned").collection("users").findOne({ username });
}

async function getSessionUser(req) {
  const cookie = req.cookies.session;
  if (!cookie) {
    return null;
  }

  const { username } = JSON.parse(Buffer.from(cookie, "base64").toString());
  return findOneUser(username);
}

function setSessionCookie(res, user) {
  const sessionCookie = Buffer.from(
    JSON.stringify({ username: user.username })
  ).toString("base64");
  res.setHeader("Set-Cookie", `session=${sessionCookie}`);
}

function removeSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "session=none;expires=Thu, 01 Jan 1970 00:00:01 GMT"
  );
}

const tokens = [];

function getToken() {
  const token = crypto.randomBytes(8).toString("hex");
  tokens.push(token);
  return token;
}

async function getHtml(user, query) {
  const allNotes = await client
    .db("pwned")
    .collection("notes")
    .find({ isPrivate: { $eq: false } })
    .toArray();
  const privateNotes = await client
    .db("pwned")
    .collection("notes")
    .find({ username: { $eq: user.username }, isPrivate: { $eq: true } })
    .toArray();

  const noteCount = allNotes
    .filter((note) => note.wasSentFromBrowser)
    .reduce((acc, note) => {
      const key = `${note.username} - ${note.note}`;
      if (!acc[key]) {
        acc[key] = 0;
      }
      acc[key] += 1;
      return acc;
    }, {});

  if (Object.values(noteCount).some((value) => value > 100)) {
    return "<h1>XSS Worm Alarm</h1><p>You found flag_xss_worm</p>";
  }

  let filteredNotes;
  try {
    filteredNotes = await filterNotes(allNotes, query);
  } catch {
    return "<h1>DOS Alarm</h1><p>You found flag_re_dos</p>";
  }

  let html = indexTemplate
    .replace(/{{username}}/, user.username)
    .replace(/{{token}}/, getToken())
    .replace(
      /{{allNotes}}/,
      filteredNotes.length === 0
        ? "<li>No notes found</li>"
        : filteredNotes
            .map((note) => `<li>${note.note} (by ${note.username})</li>`)
            .join("")
    )
    .replace(
      /{{privateNotes}}/,
      privateNotes.length === 0
        ? "<li>No notes found</li>"
        : privateNotes.map((note) => `<li>${note.note}</li>`).join("")
    );

  if (!user.isAdmin) {
    html = html.replace(
      /<!-- ADMIN ONLY START -->.*<!-- ADMIN ONLY END -->/s,
      ""
    );
  }

  return html;
}

app.get("/", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    removeSessionCookie(res);
    res.redirect("/login");
    return;
  }

  res.send(await getHtml(user, req.query.q));
});

app.post("/", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    removeSessionCookie(res);
    res.redirect("/login");
    return;
  }

  await client
    .db("pwned")
    .collection("notes")
    .insertOne({
      username: user.username,
      note: req.body.note,
      isPrivate: req.body.isPrivate !== "false",
      wasSentFromBrowser: tokens.includes(req.body.token),
    });

  res.send(await getHtml(user, req.query.q));
});

app.get("/login", async (req, res) => {
  const user = await getSessionUser(req);

  if (user) {
    res.redirect("/");
    return;
  }

  res.sendFile(path.join(__dirname + "/login.html"));
});

app.post("/login", async (req, res) => {
  const user = await findOneUser(req.body.username);
  if (!user) {
    res.send(
      `<h1>Error</h1><p>User does not exist</p><a href="/login">try again</a>`
    );
    return;
  }

  if (user.password !== req.body.password) {
    res.send(
      `<h1>Error</h1><p>Wrong password</p><a href="/login">try again</a>`
    );
    return;
  }

  setSessionCookie(res, user);
  res.redirect("/");
});

app.get("/register", async (req, res) => {
  const user = await getSessionUser(req);

  if (user) {
    res.redirect("/");
    return;
  }

  res.sendFile(path.join(__dirname + "/register.html"));
});

app.post("/register", async (req, res) => {
  const validationErrors = Object.entries(req.body)
    .map(([name, value]) =>
      config.get(`registration.validators.${name}`)(value)
    )
    .reduce((allErrors, validate) => {
      const { isValid, errorMessage } = validate();
      if (!isValid) {
        allErrors.push(`<li>${errorMessage}</li>`);
      }
      return allErrors;
    }, []);
  if (validationErrors.length > 0) {
    res.send(
      `<h1>Error</h1><ul>${validationErrors.join(
        ""
      )}</ul><a href="/register">try again</a>`
    );
    return;
  }

  const user = { username: req.body.username, password: req.body.password };
  await client.db("pwned").collection("users").insertOne(user);

  setSessionCookie(res, user);
  res.redirect("/");
});

app.get("/logout", (req, res) => {
  removeSessionCookie(res);
  res.redirect("/login");
});

const client = new MongoClient(config.get("mongodb"), {
  useUnifiedTopology: true,
});

client.connect().then(async () => {
  await client.db("pwned").dropDatabase();

  await client
    .db("pwned")
    .collection("users")
    .insertMany([
      { username: "fc24admin", password: "fc24pwned", isAdmin: true },
      { username: "fc24moderator", password: "iamincharge" },
      { username: "fc24user", password: "iamnoadmin" },
    ]);

  await client
    .db("pwned")
    .collection("notes")
    .insertMany([
      {
        username: "fc24moderator",
        note: "Welcome to our space!",
        isPrivate: false,
      },
      {
        username: "fc24user",
        note: "You found flag_account_hijacking",
        isPrivate: true,
      },
    ]);

  app.listen(port, () => {
    console.log(`Start pwning at http://localhost:${port}`);
  });
});
