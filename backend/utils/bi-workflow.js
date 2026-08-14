const { PrismaClient } = require('@prisma/client');
const { getCurrentStep, getProgressPercent, EVENT_TYPES } = require('./bi-status');

const prisma = new PrismaClient();

/**
 * Notification templates derived from workflow events (plan refinement #10).
 * recordEvent() is the ONLY place notifications are created from status
 * handlers. `role` selects the inbox (CLIENT vs ADMIN).
 */
const NOTIF_TEMPLATES = {
  [EVENT_TYPES.REQUEST_CREATED]: [
    { role: 'CLIENT', type: 'REQUEST_SUBMITTED', title: 'Demande envoyée', message: 'Votre demande de tableau de bord a bien été envoyée ({requestId}).' },
    { role: 'ADMIN', type: 'NEW_REQUEST', title: 'Nouvelle demande BI', message: 'Une nouvelle demande de tableau de bord a été soumise ({requestId}).' },
  ],
  [EVENT_TYPES.ZIP_UPLOADED]: [
    { role: 'CLIENT', type: 'ZIP_UPLOADED', title: 'Fichier de données téléversé', message: 'Votre fichier de données a bien été reçu pour la demande {requestId}.' },
    { role: 'ADMIN', type: 'ZIP_UPLOADED', title: 'Données téléversées', message: 'Un fichier de données a été téléversé pour la demande {requestId}.' },
  ],
  [EVENT_TYPES.ZIP_VALIDATED]: [
    { role: 'CLIENT', type: 'ZIP_VALIDATED', title: 'Données valides', message: 'La validation de votre fichier est terminée avec succès ({requestId}).' },
    { role: 'ADMIN', type: 'ZIP_VALIDATED', title: 'Données valides', message: 'Le fichier de la demande {requestId} a été validé avec succès.' },
  ],
  [EVENT_TYPES.ZIP_INVALID]: [
    { role: 'CLIENT', type: 'ZIP_INVALID', title: 'Données invalides', message: 'Le fichier téléversé pour {requestId} présente des erreurs. Merci de le remplacer.' },
    { role: 'ADMIN', type: 'ZIP_INVALID', title: 'Données invalides', message: 'Le fichier de la demande {requestId} n’a pas passé la validation.' },
  ],
  [EVENT_TYPES.PAYMENT_VERIFIED]: [
    { role: 'CLIENT', type: 'PAYMENT_VERIFIED', title: 'Paiement vérifié', message: 'Votre paiement a été vérifié pour la demande {requestId}.' },
  ],
  [EVENT_TYPES.PAYMENT_REJECTED]: [
    { role: 'CLIENT', type: 'PAYMENT_REJECTED', title: 'Paiement refusé', message: 'Votre paiement pour la demande {requestId} a été refusé.' },
  ],
  [EVENT_TYPES.REQUEST_APPROVED]: [
    { role: 'CLIENT', type: 'REQUEST_APPROVED', title: 'Demande approuvée', message: 'Votre demande {requestId} a été approuvée.' },
    { role: 'ADMIN', type: 'REQUEST_APPROVED', title: 'Demande approuvée', message: 'La demande {requestId} a été approuvée.' },
  ],
  [EVENT_TYPES.REQUEST_REJECTED]: [
    { role: 'CLIENT', type: 'REQUEST_REJECTED', title: 'Demande refusée', message: 'Votre demande {requestId} a été refusée.' },
  ],
  [EVENT_TYPES.REQUEST_INFO_REQUESTED]: [
    { role: 'CLIENT', type: 'REQUEST_INFO', title: 'Informations complémentaires', message: 'Des informations complémentaires sont demandées pour la demande {requestId}.' },
  ],
  [EVENT_TYPES.REQUEST_CANCELLED]: [
    { role: 'CLIENT', type: 'REQUEST_CANCELLED', title: 'Demande annulée', message: 'Votre demande {requestId} a été annulée.' },
    { role: 'ADMIN', type: 'REQUEST_CANCELLED', title: 'Demande annulée', message: 'La demande {requestId} a été annulée par le client.' },
  ],
  [EVENT_TYPES.ETL_STARTED]: [
    { role: 'CLIENT', type: 'ETL_STARTED', title: 'Traitement des données démarré', message: 'Le traitement de vos données a démarré ({requestId}).' },
    { role: 'ADMIN', type: 'ETL_STARTED', title: 'Traitement démarré', message: 'Le traitement ETL de la demande {requestId} a démarré.' },
  ],
  [EVENT_TYPES.ETL_COMPLETED]: [
    { role: 'CLIENT', type: 'ETL_COMPLETED', title: 'Données traitées', message: 'Le traitement de vos données est terminé ({requestId}).' },
    { role: 'ADMIN', type: 'ETL_COMPLETED', title: 'Traitement terminé', message: 'Le traitement ETL de la demande {requestId} est terminé.' },
  ],
  [EVENT_TYPES.ETL_FAILED]: [
    { role: 'CLIENT', type: 'ETL_FAILED', title: 'Échec du traitement', message: 'Le traitement de vos données a échoué ({requestId}).' },
    { role: 'ADMIN', type: 'ETL_FAILED', title: 'Échec du traitement', message: 'Le traitement ETL de la demande {requestId} a échoué.' },
  ],
  [EVENT_TYPES.DASHBOARD_GENERATED]: [
    { role: 'CLIENT', type: 'DASHBOARD_GENERATED', title: 'Tableau de bord généré', message: 'Votre tableau de bord est prêt pour révision ({requestId}).' },
    { role: 'ADMIN', type: 'DASHBOARD_GENERATED', title: 'Tableau de bord généré', message: 'Le tableau de bord de la demande {requestId} a été généré.' },
  ],
  [EVENT_TYPES.DASHBOARD_PUBLISHED]: [
    { role: 'CLIENT', type: 'DASHBOARD_PUBLISHED', title: 'Votre tableau de bord est disponible', message: 'Votre tableau de bord est publié et disponible dans votre espace.' },
  ],
  [EVENT_TYPES.REQUEST_COMPLETED]: [
    { role: 'CLIENT', type: 'REQUEST_COMPLETED', title: 'Demande terminée', message: 'Votre demande {requestId} est terminée. Merci !' },
  ],
};

