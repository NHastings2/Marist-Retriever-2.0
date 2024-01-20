#!/usr/bin/env node

const express = require('express');
const session = require('express-session');
const { check, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const redis = require('redis');
const RedisStore = require('connect-redis').default;

const cors = require('cors');
const cookieParser = require('cookie-parser');

const path = require('path');
const zosConnector = require('zos-node-accessor');

//Set default port or env port
const PORT = process.env.PORT || 3001;

//Create app instance
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

//Setup Rate Limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,  //10 minutes
    max: 100,
    standardHeader: true,
    legacyHeaders: false
});

//Set CORS settings
// app.use(cors({
//     origin: '*',
//     methods: [
//         'GET',
//         'POST',
//         'DELETE'
//     ],
//     allowedHeader: [
//         'Content-Type'
//     ]
// }));


//Setup json use in request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Setup Cookie Parser
app.use(cookieParser());

app.use(limiter);

const tokenAge = (1000 * 60 * 60 * 24) * 30;

const generateSessionKey = (myLength) => {
    const chars =
      "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890!*$%";
    const sessionKeyArray = Array.from(
      { length: myLength },
      (v, k) => chars[Math.floor(Math.random() * chars.length)]
    );
  
    const sessionKey = sessionKeyArray.join("");
    return sessionKey;
};

const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

redisClient.connect().catch(console.error);

redisClient.on('error', function (err) {
    console.log('Could not establish a connection with redis. ' + err);
});

redisClient.on('connect', function (err) {
    console.log('Connected to Redis Successfully');
});

//Setup Session Middleware
app.use(session({ 
    store: new RedisStore({ client: redisClient }),
    secret: generateSessionKey(30),
    saveUninitialized: false,
    resave: false,
    cookie: { 
        secure: "auto",
        maxAge: tokenAge,
        httpOnly: false,
        sameSite: 'strict'
    }
}));


//Set use of React Frontend
app.use(express.static(path.resolve(__dirname, '../client/build')));

app.use((req, res, next) => {
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    console.log(`${getDateTime()} - ${clientIp}: ${req.session.userid ?? "Unauthenticated"} - ${req.method} - ${req.originalUrl}`);
    next();
});

/**
 * Get the current date/time timestamp
 * @returns Formatted current Date & time
 */
function getDateTime() {

    let date_ob = new Date();

    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();

    let hours = date_ob.getHours();
    let minutes = date_ob.getMinutes();
    let seconds = date_ob.getSeconds() < 10 ? "0" + date_ob.getSeconds() : date_ob.getSeconds();

    return (year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
}

/**
 * Authenticate user from credentials provided
 */
app.post("/api/login", [
    check('username', 'INVALID USERNAME FORMAT').contains('KC').isString().isLength({ min: 6, max: 9 }),
    check('password', 'INVALID PASSWORD FORMAT').isString().isLength({ max: 15 })
], async (req, res) => {

    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        res.status(400);
        res.json({
            "success": false,
            errors
        });

        return;
    }

    //Create accessor object for ZOS
    var accessor = new zosConnector();

    try
    {
        //Attempt to connect to Marist
        await accessor.connect({
            user: req.body.username,
            password: req.body.password,
            host: "zos.kctr.marist.edu",
            post: 21,
            pasvTimeout: 5000,
        });

        //Close connection if successful
        accessor.close();

        //Create token from provided username and password
        var session = req.session;
        session.userid = req.body.username;
        session.password = req.body.password;

        //Log login
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        console.log(getDateTime() + " - " + clientIp + ": " + session.userid + " - Successful Login");

        session.ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        //Send token json response
        res.json({
            "success": true,
        });
    }
    catch(err)
    {
        //Log login
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        console.log(getDateTime() + " - " + clientIp + ": " + req.body.username + " - Failed Login");
        //If login is unsuccessful then send unsuccessful login response
        res.json({
            "success": false,
        });
    }
});

app.get('/api/session', (req, res) => {

    if(req.session.userid == null || req.session.userid == undefined)
    {
        //Log session check
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        console.log(getDateTime() + " - " + clientIp + ": Session Check Invalid");

        //Destroy session token
        req.session.destroy();
        //Destroy Cookie
        res.clearCookie("connect.sid");

        //Return invalid session
        res.json({
            "success": false,
            "message": "Session Token Invalid"
        });
    }
    else
    {
        //Log Session Check
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        console.log(getDateTime() + " - " + clientIp + ": " + req.session.userid + " Session Validated");

        //Return Success
        res.status(200);
        res.json({
            "success": true,
            "message": "Session Token Valid"
        });
    }

});

/**
 * Logout user from application
 */
app.get('/api/logout', (req, res) => {
    //Log logout
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    console.log(getDateTime() + " - " + clientIp + ": Logged Out");
    //Destroy session token
    req.session.destroy();
    //Destroy Cookie
    res.clearCookie("connect.sid");
    //Send back response
    res.send("Success");
});

/**
 * Retrieve jobs of logged in user
 */
