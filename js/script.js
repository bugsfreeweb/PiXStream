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
let statusFilter = 'all';

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
            currentChannel.status = 'unknown';
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
            logo: item.logo || '',
            status: 'unknown'
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
            logo: '',
            status: 'unknown'
        }));
    localStorage.setItem('channels', JSON.stringify(channels));
}

function displayChannels() {
    channelList.innerHTML = '';
    historyList.style.display = 'none';
    showHistory = false;
    const filter = document.getElementById('filter').value.toLowerCase();
    const defaultLogo = 'https://pismarttv.netlify.app/img/no-logo.png';
    const groups = [...new Set(channels.map(c => c.group))];
    groups.forEach(group => {
        const groupDiv = document.createElement('div');
        let channelsInGroup = channels.filter(c => c.group === group && (!showFavourites || c.favourite) && c.name.toLowerCase().includes(filter));
        if (statusFilter === 'active') {
            channelsInGroup = channelsInGroup.filter(c => c.status === 'active');
        } else if (statusFilter === 'offline') {
            channelsInGroup = channelsInGroup.filter(c => c.status === 'offline');
        }
        if (channelsInGroup.length > 0) {
            channelsInGroup.forEach(channel => {
                const div = document.createElement('div');
                div.className = 'channel';
                if (channel.url === currentChannelUrl) div.classList.add('selected');
                if (channel.favourite) div.classList.add('favorited');
                const logoUrl = channel.logo && channel.logo.trim() !== '' ? channel.logo : defaultLogo;
                const statusClass = channel.status === 'active' ? 'active' : channel.status === 'offline' ? 'offline' : '';
                div.innerHTML = `
                    <img src="${logoUrl}" class="channel-logo" alt="${channel.name}" onerror="this.src='${defaultLogo}'">
                    <span class="channel-title">${channel.name}</span>
                    <span class="channel-status ${statusClass}">${channel.status === 'unknown' ? '' : channel.status}</span>
                    <span class="fav-star"><i class="fas fa-star"></i></span>
                `;
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

    const track = document.getElementById('subtitleTrack');
    track.src = ''; // Reset subtitle track
    track.mode = 'disabled';

    const channel = channels.find(c => c.url === url);
    try {
        await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        channel.status = 'active';
    } catch (error) {
        channel.status = 'offline';
        showNotification('Channel is offline.');
    }
    localStorage.setItem('channels', JSON.stringify(channels));

    if (Hls.isSupported() && url.includes('.m3u8')) {
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(videoPlayer);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoPlayer.play().then(() => {
                updateNowPlaying(name, logo);
                addToRecentPlays(url, name);
                showNotification('Stream loaded!');
                channel.status = 'active';
                localStorage.setItem('channels', JSON.stringify(channels));
                displayChannels();
                updatePlaylistStatus();
            }).catch(() => {
                channel.status = 'offline';
                localStorage.setItem('channels', JSON.stringify(channels));
                showNotification('Error playing stream.');
                displayChannels();
                updatePlaylistStatus();
            });
        });
    } else {
        videoPlayer.src = url;
        videoPlayer.play().then(() => {
            updateNowPlaying(name, logo);
            addToRecentPlays(url, name);
            showNotification('Stream loaded!');
            channel.status = 'active';
            localStorage.setItem('channels', JSON.stringify(channels));
            displayChannels();
            updatePlaylistStatus();
        }).catch(() => {
            channel.status = 'offline';
            localStorage.setItem('channels', JSON.stringify(channels));
            showNotification('Error playing stream.');
            displayChannels();
            updatePlaylistStatus();
        });
    }
    videoPlayer.ontimeupdate = () => {
        localStorage.setItem(`progress-${url}`, JSON.stringify({ time: videoPlayer.currentTime, name }));
    };
    const progress = JSON.parse(localStorage.getItem(`progress-${url}`));
    if (progress) videoPlayer.currentTime = progress.time;
    playPauseBtn.querySelector('i').className = 'fas fa-pause';
    updateQualityIndicator(url);
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
        displayHistory();
    } else {
        channelList.style.display = 'block';
        historyList.style.display = 'none';
    }
}

function displayHistory() {
    historyList.innerHTML = `
        <div class="history-item">
            <span>Clear All</span>
            <button class="delete-btn" onclick="clearAllHistory()"><i class="fas fa-trash-alt"></i></button>
        </div>
        ${history.map((h, index) => `
            <div class="history-item">
                ${h.source} (${h.date})
                <button onclick="loadFromHistory('${h.source}')"><i class="fas fa-download"></i></button>
                <button class="delete-btn" onclick="deleteHistoryItem(${index})"><i class="fas fa-trash-alt"></i></button>
            </div>
        `).join('')}
    `;
}

function loadFromHistory(source) {
    if (source.startsWith('http://') || source.startsWith('https://')) {
        document.getElementById('playlistUrl').value = source;
        loadPlaylist();
    } else {
        showNotification('Please re-upload the file manually.');
    }
}

function deleteHistoryItem(index) {
    history.splice(index, 1);
    localStorage.setItem('uploadHistory', JSON.stringify(history));
    displayHistory();
}

function clearAllHistory() {
    history = [];
    localStorage.setItem('uploadHistory', JSON.stringify(history));
    displayHistory();
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

async function updatePlaylistStatus() {
    const total = channels.length;
    let active = 0;
    await Promise.all(channels.map(async (channel) => {
        try {
            await fetch(channel.url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            channel.status = 'active';
            active++;
        } catch (error) {
            channel.status = 'offline';
        }
    }));
    localStorage.setItem('channels', JSON.stringify(channels));
    playlistStatus.innerHTML = `
        <span class="total ${statusFilter === 'all' ? 'active-filter' : ''}" onclick="filterByStatus('all')">Total: ${total}</span>
        <span class="active ${statusFilter === 'active' ? 'active-filter' : ''}" onclick="filterByStatus('active')">Active: ${active}</span>
        <span class="offline ${statusFilter === 'offline' ? 'active-filter' : ''}" onclick="filterByStatus('offline')">Offline: ${total - active}</span>
    `;
    displayChannels();
}

function filterByStatus(status) {
    statusFilter = status;
    updatePlaylistStatus();
}

function updateNowPlaying(name, logo) {
    nowPlaying.style.display = 'block';
    nowPlaying.innerHTML = logo ? `<img src="${logo}" alt="${name}" style="max-height: 24px; vertical-align: middle; margin-right: 10px;">${name}` : name;
}

function showNotification(message, duration = 3000) {
    notification.textContent = message;
    notification.classList.remove('with-buttons');
    notification.style.display = 'block';
    setTimeout(hideNotification, duration);
}

function hideNotification() {
    notification.style.display = 'none';
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
        const subtitleText = e.target.result;
        const blob = new Blob([subtitleText], { type: 'text/srt' });
        const url = URL.createObjectURL(blob);
        const track = document.getElementById('subtitleTrack');
        track.src = url;
        track.mode = 'showing';
        videoPlayer.textTracks[0].mode = 'showing';
        showNotification('Subtitles loaded!');
    };
    reader.readAsText(file);
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