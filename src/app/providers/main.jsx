
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom';
import './index.css'

import App from './App.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import UsersList from './pages/UsersList.jsx'

// Dica: se seu deploy é 100% estático (sem rewrites), considere trocar para createHashRouter.
// import { createHashRouter } from 'react-router-dom'
// const router = createHashRouter([...])
import CreateUser from './pages/CreateUser.jsx';

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'users', element: <UsersList /> },
      { path: 'users/new', element: <CreateUser /> },   // 👈 nova rota
      { path: 'login', element: <Login /> },
    ],
  },
]);


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
  