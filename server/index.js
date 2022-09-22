const express = require("express");
const path = require('path');
const cookieParser = require('cookie-parser');
const zosConnector = require("zos-node-accessor");
const cors = require('cors');
const helmet = require('helmet');

const PORT = process.env.PORT || 3001;

const app = express();

//Setup Cookie Parser Use
app.use(cookieParser());
app.use(cors({
    origin: '192.168.50.55',
    methods: [
        'GET',
        'POST',
        'DELETE'
    ],
    allowedHeader: [
        'Content-Type'
    ]
}));
app.use(helmet());

app.use(function(req, res, next) {
    res.header("Cross-Origin-Embedder-Policy", "require-corp");
    res.header("Cross-Origin-Opener-Policy", "same-origin");
    next();
  });

//Setup json use in request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Set use of React Frontend
app.use(express.static(path.resolve(__dirname, '../client/build')));

app.get("/api", (req, res) => {
    res.json({ message: "Test Message"});
});

app.post("/api/login", async (req, res) => {
    var accessor = new zosConnector();

    console.log(req.body);

    try
    {
        await accessor.connect({
            user: req.body.username,
            password: req.body.password,
            host: "zos.kctr.marist.edu",
            post: 21,
            pasvTimeout: 5000,
        });

        accessor.close();

        var buffer = Buffer.from(`${req.body.username}:${req.body.password}`, "utf-8");
        var token = buffer.toString("base64");

        res.json({
            "success": true,
            "token": token
        });
    }
    catch(err)
    {
        res.json({
            "success": false,
            "token": token
        });
    }
});

app.get("/api/jobs", async (req, res) => {
    if(req.headers["token"] != null)
    {
        var accessor = new zosConnector();

        var tokenEnc = req.headers["token"];
        var tokenData = Buffer.from(tokenEnc, "base64").toString("utf-8").split(":");

        await accessor.connect({
            user: tokenData[0],
            password: tokenData[1],
            host: "zos.kctr.marist.edu",
            post: 21,
            pasvTimeout: 60000,
        });

        var jobs = await accessor.listJobs({ owner: `${tokenData[0]}A`});
        accessor.close();
        
        var jobIds = [];
        if(jobs[0] != 'No jobs found on Held queue')
        {
            for(let i = 0; i < jobs.length; i++)
            {
                jobIds.push(
                    {
                        jobOwner: jobs[i].split('  ')[0], 
                        jobID: jobs[i].split('  ')[1]
                    }
                );
            }
        }

        console.log(jobIds);
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(jobIds));
    }
    else
    {
        res.send('Must Be Logged In!');
    }
});

app.get('/api/jobs/:id', async (req, res) => {
    if(req.headers["token"] != null)
    {
        var accessor = new zosConnector();

        var tokenEnc = req.headers["token"];
        var tokenData = Buffer.from(tokenEnc, "base64").toString("utf-8").split(":");

        await accessor.connect({
            user: tokenData[0],
            password: tokenData[1],
            host: "zos.kctr.marist.edu",
            post: 21,
            pasvTimeout: 60000,
        });

        var data = await accessor.getJobLog({ jobId: `${req.params.id}` });

        var finalData = "";
        var lines = data.split('\r\n');

        lines.forEach(line => {
            if(line.includes("!! END OF JES SPOOL FILE !!")) {   

            }
            else if(line.startsWith("0")) {
                finalData += "\n" + line.substring(1, line.length) + "\n";
            }
            else if(line.startsWith("1")) {
                finalData += "\f\n" + line.substring(1, line.length) + "\n";
            }
            else if (line.startsWith("-")) {
                finalData += "\n\n" + line.substring(1, line.length) + "\n";
            }
            else if(line.startsWith(" ")) {
                finalData += line.substring(1, line.length) + "\n";
            }
            else {
                finalData += line + "\n";
            }
        });

        accessor.close();

        res.send(finalData);
    }
    else
    {
        res.send("Must Be Logged In!");
    }
});

app.delete("/api/jobs/:id", async (req, res) => {
    if(req.headers["token"] != null)
    {
        var accessor = new zosConnector();

        var tokenEnc = req.headers["token"];
        var tokenData = Buffer.from(tokenEnc, "base64").toString("utf-8").split(":");

        await accessor.connect({
            user: tokenData[0],
            password: tokenData[1],
            host: "zos.kctr.marist.edu",
            post: 21,
            pasvTimeout: 60000,
        });

        console.log(`Deleting ${req.params.id}`);
        await accessor.deleteJob(req.params.id);

        accessor.close();

        res.send(`Job ${req.params.id} Deleted`)
    }
    else
    {
        res.send("Must Be Logged In!");
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server Listening on ${PORT}`);
});