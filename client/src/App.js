import React from "react";
import { withCookies } from "react-cookie";

import "bootstrap/dist/css/bootstrap.min.css"
import './App.css';

import Login from './Pages/Login/Login';
import Jobs from './Pages/Jobs/Jobs';
import { checkSession } from "./Modules/Authentication";

class App extends React.Component
{
  render() {
    //Get cookies from client
    const {cookies} = this.props;

    //Check if user is logged in
    if(!cookies.get('connect.sid'))
      return <Login />
    else
      return <Jobs />
  }
}

export default withCookies(App);