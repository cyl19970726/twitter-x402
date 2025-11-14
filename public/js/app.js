/**
 * Main Application Logic
 */

let currentSpaces = [];

/**
 * Initialize application
 */
async function initApp() {
  setupEventListeners();

  // Check if wallet is already connected
  if (walletManager.isMetaMaskInstalled() && window.ethereum.selectedAddress) {
    walletManager.address = window.ethereum.selectedAddress;
    walletManager.connected = true;
    await onWalletConnected();
  } else {
    showAuthRequired();
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Connect wallet button
  const connectBtn = document.getElementById('connect-wallet-btn');
  if (connectBtn) {
    connectBtn.addEventListener('click', connectWallet);
  }

  // Disconnect button
  const disconnectBtn = document.getElementById('disconnect-btn');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', () => {
      walletManager.disconnect();
    });
  }

  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      handleSearch(e.target.value);
    }, 300));
  }
}

/**
 * Connect wallet
 */
async function connectWallet() {
  try {
    const connectBtn = document.getElementById('connect-wallet-btn');
    if (connectBtn) {
      connectBtn.textContent = 'Connecting...';
      connectBtn.disabled = true;
    }

    await walletManager.connect();
    await onWalletConnected();
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    alert('Failed to connect wallet: ' + error.message);

    if (connectBtn) {
      connectBtn.textContent = 'Connect Wallet';
      connectBtn.disabled = false;
    }
  }
}

/**
 * Handle wallet connection
 */
async function onWalletConnected() {
  // Update UI
  document.getElementById('connect-wallet-btn')?.classList.add('hidden');
  const walletInfo = document.getElementById('wallet-info');
  if (walletInfo) {
    walletInfo.classList.remove('hidden');
    document.getElementById('wallet-address').textContent =
      walletManager.formatAddress();
  }

  document.getElementById('auth-required')?.classList.add('hidden');
  document.getElementById('dashboard-content')?.classList.remove('hidden');

  // Load data
  await Promise.all([
    loadUserStats(),
    loadMySpaces(),
    loadPopularSpaces(),
  ]);
}

/**
 * Show auth required screen
 */
function showAuthRequired() {
  document.getElementById('auth-required')?.classList.remove('hidden');
  document.getElementById('dashboard-content')?.classList.add('hidden');
}

/**
 * Load user statistics
 */
async function loadUserStats() {
  try {
    const stats = await apiClient.getUserStats();

    document.getElementById('stat-spaces').textContent =
      stats.stats.spacesOwned || 0;
    document.getElementById('stat-transcriptions').textContent =
      stats.stats.transcriptionsPurchased || 0;
    document.getElementById('stat-chats').textContent =
      stats.stats.chatsUnlocked || 0;
    document.getElementById('stat-spent').textContent =
      stats.stats.totalSpentUSDC?.toFixed(2) || '0.00';
  } catch (error) {
    console.error('Failed to load user stats:', error);
  }
}

/**
 * Load user's spaces
 */
async function loadMySpaces() {
  const container = document.getElementById('spaces-list');
  showLoading(container, 'Loading your Spaces...');

  try {
    const response = await apiClient.getMySpaces();
    currentSpaces = response.spaces || [];

    if (currentSpaces.length === 0) {
      showEmptyState(
        container,
        'You don\'t have any Spaces yet. Purchase a transcription to get started!',
        '🎙️'
      );
      return;
    }

    renderSpaces(currentSpaces, container);
  } catch (error) {
    console.error('Failed to load spaces:', error);
    showError(container, 'Failed to load Spaces: ' + error.message);
  }
}

/**
 * Load popular spaces
 */
async function loadPopularSpaces() {
  const container = document.getElementById('popular-spaces');
  showLoading(container, 'Loading popular Spaces...');

  try {
    const response = await apiClient.getPopularSpaces(5);
    const spaces = response.spaces || [];

    if (spaces.length === 0) {
      showEmptyState(container, 'No popular Spaces yet', '📊');
      return;
    }

    renderPopularSpaces(spaces, container);
  } catch (error) {
    console.error('Failed to load popular spaces:', error);
    showError(container, 'Failed to load popular Spaces');
  }
}

/**
 * Render spaces list
 */
function renderSpaces(spaces, container) {
  if (!spaces || spaces.length === 0) {
    showEmptyState(container, 'No Spaces found', '🔍');
    return;
  }

  container.innerHTML = `
    <div class="space-list">
      ${spaces
        .map(
          (space) => `
        <div class="space-item" onclick="viewSpace('${space.spaceId}')">
          <div class="space-title">${space.title || 'Untitled Space'}</div>
          <div class="space-meta">
            <span>${getStatusBadge(space.status)}</span>
            ${
              space.audioDuration
                ? `<span>⏱️ ${formatDuration(space.audioDuration)}</span>`
                : ''
            }
            ${
              space.completedAt
                ? `<span>📅 ${formatDate(space.completedAt)}</span>`
                : ''
            }
          </div>
          ${
            space.participants?.length > 0
              ? `<div class="space-participants">
                   👥 ${space.participants.slice(0, 3).join(', ')}
                   ${space.participants.length > 3 ? `+${space.participants.length - 3} more` : ''}
                 </div>`
              : ''
          }
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Render popular spaces
 */
function renderPopularSpaces(spaces, container) {
  container.innerHTML = `
    <div class="space-list">
      ${spaces
        .map(
          (space) => `
        <div class="space-item">
          <div class="space-title">${space.title || 'Untitled Space'}</div>
          <div class="space-meta">
            <span>📊 ${space.transcriptionCount || 0} transcriptions</span>
            <span>💬 ${space.chatUnlockCount || 0} chat unlocks</span>
          </div>
          ${
            space.participants?.length > 0
              ? `<div class="space-participants">
                   👥 ${space.participants.slice(0, 3).join(', ')}
                 </div>`
              : ''
          }
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Handle search
 */
async function handleSearch(query) {
  const container = document.getElementById('spaces-list');

  if (!query || query.trim().length === 0) {
    renderSpaces(currentSpaces, container);
    return;
  }

  showLoading(container, 'Searching...');

  try {
    const response = await apiClient.searchSpaces(query);
    const results = response.results || [];

    renderSpaces(results, container);
  } catch (error) {
    console.error('Search failed:', error);
    showError(container, 'Search failed: ' + error.message);
  }
}

/**
 * View space details
 */
function viewSpace(spaceId) {
  window.location.href = `/space.html?id=${spaceId}`;
}

/**
 * Refresh spaces
 */
async function refreshSpaces() {
  await loadMySpaces();
}
