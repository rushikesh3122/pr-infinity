/**
 * Data access for the app. Currently offline: everything is stored on the phone (see data/localApi.ts).
 * The functions mirror the REST API in /backend, so switching to a server later only means
 * replacing these implementations with HTTP calls; no screen needs to change.
 */
export {
  dashboardApi,
  invoicesApi,
  leadsApi,
  settingsApi,
  type InvoiceInput,
  type InvoiceQuery,
  type LeadInput,
  type LeadQuery,
  type SettingsInput,
} from '../data/localApi';
