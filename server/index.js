#!/usr/bin/env node

const express = require("express");
const session = require('express-session');
const { check, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");

const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require("cookie-parser");

const path = require('path');
const zosConnector = require("zos-node-accessor");


//Set default port or env port
const PORT = process.env.PORT || 3001;

//Create app instance
const app = express();

//Setup Rate Limiting
const limiter = {}

//Set CORS settings
app.use(cors({
    origin: '*',
    methods: [
        'GET',
        'POST',
        'DELETE'
    ],
    allowedHeader: [
        'Content-Type'
    ]
}));

//Setup json use in request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Setup Cookie Parser
app.use(cookieParser());

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

//Setup Session Middleware
app.use(session({ 
    secret: generateSessionKey(30),
    saveUninitialized: false,
    cookie: { 
        secure: "auto",
        maxAge: tokenAge,
        httpOnly: true
    },
    resave: false
}));


//Set use of React Frontend
app.use(express.static(path.resolve(__dirname, '../client/build')));

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
    }
    else
    {
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

            //Send token json response
            res.json({
                "success": true,
            });
        }
        catch(err)
        {
            console.log(err);
            //If login is unsuccessful then send unsuccessful login response
            res.json({
                "success": false,
            });
        }
    }
});

/**
 * Logout user from application
 */
app.get('/api/logout', (req, res) => {
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

    //Check if user provided auth token
    if(req.session.userid)
    {
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

        //Send user job list back to client
        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify(jobIds));
    }
    else
    {
        //If user is not authenticated then send 401
        res.status(401);
        res.send('Invalid Session Provided');
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
    }
    else
    {
        //Check if user provided auth token
        if(req.session.userid)
        {
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

            //Set Download Headers
            res.setHeader("Content-Type", "application/octet-stream");
            res.setHeader('Content-Disposition', 'attachment; filename=' + req.params.id + '.txt');

            //Send Download Content
            res.send(finalData);
        }
        else
        {
            //If user is not authenticated then send 401
            res.status(401);
            res.send('Invalid Session Provided');
        }
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
    }
    else
    {
        //Check if user has provided auth token
        if(req.session.userid)
        {
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

                //Send back successful message
                res.json({
                    "success": true,
                    "message": `Job ${req.params.id} Deleted`
                });

            }
            catch(err)
            {
                //Close connection to server
                accessor.close();

                res.status(404);
                res.json({
                    "success": false,
                    "message": "Job not found"
                });
            }

        }
        else
        {
            //If user is not authenticated then send 401
            res.status(401);
            res.send('Invalid Session Provided');
        }
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