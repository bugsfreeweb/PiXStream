const videoPlayer = document.getElementById('videoPlayer');
const channelList = document.getElementById('channelList');
const historyList = document.getElementById('historyList');
const sidebar = document.getElementById('sidebar');
const themeToggle = document.getElementById('themeToggle');
let channels = JSON.parse(localStorage.getItem('channels')) || [];
let parentalPin = localStorage.getItem('parentalPin') || null;
let currentProfile = localStorage.getItem('currentProfile') || 'adult';
let history = JSON.parse(localStorage.getItem('uploadHistory')) || [];
let showFavourites = false;
let showHistory = false;
let hls = null;
let currentChannelUrl = null;

const translations = {
    en: { load: '⬇', pin: '🔒', placeholder: 'Enter Playlist URL' },
    es: { load: '⬇', pin: '🔒', placeholder: 'Ingresa URL de Lista' }
};

async function loadPlaylist() {
    const url = document.getElementById('playlistUrl').value;
    if (!url) return alert('Please enter a valid URL.');
    try {
        const response = await fetch(url);
        const text = await response.text();
        parseM3U(text);
        addToHistory(url, 'URL');
        displayChannels();
    } catch (error) {
        console.error('Error loading playlist:', error);
        alert('Failed to load playlist.');
    }
}

function loadFile() {
    const file = document.getElementById('fileUpload').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const extension = file.name.split('.').pop().toLowerCase();
        if (extension === 'm3u') parseM3U(text);
        else if (extension === 'json') parseJSON(text);
        else if (extension === 'txt') parseText(text);
        else return alert('Unsupported file format. Use .m3u, .json, or .txt.');
        addToHistory(file.name, 'File');
        displayChannels();
    };
    reader.readAsText(file);
}

function parseM3U(data) {
    channels = [];
    const lines = data.split('\n');
    let currentChannel = {};
    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('#EXTINF')) {
            const nameMatch = line.match(/,(.+)/);
            const groupMatch = line.match(/group-title="([^"]+)"/);
            currentChannel.name = nameMatch ? nameMatch[1] : 'Unnamed';
            currentChannel.group = groupMatch ? groupMatch[1] : 'General';
            currentChannel.rating = line.includes('adult') ? 'R' : 'G';
            currentChannel.favourite = false;
        } else if (line && !line.startsWith('#')) {
            currentChannel.url = line;
            channels.push({ ...currentChannel });
            currentChannel = {};
        }
    }
    localStorage.setItem('channels', JSON.stringify(channels));
}

function parseJSON(data) {
    try {
        const json = JSON.parse(data);
        channels = json.map(item => ({
            name: item.name || 'Unnamed',
            url: item.url,
            group: item.group || 'General',
            rating: item.rating || 'G',
            favourite: item.favourite || false
        }));
        localStorage.setItem('channels', JSON.stringify(channels));
    } catch (error) {
        alert('Invalid JSON format.');
    }
}

function parseText(data) {
    channels = data.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map((url, i) => ({
            name: `Channel ${i + 1}`,
            url,
            group: 'General',
            rating: 'G',
            favourite: false
        }));
    localStorage.setItem('channels', JSON.stringify(channels));
}

function displayChannels() {
    channelList.innerHTML = '';
    historyList.style.display = 'none';
    showHistory = false;
    const filter = document.getElementById('filter').value.toLowerCase();
    const groups = [...new Set(channels.map(c => c.group))];
    groups.forEach(group => {
        const groupDiv = document.createElement('div');
        const channelsInGroup = channels.filter(c => c.group === group && (!showFavourites || c.favourite) && c.name.toLowerCase().includes(filter));
        if (channelsInGroup.length > 0) {
            const h3 = document.createElement('h3');
            h3.textContent = group;
            groupDiv.appendChild(h3);
            channelsInGroup.forEach(channel => {
                if (currentProfile === 'child' && channel.rating === 'R' && !checkParentalPin()) return;
                const div = document.createElement('div');
                div.className = 'channel';
                if (channel.url === currentChannelUrl) div.classList.add('selected');
                div.innerHTML = `${channel.name} <span class="fav-star">${channel.favourite ? '★' : '☆'}</span>`;
                div.querySelector('.fav-star').onclick = (e) => {
                    e.stopPropagation();
                    toggleFavourite(channel);
                };
                div.onclick = (e) => {
                    if (e.target.className !== 'fav-star') playChannel(channel.url, channel.name);
                };
                groupDiv.appendChild(div);
            });
            channelList.appendChild(groupDiv);
        }
    });
}