function format(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : `{${key}}`));
}

/**
 * Map a notification `type` to its inbox category (Phase 3, Part 8):
 * REQUEST / DASHBOARD / PAYMENT / VALIDATION / SYSTEM.
 */
function categoryForType(type) {
  if (!type) return 'SYSTEM';
  if (type === 'NEW_REQUEST' || type.startsWith('REQUEST_')) return 'REQUEST';
  if (type.startsWith('PAYMENT_')) return 'PAYMENT';
  if (type.startsWith('ZIP_') || type.startsWith('ETL_')) return 'VALIDATION';
  if (type.startsWith('DASHBOARD_')) return 'DASHBOARD';
  return 'SYSTEM';
}

/**
 * Write a BiRequestEvent + derive notifications (plan refinement #10/#15).
 *
 * @param {object} opts
 * @param {string} opts.requestId
 * @param {string} opts.type                 EVENT_TYPES member
 * @param {string} [opts.message]
 * @param {object} [opts.metadata]           JSON payload (kept for audit)
 * @param {string} [opts.performedBy]        user id of the actor
 * @param {string} [opts.performedByRole]    role of the actor (e.g. ADMIN, CLIENT, system)
 */
async function recordEvent({ requestId, type, message, metadata, performedBy, performedByRole }) {
  if (!requestId || !type) return null;

  const performedAt = new Date();
  const event = await prisma.biRequestEvent.create({
    data: {
      requestId,
      type,
      message: message || null,
      metadata: metadata || undefined,
      performedBy: performedBy || null,
      performedByRole: performedByRole || null,
      performedAt,
    },
  });

  const request = await prisma.biRequest
    .findUnique({ where: { id: requestId }, select: { id: true, clientId: true, businessName: true } })
    .catch(() => null);

  const templates = NOTIF_TEMPLATES[type] || [];
  for (const tpl of templates) {
    try {
      await prisma.biNotification.create({
        data: {
          clientId: tpl.role === 'ADMIN' ? null : request?.clientId || null,
          requestId: request?.id || null,
          dashboardId: metadata?.dashboardId || null,
          type: tpl.type || type,
          category: categoryForType(tpl.type || type),
          title: format(tpl.title, { requestId, businessName: request?.businessName || '' }),
          message: format(tpl.message, { requestId, businessName: request?.businessName || '' }),
          role: tpl.role,
        },
      });
    } catch (err) {
      console.error(`[BI-WORKFLOW] notification (${type}/${tpl.role}) failed:`, err.message);
    }
  }

  return event;
}

/**
 * Serialize a BiRequest row into the API shape, appending the
 * backend-computed `currentStep` and `progressPercent` (refinements #12/#13).
 * Nested relations (events/uploads/dashboards) are passed through untouched.
 */
function serializeRequest(request) {
  if (!request) return null;
  const { events, uploads, dashboards, ...rest } = request;
  const out = { ...rest, currentStep: getCurrentStep(request.status), progressPercent: getProgressPercent(request.status) };
  if (events) out.events = events;
  if (uploads) out.uploads = uploads;
  if (dashboards) out.dashboards = dashboards;
  return out;
}

/**
 * Atomic guarded status transition — duplicate-execution protection
 * (plan refinement #14). Only the winning transition proceeds; a losing
 * concurrent/double-click caller receives a conflict.
 *
 * @param {object} opts
 * @param {'biRequest'|'biDashboard'} opts.model
 * @param {string} opts.id
 * @param {string[]} opts.allowedStatuses
 * @param {string} opts.nextStatus
 * @param {object} [opts.data] additional fields to set
 * @returns {Promise<boolean>} true when this caller won the transition
 */
async function guardTransition({ model, id, allowedStatuses, nextStatus, data = {} }) {
  const result = await prisma[model].updateMany({
    where: { id, status: { in: allowedStatuses } },
    data: { status: nextStatus, ...data },
  });
  return result.count === 1;
}

/**
 * Read a request's current status (post-guard verification helper).
 */
async function getRequestStatus(id) {
  const row = await prisma.biRequest.findUnique({ where: { id }, select: { status: true } });
  return row ? row.status : null;
}

module.exports = {
  prisma,
  recordEvent,
  serializeRequest,
  guardTransition,
  getRequestStatus,
  NOTIF_TEMPLATES,
};
