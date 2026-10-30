// EduPulse AI - JavaScript Frontend Application Logic with Role-Based Access Control

document.addEventListener("DOMContentLoaded", function() {
    
    // Application State
    let currentUser = null;
    let dashboardData = null;
    let allResponses = [];
    let charts = {};
    let debounceTimer = null;

    // Initialize UI Event Listeners
    initTabs();
    initThemeToggle();
    initGoogleForm();
    initFilterEvents();
    initAuthModal();
    
    // Check authentication state on page load
    checkAuthState();

    // ----------------------------------------------------
    // AUTHENTICATION & ROLE-BASED ACCESS CONTROL
    // ----------------------------------------------------
    function checkAuthState() {
        fetch("/api/auth/current-user")
            .then(res => res.json())
            .then(data => {
                if (data.authenticated && data.user) {
                    setAuthenticatedState(data.user);
                } else {
                    setStudentState();
                }
            })
            .catch(() => {
                setStudentState();
            });
    }

    function setAuthenticatedState(user) {
        currentUser = user;

        // Show restricted management tabs
        document.querySelectorAll(".admin-nav-item").forEach(el => el.classList.remove("hidden"));

        // Update header badges and buttons
        const studentTag = document.getElementById("student-portal-tag");
        const loginBtn = document.getElementById("open-login-btn");
        const userBadge = document.getElementById("auth-user-badge");
        const userText = document.getElementById("auth-user-text");
        const logoutBtn = document.getElementById("logout-btn");
        const dashSubtitle = document.getElementById("dashboard-subtitle");

        if (studentTag) studentTag.classList.add("hidden");
        if (loginBtn) loginBtn.classList.add("hidden");
        if (userBadge) {
            userBadge.classList.remove("hidden");
            if (userText) userText.innerText = `${user.role}: ${user.name}`;
        }
        if (logoutBtn) logoutBtn.classList.remove("hidden");

        if (dashSubtitle) {
            if (user.role === "HOD" && user.department !== "All") {
                dashSubtitle.innerText = `Department Overview: ${user.department} | Logged in as ${user.name}`;
            } else {
                dashSubtitle.innerText = `Institutional Overview: Full Campus Analytics | Logged in as ${user.name}`;
            }
        }

        // Fetch management data
        fetchDashboardData();
        fetchAllResponses();
    }

    function setStudentState() {
        currentUser = null;

        // Hide restricted tabs from students
        document.querySelectorAll(".admin-nav-item").forEach(el => el.classList.add("hidden"));

        // Ensure active tab is the student survey form
        switchToTab("google-form-tab");

        // Update header
        const studentTag = document.getElementById("student-portal-tag");
        const loginBtn = document.getElementById("open-login-btn");
        const userBadge = document.getElementById("auth-user-badge");
        const logoutBtn = document.getElementById("logout-btn");

        if (studentTag) studentTag.classList.remove("hidden");
        if (loginBtn) loginBtn.classList.remove("hidden");
        if (userBadge) userBadge.classList.add("hidden");
        if (logoutBtn) logoutBtn.classList.add("hidden");
    }

    function initAuthModal() {
        const loginBtn = document.getElementById("open-login-btn");
        const modal = document.getElementById("login-modal");
        const closeBtn = document.getElementById("close-modal-btn");
        const loginForm = document.getElementById("staff-login-form");
        const errorAlert = document.getElementById("login-error-alert");
        const logoutBtn = document.getElementById("logout-btn");

        // Open modal
        if (loginBtn && modal) {
            loginBtn.addEventListener("click", () => {
                modal.classList.remove("hidden");
                if (errorAlert) errorAlert.classList.add("hidden");
                const usernameInput = document.getElementById("login-username");
                if (usernameInput) usernameInput.focus();
            });
        }

        // Close modal
        if (closeBtn && modal) {
            closeBtn.addEventListener("click", () => {
                modal.classList.add("hidden");
            });
        }

        // Close when clicking outside modal box
        if (modal) {
            modal.addEventListener("click", (e) => {
                if (e.target === modal) {
                    modal.classList.add("hidden");
                }
            });
        }

        // Quick demo login chips
        document.querySelectorAll(".quick-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                const u = chip.getAttribute("data-user");
                const p = chip.getAttribute("data-pass");
                const userInput = document.getElementById("login-username");
                const passInput = document.getElementById("login-password");
                if (userInput) userInput.value = u;
                if (passInput) passInput.value = p;
                if (errorAlert) errorAlert.classList.add("hidden");
            });
        });

        // Submit Login Form
        if (loginForm) {
            loginForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const username = document.getElementById("login-username").value.trim();
                const password = document.getElementById("login-password").value.trim();
                const submitBtn = document.getElementById("login-submit-btn");

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
                }

                fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: username, password: password })
                })
                .then(res => res.json().then(data => ({ status: res.status, body: data })))
                .then(({ status, body }) => {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In to Dashboard';
                    }

                    if (status === 200 && body.status === "success") {
                        if (modal) modal.classList.add("hidden");
                        loginForm.reset();
                        setAuthenticatedState(body.user);
                        // Automatically switch to Analytics Dashboard upon login
                        switchToTab("dashboard-tab");
                    } else {
                        if (errorAlert) {
                            errorAlert.innerText = body.message || "Invalid credentials.";
                            errorAlert.classList.remove("hidden");
                        }
                    }
                })
                .catch(err => {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In to Dashboard';
                    }
                    if (errorAlert) {
                        errorAlert.innerText = "Connection error. Please try again.";
                        errorAlert.classList.remove("hidden");
                    }
                });
            });
        }

        // Logout action
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                fetch("/api/auth/logout", { method: "POST" })
                    .then(() => {
                        setStudentState();
                    })
                    .catch(() => {
                        setStudentState();
                    });
            });
        }
    }

    function switchToTab(targetTabId) {
        document.querySelectorAll(".nav-tab").forEach(t => {
            if (t.getAttribute("data-tab") === targetTabId) {
                t.classList.add("active");
            } else {
                t.classList.remove("active");
            }
        });

        document.querySelectorAll(".tab-pane").forEach(p => {
            if (p.id === targetTabId) {
                p.classList.add("active");
            } else {
                p.classList.remove("active");
            }
        });

        if (targetTabId === "dashboard-tab" && dashboardData) {
            setTimeout(() => renderDashboardCharts(dashboardData), 100);
        } else if (targetTabId === "models-tab" && dashboardData) {
            setTimeout(() => renderModelComparisonCharts(dashboardData.ml_model_metrics), 100);
        } else if (targetTabId === "responses-tab") {
            fetchAllResponses();
        }
    }

    // ----------------------------------------------------
    // TAB NAVIGATION
    // ----------------------------------------------------
    function initTabs() {
        const tabs = document.querySelectorAll(".nav-tab");
        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                const targetTab = tab.getAttribute("data-tab");
                switchToTab(targetTab);
            });
        });
    }

    // ----------------------------------------------------
    // THEME TOGGLE
    // ----------------------------------------------------
    function initThemeToggle() {
        const themeBtn = document.getElementById("theme-toggle");
        if (!themeBtn) return;
        
        themeBtn.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");
            const isDark = document.body.classList.contains("dark-mode");
            themeBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
            
            // Re-render charts with updated theme colors
            if (dashboardData) {
                renderDashboardCharts(dashboardData);
                if (dashboardData.ml_model_metrics) renderModelComparisonCharts(dashboardData.ml_model_metrics);
            }
        });
    }

    // ----------------------------------------------------
    // GOOGLE FORM SUBMISSION & LIVE SENTIMENT PREDICTOR
    // ----------------------------------------------------
    function initGoogleForm() {
        const reviewTextarea = document.getElementById("form-review-text");
        const surveyForm = document.getElementById("student-survey-form");
        const liveSentimentBadge = document.getElementById("live-sentiment-badge");
        const submitAnotherBtn = document.getElementById("submit-another-btn");

        // Live typing sentiment predictor
        if (reviewTextarea && liveSentimentBadge) {
            reviewTextarea.addEventListener("input", function() {
                const text = reviewTextarea.value.trim();
                
                clearTimeout(debounceTimer);
                if (text.length < 5) {
                    liveSentimentBadge.innerHTML = `
                        <span class="sentiment-pill neutral">
                            <i class="fa-solid fa-face-meh"></i> Typing feedback...
                        </span>`;
                    return;
                }

                debounceTimer = setTimeout(() => {
                    fetch("/api/predict-sentiment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: text })
                    })
                    .then(res => res.json())
                    .then(data => {
                        updateSentimentBadge(liveSentimentBadge, data.sentiment, data.confidence);
                    })
                    .catch(err => console.error("Error predicting sentiment:", err));
                }, 300);
            });
        }

        // Form Submit
        if (surveyForm) {
            surveyForm.addEventListener("submit", function(e) {
                e.preventDefault();
                
                const department = document.getElementById("form-department").value;
                const academicYear = document.querySelector('input[name="academic_year"]:checked').value;
                const facility = document.getElementById("form-facility").value;
                const rating = document.querySelector('input[name="rating"]:checked').value;
                const reviewText = document.getElementById("form-review-text").value.trim();

                const submitBtn = document.getElementById("submit-survey-btn");
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

                fetch("/api/submit-feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        department: department,
                        academic_year: academicYear,
                        facility: facility,
                        rating: rating,
                        review_text: reviewText
                    })
                })
                .then(res => res.json())
                .then(resData => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Survey';

                    if (resData.status === "success") {
                        showSubmissionSuccess(resData);
                        if (currentUser) {
                            fetchDashboardData();
                        }
                    } else {
                        alert(resData.message || "Submission failed.");
                    }
                })
                .catch(err => {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Survey';
                    alert("Error submitting feedback: " + err);
                });
            });
        }

        if (submitAnotherBtn) {
            submitAnotherBtn.addEventListener("click", () => {
                document.getElementById("student-survey-form").classList.remove("hidden");
                document.getElementById("survey-success-card").classList.add("hidden");
                document.getElementById("student-survey-form").reset();
                liveSentimentBadge.innerHTML = `
                    <span class="sentiment-pill neutral">
                        <i class="fa-solid fa-face-meh"></i> Typing feedback...
                    </span>`;
            });
        }
    }

    function updateSentimentBadge(container, sentiment, confidence) {
        let icon = "fa-face-meh";
        let cssClass = "neutral";
        let confText = confidence ? ` (${(confidence * 100).toFixed(0)}%)` : "";

        if (sentiment === "Positive") {
            icon = "fa-face-smile";
            cssClass = "positive";
        } else if (sentiment === "Negative") {
            icon = "fa-face-frown";
            cssClass = "negative";
        }

        container.innerHTML = `
            <span class="sentiment-pill ${cssClass}">
                <i class="fa-solid ${icon}"></i> AI: ${sentiment}${confText}
            </span>`;
    }

    function showSubmissionSuccess(data) {
        const formEl = document.getElementById("student-survey-form");
        const successCard = document.getElementById("survey-success-card");
        const summaryBox = document.getElementById("result-summary-box");

        formEl.classList.add("hidden");
        successCard.classList.remove("hidden");

        const entry = data.submitted_entry;
        let iconClass = entry.sentiment === "Positive" ? "fa-face-smile text-pos" : (entry.sentiment === "Negative" ? "fa-face-frown text-neg" : "fa-face-meh text-neu");
        
        summaryBox.innerHTML = `
            <p><strong>Student ID:</strong> ${entry.student_id} (${entry.department} - ${entry.academic_year})</p>
            <p><strong>Facility Reviewed:</strong> ${entry.facility}</p>
            <p><strong>Rating:</strong> ${entry.rating} / 5 Stars</p>
            <p><strong>AI Sentiment Prediction:</strong> 
                <span class="sentiment-pill ${entry.sentiment.toLowerCase()}">
                    <i class="fa-solid ${iconClass}"></i> ${entry.sentiment}
                </span> 
                (Confidence: ${(data.confidence_score * 100).toFixed(1)}%)
            </p>
            <p style="margin-top:0.5rem; font-style:italic;">"${entry.review_text}"</p>
        `;
    }

    // ----------------------------------------------------
    // DASHBOARD DATA FETCH & RENDERING (AUTHENTICATED ONLY)
    // ----------------------------------------------------
    function fetchDashboardData() {
        if (!currentUser) return;

        fetch("/api/dashboard-summary")
            .then(res => {
                if (res.status === 403) {
                    setStudentState();
                    throw new Error("Unauthorized");
                }
                return res.json();
            })
            .then(data => {
                if (data.status === "success") {
                    dashboardData = data;
                    updateKPICards(data);
                    renderDashboardCharts(data);
                    if (data.ml_model_metrics) {
                        renderModelComparisonTable(data.ml_model_metrics);
                        renderModelComparisonCharts(data.ml_model_metrics);
                        renderKeywords(data.ml_model_metrics.top_keywords);
                    }
                }
            })
            .catch(err => {
                console.warn("Dashboard fetch notice:", err.message);
            });
    }

    function updateKPICards(data) {
        const totalSurveys = document.getElementById("kpi-total-surveys");
        const posPct = document.getElementById("kpi-pos-pct");
        const posCount = document.getElementById("kpi-pos-count");
        const neuPct = document.getElementById("kpi-neu-pct");
        const neuCount = document.getElementById("kpi-neu-count");
        const negPct = document.getElementById("kpi-neg-pct");
        const negCount = document.getElementById("kpi-neg-count");
        const topFac = document.getElementById("kpi-top-facility");
        const lowFac = document.getElementById("kpi-low-facility");

        if (totalSurveys) totalSurveys.innerText = data.total_surveys.toLocaleString();
        if (posPct) posPct.innerText = data.sentiment_percentages.Positive + "%";
        if (posCount) posCount.innerText = `${data.sentiment_counts.Positive} Surveys`;
        if (neuPct) neuPct.innerText = data.sentiment_percentages.Neutral + "%";
        if (neuCount) neuCount.innerText = `${data.sentiment_counts.Neutral} Surveys`;
        if (negPct) negPct.innerText = data.sentiment_percentages.Negative + "%";
        if (negCount) negCount.innerText = `${data.sentiment_counts.Negative} Surveys`;
        if (topFac) topFac.innerText = data.top_rated_facility || "N/A";
        if (lowFac) lowFac.innerText = data.lowest_rated_facility || "N/A";
    }

    // ----------------------------------------------------
    // CHART RENDERING (Chart.js)
    // ----------------------------------------------------
    function renderDashboardCharts(data) {
        const isDark = document.body.classList.contains("dark-mode");
        const textColor = isDark ? "#cbd5e1" : "#5f6368";
        const gridColor = isDark ? "#334155" : "#e5e7eb";

        // 1. Facility-wise Sentiment Stacked Bar Chart
        const facilityNames = Object.keys(data.facility_analysis);
        const facPos = facilityNames.map(f => data.facility_analysis[f].Positive || 0);
        const facNeu = facilityNames.map(f => data.facility_analysis[f].Neutral || 0);
        const facNeg = facilityNames.map(f => data.facility_analysis[f].Negative || 0);

        createOrUpdateChart("facility-sentiment-chart", "bar", {
            labels: facilityNames,
            datasets: [
                { label: "Happy / Positive", data: facPos, backgroundColor: "#10b981" },
                { label: "Neutral", data: facNeu, backgroundColor: "#f59e0b" },
                { label: "Unhappy / Negative", data: facNeg, backgroundColor: "#ef4444" }
            ]
        }, {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, ticks: { color: textColor }, grid: { display: false } },
                y: { stacked: true, ticks: { color: textColor }, grid: { color: gridColor } }
            },
            plugins: { legend: { labels: { color: textColor } } }
        });

        // 2. Department-wise Sentiment Chart
        const deptNames = Object.keys(data.department_analysis);
        const deptPos = deptNames.map(d => data.department_analysis[d].Positive || 0);
        const deptNeu = deptNames.map(d => data.department_analysis[d].Neutral || 0);
        const deptNeg = deptNames.map(d => data.department_analysis[d].Negative || 0);

        createOrUpdateChart("dept-sentiment-chart", "bar", {
            labels: deptNames,
            datasets: [
                { label: "Positive", data: deptPos, backgroundColor: "#10b981" },
                { label: "Neutral", data: deptNeu, backgroundColor: "#f59e0b" },
                { label: "Negative", data: deptNeg, backgroundColor: "#ef4444" }
            ]
        }, {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: textColor }, grid: { display: false } },
                y: { ticks: { color: textColor }, grid: { color: gridColor } }
            },
            plugins: { legend: { labels: { color: textColor } } }
        });

        // 3. Overall Sentiment Donut Chart
        createOrUpdateChart("overall-sentiment-chart", "doughnut", {
            labels: ["Happy / Positive", "Neutral", "Unhappy / Negative"],
            datasets: [{
                data: [data.sentiment_counts.Positive, data.sentiment_counts.Neutral, data.sentiment_counts.Negative],
                backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
                borderWidth: 2,
                borderColor: isDark ? "#1e293b" : "#ffffff"
            }]
        }, {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "bottom", labels: { color: textColor } } }
        });

        // 4. Facility Average Rating Chart (Horizontal Bar)
        const facRatings = data.facility_ratings;
        const facRatingNames = Object.keys(facRatings).sort((a, b) => facRatings[b] - facRatings[a]);
        const facRatingVals = facRatingNames.map(name => facRatings[name]);

        createOrUpdateChart("facility-rating-chart", "bar", {
            labels: facRatingNames,
            datasets: [{
                label: "Average Rating Score (out of 5)",
                data: facRatingVals,
                backgroundColor: "#673ab7",
                borderRadius: 4
            }]
        }, {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { min: 1, max: 5, ticks: { color: textColor }, grid: { color: gridColor } },
                y: { ticks: { color: textColor }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        });

        // 5. Department Satisfaction Score
        const deptRatings = data.department_ratings;
        const deptRatingNames = Object.keys(deptRatings);
        const deptRatingVals = deptRatingNames.map(d => deptRatings[d]);

        createOrUpdateChart("dept-rating-chart", "bar", {
            labels: deptRatingNames,
            datasets: [{
                label: "Department Score",
                data: deptRatingVals,
                backgroundColor: "#7c4dff",
                borderRadius: 4
            }]
        }, {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: textColor }, grid: { display: false } },
                y: { min: 1, max: 5, ticks: { color: textColor }, grid: { color: gridColor } }
            },
            plugins: { legend: { display: false } }
        });
    }

    // ----------------------------------------------------
    // MODEL COMPARISON RENDERER
    // ----------------------------------------------------
    function renderModelComparisonTable(metricsData) {
        if (!metricsData || !metricsData.models) return;

        const tableBody = document.querySelector("#model-comparison-table tbody");
        const bestModelBadge = document.getElementById("best-model-badge");
        if (!tableBody) return;

        if (bestModelBadge) bestModelBadge.innerText = `Best Classifier: ${metricsData.best_model}`;

        let html = "";
        for (const [modelName, metrics] of Object.entries(metricsData.models)) {
            const isBest = modelName === metricsData.best_model;
            const highlightClass = isBest ? "row-highlight" : "";
            const statusBadge = isBest ? '<span class="sentiment-pill positive"><i class="fa-solid fa-trophy"></i> Best Model</span>' : '<span class="kw-pill">Evaluated</span>';

            html += `
                <tr class="${highlightClass}">
                    <td><strong>${modelName}</strong></td>
                    <td>${(metrics.accuracy * 100).toFixed(2)}%</td>
                    <td>${(metrics.precision * 100).toFixed(2)}%</td>
                    <td>${(metrics.recall * 100).toFixed(2)}%</td>
                    <td><strong>${(metrics.f1_score * 100).toFixed(2)}%</strong></td>
                    <td>${statusBadge}</td>
                </tr>`;
        }
        tableBody.innerHTML = html;
    }

    function renderModelComparisonCharts(metricsData) {
        if (!metricsData || !metricsData.models) return;

        const isDark = document.body.classList.contains("dark-mode");
        const textColor = isDark ? "#cbd5e1" : "#5f6368";
        const gridColor = isDark ? "#334155" : "#e5e7eb";

        const modelNames = Object.keys(metricsData.models);
        const f1Scores = modelNames.map(m => (metricsData.models[m].f1_score * 100).toFixed(2));
        const accuracies = modelNames.map(m => (metricsData.models[m].accuracy * 100).toFixed(2));

        createOrUpdateChart("model-metrics-chart", "bar", {
            labels: modelNames,
            datasets: [
                { label: "F1-Score (%)", data: f1Scores, backgroundColor: "#673ab7" },
                { label: "Accuracy (%)", data: accuracies, backgroundColor: "#10b981" }
            ]
        }, {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: textColor }, grid: { display: false } },
                y: { min: 70, max: 100, ticks: { color: textColor }, grid: { color: gridColor } }
            },
            plugins: { legend: { labels: { color: textColor } } }
        });
    }

    function renderKeywords(topKeywords) {
        const container = document.getElementById("top-keywords-container");
        if (!container || !topKeywords) return;

        let html = "";
        const mapping = [
            { key: "Positive", title: "Positive Features (Happy)", cssClass: "pos" },
            { key: "Neutral", title: "Neutral Features", cssClass: "neu" },
            { key: "Negative", title: "Negative Features (Unhappy)", cssClass: "neg" }
        ];

        mapping.forEach(m => {
            const words = topKeywords[m.key] || [];
            const wordPills = words.map(w => `<span class="kw-pill">${w}</span>`).join(" ");
            html += `
                <div class="kw-box ${m.cssClass}">
                    <div class="kw-title">${m.title}</div>
                    <div class="kw-pills">${wordPills}</div>
                </div>`;
        });
        container.innerHTML = html;
    }

    function createOrUpdateChart(canvasId, type, data, options) {
        if (charts[canvasId]) {
            charts[canvasId].destroy();
        }
        const ctx = document.getElementById(canvasId);
        if (ctx) {
            charts[canvasId] = new Chart(ctx, { type: type, data: data, options: options });
        }
    }

    // ----------------------------------------------------
    // RESPONSES EXPLORER TABLE & FILTERS
    // ----------------------------------------------------
    function initFilterEvents() {
        const searchInput = document.getElementById("search-input");
        const filterFacility = document.getElementById("filter-facility");
        const filterDept = document.getElementById("filter-department");
        const filterSentiment = document.getElementById("filter-sentiment");
        const resetBtn = document.getElementById("reset-filters-btn");
        const refreshDashBtn = document.getElementById("refresh-dash-btn");
        const exportBtn = document.getElementById("export-report-btn");

        [searchInput, filterFacility, filterDept, filterSentiment].forEach(el => {
            if (el) el.addEventListener("input", fetchAllResponses);
        });

        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                if (searchInput) searchInput.value = "";
                if (filterFacility) filterFacility.value = "All";
                if (filterDept) filterDept.value = "All";
                if (filterSentiment) filterSentiment.value = "All";
                fetchAllResponses();
            });
        }

        if (refreshDashBtn) {
            refreshDashBtn.addEventListener("click", () => {
                fetchDashboardData();
                fetchAllResponses();
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener("click", exportReportCSV);
        }
    }

    function fetchAllResponses() {
        if (!currentUser) return;

        const search = document.getElementById("search-input") ? document.getElementById("search-input").value : "";
        const facility = document.getElementById("filter-facility") ? document.getElementById("filter-facility").value : "All";
        const dept = document.getElementById("filter-department") ? document.getElementById("filter-department").value : "All";
        const sentiment = document.getElementById("filter-sentiment") ? document.getElementById("filter-sentiment").value : "All";

        const params = new URLSearchParams({
            search: search,
            facility: facility,
            department: dept,
            sentiment: sentiment
        });

        fetch(`/api/all-responses?${params.toString()}`)
            .then(res => {
                if (res.status === 403) {
                    throw new Error("Unauthorized");
                }
                return res.json();
            })
            .then(resData => {
                if (resData.status === "success") {
                    allResponses = resData.data;
                    renderResponsesTable(allResponses);
                    const countEl = document.getElementById("responses-count");
                    if (countEl) countEl.innerText = resData.total_records.toLocaleString();
                }
            })
            .catch(err => {
                console.warn("Responses fetch notice:", err.message);
            });
    }

    function renderResponsesTable(records) {
        const tbody = document.getElementById("responses-tbody");
        if (!tbody) return;

        if (records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">No matching survey responses found.</td></tr>`;
            return;
        }

        let html = "";
        records.forEach(r => {
            let iconClass = r.sentiment === "Positive" ? "fa-face-smile" : (r.sentiment === "Negative" ? "fa-face-frown" : "fa-face-meh");
            let badgeClass = r.sentiment.toLowerCase();

            html += `
                <tr>
                    <td><strong>${r.student_id}</strong></td>
                    <td>${r.department}</td>
                    <td>${r.academic_year}</td>
                    <td><span class="kw-pill">${r.facility}</span></td>
                    <td>${r.rating} / 5 ⭐</td>
                    <td style="max-width: 320px;">${r.review_text}</td>
                    <td>
                        <span class="sentiment-pill ${badgeClass}">
                            <i class="fa-solid ${iconClass}"></i> ${r.sentiment}
                        </span>
                    </td>
                </tr>`;
        });
        tbody.innerHTML = html;
    }

    function exportReportCSV() {
        if (!allResponses || allResponses.length === 0) {
            alert("No data available to export.");
            return;
        }

        const headers = ["Student ID", "Department", "Academic Year", "Facility", "Rating", "Review Text", "AI Sentiment"];
        const rows = allResponses.map(r => [
            `"${r.student_id}"`,
            `"${r.department}"`,
            `"${r.academic_year}"`,
            `"${r.facility}"`,
            r.rating,
            `"${r.review_text.replace(/"/g, '""')}"`,
            `"${r.sentiment}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `College_Survey_Sentiment_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
