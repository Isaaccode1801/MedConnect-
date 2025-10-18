import { get } from "../http";

export type Paciente = { id: string; full_name: string };

export const pacientesEndpoint = {
  list: () => get<Paciente[]>("/pacientes"),
};

export const listPacientes = pacientesEndpoint.list;