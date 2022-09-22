import React from "react";
import { Cookies } from 'react-cookie';

import "bootstrap/dist/css/bootstrap.min.css"
import './App.css';

import Login from './Pages/Login/Login';
import Jobs from './Pages/Jobs/Jobs';

export default function App() {

  const cookies = new Cookies();

  if(!localStorage.getItem("token"))
    return <Login />
  else
    return <Jobs />
}