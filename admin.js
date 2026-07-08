// Admin Panel Console Controller Logic
let usersData = JSON.parse(localStorage.getItem("elonix_staking_users")) || {};
let adminSession = JSON.parse(localStorage.getItem("elonix_admin_session")) || null;

// DOM Elements cache
const DOM = {
    authContainer: document.getElementById("adminAuthContainer"),
    dashboardContainer: document.getElementById("adminDashboardContainer"),
    loginForm: document.getElementById("adminLoginForm"),
    logoutBtn: document.getElementById("btnAdminLogout"),
    errorMsg: document.getElementById("adminErrorMsg"),
    
    // Stats cards
    statPending: document.getElementById("statPendingCount"),
    statApproved: document.getElementById("statApprovedCount"),
    statUsers: document.getElementById("statTotalUsers"),
    
    // Views and Tables
    depositsBody: document.getElementById("adminPendingDepositsBody"),
    kycBody: document.getElementById("adminPendingKycBody"),
    withdrawalsBody: document.getElementById("adminPendingWithdrawalsBody"),
    ticketsList: document.getElementById("adminSupportTicketsList"),
    
    toast: document.getElementById("toast"),
    
    // KYC Audit Modal Elements
    kycAuditModal: document.getElementById("kycAuditModal"),
    closeKycModalBtn: document.getElementById("closeKycModalBtn"),
    auditUsername: document.getElementById("auditUsername"),
    auditTimestamp: document.getElementById("auditTimestamp"),
    auditFullName: document.getElementById("auditFullName"),
    auditDob: document.getElementById("auditDob"),
    auditGender: document.getElementById("auditGender"),
    auditCountry: document.getElementById("auditCountry"),
    auditAddress: document.getElementById("auditAddress"),
    auditDocType: document.getElementById("auditDocType"),
    auditDocId: document.getElementById("auditDocId"),
    auditIdFront: document.getElementById("auditIdFront"),
    auditIdBack: document.getElementById("auditIdBack"),
    btnRejectKyc: document.getElementById("btnRejectKyc"),
    btnApproveKyc: document.getElementById("btnApproveKyc")
};

// Sub navigation tabs cache
let adminTabs = [];

// Start application
window.addEventListener("DOMContentLoaded", () => {
    setupAuthForm();
    setupAdminSubTabs();
    setupKycModalListeners();
    
    if (adminSession) {
        loadAdminDashboard();
    } else {
        showAuthScreen();
    }
});

// Setup Modal overlay and close triggers
function setupKycModalListeners() {
    if (DOM.closeKycModalBtn) {
        DOM.closeKycModalBtn.addEventListener("click", () => {
            if (DOM.kycAuditModal) DOM.kycAuditModal.classList.remove("active");
        });
    }
    
    if (DOM.kycAuditModal) {
        DOM.kycAuditModal.addEventListener("click", (e) => {
            if (e.target === DOM.kycAuditModal) {
                DOM.kycAuditModal.classList.remove("active");
            }
        });
    }
}

// Switch screens
function showAuthScreen() {
    if (DOM.authContainer) DOM.authContainer.style.display = "block";
    if (DOM.dashboardContainer) DOM.dashboardContainer.style.display = "none";
    if (DOM.logoutBtn) DOM.logoutBtn.style.display = "none";
}

function showDashboardScreen() {
    if (DOM.authContainer) DOM.authContainer.style.display = "none";
    if (DOM.dashboardContainer) DOM.dashboardContainer.style.display = "block";
    if (DOM.logoutBtn) DOM.logoutBtn.style.display = "block";
}

// Authentication
function setupAuthForm() {
    if (DOM.loginForm) {
        DOM.loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const username = document.getElementById("adminUsername").value.trim();
            const pass = document.getElementById("adminPassword").value;
            
            if (!username || !pass) {
                setAuthError("Please fill out all fields.");
                return;
            }
            
            // Hardcoded Administrator credentials
            if (username.toLowerCase() === "admin" && pass === "admin123") {
                adminSession = { username: "Administrator", loginTime: Date.now() };
                localStorage.setItem("elonix_admin_session", JSON.stringify(adminSession));
                DOM.loginForm.reset();
                loadAdminDashboard();
                showToast("Terminal Authorized. Welcome Admin.");
            } else {
                setAuthError("Unauthorized credentials. Access Denied.");
            }
        });
    }
    
    if (DOM.logoutBtn) {
        DOM.logoutBtn.addEventListener("click", () => {
            adminSession = null;
            localStorage.removeItem("elonix_admin_session");
            showAuthScreen();
            showToast("Terminal session closed successfully.");
        });
    }
}

