/**
 * Utility Functions
 */

/**
 * Format date to readable string
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }

  // Less than 1 day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  // Full date
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format duration in seconds
 */
function formatDuration(seconds) {
  if (!seconds) return 'N/A';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format large numbers
 */
function formatNumber(num) {
  if (!num) return '0';

  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Show loading state
 */
function showLoading(container, message = 'Loading...') {
  container.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Show error message
 */
function showError(container, message) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Show empty state
 */
function showEmptyState(container, message, icon = '📭') {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Truncate text
 */
function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
  const statusMap = {
    completed: { class: 'status-completed', text: 'Completed' },
    processing: { class: 'status-processing', text: 'Processing' },
    failed: { class: 'status-failed', text: 'Failed' },
    pending: { class: 'status-processing', text: 'Pending' },
  };

  const statusInfo = statusMap[status] || { class: 'status-processing', text: status };
  return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Copy to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}
