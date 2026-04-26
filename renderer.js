(function () {
  const API_ENDPOINTS = {
    turbo: 'https://server.simpletex.cn/api/latex_ocr_turbo',
    standard: 'https://server.simpletex.cn/api/latex_ocr'
  };

  const elements = {
    statusText: document.getElementById('statusText'),
    settingsButton: document.getElementById('settingsButton'),
    settingsPanel: document.getElementById('settingsPanel'),
    tokenInput: document.getElementById('tokenInput'),
    modelSelect: document.getElementById('modelSelect'),
    saveSettingsButton: document.getElementById('saveSettingsButton'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    chooseButton: document.getElementById('chooseButton'),
    recognizeButton: document.getElementById('recognizeButton'),
    imagePreview: document.getElementById('imagePreview'),
    latexInput: document.getElementById('latexInput'),
    copyLatexButton: document.getElementById('copyLatexButton'),
    copyMarkdownButton: document.getElementById('copyMarkdownButton'),
    clearButton: document.getElementById('clearButton'),
    mathPreview: document.getElementById('mathPreview'),
    confidenceText: document.getElementById('confidenceText')
  };

  const state = {
    imageBlob: null,
    imageName: 'formula.png',
    settings: {
      token: '',
      model: 'turbo'
    },
    recognizing: false,
    lastAutoImage: {
      payload: '',
      time: 0
    }
  };

  ensureRubickFormula();
  init();

  function ensureRubickFormula() {
    if (window.rubickFormula) {
      return;
    }

    const settingsId = 'simpletex-formula/settings';
    const defaultSettings = {
      token: '',
      model: 'turbo'
    };

    window.rubickFormula = {
      readSettings: function () {
        try {
          return Promise.resolve(Object.assign(
            {},
            defaultSettings,
            JSON.parse(window.localStorage.getItem(settingsId) || '{}')
          ));
        } catch (error) {
          return Promise.resolve(Object.assign({}, defaultSettings));
        }
      },
      saveSettings: function (settings) {
        const next = Object.assign({}, defaultSettings, settings);
        try {
          window.localStorage.setItem(settingsId, JSON.stringify(next));
        } catch (error) {
          // localStorage can be unavailable in restricted contexts.
        }
        return Promise.resolve(next);
      },
      notify: function (message) {
        console.log(message);
      },
      setHeight: function () {},
      onReady: function (callback) {
        window.addEventListener('DOMContentLoaded', function () {
          callback({ code: 'formula', type: 'manual', payload: null });
        });
      },
      onEnter: function () {},
      copyText: function (text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text);
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
        return Promise.resolve();
      }
    };
  }

  async function init() {
    window.rubickFormula.setHeight(720);
    state.settings = await window.rubickFormula.readSettings();
    elements.tokenInput.value = state.settings.token || '';
    elements.modelSelect.value = state.settings.model || 'turbo';
    bindEvents();
    updatePreview();

    window.rubickFormula.onReady(handlePluginEntry);
    window.rubickFormula.onEnter(handlePluginEntry);
  }

  function bindEvents() {
    elements.settingsButton.addEventListener('click', function () {
      elements.settingsPanel.classList.toggle('is-open');
    });

    elements.saveSettingsButton.addEventListener('click', saveSettings);
    elements.chooseButton.addEventListener('click', function () {
      elements.fileInput.click();
    });

    elements.fileInput.addEventListener('change', function (event) {
      const file = event.target.files && event.target.files[0];
      if (file) {
        loadFile(file);
      }
    });

    elements.recognizeButton.addEventListener('click', recognize);
    elements.latexInput.addEventListener('input', updatePreview);
    elements.copyLatexButton.addEventListener('click', copyLatex);
    elements.copyMarkdownButton.addEventListener('click', copyMarkdown);
    elements.clearButton.addEventListener('click', clearAll);

    document.addEventListener('paste', handlePaste);

    ['dragenter', 'dragover'].forEach(function (eventName) {
      elements.dropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        elements.dropzone.classList.add('is-dragging');
      });
    });

    ['dragleave', 'drop'].forEach(function (eventName) {
      elements.dropzone.addEventListener(eventName, function (event) {
        event.preventDefault();
        elements.dropzone.classList.remove('is-dragging');
      });
    });

    elements.dropzone.addEventListener('drop', function (event) {
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) {
        loadFile(file);
      }
    });
  }

  async function saveSettings() {
    state.settings = await window.rubickFormula.saveSettings({
      token: elements.tokenInput.value.trim(),
      model: elements.modelSelect.value
    });
    setStatus('设置已保存');
    window.rubickFormula.notify('SimpleTex 设置已保存');
  }

  function handlePaste(event) {
    const items = Array.from((event.clipboardData && event.clipboardData.items) || []);
    const imageItem = items.find(function (item) {
      return item.type.indexOf('image/') === 0;
    });

    if (!imageItem) {
      return;
    }

    const file = imageItem.getAsFile();
    if (file) {
      loadFile(file, true);
      event.preventDefault();
    }
  }

  function loadFile(file, autoRecognize) {
    if (!file.type || file.type.indexOf('image/') !== 0) {
      setStatus('请选择图片文件', true);
      return;
    }

    state.imageBlob = file;
    state.imageName = file.name || 'formula.png';
    renderImage(URL.createObjectURL(file));
    elements.recognizeButton.disabled = false;
    setStatus('图片已载入，可以开始识别');
    if (autoRecognize) {
      recognize();
    }
  }

  async function loadDataUrl(dataUrl, name, autoRecognize) {
    try {
      const blob = dataUrlToBlob(dataUrl);
      state.imageBlob = blob;
      state.imageName = name;
      renderImage(dataUrl);
      elements.recognizeButton.disabled = false;
      setStatus('已接收 Rubick 图片，可以开始识别');
      if (autoRecognize) {
        recognize();
      }
    } catch (error) {
      setStatus('无法读取 Rubick 传入的图片', true);
    }
  }

  function dataUrlToBlob(dataUrl) {
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
    if (!match) {
      throw new Error('无效的图片数据');
    }

    const mime = match[1] || 'image/png';
    const isBase64 = Boolean(match[2]);
    const data = match[3] || '';
    const binary = isBase64 ? atob(data) : decodeURIComponent(data);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mime });
  }

  function handlePluginEntry(entry) {
    if (entry && entry.type === 'img' && typeof entry.payload === 'string') {
      const now = Date.now();
      if (state.lastAutoImage.payload === entry.payload && now - state.lastAutoImage.time < 1500) {
        return;
      }
      state.lastAutoImage = {
        payload: entry.payload,
        time: now
      };
      loadDataUrl(entry.payload, 'rubick-image.png', true);
    }
  }

  function renderImage(src) {
    const oldImage = elements.imagePreview.querySelector('img');
    if (oldImage) {
      oldImage.remove();
    }
    const image = document.createElement('img');
    image.alt = '待识别公式';
    image.src = src;
    elements.imagePreview.insertBefore(image, elements.statusText);
    elements.imagePreview.classList.add('has-image');
  }

  async function recognize() {
    if (!state.imageBlob) {
      setStatus('请先选择公式图片', true);
      return;
    }

    const token = elements.tokenInput.value.trim() || state.settings.token;
    if (!token) {
      elements.settingsPanel.classList.add('is-open');
      setStatus('请先填写 SimpleTex UAT Token', true);
      return;
    }

    await saveSettings();
    setRecognizing(true);

    try {
      const formData = new FormData();
      formData.append('file', state.imageBlob, state.imageName);

      const response = await fetch(API_ENDPOINTS[state.settings.model] || API_ENDPOINTS.turbo, {
        method: 'POST',
        headers: {
          token: token
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok || !data.status) {
        throw new Error(readApiError(data, response.status));
      }

      const latex = data.res && data.res.latex ? data.res.latex : '';
      if (!latex || latex === '[EMPTY]') {
        throw new Error('SimpleTex 未识别到有效公式');
      }

      elements.latexInput.value = latex;
      elements.confidenceText.textContent = typeof data.res.conf === 'number'
        ? '置信度 ' + Math.round(data.res.conf * 100) + '%'
        : '';
      updatePreview();
      setStatus('识别完成');
    } catch (error) {
      setStatus(error.message || '识别失败', true);
    } finally {
      setRecognizing(false);
    }
  }

  function readApiError(data, status) {
    if (data && data.res && data.res.err_info) {
      return data.res.err_info;
    }
    if (data && data.res && data.res.errType) {
      return data.res.errType;
    }
    return 'SimpleTex 请求失败，HTTP ' + status;
  }

  function updatePreview() {
    const latex = elements.latexInput.value.trim();
    if (!latex) {
      elements.mathPreview.textContent = '等待公式';
      return;
    }

    elements.mathPreview.textContent = '$$' + latex + '$$';
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([elements.mathPreview]).catch(function () {
        elements.mathPreview.textContent = latex;
      });
    }
  }

  async function copyLatex() {
    const latex = elements.latexInput.value.trim();
    if (!latex) {
      setStatus('没有可复制的 LaTeX', true);
      return;
    }
    await window.rubickFormula.copyText(latex);
    setStatus('已复制 LaTeX');
  }

  async function copyMarkdown() {
    const latex = elements.latexInput.value.trim();
    if (!latex) {
      setStatus('没有可复制的 Markdown 公式', true);
      return;
    }
    await window.rubickFormula.copyText('$$\n' + latex + '\n$$');
    setStatus('已复制 Markdown 公式');
  }

  function clearAll() {
    state.imageBlob = null;
    state.imageName = 'formula.png';
    elements.fileInput.value = '';
    const oldImage = elements.imagePreview.querySelector('img');
    if (oldImage) {
      oldImage.remove();
    }
    elements.imagePreview.classList.remove('has-image');
    elements.latexInput.value = '';
    elements.confidenceText.textContent = '';
    elements.recognizeButton.disabled = true;
    updatePreview();
    setStatus('粘贴、拖入或选择一张公式图片');
  }

  function setRecognizing(isRecognizing) {
    state.recognizing = isRecognizing;
    elements.recognizeButton.disabled = isRecognizing || !state.imageBlob;
    elements.recognizeButton.textContent = isRecognizing ? '识别中...' : '开始识别';
    if (isRecognizing) {
      setStatus('正在调用 SimpleTex');
    }
  }

  function setStatus(message, isError) {
    elements.statusText.textContent = message;
    elements.statusText.classList.toggle('is-error', Boolean(isError));
  }
})();