function setAuthError(msg) {
    if (DOM.errorMsg) {
        DOM.errorMsg.innerText = msg;
        DOM.errorMsg.style.display = "block";
        DOM.errorMsg.classList.add("shake-animation");
        setTimeout(() => {
            DOM.errorMsg.classList.remove("shake-animation");
        }, 500);
    }
}

function clearAuthError() {
    if (DOM.errorMsg) {
        DOM.errorMsg.innerText = "";
        DOM.errorMsg.style.display = "none";
    }
}

// Admin Sub-Navigation Setup
function setupAdminSubTabs() {
    adminTabs = [
        { btn: document.getElementById("adminTabBtnDeposits"), view: document.getElementById("adminViewDeposits"), renderer: renderPendingDeposits },
        { btn: document.getElementById("adminTabBtnKyc"), view: document.getElementById("adminViewKyc"), renderer: renderKycQueue },
        { btn: document.getElementById("adminTabBtnWithdrawals"), view: document.getElementById("adminViewWithdrawals"), renderer: renderWithdrawalsQueue },
        { btn: document.getElementById("adminTabBtnSupport"), view: document.getElementById("adminViewSupport"), renderer: renderSupportTicketsQueue }
    ];

    adminTabs.forEach(tab => {
        if (tab.btn) {
            tab.btn.addEventListener("click", () => {
                adminTabs.forEach(t => {
                    if (t.btn) t.btn.classList.remove("active");
                    if (t.view) t.view.style.display = "none";
                });
                
                tab.btn.classList.add("active");
                if (tab.view) tab.view.style.display = "block";
                
                refreshAdminDatabase();
                tab.renderer();
            });
        }
    });
}

// Load Dashboard Panel
function loadAdminDashboard() {
    showDashboardScreen();
    clearAuthError();
    refreshAdminDatabase();
    renderStats();
    
    // Auto load current active tab view
    const activeTab = adminTabs.find(t => t.btn && t.btn.classList.contains("active")) || adminTabs[0];
    if (activeTab) {
        activeTab.renderer();
    }
}

function refreshAdminDatabase() {
    usersData = JSON.parse(localStorage.getItem("elonix_staking_users")) || {};
}

function saveAdminDatabase() {
    localStorage.setItem("elonix_staking_users", JSON.stringify(usersData));
}

// Render Metrics
function renderStats() {
    let pending = 0;
    let approved = 0;
    const usersCount = Object.keys(usersData).length;
    
    Object.keys(usersData).forEach(u => {
        const user = usersData[u];
        if (user.transactions) {
            user.transactions.forEach(t => {
                if (t.type === "Token Deposit Proof") {
                    if (t.status === "Pending") pending++;
                    if (t.status === "Success") approved++;
                }
            });
        }
    });
    
    if (DOM.statPending) DOM.statPending.innerText = pending;
    if (DOM.statApproved) DOM.statApproved.innerText = approved;
    if (DOM.statUsers) DOM.statUsers.innerText = usersCount;
}

