# Frontend Functional Requirements Document (FRD) & UI Design Spec

## 1. Global UI/UX Design System (The "Pleasing UI")

To build a premium, user-friendly interface that feels native and clean, the frontend should adopt a **Sleek Dark Mode Accent** aesthetic (similar to Spotify or Apple Music). This prevents eye strain and makes album artwork pop beautifully.

### Color Palette & Typography

- **Background Primary:** `#0F0F12` (Deep Obsidian Black)
- **Background Secondary:** `#16161E` (Dark Charcoal for cards, sidebars, and player bars)
- **Accent/Active Color:** `#6366F1` (Indigo Blue for active states, sliders, and primary buttons)
- **Text Primary:** `#FFFFFF` (Pure White for song titles and headings)
- **Text Secondary:** `#94A3B8` (Muted Slate Grey for artists, timers, and borders)
- **Typography:** `Inter` or `System-Sans` (Clean, geometric, highly readable)

---

## 2. Frontend Functional Requirements (FR)

### Module 1: Authentication & Gateway Access

- **FR-1.1: Login Layout View**
- _Description:_ A minimal, centered form container for user credentials.
- _UI Elements:_ Input fields for username and password, a primary "Login" button, and an error alert banner.
- _Interaction:_ Submits data to `POST /api/auth/login`. On success, stores the JWT securely in `localStorage` or a secure cookie, then routes the user directly to the Dashboard.

- **FR-1.2: Admin Console View**
- _Description:_ A restricted settings tab accessible _only_ if the decoded JWT payload contains `role: 'admin'`.
- _UI Elements:_ A simplified form containing `Username`, `Password`, and a dropdown selector for `Role` (Admin/User), followed by a "Create User" action button.
- _Interaction:_ Submits payload to `POST /api/admin/create-user`. Displays a clear success toast toast notification ("User Created Successfully") or a `403 Forbidden` error state.

### Module 2: The Dashboard & Global Navigation

The interface is structured as a single-page application (SPA) split into three distinct structural columns:

```
┌──────────────────┬────────────────────────────────────────────────────────┐
│                  │  🔍 Search Songs Input Field...                       │
│  🎵 MyStream     ├────────────────────────────────────────────────────────┤
│                  │                                                        │
│  🏠 Dashboard    │  ✨ Automated Ingestion Pane                           │
│  🔍 Search       │  [ Track Name ] [ Artist ] [ Year ]  [ 📥 Request ]   │
│                  │                                                        │
│  ➕ New Playlist │────────────────────────────────────────────────────────┤
│                  │                                                        │
│  🗂️ PLAYLISTS    │  🎶 Global Audio Library / Selected Playlist           │
│  • Chill Mix     │  #  Title       Artist        Album       Duration     │
│  • Coding Beats  │  1  Kesariya    Arijit Singh  Brahmastra  4:30         │
│                  │                                                        │
└──────────────────┴────────────────────────────────────────────────────────┘
│ ▶  [Img] Kesariya - Arijit S.   ⏮ ⏪ [ ▶ / ⏸ ] ⏩ ⏭ 🔀  🔊 ───────────   │
└───────────────────────────────────────────────────────────────────────────┘

```

- **FR-2.1: Navigation Sidebar (Left Column)**
- Contains the application branding logo, links to "Dashboard/Home", "Search", a "➕ Create Playlist" action button, and a dynamic vertical list of the user’s custom playlists.

- **FR-2.2: Automated Ingestion Card (Top Main Section)**
- _Description:_ A prominent interactive form widget allowing users to request new content.
- _UI Elements:_ Four inline text fields: `Song Name`, `Singer`, `Release Year`, and `Movie/Album`. A primary accent button labeled `📥 Request Track`.
- _Interaction:_ Clicking the button triggers `POST /api/download`. The UI immediately hides the button, displays a subtle checkmark asset, and renders a status notification toast saying: _"Request has been made, you can search for the song in few minutes."_ The user is **never** blocked from using the rest of the application.

- **FR-2.3: Search & Content List View (Main Center Area)**
- _Description:_ Displays a tabular or grid layout of tracks.
- _UI Elements:_ A prominent search bar at the top (`Input field`). Typing instantly filters rows matching Title, Artist, or Album layout frames.
- _Data Grid Rows:_ Displays song index number, square thumbnail image container, Title, Artist, Album, and a `➕ Add to Playlist` quick-action dropdown menu button.

### Module 3: Isolated Playlist Manager

- **FR-3.1: Playlist CRUD View**
- _Description:_ Clicking a playlist in the sidebar loads its dedicated detail view.
- _UI Elements:_ Displays a large header showing a collective playlist placeholder icon, the custom name of the playlist, a `🗑️ Delete Playlist` text option, and its ordered list of tracks.
- _Interaction:_ Clicking a song row inside this view establishes the playlist array as the active player queue.

### Module 4: Persistent Audio Media Player Bar (Bottom Strip)

This fixed footer bar controls all underlying audio binary operations. It holds the core state object locally in the browser.

- **FR-4.1: Track Information Display (Left Side of Bar)**
- Renders a small `50x50px` high-quality square album cover thumbnail (extracted by the server and rendered on the client), the song title, and the artist string.

- **FR-4.2: Media Core Controls (Center of Bar)**
- _UI Play/Pause Toggle:_ A prominent circular button changing between a Play and Pause icon instantly on click, natively invoking `audio.play()` or `audio.pause()`.
- _Skip/Rewind Buttons:_ Dedicated `⏪ -5s` and `⏩ +5s` action buttons. Clicking them modifies the audio object state runtime context directly (`audio.currentTime += 5`), prompting the browser to smoothly coordinate upcoming range packets from your laptop directory.
- _Shuffle Toggle Button:_ A split layout arrow icon button. Clicking it instantly toggles active state highlights and processes a **Fisher-Yates randomization algorithm** on the local array of song IDs in memory.
- _Previous Track Button (`⏮`):_ Clicking it pops the last track ID from an internal JS history stack array and loads it immediately.

- **FR-4.3: Timeline Progress Bar (Center Lower)**
- _UI Elements:_ Current timestamp text (e.g., `01:24`), a horizontal slider bar tracker styled with the primary accent color, and total track duration text (e.g., `04:32`).
- _Interaction:_ Dragging or clicking a spot on the slider bar directly re-assigns `audio.currentTime`, triggering an instantaneous partial-content packet fetch over HTTP.

---

## 3. Frontend Non-Functional Requirements (NFR)

### NFR-1: Responsiveness & Interface Speed

- **NFR-1.1:** The user interface must utilize client-side array management for state operations (like shuffling, backtracking, and queue parsing). These interactions must update the DOM within **16 milliseconds** (maintaining a smooth 60fps frame rate rendering standard).
- **NFR-1.2:** The design layout must use fluid grid system constraints, scaling cleanly from an ultra-wide desktop format down to a mobile browser screen layout without breaking functionality.

### NFR-2: Memory Control & Network Resilience

- **NFR-2.1:** The frontend media player engine must rely on the browser's native `HTMLAudioElement` stream lifecycle garbage collection routines. When skipping tracks, the application must immediately sever active chunk loading connections to ensure your laptop's memory allocation remains perfectly lightweight.

### NFR-3: User Experience Friction Minimization

- **NFR-3.1:** To prevent user confusion, the frontend must intercept network drop exceptions or missing media files gracefully, shifting the UI play toggle button back to a "Pause/Stopped" visual state and firing an informative error message toast ("Track temporarily unavailable from local storage").
