import React from "react";
import "./Jobs.css";

import { getJobs, getJob, deleteJob, logoutUser } from "./Marist";

import "bootstrap/dist/css/bootstrap.min.css"

export default function Jobs() {
    //Setup state for storing job list
    const [jobs, setJobs] = React.useState([]);

    /**
     * Retrieve a list of all jobs from server
     */
    const retrieveJobs = () => {
        //Query and set job list
        getJobs().then((data) => setJobs(data));
    }

    /**
     * Delete specified job from server
     * @param {string} jobId 
     */
    const removeJob = (jobId) => {
        //Delete the job and then update list
        deleteJob(jobId).then(retrieveJobs());
    }

    /**
     * Delete all jobs from server
     */
    const purgeJobs = () => {
        //Retrieve all current jobs
        getJobs().then((data) => setJobs(data));

        //Delete each job from the list
        jobs.forEach(job => {
            deleteJob(job.jobID).then();
        });

        //Retrieve update job list from server
        getJobs().then((data) => setJobs(data));
    }

    /**
     * Download output from server
     * @param {string} jobId 
     */
    const downloadJob = (jobId) => {
        //Download job output from server
        getJob(jobId).then((data) => {
            //Create empty element
            const element = document.createElement("a");

            //Create new plain text file with output data
            const file = new Blob([data], {
                type: "text/plain"
            });

            //Set object URL to empty element
            element.href = URL.createObjectURL(file);
            //Set the download name to the job ID
            element.download = `${jobId}.txt`;
            //Add the element to the current page
            document.body.appendChild(element);
            //Click the element to download the file
            element.click();
            //Delete the element from the page
            document.body.removeChild(element);
        });
    }

    /**
     * Logout user from app
     */
    const logout = () => {
        logoutUser().then(() => {
            window.location.reload();
        });
    }

    //Render page with job data and elements
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