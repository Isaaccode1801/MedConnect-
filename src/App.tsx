import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/features/home/pages/Home";
import Login from "@/features/auth/pages/Login";
import DoctorDashboard from "@/features/doctor/pages/Dashboard";
// (exemplo de placeholders)
function Patient() {
  return <h1 className="text-center text-2xl p-10">Página do Paciente</h1>;
}
function Secretary() {
  return <h1 className="text-center text-2xl p-10">Página da Secretária</h1>;
}
function Admin() {
  return <h1 className="text-center text-2xl p-10">Área do Administrador</h1>;
}
function Finance() {
  return <h1 className="text-center text-2xl p-10">Financeiro</h1>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/patient" element={<Patient />} />
        <Route path="/secretary" element={<Secretary />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/doctor" element={<DoctorDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}