app.get("/api/jobs", async (req, res) => {

    if(!req.session.userid) {
        //If user is not authenticated then send 401
        res.status(401);
        res.json();

        return;
    }

    //Create new zos accessor instance
    var accessor = new zosConnector();

    //Connect to marist server
    await accessor.connect({
        user: req.session.userid,
        password: req.session.password,
        host: "zos.kctr.marist.edu",
        post: 21,
        pasvTimeout: 60000,
    });

    try
    {
        //Get all jobs with user as owner
        var jobs = await accessor.listJobs({ owner: `${req.session.userid}A`});
        accessor.close();

        //Check if there are jobs in the queue
        var jobIds = [];
        if(jobs[0] != 'No jobs found on Held queue')
        {
            //If jobs in queue
            for(let i = 0; i < jobs.length; i++)
            {
                //Parse job data and push owner and id to list
                jobIds.push(
                    {
                        jobOwner: jobs[i].split('  ')[0], 
                        jobID: jobs[i].split('  ')[1]
                    }
                );
            }
        }

        //Log Retrieve Jobs
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        console.log(getDateTime() + " - " + clientIp + ": " + req.session.userid + " - Retrieved " + jobIds.length + " Jobs");

        //Send user job list back to client
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.json({
            "success": true,
            "jobs": jobIds
        });
    }
    catch(err)
    {
        //Response with server error
        res.status(500);
        res.json({
            "success": false,
            "error": err
        });
    }
});

/**
 * Get JES output for specified job id
 * @param id JES Job ID
 */
app.get('/api/jobs/:id', [
    check('id', 'INVALID JOB ID').contains('JOB').isString().isLength({ min:8, max:8 })
], async (req, res) => {

    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        res.status(400);
        res.json({
            "success": false,
            "errors": errors
        });

        return;
    }

    if(!req.session.userid) {
        //If user is not authenticated then send 401
        res.status(401);
        res.send();

        return;
    }

    //Create zos accessor instance
    var accessor = new zosConnector();

    //Connect to marist server
    await accessor.connect({
        user: req.session.userid,
        password: req.session.password,
        host: "zos.kctr.marist.edu",
        post: 21,
        pasvTimeout: 60000,
    });

    try
    {
        //Retrieve all job log files from marist
        var data = await accessor.getJobLog({ jobId: `${req.params.id}` });

        //Close accessor connection
        accessor.close();

        //Split file into individual lines
        var finalData = "";
        var lines = data.split('\r\n');

        //Check over each line for formatting
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

        //Log Retrieve Job
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        console.log(getDateTime() + " - " + clientIp + ": " + req.session.userid + " - Retrieved Job: " + req.params.id);

        //Set Download Headers
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader('Content-Disposition', 'attachment; filename=' + req.params.id + '.txt');

        //Send Download Content
        res.send(finalData);
    }
    catch(err)
    {
        console.log(getDateTime() + " - " + err);

        //Respond with server error
        res.status(500);
        res.json({
            "success": false,
            "error": err
        })
    }
});

/**
 * Delete specified job
 * @param id JES Job ID
 */
app.delete("/api/jobs/:id", [
    check('id', 'INVALID JOB ID').contains('JOB').isString().isLength({ min:8, max:8 })
], async (req, res) => {

    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        res.status(400);
        res.json({
            "success": false,
            "errors": errors
        });

        return;
    }

    if(!req.session.userid) {
        res.status(401);
        res.send('Invalid Session Provided');

        return;
    }

    //Create zos accessor instance
    var accessor = new zosConnector();

    //Connect to marist server
    await accessor.connect({
        user: req.session.userid,
        password: req.session.password,
        host: "zos.kctr.marist.edu",
        post: 21,
        pasvTimeout: 60000,
    });

    try
    {
        //Delete job from server
        await accessor.deleteJob(req.params.id);

        //Close connection to server
        accessor.close();

        //Log Job Delete
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        console.log(getDateTime() + " - " + clientIp + ": " + req.session.userid + " - Deleted Job: " + req.params.id);

        //Send back successful message
        res.json({
            "success": true,
            "message": `Job ${req.params.id} Deleted`
        });

    }
    catch(err)
    {
        //Log error
        console.log(getDateTime() + " - " + err);

        //Close connection to server
        accessor.close();

        res.status(404);
        res.json({
            "success": false,
            "message": "Job not found"
        });
    }

});

app.delete("/api/purgeJobs", async (req, res) => {

    if(!req.session.userid) {
        res.status(401);
        res.send('Invalid Session Provided');

        return;
    }

    var accessor = new zosConnector();

    //Connect to marist server
    await accessor.connect({
        user: req.session.userid,
        password: req.session.password,
        host: "zos.kctr.marist.edu",
        post: 21,
        pasvTimeout: 60000,
    });

    try
    {
        var jobs = await accessor.listJobs({ owner: `${req.session.userid}A`});

        if(jobs[0] != 'No jobs found on Held queue')
        {
            //If jobs in queue
            for(let i = 0; i < jobs.length; i++)
            {
                accessor.deleteJob(jobs[i].split(' '[1]));
            }
        }

        accessor.close();

        //Log Retrieve Jobs
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
        console.log(getDateTime() + " - " + clientIp + ": Purged " + req.session.userid + " Jobs");

        //Send user job list back to client
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.json({
            "success": true,
        });
    }
    catch(err)
    {
        //Log error
        console.log(getDateTime() + " - " + err);

        //Close connection to server
        accessor.close();

        res.status(404);
        res.json({
            "success": false,
            "message": "Job not found"
        });
    }
});

/**
 * Serve React Frontend
 */
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
});

/**
 * Start server on specified port
 */
app.listen(PORT, () => {
    console.log(`Server Listening on ${PORT}`);
});