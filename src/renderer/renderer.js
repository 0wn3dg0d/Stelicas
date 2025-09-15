document.addEventListener('DOMContentLoaded', async () => {
  const settings = await window.electron.getSettings();
  document.getElementById('steam3Id').value = settings.steam3Id;
  document.getElementById('language').value = settings.language;
  document.getElementById('countryCode').value = settings.countryCode;
  document.getElementById('supportedLanguage').value = settings.supportedLanguage;

  await updateUserdataIds();
  await checkSteamRunning();
});

document.getElementById('settings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const steam3Id = document.getElementById('steam3Id').value;
  const language = document.getElementById('language').value;
  const countryCode = document.getElementById('countryCode').value;
  const supportedLanguage = document.getElementById('supportedLanguage').value;
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const statusDiv = document.getElementById('status');
  progressBar.style.width = '0%';
  progressText.textContent = '0%';
  statusDiv.textContent = 'Starting process...';
  window.electron.startProcess(steam3Id, language, countryCode, supportedLanguage);
});

window.electron.onProcessUpdate((event, { progress, status }) => {
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const statusDiv = document.getElementById('status');
  progressBar.style.width = `${progress}%`;
  progressBar.setAttribute('aria-valuenow', progress);
  progressText.textContent = `${progress}%`;
  statusDiv.textContent = status;
});

document.getElementById('minimize-btn').addEventListener('click', () => {
  window.electron.minimizeWindow();
});

document.getElementById('close-btn').addEventListener('click', () => {
  window.electron.closeWindow();
});

document.getElementById('select-steam-path-btn').addEventListener('click', async () => {
    const path = await window.electron.selectSteamPath();
    if(path) {
        document.getElementById('steam-path-container').style.display = 'none';
        await updateUserdataIds();
    } else {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = "Invalid folder selected. Please choose your main Steam installation folder.";
    }
});


const updateUserdataIds = async () => {
  const userdataIdsContainer = document.getElementById('userdata-ids');
  const ids = await window.electron.getUserdataIds();
  const steamPath = await window.electron.getSteamPath();
  
  if (!steamPath) {
      document.getElementById('steam-path-container').style.display = 'block';
      userdataIdsContainer.innerHTML = '';
      return;
  }

  document.getElementById('steam-path-container').style.display = 'none';
  if (ids.length > 0) {
    userdataIdsContainer.innerHTML = `
      <strong>Your Ids:</strong>
      ${ids.map(id => `<span class="userdata-id">${id}</span>`).join('')}
    `;
    document.querySelectorAll('.userdata-id').forEach(element => {
      element.addEventListener('click', () => {
        document.getElementById('steam3Id').value = element.textContent;
      });
    });
  } else {
    userdataIdsContainer.innerHTML = '<strong>No userdata IDs found.</strong>';
  }
};

const checkSteamRunning = async () => {
  const isSteamRunning = await window.electron.isSteamRunning();
  const startButton = document.querySelector('#settings-form button[type="submit"]');
  if (isSteamRunning) {
    startButton.disabled = true;
    startButton.title = 'Please close Steam to collect the database';
  } else {
    startButton.disabled = false;
    startButton.title = '';
  }
};

setInterval(checkSteamRunning, 1000);