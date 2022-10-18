/**
 * Authenticate user with provided credentials
 * @param {credential json} credentials 
 * @returns Response JSON from server
 */
export async function loginUser(credentials) {
    //Send auth request to API server
    return await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials),
    })
    .then(data => data)
    .then((response) => {
      return response.json();
    })
  }

/**
 * Checks if session is valid
 * @return Response JSON from server
 */
export async function checkSession() {
  return await fetch('/api/session', {
    method: 'GET',
  })
  .then(data => data)
  .then((response) => {
    return response.json().success;
  })
}

/**
 * Logout current user session
 * @returns Text response from server
 */
export async function logoutUser() {
    return await fetch('/api/logout', {
        method: 'GET'
    })
    .then(data => data)
    .then((response) => {
        return response.text();
    });
}