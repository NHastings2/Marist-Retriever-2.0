import React from "react";
import './Login.css';

async function loginUser(credentials) {
  return fetch('/api/login', {
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

export default function Login() {
  const [username, setUsername] = React.useState(null);
  const [password, setPassword] = React.useState(null);

  const handleLogin = async e => {
    e.preventDefault();

    const response = await loginUser({
      username,
      password
    });

    if(response.success)
    {
      localStorage.setItem('token', response.token);
      window.location.reload();
    }
    else
    {
      document.getElementById("#FailedLogin").innerText = "Invalid Username or Password";
    }
  };

  console.log(process.env.HOST);

  return (
    <div className="Auth-form-container">
      <form className="Auth-form" onSubmit={handleLogin}>
        <div className="Auth-form-content">
          <h3 className="Auth-form-title">Marist Job Retriever <br />Sign In</h3>
          <div className="form-group mt-3">
            <label>Marist KC-ID</label>
            <input 
              className="form-control mt-1"
              placeholder="Enter ID"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="form-group mt-3">
            <label>Password</label>
            <input 
              type="password"
              className="form-control mt-1"
              placeholder="Enter password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="d-grid gap-2 mt-3">
            <button type="submit" className="btn btn-primary">
              Submit
            </button>
          </div>
          <div className="form-group mt-3">
            <p className="failedText" id="#FailedLogin"></p>
          </div>
        </div>
      </form>
    </div>
  );
}