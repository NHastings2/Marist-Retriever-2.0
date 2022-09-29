/**
 * Get the current user's jobs
 * @returns List object of user job
 */
 export async function getJobs() {
    //Request user jobs from server
    const response = await fetch('/api/jobs', {
        method: 'GET',
        headers: {
            'token': localStorage.getItem('token')
        },
    })
        
    //Parse the json response
    const data = await response.json();

    //Map JSON object and return new list
    return data.map(({jobOwner, jobID}) => ({
        jobID: jobID,
        jobOwner: jobOwner
    }));
}

/**
 * Get JES output by ID
 * @param {string} jobID 
 * @returns String of JES output text
 */
export async function getJob(jobID) {
    //Get job data from API server
    return fetch('/api/jobs/' + jobID, {
        method: 'GET',
        headers: {
            'token': localStorage.getItem('token')
        },
    })
    .then((data) => data)
    .then((response) => {
        return response.text();
    })
}

/**
 * Delete Job by ID
 * @param {string} jobID 
 */
export async function deleteJob(jobID) {
    return fetch('/api/jobs/' + jobID, {
    method: 'DELETE',
    headers: {
        'token': localStorage.getItem('token')
    },
    })
    .then(data => JSON.parse(data))
    .then((response) => {
        return response.text();
    })
}