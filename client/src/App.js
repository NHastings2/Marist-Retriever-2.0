import React from "react";
import { withCookies } from "react-cookie";

import "bootstrap/dist/css/bootstrap.min.css"
import './App.css';

import Login from './Pages/Login/Login';
import Jobs from './Pages/Jobs/Jobs';

class App extends React.Component
{
  render() {
    //Get cookies from client
    const {cookies} = this.props;

    console.log(!cookies.get('connect.sid'));
    //Check if user is logged in
    if(!cookies.get('connect.sid'))
      return <Login />
    else
      return <Jobs />
  }
}

export default withCookies(App);