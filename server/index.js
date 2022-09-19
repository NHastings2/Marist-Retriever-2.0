const express = require("express");
const path = require('path');
const cookieParser = require('cookie-parser');
const url = require("url");
const zosConnector = require("zos-node-accessor");

const PORT = process.env.PORT || 3001;

const app = express();

//Setup Cookie Parser Use
app.use(cookieParser());

//Setup json use in request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Set use of React Frontend
app.use(express.static(path.resolve(__dirname, '../client/build')));

app.get("/api", (req, res) => {
    res.json({ message: "Hello from server!" });
});

app.post("/api/login", (req, res) => {
    console.log(req.body);

    res.cookie(`username`, req.body.user, {
        sameSite: "lax",
        expires: addMonths(5)
    });
    res.cookie(`password`, req.body.pass, {
        sameSite: "lax",
        expires: addMonths(5)
    });

    res.send("Logged In Successfully");
});

app.get("/api/logout", (req, res) => {
    res.clearCookie(`username`);
    res.clearCookie(`password`);

    res.send("Logged Out Successfully");
});

app.get("/api/jobs", async (req, res) => {
    var accessor = new zosConnector();

    await accessor.connect({
        user: req.cookies.username,
        password: req.cookies.password,
        host: "zos.kctr.marist.edu",
        post: 21,
        pasvTimeout: 60000,
    });

    var jobs = await accessor.listJobs({ owner: `${req.cookies.username}A`});
    accessor.close();
    
    var jobIds = [];
    if(jobs[0] != 'No jobs found on Held queue')
    {
        for(let i = 0; i < jobs.length; i++)
            jobIds.push(jobs[i].split('  ')[1]);
    }
    else
    {
        jobIds.push('No Jobs Available');
    }

    console.log(jobIds);
    res.send(JSON.stringify(jobIds));
});

app.get('/api/jobs/:id', async (req, res) => {
        var accessor = new zosConnector();

        await accessor.connect({
            user: req.cookies.username,
            password: req.cookies.password,
            host: "zos.kctr.marist.edu",
            post: 21,
            pasvTimeout: 60000,
        });

        var data = await accessor.getJobLog({ jobId: `${req.params.id}` });

        accessor.close();

        res.send(data);
});

app.delete("/api/jobs/:id", async (req, res) => {
    var accessor = new zosConnector();

    await accessor.connect({
        user: req.cookies.username,
        password: req.cookies.password,
        host: "zos.kctr.marist.edu",
        post: 21,
        pasvTimeout: 60000,
    });

    console.log(`Deleting ${req.params.id}`);
    await accessor.deleteJob(req.params.id);

    accessor.close();

    res.send(`Job ${req.params.id} Deleted`)
});

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server Listening on ${PORT}`);
});

function addMonths(numofMonths, date = new Date()) {
    date.setMonth(date.getMonth() + numofMonths);

    return date;
}