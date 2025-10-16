// src/App.tsx
import { RouterProvider } from 'react-router-dom'
import { router } from './app/providers/router'
import './styles/global.css'

export default function App() {
  return <RouterProvider router={router} />
}