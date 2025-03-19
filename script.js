const videoPlayer = document.getElementById('videoPlayer');
const channelList = document.getElementById('channelList');
const historyList = document.getElementById('historyList');
const sidebar = document.getElementById('sidebar');
const themeToggle = document.getElementById('themeToggle');
const playlistStatus = document.getElementById('playlistStatus');
const nowPlaying = document.getElementById('nowPlaying');
const notification = document.getElementById('notification');
const playPauseBtn = document.getElementById('playPauseBtn');
const qualityIndicator = document.getElementById('qualityIndicator');
let channels = JSON.parse(localStorage.getItem('channels')) || [];
let history = JSON.parse(localStorage.getItem('uploadHistory')) || [];
let recentPlays = JSON.parse(localStorage.getItem('recentPlays')) || [];
let showFavourites = false;
let showHistory = false;
let hls = null;
let currentChannelUrl = null;
let currentStreamName = '';

async function loadPlaylist() {
    const url = document.getElementById('playlistUrl').value;
    if (!url) return showNotification('Please enter a valid URL.');
    showNotification('Loading playlist...');
    try {
        const response = await fetch(url);
        const text = await response.text();
        parseM3U(text);
        addToHistory(url);
        displayChannels();
        updatePlaylistStatus();
        showNotification('Playlist loaded!');
    } catch (error) {
        console.error('Error loading playlist:', error);
        showNotification('Failed to load playlist.');
    }
}

