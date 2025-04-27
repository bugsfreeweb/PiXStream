# Enjoy the IPTV player source code for free!
# PiXStream IPTV Player

PiXStream IPTV is a web-based application designed for streaming IPTV channels. It provides a user-friendly interface to load, manage, and play IPTV playlists in formats like M3U, JSON, and TXT. The application supports features such as channel filtering, favorites, playback history, subtitles, and theme switching.

## Table of Contents
- [Features](#features)
- [Technologies](#technologies)
- [Installation](#installation)
- [Usage](#usage)
- [Code Analysis](#code-analysis)
  - [HTML Structure](#html-structure)
  - [CSS Styling](#css-styling)
  - [JavaScript Functionality](#javascript-functionality)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Playlist Support:** Load playlists via URL or file upload (M3U, JSON, TXT formats).
- **Channel Management:** Filter channels by name, group, status (active/offline), or favorites.
- **Video Playback:** Stream channels using HTML5 video with HLS.js for M3U8 streams.
- **Responsive Design:** Adapts to mobile and desktop devices with a collapsible sidebar.
- **Dark/Light Mode:** Toggle between themes with persistent user preference.
- **Subtitles:** Upload and display SRT subtitle files.
- **Favorites & History:** Mark favorite channels and track recently played streams.
- **Player Controls:** Play/pause, fullscreen, Picture-in-Picture (PiP), casting, and random channel playback.
- **Keyboard Shortcuts:** Space (play/pause), F (fullscreen), P (PiP), R (random).
- **Touch Gestures:** Double-tap to play/pause, swipe up/down for fullscreen on mobile.
- **Service Worker:** Basic offline support via service worker registration.
- **Notifications:** Display status messages for user actions (e.g., loading, errors).

## Technologies

- **HTML5:** For structuring the application.
- **CSS3:** Custom styles with responsive design, gradients, and animations.
- **JavaScript:** Core functionality, including playlist parsing and video playback.
- **HLS.js:** For streaming M3U8 playlists.
- **Font Awesome:** Icons for UI elements.
- **Google Fonts (Inter):** For typography.
- **Service Worker:** For offline capabilities.
- **LocalStorage:** For persisting channels, history, and theme settings.

## Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/bugsfreeweb/pixstream-iptv.git
   cd pixstream-iptv
   ```

2. **Set Up a Local Server:**
   Since the application uses a service worker and fetch requests, it requires a server. Use a simple HTTP server like:
   ```bash
   python -m http.server 8000
   ```
   Alternatively, use Node.js with `http-server`:
   ```bash
   npm install -g http-server
   http-server
   ```

3. **Access the Application:**
   Open your browser and navigate to [http://localhost:8000](http://localhost:8000).

## Usage

1. **Load a Playlist:**
   - Enter a playlist URL (e.g., M3U) in the input field and click the download button.
   - Alternatively, upload a local M3U, JSON, or TXT file via the file input.

2. **Browse Channels:**
   - Use the search bar to filter channels by name.
   - Click status filters (Total, Active, Offline) to narrow down the list.
   - Toggle favorites or history using the respective buttons.

3. **Play a Channel:**
   - Click a channel to start streaming.
   - Use player controls for play/pause, fullscreen, PiP, or subtitles.

4. **Manage Settings:**
   - Toggle the sidebar for more screen space.
   - Switch between dark and light themes.
   - Clear all data (channels, history) using the trash button.

## Code Analysis

### HTML Structure

The HTML is structured into two main sections within a `.container`:

1. **Sidebar (`#sidebar`):**
   - **Header:** Displays the logo.
   - **Content:** Includes playlist input, file upload, playlist controls, channel list, and status indicators.

2. **Player Section (`#playerSection`):**
   - Contains the video player, top controls (sidebar toggle, theme switch), now-playing info, notifications, and player controls.

**External Resources:**
- **Fonts:** Google Fonts (Inter).
- **Icons:** Font Awesome.
- **Scripts:** HLS.js for M3U8 streaming, disable-devtool for developer tools restriction.
- **Favicon and manifest:** For PWA support.

### CSS Styling

The CSS is designed for a modern, responsive UI:

1. **Global Styles:**
   - Uses `box-sizing: border-box` and resets margins/padding.
   - Applies the Inter font and a light background (`#f5f6f5`).

2. **Dark Mode:**
   - Toggles to a dark theme (`#1a1a1a`) with adjusted colors for elements.

3. **Sidebar:**
   - Fixed, collapsible with a gradient background and shadow.
   - Responsive: Full-width on mobile with slide-in animation.

4. **Player:**
   - Full-screen video with centered controls that appear on hover.
   - Notifications and now-playing info use semi-transparent backgrounds.

5. **Animations:**
   - Smooth transitions for hover effects, theme switching, and sidebar movement.
   - Transform and scale effects for buttons and channels.

6. **Media Queries:**
   - Adjusts layouts, button sizes, and padding for mobile devices (`max-width: 768px`).

### JavaScript Functionality

The JavaScript handles the core logic:

1. **Playlist Loading:**
   - `loadPlaylist()`: Fetches and parses M3U playlists from URLs.
   - `loadFile()`: Reads and parses local M3U, JSON, or TXT files.
   - Parsers (`parseM3U`, `parseJSON`, `parseText`): Convert data into a unified channel format stored in `localStorage`.

2. **Channel Display:**
   - `displayChannels()`: Renders channels grouped by category, with filtering by name, favorites, or status.
   - Supports default logos and status indicators (active/offline).

3. **Playback:**
   - `playChannel()`: Streams channels using HLS.js for M3U8 or direct video source for others.
   - Handles errors, updates channel status, and saves progress in `localStorage`.
   - `updateQualityIndicator()`: Detects HD/SD based on URL patterns.

4. **Interactivity:**
   - `toggleSidebar()`, `toggleTheme()`: Manage UI state with `localStorage` persistence.
   - `toggleFavourites()`, `toggleHistory()`: Filter channels or show history.
   - `loadSubtitles()`: Loads SRT files as video tracks.
   - `castStream()`: Uses `getDisplayMedia` for screen sharing.

5. **Event Listeners:**
   - Keyboard shortcuts for playback control.
   - Touch gestures for mobile interaction.
   - Video events (`play`, `pause`, `timeupdate`) for updating UI.

6. **Service Worker:**
   - Registers `/sw.js` for offline support, though the service worker file is not provided in the code.

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```
3. Commit changes:
   ```bash
   git commit -m 'Add your feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/your-feature
   ```
5. Open a pull request.

Please ensure code follows the existing style and includes tests where applicable.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
