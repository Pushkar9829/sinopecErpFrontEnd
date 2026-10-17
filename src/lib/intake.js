// Shared labels for draft orders (messages read from WhatsApp, Gmail and the panel).
export const INTAKE_STATUS = {
  stored: { label: 'Not an order', tone: 'muted' },
  received: { label: 'Waiting to be read', tone: 'info' },
  reading: { label: 'Reading', tone: 'info' },
  needs_review: { label: 'Needs review', tone: 'warning' },
  reading_failed: { label: 'Reading failed', tone: 'danger' },
  customer_confirmed: { label: 'Customer confirmed', tone: 'purple' },
  converted: { label: 'Converted', tone: 'success' },
  discarded: { label: 'Discarded', tone: 'muted' },
};

export const INTAKE_GROUPS = [
  { id: 'review', label: 'To review', tone: 'warning' },
  { id: 'waiting', label: 'Being read', tone: 'info' },
  { id: 'failed', label: 'Failed', tone: 'danger' },
  { id: 'converted', label: 'Converted', tone: 'success' },
  { id: 'not_order', label: 'Not orders' },
  { id: 'discarded', label: 'Discarded' },
  { id: 'all', label: 'All' },
];

export const CHANNEL_LABEL = { panel: 'Panel', paste: 'Panel', gmail: 'Gmail', whatsapp: 'WhatsApp' };

export function intakeStatus(status) {
  return INTAKE_STATUS[status] || { label: status, tone: 'muted' };
}

export function senderOf(draft) {
  return draft?.customerName || draft?.sender?.name || draft?.sender?.email || draft?.sender?.phone || 'Unknown sender';
}

export function timeAgo(value) {
  if (!value) return '';
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(value).toLocaleDateString();
}
