import React, { useState, useEffect } from "react";
import "./Consultas.css";
import { listarConsultasComNomes } from "@/lib/pacientesService"; // vamos criar já já

export default function Consultas() {
  const [consultas, setConsultas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // Carrega consultas reais da API
  useEffect(() => {
    async function carregar() {
      try {
        const dados = await listarConsultasComNomes();
        setConsultas(dados || []);
      } catch (e) {
        console.error("[Consultas] erro ao carregar", e);
        setErro("Não foi possível carregar as consultas.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  return (
    <div className="secretary-page-wrap">
      {/* Top bar parecida com sua AppBar */}
      <div className="appbar">
        <div className="appbar-inner">
          <div className="brand">
            <div>
              <h1>HealthOne</h1>
              <small>Histórico de Consultas</small>
            </div>
          </div>

          <div className="nav-links">
            <h1 style={{ fontSize: "1rem", fontWeight: 500, color: "#64748b", margin: 0 }}>
              Gerenciamento de Consultas
            </h1>
          </div>
        </div>
      </div>

      <main className="wrap">
        <section className="card" aria-label="Histórico de consultas">
          <div className="card-header">
            <h2>Histórico de Consultas</h2>
          </div>

          <div className="card-content">
            {carregando ? (
              <div className="empty note">Carregando consultas...</div>
            ) : erro ? (
              <div className="empty note" style={{ color: "#dc2626" }}>{erro}</div>
            ) : consultas.length === 0 ? (
              <div className="empty note">Nenhuma consulta encontrada.</div>
            ) : (
              <div className="table-wrap">
                <table id="Consultas">
                  <thead className="thead">
                    <tr>
                      <th>CPF</th>
                      <th>Paciente</th>
                      <th>Telefone</th>
                      <th>Médico</th>
                      <th>Data da Consulta</th>
                      <th>Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultas.map((c, i) => (
                      <tr key={i} className="row">
                        <td>{c.cpf || "—"}</td>
                        <td>{c.paciente_nome || "—"}</td>
                        <td>{c.paciente_telefone || "—"}</td>
                        <td>{c.medico_nome || "—"}</td>
                        <td>
                          {c.scheduled_at
                            ? new Date(c.scheduled_at).toLocaleString("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                        <td>{c.duration_minutes ? `${c.duration_minutes} min` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* escopo local só pra garantir spacing/layout sem duplicar sidebar */}
      <style>{`
        .secretary-page-wrap {
          flex: 1;
          min-height: 1vh;
          background: var(--bg, #fff);
          padding-left: 2px; /* mesma largura da sidebar da secretaria */
        }

        @media (max-width: 768px) {
          .secretary-page-wrap {
            padding-left: 88px; /* se você fizer sidebar colapsável depois */
          }
        }

        .appbar {
          background: transparent;
          padding: 24px 24px 0;
        }

        .appbar-inner {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .brand h1 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .brand small {
          color: #64748b;
          font-size: 0.8rem;
        }

        .wrap {
          padding: 24px;
          padding-top: 8px;
          max-width: 1100px;
        }

        .card {
          background: #f9fafb;
          border-radius: 12px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.05);
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .card-header {
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .card-header h2 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .card-content {
          padding: 16px 20px 24px;
        }

        .note {
          color: #64748b;
          font-size: 0.9rem;
          padding: 12px;
        }

        .table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
          color: #1e293b;
        }

        thead tr {
          background: #eef2ff;
          color: #1e293b;
        }

        th, td {
          text-align: left;
          padding: 10px 12px;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }

        tbody tr:last-child td {
          border-bottom: 0;
        }

        tbody tr:hover {
          background: #f8fafc;
        }
      `}</style>
    </div>
  );
}