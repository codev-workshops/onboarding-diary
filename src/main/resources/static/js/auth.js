/* Shared helpers for the auth/profile forms: submit JSON to the REST API and render errors. */
function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach(function (node) {
        node.textContent = '';
    });
    var alertBox = form.querySelector('.alert');
    if (alertBox) {
        alertBox.textContent = '';
        alertBox.hidden = true;
    }
}

function showAlert(form, message, kind) {
    var alertBox = form.querySelector('.alert');
    if (!alertBox) {
        return;
    }
    alertBox.textContent = message;
    alertBox.className = 'alert ' + (kind === 'success' ? 'alert-success' : 'alert-error');
    alertBox.hidden = false;
}

function showFieldErrors(form, errors) {
    Object.keys(errors || {}).forEach(function (field) {
        var node = form.querySelector('[data-error-for="' + field + '"]');
        if (node) {
            node.textContent = errors[field];
        }
    });
}

function submitJson(form, url, method, body, onSuccess) {
    clearErrors(form);
    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body)
    }).then(function (response) {
        return response.json().catch(function () {
            return {};
        }).then(function (payload) {
            if (response.ok) {
                onSuccess(payload);
            } else {
                showFieldErrors(form, payload.errors);
                showAlert(form, payload.message || 'Request failed', 'error');
            }
        });
    }).catch(function () {
        showAlert(form, 'Network error, please try again', 'error');
    });
}