function loadFile() {
    const file = document.getElementById('fileUpload').files[0];
    if (!file) return;
    showNotification('Loading file...');
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const extension = file.name.split('.').pop().toLowerCase();
        if (extension === 'm3u') parseM3U(text);
        else if (extension === 'json') parseJSON(text);
        else if (extension === 'txt') parseText(text);
        else return showNotification('Unsupported file format.');
        addToHistory(file.name);
        displayChannels();
        updatePlaylistStatus();
        showNotification('File loaded!');
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
            currentChannel.favourite = false;
            currentChannel.logo = line.match(/tvg-logo="([^"]+)"/)?.[1] || '';
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
            favourite: item.favourite || false,
            logo: item.logo || ''
        }));
        localStorage.setItem('channels', JSON.stringify(channels));
    } catch (error) {
        showNotification('Invalid JSON format.');
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
            favourite: false,
            logo: ''
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
            channelsInGroup.forEach(channel => {
                const div = document.createElement('div');
                div.className = 'channel';
                if (channel.url === currentChannelUrl) div.classList.add('selected');
                div.innerHTML = `${channel.name} <span class="fav-star"><i class="fas fa-star"></i></span>`;
                div.querySelector('.fav-star').onclick = (e) => {
                    e.stopPropagation();
                    toggleFavourite(channel);
                };
                div.onclick = (e) => {
                    if (e.target.className !== 'fav-star' && !e.target.closest('.fav-star')) playChannel(channel.url, channel.name, channel.logo);
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

async function playChannel(url, name, logo = '') {
    if (hls) hls.destroy();
    showNotification('Loading stream...');
    currentChannelUrl = url;
    currentStreamName = name;
    if (Hls.isSupported() && url.includes('.m3u8')) {
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(videoPlayer);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoPlayer.play();
            updateNowPlaying(name, logo);
            addToRecentPlays(url, name);
            showNotification('Stream loaded!');
        });
    } else {
        videoPlayer.src = url;
        videoPlayer.play().then(() => {
            updateNowPlaying(name, logo);
            addToRecentPlays(url, name);
            showNotification('Stream loaded!');
        }).catch(() => showNotification('Error playing stream.'));
    }
    videoPlayer.ontimeupdate = () => {
        localStorage.setItem(`progress-${url}`, JSON.stringify({ time: videoPlayer.currentTime, name }));
    };
    const progress = JSON.parse(localStorage.getItem(`progress-${url}`));
    if (progress) videoPlayer.currentTime = progress.time;
    playPauseBtn.querySelector('i').className = 'fas fa-pause';
    updateQualityIndicator(url);
    displayChannels();
}

function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    if (window.innerWidth <= 768) sidebar.classList.toggle('active');
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

function addToHistory(source) {
    history.unshift({ source, date: new Date().toLocaleString() });
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
                ${h.source} (${h.date})
                <button onclick="loadFromHistory('${h.source}')"><i class="fas fa-download"></i></button>
            </div>
        `).join('');
    } else {
        channelList.style.display = 'block';
        historyList.style.display = 'none';
    }
}

function loadFromHistory(source) {
    if (source.startsWith('http://') || source.startsWith('https://')) {
        document.getElementById('playlistUrl').value = source;
        loadPlaylist();
    } else {
        showNotification('Please re-upload the file manually.');
    }
}

function clearAllData() {
    history = [];
    channels = [];
    recentPlays = [];
    localStorage.clear();
    displayChannels();
    toggleHistory();
    updatePlaylistStatus();
    showNotification('All data cleared!');
}

function updatePlaylistStatus() {
    const total = channels.length;
    let active = 0;
    Promise.all(channels.map(channel => 
        fetch(channel.url, { method: 'HEAD', timeout: 5000 })
            .then(() => active++)
            .catch(() => {})
    )).then(() => {
        playlistStatus.innerHTML = `
            <span class="total">Total: ${total}</span>
            <span class="active">Active: ${active}</span>
            <span class="offline">Offline: ${total - active}</span>
        `;
    });
}

setInterval(updatePlaylistStatus, 5 * 60 * 1000); // Every 5 minutes

function updateNowPlaying(name, logo) {
    nowPlaying.style.display = 'block';
    nowPlaying.innerHTML = logo ? `<img src="${logo}" alt="${name}" style="max-height: 24px; vertical-align: middle; margin-right: 10px;">${name}` : name;
}

function showNotification(message, duration = 3000) {
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', duration);
}

function togglePlayPause() {
    if (videoPlayer.paused) {
        videoPlayer.play();
        playPauseBtn.querySelector('i').className = 'fas fa-pause';
    } else {
        videoPlayer.pause();
        playPauseBtn.querySelector('i').className = 'fas fa-play';
    }
}

function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        videoPlayer.requestFullscreen();
    }
}

function togglePiP() {
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
    } else if (videoPlayer.paused) {
        showNotification('Play video to enable PiP.');
    } else {
        videoPlayer.requestPictureInPicture();
    }
}

async function castStream() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        videoPlayer.srcObject = stream;
        videoPlayer.play();
        showNotification('Casting started!');
        stream.getVideoTracks()[0].onended = () => {
            playChannel(currentChannelUrl, currentStreamName);
            showNotification('Casting stopped.');
        };
    } catch (error) {
        showNotification('Casting failed.');
    }
}

function loadSubtitles() {
    const file = document.getElementById('subtitleUpload').files[0];
    if (!file || !file.name.endsWith('.srt')) return showNotification('Please upload an .srt file.');
    const reader = new FileReader();
    reader.onload = function(e) {
        const track = document.getElementById('subtitleTrack');
        track.src = URL.createObjectURL(file);
        track.default = true;
        if (videoPlayer.duration > 3600 || currentStreamName.toLowerCase().includes('movie')) {
            track.style.display = 'block';
        }
        showNotification('Subtitles loaded!');
    };
    reader.readAsDataURL(file);
}

function playRandom() {
    const randomChannel = channels[Math.floor(Math.random() * channels.length)];
    playChannel(randomChannel.url, randomChannel.name, randomChannel.logo);
}

function updateQualityIndicator(url) {
    qualityIndicator.textContent = url.match(/1080|hd/i) ? 'HD' : 'SD';
}

function addToRecentPlays(url, name) {
    recentPlays.unshift({ url, name, date: new Date().toLocaleString() });
    if (recentPlays.length > 10) recentPlays.pop();
    localStorage.setItem('recentPlays', JSON.stringify(recentPlays));
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case ' ': togglePlayPause(); e.preventDefault(); break;
        case 'f': toggleFullscreen(); break;
        case 'p': togglePiP(); break;
        case 'r': playRandom(); break;
    }
});

// Touch Gestures
let lastTap = 0;
videoPlayer.addEventListener('touchstart', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) togglePlayPause();
    lastTap = now;
});

let touchStartY = 0;
videoPlayer.addEventListener('touchstart', (e) => touchStartY = e.touches[0].clientY);
videoPlayer.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    if (touchStartY - touchEndY > 50) toggleFullscreen();
    if (touchEndY - touchStartY > 50) document.fullscreenElement ? document.exitFullscreen() : null;
});

// Initial Setup
displayChannels();
updatePlaylistStatus();
videoPlayer.addEventListener('play', () => playPauseBtn.querySelector('i').className = 'fas fa-pause');
videoPlayer.addEventListener('pause', () => playPauseBtn.querySelector('i').className = 'fas fa-play');