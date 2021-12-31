const stateElements = {
  login: () => document.querySelectorAll('[data-state="login"]'),
  chat: () => document.querySelectorAll('[data-state="chat"]'),
  chatEmpty: () => document.querySelectorAll('[data-state="chat-empty"]'),
  encrypted: () => document.querySelectorAll('[data-state="encrypted"]'),
  notEncrypted: () => document.querySelectorAll('[data-state="not-encrypted"]'),
  fileSelected: () => document.querySelectorAll('[data-state="file-selected"]'),
  fileNotSelected: () => document.querySelectorAll('[data-state="file-not-selected"]'),
};

const actionButtons = {
  logout: document.querySelectorAll('[data-action="logout"]'),
  login: document.querySelectorAll('[data-action="login"]'),
  sendNewMsg: document.querySelectorAll('[data-action="send-new-msg"]'),
  sendFile: document.querySelectorAll('[data-action="send-file"]'),
  lockEncryption: document.querySelectorAll('[data-action="lock-encryption"]'),
  unlockEncryption: document.querySelectorAll('[data-action="unlock-encryption"]'),
};

const loadingElements = {
  sendNewMsg: document.querySelectorAll('[data-loading="send-new-msg"]'),
  sendFile: document.querySelectorAll('[data-loading="send-file"]'),
};

const variableElements = {
  username: document.querySelectorAll('[data-variable="username"]'),
  ciphertext: document.querySelectorAll('[data-variable="ciphertext"]'),
  selectedFileName: document.querySelectorAll('[data-variable="selected-file-name"]'),
};

const inputs = {
  username: document.querySelector('[data-input="username"]'),
  newMsg: document.querySelector('[data-input="new-msg"]'),
  newMsgFile: document.querySelector('[data-input="new-msg-file"]'),
  encryptionAlgorithm: document.querySelector('[data-input="encryption-algorithm"]'),
  encryptionSecretKey: document.querySelector('[data-input="encryption-secret-key"]'),
};

const chatContentElement = document.querySelector('.chat-content');

const stateData = {
  loggedUser: null,
  messages: [],
  usernameContent: '',
  encryption: null,
  newMsgCiphertext: '',
};

window.state = 'login';
window.wsClient = null;

window.updateState = (state) => {
  console.log('updating state: ' + state);
  window.updateView(state);
  window.state = state;
};

window.updateVariables = () => {
  variableElements.username.forEach((element) => {
    element.innerHTML = stateData.loggedUser;
  });
  variableElements.ciphertext.forEach((element) => {
    element.innerHTML = stateData.newMsgCiphertext;
  });
  variableElements.selectedFileName.forEach((element) => {
    element.innerHTML = inputs.newMsgFile.files[0]?.name;
  });
}

window.updateView = (state) => {
  updateVariables();
  switch (state) {
    case 'login':
      showElements(stateElements.login());
      hideElements(stateElements.chat());
      hideElements(stateElements.chatEmpty());
      break;
    case 'login-success':
      hideElements(stateElements.login());
      showElements(stateElements.chat());
      showElements(stateElements.chatEmpty());
      break;
    case 'message-sending':
      hideElements(actionButtons.sendNewMsg);
      showElements(loadingElements.sendNewMsg);
      break;
    case 'message-received':
      hideElements(stateElements.chatEmpty());
      break;
    case 'message-sent':
      hideElements(loadingElements.sendNewMsg);
      showElements(actionButtons.sendNewMsg);
      break;
    case 'file-selected':
      hideElements(stateElements.fileNotSelected());
      showElements(stateElements.fileSelected());
      break;
    case 'file-not-selected':
      hideElements(stateElements.fileSelected());
      showElements(stateElements.fileNotSelected());
      break;
    case 'file-uploading':
      hideElements(actionButtons.sendNewMsg);
      showElements(loadingElements.sendNewMsg);
      hideElements(actionButtons.sendFile);
      showElements(loadingElements.sendFile);
      break;
    case 'file-upload-failed':
      hideElements(loadingElements.sendNewMsg);
      showElements(actionButtons.sendNewMsg);
      showElements(actionButtons.sendFile);
      hideElements(loadingElements.sendFile);
      break;
    case 'file-uploaded':
      hideElements(loadingElements.sendNewMsg);
      showElements(actionButtons.sendNewMsg);
      showElements(actionButtons.sendFile);
      hideElements(loadingElements.sendFile);
      break;
    case 'chat-encrypted':
      hideElements(stateElements.notEncrypted());
      showElements(stateElements.encrypted());
      reRenderChat();
      break;
    case 'chat-not-encrypted':
      showElements(stateElements.notEncrypted());
      hideElements(stateElements.encrypted());
      reRenderChat();
      break;
  }
};

