const stateElements = {
  login: () => document.querySelectorAll('[data-state="login"]'),
  chat: () => document.querySelectorAll('[data-state="chat"]'),
  chatEmpty: () => document.querySelectorAll('[data-state="chat-empty"]'),
  encrypted: () => document.querySelectorAll('[data-state="encrypted"]'),
  notEncrypted: () => document.querySelectorAll('[data-state="not-encrypted"]'),
};

const actionButtons = {
  logout: document.querySelectorAll('[data-action="logout"]'),
  login: document.querySelectorAll('[data-action="login"]'),
  sendNewMsg: document.querySelectorAll('[data-action="send-new-msg"]'),
  lockEncryption: document.querySelectorAll('[data-action="lock-encryption"]'),
  unlockEncryption: document.querySelectorAll('[data-action="unlock-encryption"]'),
};

const loadingElements = {
  sendNewMsg: document.querySelectorAll('[data-loading="send-new-msg"]'),
};

const variableElements = {
  username: document.querySelectorAll('[data-variable="username"]'),
  ciphertext: document.querySelectorAll('[data-variable="ciphertext"]'),
};

const inputs = {
  username: document.querySelector('[data-input="username"]'),
  newMsg: document.querySelector('[data-input="new-msg"]'),
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
    case 'message-loaded':
      hideElements(loadingElements.sendNewMsg);
      showElements(actionButtons.sendNewMsg);
      hideElements(stateElements.chatEmpty());
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

const encryptMessageContent = (content) => {
  switch (stateData.encryption?.algorithm) {
    case 'sha256':
      return CryptoJS.SHA256(content);
    case 'spn':
      return CryptoJS.AES.encrypt(content, stateData.encryption.secretKey).toString();
    default:
      return content;
  }
};

const decryptMessageContent = (content) => {
  if (stateData.encryption?.algorithm !== 'spn') {
    return content;
  }
  const bytes = CryptoJS.AES.decrypt(content, stateData.encryption.secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
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
    updateState('message-loaded');
  };
};

const sendCurrentMessage = () => {
  if (!stateData.newMsgCiphertext) {
    return;
  }
  wsClient.send(stateData.newMsgCiphertext);
  updateState('message-sending');
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
  stateData.newMsgCiphertext = encryptMessageContent(inputs.newMsg.value);
  updateVariables();
};

const onAlgorithmChanged = () => {
  stateData.newMsgCiphertext = encryptMessageContent(inputs.newMsg.value);
  updateVariables();
};

const addMessageToChatContent = (message) => {
  const { msg: content, from, date, isEvent } = message;
  const formattedDate = new Date(date).toLocaleTimeString();
  let dom;
  if (isEvent) {
    dom = `
      <div class="msg-row ta-center">
        <div class="msg bp3-tag">${content}</div>
      </div>
    `;
  }
  else if (from === stateData.loggedUser) {
    dom = `
      <div class="msg-row msg-outgoing">
        <div class="msg bp3-callout bp3-intent-primary">
          <div>${decryptMessageContent(content)}</div>
          <span class="bp3-text-disabled">from</span>
          <span class="bp3-text-muted">${from}</span>
          <span class="bp3-text-disabled">at ${formattedDate}</span>
        </div>
      </div>
    `;
  } else {
    dom = `
      <div class="msg-row msg-incoming">
        <div class="msg bp3-callout">
          <div>${decryptMessageContent(content)}</div>
          <span class="bp3-text-disabled">from</span>
          <span class="bp3-text-muted">${from}</span>
          <span class="bp3-text-disabled">at ${formattedDate}</span>
        </div>
      </div>
    `;
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

updateNewMsgButtonState();
