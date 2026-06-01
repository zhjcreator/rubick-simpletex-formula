(function () {
  const SETTINGS_ID = 'simpletex-formula/settings';
  const DEFAULT_SETTINGS = {
    token: '',
    model: 'turbo'
  };

  function hasRubick() {
    return typeof rubick !== 'undefined' && rubick;
  }

  async function readSettings() {
    if (!hasRubick() || !rubick.db) {
      return readLocalSettings();
    }

    try {
      const doc = await rubick.db.get(SETTINGS_ID);
      return Object.assign({}, DEFAULT_SETTINGS, doc.data || {}, { _rev: doc._rev });
    } catch (error) {
      return readLocalSettings();
    }
  }

  async function saveSettings(settings) {
    const next = Object.assign({}, DEFAULT_SETTINGS, settings);

    if (!hasRubick() || !rubick.db) {
      writeLocalSettings(next);
      return next;
    }

    try {
      const oldDoc = await rubick.db.get(SETTINGS_ID);
      await rubick.db.put({
        _id: SETTINGS_ID,
        _rev: oldDoc._rev,
        data: next
      });
    } catch (error) {
      await rubick.db.put({
        _id: SETTINGS_ID,
        data: next
      });
    }

    writeLocalSettings(next);
    return next;
  }

  function readLocalSettings() {
    try {
      return Object.assign(
        {},
        DEFAULT_SETTINGS,
        JSON.parse(window.localStorage.getItem(SETTINGS_ID) || '{}')
      );
    } catch (error) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function writeLocalSettings(settings) {
    try {
      window.localStorage.setItem(SETTINGS_ID, JSON.stringify(settings));
    } catch (error) {
      // localStorage can be unavailable in restricted contexts.
    }
  }

  function notify(message) {
    if (hasRubick() && typeof rubick.showNotification === 'function') {
      rubick.showNotification(message);
      return;
    }
    console.log(message);
  }

  function setHeight(height) {
    if (hasRubick() && typeof rubick.setExpendHeight === 'function') {
      rubick.setExpendHeight(height);
    }
  }

  function onReady(callback) {
    if (hasRubick() && typeof rubick.onPluginReady === 'function') {
      rubick.onPluginReady(callback);
      return;
    }
    window.addEventListener('DOMContentLoaded', function () {
      callback({ code: 'formula', type: 'manual', payload: null });
    });
  }

  function onEnter(callback) {
    if (hasRubick() && typeof rubick.onPluginEnter === 'function') {
      rubick.onPluginEnter(callback);
    }
  }

  async function copyText(text) {
    if (hasRubick() && rubick.clipboard && typeof rubick.clipboard.writeText === 'function') {
      rubick.clipboard.writeText(text);
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  async function copyRichText(html, text) {
    if (
      navigator.clipboard &&
      navigator.clipboard.write &&
      typeof ClipboardItem !== 'undefined'
    ) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })
      ]);
      return;
    }

    await copyText(text);
  }

  window.rubickFormula = {
    readSettings,
    saveSettings,
    notify,
    setHeight,
    onReady,
    onEnter,
    copyText,
    copyRichText
  };
})();
