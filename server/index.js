const express = require("express");
const path = require('path');
const ftpClient = require('ftp-client');
const url = require('url');
const cookieParser = require('cookie-parser');

const PORT = process.env.PORT || 3001;

const app = express();

app.use(cookieParser());
app.use(express.static(path.resolve(__dirname, '../client/build')));

app.get("/api", (req, res) => {
    res.json({ message: "Hello from server!" });
});

app.get("/api/login", (req, res) => {
    var queryObject = url.parse(req.url, true).query;
    console.log(queryObject);

    res.cookie(`Username`, queryObject["user"], {
        secure: true,
        sameSite: "lax"
    });
    res.cookie(`Password`, queryObject["pass"], {
        secure: true,
        sameSite: "lax"
    });

    res.send("Logged In Successfully");
});

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server Listening on ${PORT}`);
});