// ==========================================
// 1. RENDER DEPOSIT AUDITS QUEUE
// ==========================================
function renderPendingDeposits() {
    if (!DOM.depositsBody) return;
    
    DOM.depositsBody.innerHTML = "";
    let count = 0;
    
    Object.keys(usersData).forEach(username => {
        const user = usersData[username];
        if (user.transactions) {
            user.transactions.forEach((tx, txIndex) => {
                if (tx.type === "Token Deposit Proof" && tx.status === "Pending") {
                    count++;
                    const row = document.createElement("tr");
                    const dateStr = formatDate(new Date(tx.timestamp));
                    
                    row.innerHTML = `
                        <td>${dateStr}</td>
                        <td style="font-weight: 600;">${user.username}</td>
                        <td class="font-tech text-cyan" style="font-weight:700;">${tx.amount.toFixed(2)} ELX</td>
                        <td class="font-tech" style="font-size: 0.8rem; color: var(--text-secondary);">${tx.txHash.slice(0, 16)}...</td>
                        <td><span class="badge-status claimable" style="background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.2); color: #f59e0b;">Pending</span></td>
                        <td>
                            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                                <button class="btn btn-row-action btn-success-glow" onclick="verifyDepositAction('${username}', ${txIndex}, 'approve')">Approve</button>
                                <button class="btn btn-row-action btn-danger-glow" onclick="verifyDepositAction('${username}', ${txIndex}, 'reject')">Reject</button>
                            </div>
                        </td>
                    `;
                    DOM.depositsBody.appendChild(row);
                }
            });
        }
    });
    
    if (count === 0) {
        DOM.depositsBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table-msg">
                    <div class="empty-state-visual">📥</div>
                    No pending deposit transactions waiting for verification.
                </td>
            </tr>
        `;
    }
}

// ==========================================
// 2. RENDER KYC AUDITS QUEUE
// ==========================================
function renderKycQueue() {
    if (!DOM.kycBody) return;
    
    DOM.kycBody.innerHTML = "";
    let count = 0;
    
    Object.keys(usersData).forEach(username => {
        const user = usersData[username];
        if (user.kyc && user.kyc.status === "Pending") {
            count++;
            const row = document.createElement("tr");
            const dateStr = formatDate(new Date(user.kyc.timestamp || Date.now()));
            
            row.innerHTML = `
                <td>${dateStr}</td>
                <td style="font-weight: 600;">${user.username}</td>
                <td>${user.kyc.fullName}</td>
                <td>${user.kyc.country}</td>
                <td class="font-tech" style="font-size: 0.85rem; color: var(--text-secondary);">${user.kyc.docType}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="btn btn-row-action btn-primary-glow" onclick="openKycAuditModal('${username}')">🔍 Audit Profile</button>
                    </div>
                </td>
            `;
            DOM.kycBody.appendChild(row);
        }
    });
    
    if (count === 0) {
        DOM.kycBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table-msg">
                    <div class="empty-state-visual">🛡️</div>
                    No pending identity profiles waiting for verification.
                </td>
            </tr>
        `;
    }
}

// ==========================================
// 3. RENDER WITHDRAWALS AUDITS QUEUE
// ==========================================
function renderWithdrawalsQueue() {
    if (!DOM.withdrawalsBody) return;
    
    DOM.withdrawalsBody.innerHTML = "";
    let count = 0;
    
    Object.keys(usersData).forEach(username => {
        const user = usersData[username];
        if (user.withdrawals) {
            user.withdrawals.forEach((w, wIndex) => {
                if (w.status === "Pending") {
                    count++;
                    const row = document.createElement("tr");
                    const dateStr = formatDate(new Date(w.timestamp));
                    
                    row.innerHTML = `
                        <td>${dateStr}</td>
                        <td style="font-weight: 600;">${user.username}</td>
                        <td class="font-tech text-cyan" style="font-weight:700;">${w.amount.toFixed(2)} ELX</td>
                        <td class="font-tech" style="font-size: 0.8rem; color: var(--text-secondary);">${w.address}</td>
                        <td>
                            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                                <button class="btn btn-row-action btn-success-glow" onclick="verifyWithdrawalAction('${username}', ${wIndex}, 'approve')">Approve</button>
                                <button class="btn btn-row-action btn-danger-glow" onclick="verifyWithdrawalAction('${username}', ${wIndex}, 'reject')">Reject</button>
                            </div>
                        </td>
                    `;
                    DOM.withdrawalsBody.appendChild(row);
                }
            });
        }
    });
    
    if (count === 0) {
        DOM.withdrawalsBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table-msg">
                    <div class="empty-state-visual">💸</div>
                    No pending payout withdrawals waiting for processing.
                </td>
            </tr>
        `;
    }
}

// ==========================================
// 4. RENDER SUPPORT TICKETS QUEUE
// ==========================================
function renderSupportTicketsQueue() {
    if (!DOM.ticketsList) return;
    
    DOM.ticketsList.innerHTML = "";
    let count = 0;
    
    Object.keys(usersData).forEach(username => {
        const user = usersData[username];
        if (user.tickets) {
            user.tickets.forEach((t, tIndex) => {
                if (t.status === "Open") {
                    count++;
                    const card = document.createElement("div");
                    card.style.background = "rgba(255, 255, 255, 0.012)";
                    card.style.border = "1px solid var(--border-titanium)";
                    card.style.borderRadius = "6px";
                    card.style.padding = "1.25rem";
                    card.style.display = "flex";
                    card.style.flexDirection = "column";
                    card.style.gap = "0.75rem";
                    
                    const dateStr = formatDate(new Date(t.timestamp));
                    
                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.5rem;">
                            <div>
                                <span style="font-size: 0.75rem; color: var(--text-muted); margin-right: 0.5rem;">Client: ${user.username}</span>
                                <strong style="font-size: 1rem; color: var(--text-primary);">${t.subject}</strong>
                            </div>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">${dateStr}</span>
                        </div>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
                            ${t.message}
                        </p>
                        <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
                            <textarea id="reply_${username}_${tIndex}" class="form-input text-cyan" style="min-height: 60px; font-family: inherit; font-size: 0.85rem; padding: 0.4rem 0.6rem;" placeholder="Type support response message..."></textarea>
                            <div style="display: flex; justify-content: flex-end;">
                                <button class="btn btn-primary btn-sm btn-glow" onclick="replySupportTicketAction('${username}', ${tIndex})">Send Response & Resolve</button>
                            </div>
                        </div>
                    `;
                    DOM.ticketsList.appendChild(card);
                }
            });
        }
    });
    
    if (count === 0) {
        DOM.ticketsList.innerHTML = `
            <div class="empty-table-msg" style="text-align: center; padding: 2rem 0;">
                <div class="empty-state-visual">📨</div>
                No active support inquiries registered.
            </div>
        `;
    }
}

