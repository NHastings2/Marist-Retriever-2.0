import React from "react";
import './Login.css';
import { loginUser } from '../../Modules/Authentication.js';

export default function Login() {
  //State containing username and password
  const [username, setUsername] = React.useState(null);
  const [password, setPassword] = React.useState(null);

  /**
   * Handle when user attempts to login
   */
  const handleLogin = async e => {
    e.preventDefault();

    //Execute authentication request
    const response = await loginUser({
      username,
      password
    });

    //If auth is successful
    if(response.success)
    {
      //Reload window to render jobs page
      window.location.reload();
    }
    //If auth failed
    else
    {
      //Set Failed text to invalid username and password
      document.getElementById("#FailedLogin").innerText = "Invalid Username or Password";
    }
  };

  return (
    <div className="Auth-form-container">
      <form className="Auth-form" onSubmit={handleLogin}>
        <div className="Auth-form-content">
          <h3 className="Auth-form-title">Marist Job Retriever<br />Sign In</h3>
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
      <p className="secret"><a href="https://www.youtube.com/watch?v=pXPXMxsXT28">π</a></p>
    </div>
  );
}