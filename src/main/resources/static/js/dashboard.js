(function () {
    const holder = document.getElementById('chartData');
    const data = holder && holder.dataset.charts ? JSON.parse(holder.dataset.charts) : {};
    const palette = ['#0d6efd', '#6f42c1', '#198754', '#dc3545', '#fd7e14', '#20c997'];

    function render(canvasId, dataset, type) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !dataset) {
            return;
        }
        const labels = Object.keys(dataset);
        const values = labels.map((key) => dataset[key]);
        if (!labels.length) {
            canvas.parentElement.innerHTML = '<p class="text-muted mb-0">No data yet.</p>';
            return;
        }
        new Chart(canvas, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Entries',
                    data: values,
                    backgroundColor: labels.map((_, index) => palette[index % palette.length])
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: type === 'bar' ? {y: {beginAtZero: true, ticks: {precision: 0}}} : {}
            }
        });
    }

    document.querySelectorAll('.progress-bar[data-progress]').forEach((bar) => {
        bar.style.width = bar.dataset.progress + '%';
    });

    render('taskStatusChart', data.tasksByStatus, 'doughnut');
    render('issueSeverityChart', data.issuesBySeverity, 'bar');
    render('teamTaskStatusChart', data.teamTasksByStatus, 'doughnut');
    render('teamIssueSeverityChart', data.teamIssuesBySeverity, 'bar');
})();