// ==========================================
// ACTIONS AUDITING HANDLERS
// ==========================================

// 1. Verify Deposit
window.verifyDepositAction = function(username, txIndex, action) {
    refreshAdminDatabase();
    const user = usersData[username.toLowerCase()];
    if (!user || !user.transactions || !user.transactions[txIndex]) return;
    
    const tx = user.transactions[txIndex];
    if (tx.status !== "Pending") return;
    
    if (action === "approve") {
        tx.status = "Success";
        tx.desc = `Deposit verified by admin. TxID: ${tx.txHash.slice(0, 10)}...`;
        user.balance = (user.balance || 0) + tx.amount;
        user.depositedBalance = (user.depositedBalance || 0) + tx.amount;
        saveAdminDatabase();
        showToast(`Approved deposit of ${tx.amount.toFixed(2)} ELX for ${user.username}.`);
    } else {
        tx.status = "Rejected";
        tx.desc = `Deposit proof rejected by admin. TxID: ${tx.txHash.slice(0, 10)}...`;
        saveAdminDatabase();
        showToast(`Rejected deposit proof from ${user.username}.`);
    }
    
    renderStats();
    renderPendingDeposits();
};

// 2. Verify KYC
window.verifyKycAction = function(username, action) {
    refreshAdminDatabase();
    const user = usersData[username.toLowerCase()];
    if (!user || !user.kyc) return;
    
    user.kyc.status = (action === "approve" ? "Approved" : "Rejected");
    saveAdminDatabase();
    
    showToast(`KYC audit complete: Status set to ${user.kyc.status} for ${user.username}.`);
    
    // Close modal
    if (DOM.kycAuditModal) {
        DOM.kycAuditModal.classList.remove("active");
    }
    
    renderKycQueue();
    renderStats();
};