const encryptContent = (content) => {
  switch (stateData.encryption?.algorithm) {
    case 'sha256':
      return CryptoJS.SHA256(content).toString();
    case 'spn':
      return CryptoJS.AES.encrypt(content, stateData.encryption.secretKey).toString();
    default:
      return content;
  }
};

const decryptContent = (content) => {
  if (stateData.encryption?.algorithm !== 'spn') {
    return content;
  }
  try {
    const bytes = CryptoJS.AES.decrypt(content, stateData.encryption.secretKey);
    return bytes.toString(CryptoJS.enc.Utf8) || false;
  } catch (e) {
    return false;
  }
};

const startWsClient = () => {
  if (window.wsClient) {
    return;
  }

  window.wsClient = new WebSocket(`ws://${location.host}`);

  wsClient.onerror = (e) => {
    updateState('login');
    addToast(`WebSocket error: ${JSON.stringify(e)}`, 'danger', false);
  };
  wsClient.onopen = () => {
    updateState('login-success');
    addToast('WebSocket connection established', 'success');
  };
  wsClient.onclose = () => {
    updateState('login');
    addToast('WebSocket connection closed', 'success');
    window.wsClient = null;
  };
  wsClient.onmessage = (msg) => {
    const message = JSON.parse(msg.data.toString());
    stateData.messages.push(message);
    addMessageToChatContent(message);
    updateState('message-received');
    if (message.from === stateData.loggedUser) {
      updateState('message-sent');
    }
    if (message.isFile && message.from === stateData.loggedUser) {
      updateState('file-uploaded');
    }
  };
};

const sendCurrentMessage = () => {
  if (!stateData.newMsgCiphertext) {
    return;
  }
  updateState('message-sending');
  console.log('sending', { content: stateData.newMsgCiphertext });
  wsClient.send(JSON.stringify({ content: stateData.newMsgCiphertext }));
};

const sendCurrentFile = () => {
  const file = inputs.newMsgFile.files[0];
  if (!file) {
    return;
  }
  updateState('file-uploading');
  const reader = new FileReader();
  reader.onload = (e) => {
    updateState('message-sending');
    wsClient.send(JSON.stringify({
      content: encryptContent(e.target.result),
      isFile: true,
    }));
  };
  reader.onerror = () => {
    addToast('An error occurred while reading the file content. Please try again', 'danger');
    updateState('file-upload-failed');
  };
  reader.readAsDataURL(file);
};

const updateNewMsgButtonState = () => {
  actionButtons.sendNewMsg.forEach((button) => {
    if (inputs.newMsg.value) {
      button.removeAttribute('disabled');
    } else {
      button.setAttribute('disabled', 'true');
    }
  });
};

const onNewMsgChanged = () => {
  updateNewMsgButtonState();
  stateData.newMsgCiphertext = encryptContent(inputs.newMsg.value);
  updateVariables();
};

const onAlgorithmChanged = () => {
  stateData.newMsgCiphertext = encryptContent(inputs.newMsg.value);
  updateVariables();
};

