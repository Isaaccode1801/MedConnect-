import { get } from "../http";

export type Medico = { id: string; full_name: string };

export const medicosEndpoint = {
  list: () => get<Medico[]>("/medicos"),
};

export const listarMedicos = medicosEndpoint.list;