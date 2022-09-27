import React from "react";

import "bootstrap/dist/css/bootstrap.min.css"
import './App.css';

import Login from './Pages/Login/Login';
import Jobs from './Pages/Jobs/Jobs';

export default function App() {

  //If user is not logged in, send to login page
  if(!localStorage.getItem("token"))
    return <Login />
  else
    return <Jobs />
}