const addMessageToChatContent = (message) => {
  const { msg, from, date, isEvent, isFile } = message;
  const formattedDate = new Date(date).toLocaleTimeString();
  let dom;
  if (isEvent) {
    dom = `
      <div class="msg-row ta-center">
        <div class="msg bp3-tag">${msg}</div>
      </div>
    `;
  } else {
    const content = decryptContent(msg);

    let contentDom = '';
    if (content === false || (isFile && !content.startsWith('data:'))) {
      contentDom += '<div><i>Cannot decrypt the message with current encryption settings.</i></div>';
    } else {
      contentDom += `<div>${isFile ? `<i>Added a file</i><br/><a role="button" target="_blank" href="${content}" class="bp3-button bp3-minimal bp3-small bp3-icon-download">Click to see</a>` : content}</div>`
    }
    contentDom += `
      <span class="bp3-text-disabled">from</span>
      <span class="bp3-text-muted">${from}</span>
      <span class="bp3-text-disabled">at ${formattedDate}</span>
    `;
    if (from === stateData.loggedUser) {
      dom = `
      <div class="msg-row msg-outgoing">
        <div class="msg bp3-callout bp3-intent-primary">
          ${contentDom}
        </div>
      </div>
    `;
    } else {
      dom = `
      <div class="msg-row msg-incoming">
        <div class="msg bp3-callout">
          ${contentDom}
        </div>
      </div>
    `;
    }
  }
  chatContentElement.insertAdjacentHTML('beforeend', dom);
  chatContentElement.scrollTop = chatContentElement.scrollHeight - chatContentElement.clientHeight;
};

const reRenderChat = () => {
  chatContentElement.innerHTML = '';
  stateData.messages.forEach(addMessageToChatContent);
}

const handleResponse = (response) => response.ok
    ? response.json()
    : Promise.reject(new Error('Unexpected response: ' + JSON.stringify(response)));

const loginUser = () => {
  const username = inputs.username.value;
  if (!username) {
    addToast('Please enter a username', 'danger');
    return;
  }
  fetch('/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username }),
  })
  .then(handleResponse)
  .then(({ userId }) => {
    startWsClient();
    addToast(`Logged in as ${userId}`, 'success');
    stateData.loggedUser = userId;
  })
  .catch(function (err) {
    addToast(`Error occurred while connecting: ${err.message}`, 'danger');
  });
};

actionButtons.login.forEach((element) => {
  element.onclick = loginUser;
});

actionButtons.logout.forEach((element) => {
  element.onclick = () => {
    fetch('/logout', { method: 'DELETE', credentials: 'same-origin' })
    .then(handleResponse)
    .then(({ message }) => {
      updateState('login');
      addToast(`Server response: ${message}`, 'success');
    })
    .catch(function (err) {
      addToast(`Error occurred while connecting: ${err.message}`, 'danger');
    });
  };
});

actionButtons.sendNewMsg.forEach((button) => {
  button.onclick = () => {
    sendCurrentMessage();
    inputs.newMsg.value = '';
    onNewMsgChanged();
  };
});

actionButtons.lockEncryption.forEach((button) => {
  button.onclick = () => {
    const algorithm = inputs.encryptionAlgorithm.value;
    if (!algorithm) {
      addToast('Please select an encryption algorithm', 'danger');
      return;
    }
    const secretKey = inputs.encryptionSecretKey.value;
    stateData.encryption = { algorithm, secretKey };
    inputs.encryptionAlgorithm.setAttribute('disabled', 'true');
    inputs.encryptionSecretKey.setAttribute('disabled', 'true');
    onAlgorithmChanged();
    updateState('chat-encrypted');
  };
});

actionButtons.unlockEncryption.forEach((button) => {
  button.onclick = () => {
    stateData.encryption = undefined;
    inputs.encryptionAlgorithm.removeAttribute('disabled');
    inputs.encryptionSecretKey.removeAttribute('disabled');
    onAlgorithmChanged();
    updateState('chat-not-encrypted');
  };
});

actionButtons.sendFile.forEach((button) => {
  button.onclick = () => {
    sendCurrentFile();
  };
});

inputs.newMsg.addEventListener('input', onNewMsgChanged);

inputs.newMsg.addEventListener('keydown', (e) => {
  if (e.keyCode === 13) {
    sendCurrentMessage();
    inputs.newMsg.value = '';
    onNewMsgChanged();
  }
});

inputs.username.addEventListener('keydown', (e) => {
  if (e.keyCode === 13) {
    loginUser();
    inputs.username.value = '';
  }
});

inputs.newMsgFile.addEventListener('change', () => {
  if (inputs.newMsgFile.files[0]) {
    updateState('file-selected');
  } else {
    updateState('file-not-selected');
  }
});

updateNewMsgButtonState();
