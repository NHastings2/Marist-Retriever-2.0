/**
 * Get the current user's jobs
 * @returns List object of user job
 */
 export async function getJobs() {
    //Request user jobs from server
    const response = await fetch('/api/jobs', {
        method: 'GET',
    })
        
    //Parse the json response
    const data = await response.json();

    //Map JSON object and return new list
    return data.jobs.map(({jobOwner, jobID}) => ({
        jobID: jobID,
        jobOwner: jobOwner
    }));
}

/**
 * Delete Job by ID
 * @param {string} jobID 
 */
export async function deleteJob(jobID) {
    return fetch('/api/jobs/' + jobID, {
        method: 'DELETE',
    })
    .then(data => JSON.parse(data))
    .then((response) => {
        return response.text();
    })
}

/**
 * Purge all jobs from queue
 */
export async function purgeJobs() {
    return fetch('/api/purgeJobs', {
        method: 'DELETE',
    })
    .then(data => JSON.parse(data))
    .then((response) => {
        return response.text();
    })
}