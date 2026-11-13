// Uma função por rota da plataforma (ver /docs na API).
import { request } from './client.js';

const get = (path, query) => request(path, { query });
const send = (method) => (path, body) => request(path, { method, body: body ?? {} });
const post = send('POST');
const patch = send('PATCH');
const put = send('PUT');

export const Platform = {
  login: (email, password) => request('/api/platform/login', { method: 'POST', body: { email, password }, auth: false }),
  overview: () => get('/api/platform/overview'),
  clinics: (query) => get('/api/platform/clinics', query),
  clinic: (id) => get(`/api/platform/clinics/${id}`),
  createClinic: (body) => post('/api/platform/clinics', body),
  updateClinic: (id, body) => patch(`/api/platform/clinics/${id}`, body),
  billing: (id) => get(`/api/platform/clinics/${id}/billing`),
  payInvoice: (clinicId, invoiceId, note) => post(`/api/platform/clinics/${clinicId}/invoices/${invoiceId}/pay`, note ? { note } : {}),
  extendTrial: (id, days) => post(`/api/platform/clinics/${id}/trial/extend`, { days }),
  setCourtesy: (id, body) => put(`/api/platform/clinics/${id}/courtesy`, body),
  invoices: (query) => get('/api/platform/invoices', query),
  plans: () => get('/api/platform/plans'),
  updatePlan: (id, body) => patch(`/api/platform/plans/${id}`, body),
};