function toggleFavourite(channel) {
    channel.favourite = !channel.favourite;
    localStorage.setItem('channels', JSON.stringify(channels));
    displayChannels();
}

function toggleFavourites() {
    showFavourites = !showFavourites;
    displayChannels();
}

function filterChannels() {
    displayChannels();
}

function playChannel(url, name) {
    if (currentProfile === 'child' && !checkParentalPin()) return;
    if (hls) hls.destroy();
    if (Hls.isSupported() && url.includes('.m3u8')) {
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(videoPlayer);
        hls.on(Hls.Events.MANIFEST_PARSED, () => videoPlayer.play());
    } else {
        videoPlayer.src = url;
        videoPlayer.play();
    }
    videoPlayer.ontimeupdate = () => {
        localStorage.setItem(`progress-${url}`, JSON.stringify({ time: videoPlayer.currentTime, name }));
    };
    const progress = JSON.parse(localStorage.getItem(`progress-${url}`));
    if (progress) videoPlayer.currentTime = progress.time;
    currentChannelUrl = url;
    displayChannels(); // Refresh to highlight the selected channel
}

function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
}

function toggleTheme() {
    const isDark = themeToggle.checked;
    document.body.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    themeToggle.checked = true;
}

function changeLanguage() {
    const lang = document.getElementById('language').value;
    document.getElementById('loadBtn').textContent = translations[lang].load;
    document.getElementById('playlistUrl').placeholder = translations[lang].placeholder;
    document.querySelector('button[onclick="setParentalPin()"]').textContent = translations[lang].pin;
}

function setParentalPin() {
    parentalPin = document.getElementById('parentalPin').value;
    localStorage.setItem('parentalPin', parentalPin);
    alert('Parental PIN set.');
}

function checkParentalPin() {
    return parentalPin ? prompt('Enter Parental PIN') === parentalPin : true;
}

function switchProfile() {
    currentProfile = document.getElementById('profile').value;
    localStorage.setItem('currentProfile', currentProfile);
    displayChannels();
}

function addToHistory(source, type) {
    history.unshift({ source, type, date: new Date().toLocaleString() });
    if (history.length > 10) history.pop();
    localStorage.setItem('uploadHistory', JSON.stringify(history));
}

function toggleHistory() {
    showHistory = !showHistory;
    if (showHistory) {
        channelList.style.display = 'none';
        historyList.style.display = 'block';
        historyList.innerHTML = history.map(h => `
            <div class="history-item">
                ${h.type}: ${h.source} (${h.date})
                <button onclick="loadFromHistory('${h.source}', '${h.type}')">⬇</button>
            </div>
        `).join('') + '<button onclick="clearHistory()">🗑️</button>';
    } else {
        channelList.style.display = 'block';
        historyList.style.display = 'none';
    }
}

function loadFromHistory(source, type) {
    if (type === 'URL') {
        document.getElementById('playlistUrl').value = source;
        loadPlaylist();
    } else {
        alert('Please re-upload the file manually.');
    }
}

function clearHistory() {
    history = [];
    localStorage.setItem('uploadHistory', JSON.stringify(history));
    toggleHistory();
}

videoPlayer.addEventListener('dblclick', () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        videoPlayer.requestFullscreen();
    }
});

// Initial setup
displayChannels();