#!/usr/bin/env node

const express = require("express");
const path = require('path');
const zosConnector = require("zos-node-accessor");
const cors = require('cors');

//Set default port or env port
const PORT = process.env.PORT || 3001;

//Create app instance
const app = express();

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

//Set use of React Frontend
app.use(express.static(path.resolve(__dirname, '../client/build')));

/**
 * Authenticate user from credentials provided
 */
app.post("/api/login", async (req, res) => {
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
        var buffer = Buffer.from(`${req.body.username}:${req.body.password}`, "utf-8");
        var token = buffer.toString("base64");

        //Send token json response
        res.json({
            "success": true,
            "token": token
        });
    }
    catch(err)
    {
        //If login is unsuccessful then send unsuccessful login response
        res.json({
            "success": false,
            "token": token
        });
    }
});

/**
 * Retrieve jobs of logged in user
 */
app.get("/api/jobs", async (req, res) => {

    //Check if user provided auth token
    if(req.headers["token"] != null)
    {
        //Create new zos accessor instance
        var accessor = new zosConnector();

        //Retrieve and parse user token
        var tokenEnc = req.headers["token"];
        var tokenData = Buffer.from(tokenEnc, "base64").toString("utf-8").split(":");

        //Connect to marist server
        await accessor.connect({
            user: tokenData[0],
            password: tokenData[1],
            host: "zos.kctr.marist.edu",
            post: 21,
            pasvTimeout: 60000,
        });

        //Get all jobs with user as owner
        var jobs = await accessor.listJobs({ owner: `${tokenData[0]}A`});
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
        res.send('Invalid Token Provided');
    }
});

/**
 * Get JES output for specified job id
 * @param id JES Job ID
 */
app.get('/api/jobs/:id', async (req, res) => {

    //Check if user provided auth token
    if(req.headers["token"] != null)
    {
        //Create zos accessor instance
        var accessor = new zosConnector();

        //Get and parse user token
        var tokenEnc = req.headers["token"];
        var tokenData = Buffer.from(tokenEnc, "base64").toString("utf-8").split(":");

        //Connect to marist server
        await accessor.connect({
            user: tokenData[0],
            password: tokenData[1],
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

        res.send(finalData);
    }
    else
    {
        //If user is not authenticated then send 401
        res.status(401);
        res.send('Invalid Token Provided');
    }
});

/**
 * Delete specified job
 * @param id JES Job ID
 */
app.delete("/api/jobs/:id", async (req, res) => {

    //Check if user has provided auth token
    if(req.headers["token"] != null)
    {
        //Create zos accessor instance
        var accessor = new zosConnector();

        //Get and parse provided user auth token
        var tokenEnc = req.headers["token"];
        var tokenData = Buffer.from(tokenEnc, "base64").toString("utf-8").split(":");

        //Connect to marist server
        await accessor.connect({
            user: tokenData[0],
            password: tokenData[1],
            host: "zos.kctr.marist.edu",
            post: 21,
            pasvTimeout: 60000,
        });

        //Delete job from server
        await accessor.deleteJob(req.params.id);

        //Close connection to server
        accessor.close();

        //Send back successful message
        res.send(`Job ${req.params.id} Deleted`)
    }
    else
    {
        //If user is not authenticated then send 401
        res.status(401);
        res.send('Invalid Token Provided');
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