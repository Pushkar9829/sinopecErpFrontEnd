// Opens the app's confirm dialog (rendered once by <ConfirmHost />) and
// resolves with the answer: true/false, or the typed reason (null on cancel)
// when { withReason: true }.
let show = null;

export function setConfirmHandler(handler) {
  show = handler;
}

export function confirmAction(options) {
  const settings = typeof options === 'string' ? { message: options } : options || {};
  if (!show) return Promise.resolve(settings.withReason ? null : false);
  return new Promise((resolve) => show({ ...settings, resolve }));
}

export function notify(message, title = 'Notice') {
  return confirmAction({ title, message, confirmLabel: 'OK', hideCancel: true });
}
