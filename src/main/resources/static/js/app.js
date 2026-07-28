/* Shared helpers for the entry, dashboard and report pages: read the REST API and render lists. */
function queryString(params) {
    var query = new URLSearchParams();
    Object.keys(params).forEach(function (key) {
        var value = params[key];
        if (value !== null && value !== undefined && String(value).trim() !== '') {
            query.set(key, String(value).trim());
        }
    });
    var text = query.toString();
    return text === '' ? '' : '?' + text;
}

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function readableEnum(value) {
    if (!value) {
        return '';
    }
    return String(value).toLowerCase().replace(/_/g, ' ');
}

function pageAlert(message, kind) {
    var box = document.getElementById('page-alert');
    if (!box) {
        return;
    }
    if (!message) {
        box.textContent = '';
        box.hidden = true;
        return;
    }
    box.textContent = message;
    box.className = 'alert ' + (kind === 'success' ? 'alert-success' : 'alert-error');
    box.hidden = false;
}

function apiGet(url, onSuccess) {
    pageAlert(null);
    fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
        .then(function (response) {
            return response.json().catch(function () {
                return {};
            }).then(function (payload) {
                if (response.ok) {
                    onSuccess(payload);
                } else if (response.status === 401) {
                    window.location.href = '/login';
                } else {
                    pageAlert(payload.message || 'Request failed', 'error');
                }
            });
        })
        .catch(function () {
            pageAlert('Network error, please try again', 'error');
        });
}

function apiDelete(url, onSuccess) {
    pageAlert(null);
    fetch(url, { method: 'DELETE', credentials: 'same-origin' })
        .then(function (response) {
            if (response.ok) {
                onSuccess();
            } else if (response.status === 401) {
                window.location.href = '/login';
            } else {
                response.json().catch(function () {
                    return {};
                }).then(function (payload) {
                    pageAlert(payload.message || 'Delete failed', 'error');
                });
            }
        })
        .catch(function () {
            pageAlert('Network error, please try again', 'error');
        });
}

function downloadFile(url, fallbackName) {
    pageAlert(null);
    fetch(url, { credentials: 'same-origin' })
        .then(function (response) {
            if (!response.ok) {
                return response.json().catch(function () {
                    return {};
                }).then(function (payload) {
                    pageAlert(payload.message || 'Download failed', 'error');
                });
            }
            var disposition = response.headers.get('Content-Disposition') || '';
            var match = disposition.match(/filename="?([^";]+)"?/);
            var filename = match ? match[1] : fallbackName;
            return response.blob().then(function (blob) {
                var objectUrl = URL.createObjectURL(blob);
                var link = document.createElement('a');
                link.href = objectUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(objectUrl);
                pageAlert('Downloaded ' + filename, 'success');
            });
        })
        .catch(function () {
            pageAlert('Network error, please try again', 'error');
        });
}

function emptyRow(columns, message) {
    return '<tr><td class="empty" colspan="' + columns + '">' + escapeHtml(message) + '</td></tr>';
}

function logoutOnClick() {
    var button = document.getElementById('logout');
    if (!button) {
        return;
    }
    button.addEventListener('click', function () {
        fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
            .then(function () {
                window.location.href = '/login';
            });
    });
}

/* The nav search bar submits only from the minimum query length on (REQUIREMENTS 9.6). */
function navSearchMinimumLength() {
    var input = document.getElementById('nav-search-q');
    var submit = document.getElementById('nav-search-submit');
    if (!input || !submit) {
        return;
    }
    var sync = function () {
        submit.disabled = input.value.trim().replace(/\s+/g, ' ').length < 2;
    };
    input.addEventListener('input', sync);
    sync();
}

document.addEventListener('DOMContentLoaded', logoutOnClick);
document.addEventListener('DOMContentLoaded', navSearchMinimumLength);
