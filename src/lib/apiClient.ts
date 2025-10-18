// FONTE ÚNICA DA VERDADE: pacientesService
export {
  getHeaders as getAuthHeaders,
  // Pacientes
  listPacientes,
  getPaciente,
  createPaciente,
  updatePaciente,
  deletePaciente,
  // Laudos
  listarLaudos,
  excluirLaudo,
  createLaudo,
  getLaudo,
  updateLaudo,
  // Médicos
  listarMedicos,
} from './pacientesService';