// 2.5 Open KYC Audit Modal with details
window.openKycAuditModal = function(username) {
    refreshAdminDatabase();
    const user = usersData[username.toLowerCase()];
    if (!user || !user.kyc) return;
    
    const kyc = user.kyc;
    
    // Fill text elements
    if (DOM.auditUsername) DOM.auditUsername.innerText = user.username;
    if (DOM.auditTimestamp) DOM.auditTimestamp.innerText = formatDate(new Date(kyc.timestamp || Date.now()));
    if (DOM.auditFullName) DOM.auditFullName.innerText = kyc.fullName || "N/A";
    if (DOM.auditDob) DOM.auditDob.innerText = kyc.dob || "Not Provided";
    if (DOM.auditGender) DOM.auditGender.innerText = kyc.gender || "Not Provided";
    if (DOM.auditCountry) DOM.auditCountry.innerText = kyc.country || "N/A";
    if (DOM.auditAddress) DOM.auditAddress.innerText = kyc.address || "Not Provided";
    if (DOM.auditDocType) DOM.auditDocType.innerText = kyc.docType || "N/A";
    if (DOM.auditDocId) DOM.auditDocId.innerText = kyc.docId || "N/A";
    
    // Document Images
    if (DOM.auditIdFront) {
        DOM.auditIdFront.src = kyc.idFront || "logo.png";
        DOM.auditIdFront.style.opacity = kyc.idFront ? "1" : "0.3";
    }
    if (DOM.auditIdBack) {
        DOM.auditIdBack.src = kyc.idBack || "logo.png";
        DOM.auditIdBack.style.opacity = kyc.idBack ? "1" : "0.3";
    }
    
    // Bind buttons
    if (DOM.btnApproveKyc) {
        DOM.btnApproveKyc.onclick = () => verifyKycAction(username, 'approve');
    }
    if (DOM.btnRejectKyc) {
        DOM.btnRejectKyc.onclick = () => verifyKycAction(username, 'reject');
    }
    
    // Show Modal
    if (DOM.kycAuditModal) {
        DOM.kycAuditModal.classList.add("active");
    }
};

// 3. Verify Withdrawal
window.verifyWithdrawalAction = function(username, wIndex, action) {
    refreshAdminDatabase();
    const user = usersData[username.toLowerCase()];
    if (!user || !user.withdrawals || !user.withdrawals[wIndex]) return;
    
    const w = user.withdrawals[wIndex];
    if (w.status !== "Pending") return;
    
    // Find transaction log associated with this request
    let txLog = null;
    if (user.transactions) {
        // Find pending withdrawal request log closest in amount
        txLog = user.transactions.find(t => t.type === "Withdrawal Request" && t.status === "Pending" && Math.abs(t.amount) === w.amount);
    }
    
    if (action === "approve") {
        w.status = "Approved";
        if (txLog) {
            txLog.status = "Success";
            txLog.desc = `Withdrawal processed successfully to address ${w.address.slice(0, 8)}...`;
        }
        saveAdminDatabase();
        showToast(`Approved withdrawal of ${w.amount.toFixed(2)} ELX for ${user.username}.`);
    } else {
        w.status = "Rejected";
        // Payout rejected: Refund the amount back to user active balances
        user.balance = (user.balance || 0) + w.amount;
        user.depositedBalance = (user.depositedBalance || 0) + w.amount;
        
        if (txLog) {
            txLog.status = "Rejected";
            txLog.desc = `Withdrawal request rejected by administrator. Payout refunded.`;
        }
        saveAdminDatabase();
        showToast(`Rejected and refunded withdrawal of ${w.amount.toFixed(2)} ELX for ${user.username}.`);
    }
    
    renderWithdrawalsQueue();
};

// 4. Reply to Support Ticket
window.replySupportTicketAction = function(username, tIndex) {
    refreshAdminDatabase();
    const user = usersData[username.toLowerCase()];
    if (!user || !user.tickets || !user.tickets[tIndex]) return;
    
    const replyText = document.getElementById(`reply_${username}_${tIndex}`).value.trim();
    if (!replyText) {
        showToast("Please enter a response message.");
        return;
    }
    
    const t = user.tickets[tIndex];
    t.reply = replyText;
    t.status = "Resolved";
    saveAdminDatabase();
    
    showToast(`Reply transmitted! Ticket from ${user.username} resolved.`);
    renderSupportTicketsQueue();
};

// Date Formatter helper
function formatDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Toast indicator helper
function showToast(message) {
    if (!DOM.toast) return;
    DOM.toast.innerText = message;
    DOM.toast.classList.add("show");
    
    if (window.adminToastTimeout) clearTimeout(window.adminToastTimeout);
    window.adminToastTimeout = setTimeout(() => {
        DOM.toast.classList.remove("show");
    }, 3500);
}
