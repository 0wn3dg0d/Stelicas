document.addEventListener('DOMContentLoaded', async () => {
  const settings = await window.electron.getSettings();

  // Set the form values from the saved settings
  document.getElementById('steam3Id').value = settings.steam3Id;
  document.getElementById('language').value = settings.language;
  document.getElementById('countryCode').value = settings.countryCode;
  document.getElementById('supportedLanguage').value = settings.supportedLanguage;

  // Update userdata IDs
  await updateUserdataIds();

  // Check if Steam is running
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

const userdataIdsContainer = document.createElement('div');
userdataIdsContainer.id = 'userdata-ids';
userdataIdsContainer.style.marginTop = '10px';
userdataIdsContainer.style.color = '#66c0f4';
document.body.appendChild(userdataIdsContainer);

const updateUserdataIds = async () => {
  const ids = await window.electron.getUserdataIds();
  if (ids.length > 0) {
    userdataIdsContainer.innerHTML = `
      <strong>Your Ids:</strong>
      ${ids.map(id => `<span class="userdata-id" style="cursor: pointer; margin-left: 5px;">${id}</span>`).join('')}
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
checkSteamRunning();