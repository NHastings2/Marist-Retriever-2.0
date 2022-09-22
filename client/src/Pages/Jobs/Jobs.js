import React from "react";
import "./Jobs.css";

import "bootstrap/dist/css/bootstrap.min.css"

async function getJobs() {
    const response = await fetch('https://9393ace83c7f.ngrok.io/api/jobs', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'token': localStorage.getItem('token')
        },
        })
        
    const data = await response.json();

    return data.map(({jobOwner, jobID}) => ({
        jobID: jobID,
        jobOwner: jobOwner
    }));
}

async function getJob(jobID) {
    return fetch('https://9393ace83c7f.ngrok.io/api/jobs/' + jobID, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'token': localStorage.getItem('token')
    },
    })
    .then((data) => data)
    .then((response) => {
        return response.text();
    })
}

async function deleteJob(jobID) {
    return fetch('https://9393ace83c7f.ngrok.io/api/jobs/' + jobID, {
    method: 'DELETE',
    headers: {
        'Content-Type': 'application/json',
        'token': localStorage.getItem('token')
    },
    })
    .then(data => JSON.parse(data))
    .then((response) => {
        return response.text();
    })
}

export default function Jobs() {
    const [jobs, setJobs] = React.useState([]);

    const retrieveJobs = () => {
        getJobs().then((data) => setJobs(data));
    }

    const removeJob = (jobId) => {
        deleteJob(jobId).then(retrieveJobs());
    }

    const purgeJobs = () => {
        getJobs().then((data) => setJobs(data));

        jobs.forEach(job => {
            deleteJob(job.jobID).then();
        });

        getJobs().then((data) => setJobs(data));
    }

    const downloadJob = (jobId) => {
        getJob(jobId).then((data) => {
            const element = document.createElement("a");
            const file = new Blob([data], {
                type: "text/plain"
            });

            element.href = URL.createObjectURL(file);
            element.download = `${jobId}.txt`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        });
    }

    const logout = () => {
        localStorage.removeItem('token');
        window.location.reload();
    }

    return(
        <div className="home-container">
            <header data-role="Header" className="home-header">
                <span className="home-text">Marist Job Retriever</span>
                <div className="home-nav"></div>
                <div className="nav-right-control-grp">
                    <div className="nav-right-btn-group">
                        <button onClick={logout} className="button">
                        <span>
                            <span>Logout</span>
                            <br></br>
                        </span>
                        </button>
                    </div>
                </div>
            </header>
            <div className="main-control-panel">
                <div id="buttoncontainer" className="left-control-panel">
                    <button onClick={retrieveJobs} className="refresh-button button">
                        <span>
                        <span>Refresh Jobs</span>
                        <br></br>
                        </span>
                    </button>
                    <button onClick={purgeJobs} className="purge-button button">Purge All Jobs</button>
                </div>
                <div id="tableview" className="right-control-grp">
                    <div className="job-ctrl-grp">
                        {
                            jobs.length > 0 ? (
                                <table>
                                    <thead>
                                        <th className="th-id">Job ID</th>
                                        <th className="th-action">Action</th>
                                    </thead>
                                    <tbody>
                                        {
                                            jobs.map((job) => (
                                                <tr>
                                                    <td>
                                                        {job.jobID}
                                                    </td>
                                                    <td>
                                                        <button className="btn-action" value={job.jobID} onClick={(e) => {downloadJob(e.target.value)}}>Download</button>
                                                        <button className="btn-action" value={job.jobID} onClick={(e) => {removeJob(e.target.value)}}>Delete</button>
                                                    </td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            ) : (
                                <h4>No Jobs Available</h4>
                            )
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}