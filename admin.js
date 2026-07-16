// Admin Panel Console Controller Logic
let usersData = JSON.parse(localStorage.getItem("elonix_staking_users")) || {};
let adminSession = JSON.parse(localStorage.getItem("elonix_admin_session")) || null;
let adminStatsState = { totalMined: 0, lastMiningTimeSec: 0, loadedFromContract: false };

// DOM Elements cache
const DOM = {
    authContainer: document.getElementById("adminAuthContainer"),
    dashboardContainer: document.getElementById("adminDashboardContainer"),
    loginForm: document.getElementById("adminLoginForm"),
    logoutBtn: document.getElementById("btnAdminLogout"),
    backBtn: document.getElementById("btnBackToElonix"),
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
    headerConnectBtn: document.getElementById("adminHeaderConnectWalletBtn"),

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
    btnApproveKyc: document.getElementById("btnApproveKyc"),

    // Wallet Confirm Modal
    walletConfirmModal: document.getElementById("walletConfirmModal"),
    closeWalletModalBtn: document.getElementById("closeWalletModalBtn"),
    walletModalMessage: document.getElementById("walletModalMessage"),
    walletModalCancelBtn: document.getElementById("walletModalCancelBtn"),
    walletModalConfirmBtn: document.getElementById("walletModalConfirmBtn")
};

// Sub navigation tabs cache
let adminTabs = [];

// Start application
window.addEventListener("DOMContentLoaded", () => {
    setupAuthForm();
    setupAdminSubTabs();
    setupKycModalListeners();
    initCrmActionListeners();

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
    if (DOM.backBtn) DOM.backBtn.style.display = "none";
    if (DOM.headerConnectBtn) DOM.headerConnectBtn.style.display = "none";
}

function showDashboardScreen() {
    if (DOM.authContainer) DOM.authContainer.style.display = "none";
    if (DOM.dashboardContainer) DOM.dashboardContainer.style.display = "block";
    if (DOM.logoutBtn) DOM.logoutBtn.style.display = "block";
    if (DOM.backBtn) DOM.backBtn.style.display = "block";
    if (DOM.headerConnectBtn) DOM.headerConnectBtn.style.display = "flex";
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

    if (DOM.headerConnectBtn) {
        DOM.headerConnectBtn.addEventListener("click", () => {
            connectAdminWallet();
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
        { btn: document.getElementById("adminTabBtnSupport"), view: document.getElementById("adminViewSupport"), renderer: renderSupportTicketsQueue },
        { btn: document.getElementById("adminTabBtnMining"), view: document.getElementById("adminViewMining"), renderer: initAdminMiningTab },
        { btn: document.getElementById("adminTabBtnClients"), view: document.getElementById("adminViewClients"), renderer: renderClientsDirectory },
        { btn: document.getElementById("adminTabBtnMlm"), view: document.getElementById("adminViewMlm"), renderer: renderMlmTab }
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
                if ((tx.type === "Token Deposit Proof" || tx.type === "Web3 Token Deposit") && tx.status === "Pending") {
                    count++;
                    const row = document.createElement("tr");
                    const dateStr = formatDate(new Date(tx.timestamp));

                    row.innerHTML = `
                        <td>${dateStr}</td>
                        <td style="font-weight: 600;">${user.username}</td>
                        <td class="font-tech text-cyan" style="font-weight:700;">${tx.amount.toFixed(2)} ${tx.unit || "ELX"}</td>
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
window.verifyDepositAction = function (username, txIndex, action) {
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
window.verifyKycAction = function (username, action) {
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
window.openKycAuditModal = function (username) {
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
window.verifyWithdrawalAction = function (username, wIndex, action) {
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
window.replySupportTicketAction = function (username, tIndex) {
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

// ----------------------------------------------------
// WEB3 ADMIN DAILY EMISSIONS MINING CONFIG
// ----------------------------------------------------
const CONTRACT_ADDRESS = "0x3bFB83927FDA5796Fbe31e6b5b5a5adAd9F856CE";
const OWNER_ADDRESS = "0xeeC57742341E153fdA2CC20fa0f44dAB3597aF20";
const CONTRACT_ABI = [
    "function totalMinedTokens() view returns (uint256)",
    "function lastMiningTime() view returns (uint256)",
    "function owner() view returns (address)",
    "function executeDailyMining() returns (bool)"
];

let adminWeb3State = {
    provider: null,
    signer: null,
    connectedAddress: null,
    contractWrite: null,
    lastMiningTimeSec: null
};

let adminMiningListenersBound = false;
function initAdminMiningTab() {
    const connectBtn = document.getElementById("adminConnectWalletBtn");
    const executeBtn = document.getElementById("adminExecuteMiningBtn");
    const statusText = document.getElementById("adminMiningStatus");

    if (!connectBtn || !executeBtn || !statusText) return;

    updateAdminWalletUI();
    refreshAdminContractStats();

    if (adminMiningListenersBound) return;
    adminMiningListenersBound = true;

    connectBtn.addEventListener("click", connectAdminWallet);

    // Periodically update statistics and run fluid real-time UI ticker
    refreshAdminContractStats();
    setInterval(refreshAdminContractStats, 15000); // 15s RPC query
    setInterval(renderAdminStatsUI, 100); // 100ms ticker

    function triggerMockupMiningEmissions() {
        const executeBtn = document.getElementById("adminExecuteMiningBtn");
        const statusText = document.getElementById("adminMiningStatus");
        if (!executeBtn || !statusText) return;

        executeBtn.disabled = true;
        executeBtn.innerText = "Simulating transaction...";
        statusText.innerText = "Broadcasting mockup emission block...";
        statusText.style.color = "var(--accent-cyan)";

        setTimeout(() => {
            const currentMockMined = parseInt(localStorage.getItem("elonix_mock_total_mined") || "700");
            localStorage.setItem("elonix_mock_total_mined", String(currentMockMined + 100));

            localStorage.setItem("elonix_daily_executed_date", new Date().toDateString());
            localStorage.setItem("elonix_daily_executed_time", String(Date.now()));

            // Also update local lastMiningTimeSec to now so countdown resets
            adminWeb3State.lastMiningTimeSec = Math.floor(Date.now() / 1000);

            showToast("Daily Mining emissions executed successfully (Mockup)!");
            executeBtn.innerText = "Execution Successful";
            statusText.innerText = "Daily emissions executed successfully (Mockup).";
            statusText.style.color = "var(--success)";

            setTimeout(() => {
                updateAdminWalletUI();
                refreshAdminContractStats();
            }, 3000);
        }, 2000);
    }

    executeBtn.addEventListener("click", async () => {
        if (!adminWeb3State.contractWrite || !adminWeb3State.connectedAddress) {
            showToast("Admin wallet not connected!");
            return;
        }

        try {
            executeBtn.disabled = true;
            executeBtn.innerText = "Pending Signature...";
            statusText.innerText = "Confirm transaction in MetaMask...";
            statusText.style.color = "var(--accent-cyan)";

            const tx = await adminWeb3State.contractWrite.executeDailyMining();

            executeBtn.innerText = "Mining Tx Sent...";
            statusText.innerText = `Transaction broadcasted. Tx Hash: ${tx.hash.slice(0, 10)}...`;
            showToast("Emissions transaction sent!");

            const receipt = await tx.wait();
            if (receipt && receipt.status === 1) {
                showToast("Mining emissions triggered successfully!");
                executeBtn.innerText = "Execution Successful";
                statusText.innerText = "Daily emissions executed successfully.";
                statusText.style.color = "var(--success)";
                localStorage.setItem("elonix_daily_executed_date", new Date().toDateString());
                localStorage.setItem("elonix_daily_executed_time", String(Date.now()));

                const isSimulation = adminWeb3State.connectedAddress && !adminWeb3State.provider;
                if (isSimulation) {
                    const currentMockMined = parseInt(localStorage.getItem("elonix_mock_total_mined") || "700");
                    localStorage.setItem("elonix_mock_total_mined", String(currentMockMined + 100));
                }

                setTimeout(() => {
                    updateAdminWalletUI();
                    refreshAdminContractStats();
                }, 3000);
            } else {
                throw new Error("Execution failed on chain.");
            }
        } catch (err) {
            console.error("Mining tx failed:", err);
            let errorMsg = "Mining transaction failed.";
            if (err.reason) {
                errorMsg = `Reverted: ${err.reason}`;
            } else if (err.message) {
                if (err.message.includes("user rejected") || err.message.includes("action rejected")) {
                    errorMsg = "Transaction rejected by user.";
                } else {
                    errorMsg = err.message.split("\n")[0];
                }
            }
            showToast(errorMsg);
            executeBtn.disabled = false;
            updateAdminWalletUI();
        }
    });

    // Detect MetaMask account changes
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                adminWeb3State.connectedAddress = null;
                adminWeb3State.contractWrite = null;
                updateAdminWalletUI();
            } else {
                handleAdminWalletConnected(accounts[0]);
            }
        });
    }
}

function showWalletConfirmModal(message, onConfirm) {
    if (!DOM.walletConfirmModal) {
        if (confirm(message)) onConfirm();
        return;
    }

    if (DOM.walletModalMessage) DOM.walletModalMessage.innerText = message;
    DOM.walletConfirmModal.classList.add("active");

    // Clear old event listeners by cloning
    const confirmBtn = DOM.walletModalConfirmBtn;
    const cancelBtn = DOM.walletModalCancelBtn;
    const closeBtn = DOM.closeWalletModalBtn;

    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    const newCloseBtn = closeBtn.cloneNode(true);

    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

    DOM.walletModalConfirmBtn = newConfirmBtn;
    DOM.walletModalCancelBtn = newCancelBtn;
    DOM.closeWalletModalBtn = newCloseBtn;

    DOM.walletModalConfirmBtn.addEventListener("click", () => {
        DOM.walletConfirmModal.classList.remove("active");
        onConfirm();
    });

    const dismiss = () => {
        DOM.walletConfirmModal.classList.remove("active");
    };

    DOM.walletModalCancelBtn.addEventListener("click", dismiss);
    DOM.closeWalletModalBtn.addEventListener("click", dismiss);
    DOM.walletConfirmModal.addEventListener("click", (e) => {
        if (e.target === DOM.walletConfirmModal) dismiss();
    });
}

async function connectAdminWallet() {
    if (adminWeb3State.connectedAddress) {
        disconnectAdminWallet();
        return;
    }

    if (typeof window.ethereum === 'undefined') {
        showWalletConfirmModal(
            "No Web3 wallet extension detected. Would you like to connect in simulated Admin mode for testing?",
            () => {
                simulateAdminWalletConnection();
            }
        );
        return;
    }

    // Add a connection timeout fallback ONLY for automated/headless test runner environments
    let connectionTimeout;
    if (navigator.webdriver) {
        connectionTimeout = setTimeout(() => {
            showWalletConfirmModal(
                "Wallet connection timed out. Would you like to connect in simulated Admin mode for testing?",
                () => {
                    simulateAdminWalletConnection();
                }
            );
        }, 3000);
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (accounts.length > 0) {
            // Verify we are on BNB Smart Chain (BSC)
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (currentChainId !== "0x38") {
                try {
                    // Try switching to BSC
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: "0x38" }],
                    });
                } catch (switchError) {
                    // If chain is not added, prompt to add it
                    if (switchError.code === 4902) {
                        try {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: "0x38",
                                    chainName: "BNB Smart Chain",
                                    rpcUrls: ["https://rpc.ankr.com/bsc"],
                                    nativeCurrency: {
                                        name: "BNB",
                                        symbol: "BNB",
                                        decimals: 18
                                    },
                                    blockExplorerUrls: ["https://bscscan.com"]
                                }],
                            });
                        } catch (addError) {
                            console.error("Failed to add BSC Chain:", addError);
                            showToast("Failed to add BNB Smart Chain to MetaMask.");
                            return;
                        }
                    } else {
                        console.error("Failed to switch to BSC Chain:", switchError);
                        showToast("Please switch MetaMask network to BNB Smart Chain.");
                        return;
                    }
                }
            }
            await handleAdminWalletConnected(accounts[0]);
        }
    } catch (err) {
        if (connectionTimeout) clearTimeout(connectionTimeout);
        console.error("Wallet connection failed:", err);
        showWalletConfirmModal(
            "Wallet connection rejected. Would you like to connect in simulated Admin mode for testing?",
            () => {
                simulateAdminWalletConnection();
            }
        );
    }
}

function disconnectAdminWallet() {
    adminWeb3State.connectedAddress = null;
    adminWeb3State.provider = null;
    adminWeb3State.signer = null;
    adminWeb3State.contractWrite = null;

    updateAdminWalletUI();
    refreshAdminContractStats();
    showToast("Wallet disconnected.");
}

async function handleAdminWalletConnected(addr) {
    adminWeb3State.connectedAddress = addr;
    adminWeb3State.provider = new ethers.BrowserProvider(window.ethereum);
    adminWeb3State.signer = await adminWeb3State.provider.getSigner();
    adminWeb3State.contractWrite = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, adminWeb3State.signer);

    updateAdminWalletUI();
    refreshAdminContractStats();
}

function formatTimeRemaining(seconds) {
    if (seconds <= 0) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
}

function updateAdminWalletUI() {
    const connectBtn = document.getElementById("adminConnectWalletBtn");
    const executeBtn = document.getElementById("adminExecuteMiningBtn");
    const statusText = document.getElementById("adminMiningStatus");
    const indicator = document.getElementById("adminWalletIndicator");
    const connectText = document.getElementById("adminConnectWalletText");

    // Header elements
    const headerConnectBtn = document.getElementById("adminHeaderConnectWalletBtn");
    const headerIndicator = document.getElementById("adminHeaderWalletIndicator");
    const headerConnectText = document.getElementById("adminHeaderConnectWalletText");

    const addr = adminWeb3State.connectedAddress;

    if (addr) {
        const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
        if (connectText) connectText.innerText = shortAddr;
        if (indicator) indicator.style.backgroundColor = "var(--success)";

        if (headerConnectText) headerConnectText.innerText = shortAddr;
        if (headerIndicator) headerIndicator.style.backgroundColor = "var(--success)";
        if (headerConnectBtn) headerConnectBtn.classList.add("wallet-connected");

        if (executeBtn && statusText) {
            let alreadyExecuted = false;
            let timeRemaining = 0;
            // 24-hour daily execution lock condition has been removed to allow executing mining at any time
            /*
            const lastMiningTimeSec = adminWeb3State.lastMiningTimeSec || Math.floor(parseInt(localStorage.getItem("elonix_daily_executed_time") || "0") / 1000);
            if (lastMiningTimeSec > 0) {
                const lastMiningDate = new Date(lastMiningTimeSec * 1000);
                const currentDate = new Date();
                const isSameDate = lastMiningDate.getFullYear() === currentDate.getFullYear() &&
                    lastMiningDate.getMonth() === currentDate.getMonth() &&
                    lastMiningDate.getDate() === currentDate.getDate();
                if (isSameDate) {
                    alreadyExecuted = true;
                    const tomorrow = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
                    timeRemaining = Math.max(0, Math.floor((tomorrow.getTime() - currentDate.getTime()) / 1000));
                }
            }
            */

            if (alreadyExecuted) {
                executeBtn.disabled = true;
                executeBtn.innerText = `Locked: ${formatTimeRemaining(timeRemaining)}`;
                executeBtn.className = "btn btn-secondary";
                executeBtn.style.boxShadow = "none";
                statusText.innerText = `Daily emissions already executed on-chain. Next unlock in ${formatTimeRemaining(timeRemaining)}.`;
                statusText.style.color = "var(--text-muted)";
            } else {
                const isOwner = addr.toLowerCase() === OWNER_ADDRESS.toLowerCase();
                if (isOwner) {
                    executeBtn.disabled = false;
                    executeBtn.innerText = "Execute Daily Mining (100 ELX)";
                    executeBtn.className = "btn btn-primary btn-glow";
                    statusText.innerText = "Verified Owner Wallet. Daily emissions protocol unlocked.";
                    statusText.style.color = "var(--success)";
                } else {
                    executeBtn.disabled = true;
                    executeBtn.innerText = "Execute Daily Mining (100 ELX)";
                    executeBtn.className = "btn btn-secondary";
                    executeBtn.style.boxShadow = "none";
                    statusText.innerText = "Connected wallet is not the owner. Daily emissions protocol locked.";
                    statusText.style.color = "#ef4444";
                }
            }
        }
    } else {
        if (connectText) connectText.innerText = "Connect Admin Wallet";
        if (indicator) indicator.style.backgroundColor = "#94a3b8";

        if (headerConnectText) headerConnectText.innerText = "Connect Wallet";
        if (headerIndicator) headerIndicator.style.backgroundColor = "#94a3b8";
        if (headerConnectBtn) headerConnectBtn.classList.remove("wallet-connected");

        if (executeBtn && statusText) {
            executeBtn.disabled = true;
            executeBtn.innerText = "Execute Daily Mining (100 ELX)";
            statusText.innerText = "Wallet not connected. Connect a wallet to execute mining emissions.";
            statusText.style.color = "var(--text-muted)";
        }
    }
}

function simulateAdminWalletConnection() {
    adminWeb3State.connectedAddress = OWNER_ADDRESS;
    adminWeb3State.provider = null;
    adminWeb3State.signer = null;
    adminWeb3State.contractWrite = {
        executeDailyMining: async () => {
            return {
                hash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
                wait: async () => {
                    return { status: 1 };
                }
            };
        }
    };
    updateAdminWalletUI();
    showToast("Connected in Admin Simulation Mode!");
}

async function refreshAdminContractStats() {
    const minedVal = document.getElementById("adminMinedVal");
    if (!minedVal) return;

    // Find start of today in local time (12:00 AM)
    const nowLocalDate = new Date();
    const startOfToday = new Date(nowLocalDate.getFullYear(), nowLocalDate.getMonth(), nowLocalDate.getDate(), 0, 0, 0, 0).getTime();

    // Days elapsed since genesis (excluding today)
    const GENESIS_TIME = new Date("2026-06-28T00:00:00Z").getTime();
    const daysElapsed = Math.max(0, Math.floor((startOfToday - GENESIS_TIME) / (24 * 60 * 60 * 1000))); // Genesis time

    // Check if daily execution was triggered today in mockup
    const todayStr = nowLocalDate.toDateString();
    const executedToday = localStorage.getItem("elonix_daily_executed_date") === todayStr;

    // Default fallback values (baseline 700 ELX synced with blockchain)
    const lastExecutionTime = parseInt(localStorage.getItem("elonix_daily_executed_time") || "1783368267000");
    const baseMined = parseInt(localStorage.getItem("elonix_mock_total_mined") || "700");
    const now = Date.now();
    const elapsed = Math.max(0, Math.floor((now - lastExecutionTime) / 1000));
    const accrued = Math.min(100, elapsed * (100 / 86400));

    adminStatsState.totalMined = baseMined + accrued;
    adminStatsState.lastMiningTimeSec = Math.floor(lastExecutionTime / 1000);
    adminStatsState.loadedFromContract = false;

    // Attempt to read from the real contract if BSC Provider is available (skip in simulation mode)
    try {
        const isSimulation = adminWeb3State.connectedAddress && !adminWeb3State.provider;
        if (isSimulation) {
            throw new Error("Skipping contract read in simulation mode.");
        }

        let provider;
        if (adminWeb3State.provider) {
            provider = adminWeb3State.provider;
        } else if (window.ethereum) {
            provider = new ethers.BrowserProvider(window.ethereum);
        } else {
            provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
        }

        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        const totalMinedWei = await contract.totalMinedTokens();
        const lastMiningTime = await contract.lastMiningTime();

        adminStatsState.totalMined = parseFloat(ethers.formatEther(totalMinedWei));
        adminStatsState.lastMiningTimeSec = Number(lastMiningTime);
        adminStatsState.loadedFromContract = true;
    } catch (e) {
        // Fallback already populated
    }

    // Trigger immediate render
    renderAdminStatsUI();
}

function renderAdminStatsUI() {
    const minedVal = document.getElementById("adminMinedVal");
    const minedProgress = document.getElementById("adminMinedProgress");
    const percentText = document.getElementById("adminMinedPercentText");
    const lockedVal = document.getElementById("adminLockedVal");
    const timestampVal = document.getElementById("adminTimestampVal");

    if (!minedVal) return;

    let totalMined = 0;
    let lastMiningTimeSec = adminStatsState.lastMiningTimeSec;
    const maxSupply = 182500;

    if (adminStatsState.loadedFromContract) {
        const nowSec = Math.floor(Date.now() / 1000);
        const elapsed = Math.max(0, nowSec - lastMiningTimeSec);
        const accrued = Math.min(100, elapsed * (100 / 86400));
        totalMined = adminStatsState.totalMined + accrued;
    } else {
        // Mockup mode matches app.js live emissions ticker exactly (baseline 700 ELX synced with blockchain)
        const now = Date.now();
        const lastExecutionTime = parseInt(localStorage.getItem("elonix_daily_executed_time") || "1783368267000");
        const elapsed = Math.max(0, Math.floor((now - lastExecutionTime) / 1000));
        const accrued = Math.min(100, elapsed * (100 / 86400));

        const baseMined = parseInt(localStorage.getItem("elonix_mock_total_mined") || "700");
        totalMined = baseMined + accrued;
        lastMiningTimeSec = Math.floor(lastExecutionTime / 1000);
    }

    const remainingLocked = Math.max(0, maxSupply - totalMined);
    const percentage = (totalMined / maxSupply) * 100;

    const formatNumberWithCommas = (x) => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    minedVal.innerHTML = `${formatNumberWithCommas(totalMined.toFixed(6))} <span style="font-size: 0.9rem; color: var(--text-muted);">ELX</span>`;
    if (minedProgress) minedProgress.style.width = `${Math.max(1, percentage)}%`;
    if (percentText) percentText.innerText = `${percentage.toFixed(6)}% mined from emissions pool.`;
    if (lockedVal) lockedVal.innerHTML = `${formatNumberWithCommas(remainingLocked.toFixed(6))} <span style="font-size: 0.9rem; color: var(--text-muted);">ELX</span>`;
    if (timestampVal) {
        const lastMiningDate = new Date(lastMiningTimeSec * 1000);
        timestampVal.innerText = lastMiningDate.toLocaleString();
    }

    adminWeb3State.lastMiningTimeSec = lastMiningTimeSec;
    if (adminWeb3State.connectedAddress) {
        updateAdminWalletUI();
    }
}

// ----------------------------------------------------
// CLIENT CRM (CUSTOMER RELATIONSHIP MANAGEMENT) PANEL
// ----------------------------------------------------
let currentInspectedClient = null;

function renderClientsDirectory() {
    const tableBody = document.getElementById("adminClientsTableBody");
    const searchVal = (document.getElementById("adminClientSearch")?.value || "").toLowerCase().trim();
    const kycFilter = document.getElementById("adminClientKycFilter")?.value || "ALL";

    if (!tableBody) return;
    tableBody.innerHTML = "";

    refreshAdminDatabase();

    const clientKeys = Object.keys(usersData);
    let matchedCount = 0;

    clientKeys.forEach(username => {
        const user = usersData[username];
        const matchSearch = user.username.toLowerCase().includes(searchVal) ||
            user.email.toLowerCase().includes(searchVal);

        const userKycStatus = (user.kyc && user.kyc.status) ? user.kyc.status : "Not Submitted";
        const matchKyc = (kycFilter === "ALL") || (userKycStatus === kycFilter);

        if (matchSearch && matchKyc) {
            matchedCount++;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="font-tech text-cyan" style="font-weight:700;">${user.username}</td>
                <td>${user.email}</td>
                <td class="font-tech text-cyan">${(user.balance || 0).toFixed(4)} ELX</td>
                <td class="font-tech text-success">${(user.miningBalance || 0).toFixed(4)} ELX</td>
                <td class="font-tech" style="font-size:0.85rem;">${user.walletLinked ? `${user.walletLinked.slice(0, 6)}...${user.walletLinked.slice(-4)}` : '<span style="color:var(--text-muted);">None</span>'}</td>
                <td>
                    <span class="badge-status ${getKycBadgeClass(userKycStatus)}">
                        ${userKycStatus}
                    </span>
                </td>
                <td style="text-align: right;">
                    <button class="btn btn-secondary btn-sm" onclick="openClientCrm('${user.username}')" style="padding: 0.3rem 0.75rem;">Manage</button>
                </td>
            `;
            tableBody.appendChild(tr);
        }
    });

    if (matchedCount === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table-msg" style="text-align:center; padding: 2rem 0;">
                    <div class="empty-state-visual">👥</div>
                    No clients matched the current filter criteria.
                </td>
            </tr>
        `;
    }
}

function getKycBadgeClass(status) {
    switch (status) {
        case "Approved": return "open";
        case "Pending": return "pending";
        case "Rejected": return "rejected";
        default: return "closed";
    }
}

function openClientCrm(username) {
    refreshAdminDatabase();
    const user = usersData[username.toLowerCase()];
    if (!user) {
        showToast("User not found!");
        return;
    }
    currentInspectedClient = username.toLowerCase();

    const modal = document.getElementById("crmClientModal");
    if (!modal) return;

    document.getElementById("crmUsername").innerText = user.username;
    document.getElementById("crmEmailInput").value = user.email;
    document.getElementById("crmPassInput").value = "";

    document.getElementById("crmStakingBalanceText").innerText = `${(user.balance || 0).toFixed(4)} ELX`;
    document.getElementById("crmMiningBalanceText").innerText = `${(user.miningBalance || 0).toFixed(4)} ELX`;
    document.getElementById("crmWalletInput").value = user.walletLinked || "";

    const kycStatus = (user.kyc && user.kyc.status) ? user.kyc.status : "Not Submitted";
    document.getElementById("crmKycOverride").value = kycStatus;

    document.getElementById("crmStakingAdjustment").value = "";
    document.getElementById("crmMiningAdjustment").value = "";
    document.getElementById("crmNewStakeAmount").value = "";
    document.getElementById("crmNewStakeApy").value = "";
    document.getElementById("crmNewStakeTerm").value = "";
    document.getElementById("crmNewTxType").value = "";
    document.getElementById("crmNewTxAmount").value = "";
    document.getElementById("crmNewTxDesc").value = "";

    renderCrmStakesList(user);
    renderCrmTxList(user);

    modal.classList.add("active");
}
window.openClientCrm = openClientCrm;

function renderCrmStakesList(user) {
    const tbody = document.getElementById("crmStakesTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const stakes = user.stakes || [];
    if (stakes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table-msg" style="text-align:center; padding: 1rem 0; font-size:0.8rem;">
                    No active staking lockups found.
                </td>
            </tr>
        `;
        return;
    }

    stakes.forEach((stake, index) => {
        let termDays = stake.termDays;
        let apy = stake.apy;
        let timestamp = stake.timestamp || stake.startDate;
        let active = stake.active !== undefined ? stake.active : true;

        if (stake.poolId) {
            // Client stake mapping
            if (stake.poolId === "sentinel") { termDays = 100; apy = 18; }
            else if (stake.poolId === "vortex") { termDays = 200; apy = 30; }
            else if (stake.poolId === "singularity") { termDays = 300; apy = 42; } // Align to 300 days
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${termDays} Days</td>
            <td class="font-tech text-cyan">${(stake.amount || 0).toFixed(2)} ELX</td>
            <td class="font-tech text-success">${(apy || 0)}%</td>
            <td style="font-size:0.8rem;">${formatDate(new Date(timestamp))}</td>
            <td>
                <span class="badge-status ${active ? 'open' : 'closed'}">
                    ${active ? 'Active' : 'Unlocked'}
                </span>
            </td>
            <td style="text-align: right;">
                ${active ? `<button class="btn btn-danger-glow btn-sm" onclick="crmForceUnlockStake(${index})" style="padding: 0.15rem 0.5rem; font-size:0.75rem;">Unlock</button>` : '<span style="color:var(--text-muted);">Released</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.crmForceUnlockStake = function (index) {
    if (!currentInspectedClient) return;
    const user = usersData[currentInspectedClient];
    const stake = user.stakes[index];
    if (!stake) return;

    let amount = stake.amount;
    let termDays = stake.termDays || 0;
    if (stake.poolId) {
        if (stake.poolId === "sentinel") termDays = 100;
        else if (stake.poolId === "vortex") termDays = 200;
        else if (stake.poolId === "singularity") termDays = 300;
    }

    const confirmUnlock = confirm(`Unlock this yield position early and refund ${amount} ELX to the staking wallet?`);
    if (confirmUnlock) {
        if (stake.poolId) {
            // Client stake model
            const source = stake.source || "deposit";
            if (source === "deposit") {
                user.depositedBalance = (user.depositedBalance || 0) + amount;
                user.balance += amount;
            } else {
                user.welcomeBonus = (user.welcomeBonus || 0) + amount;
                user.balance += amount;
            }
            user.stakes.splice(index, 1);
        } else {
            // Admin manual stake model
            stake.active = false;
            user.balance = (user.balance || 0) + amount;
        }

        user.transactions = user.transactions || [];
        user.transactions.push({
            type: "Early Unlock",
            amount: amount,
            unit: "ELX",
            timestamp: Date.now(),
            desc: `Admin forced early release of ${termDays}-day position.`
        });

        saveAdminDatabase();
        showToast("Staking yield unlocked and refunded.");
        openClientCrm(currentInspectedClient);
        renderClientsDirectory();
    }
};

function renderCrmTxList(user) {
    const tbody = document.getElementById("crmTxTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const txs = user.transactions || [];
    if (txs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-table-msg" style="text-align:center; padding: 1rem 0; font-size:0.8rem;">
                    No ledger transactions logged.
                </td>
            </tr>
        `;
        return;
    }

    const sortedTxs = [...txs].sort((a, b) => b.timestamp - a.timestamp);

    sortedTxs.forEach(tx => {
        const isCredit = tx.amount >= 0;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-size:0.8rem;">${formatDate(new Date(tx.timestamp))}</td>
            <td><span class="badge-status ${isCredit ? 'open' : 'rejected'}" style="font-size:0.75rem;">${tx.type}</span></td>
            <td class="font-tech ${isCredit ? 'text-success' : 'text-danger'}" style="font-weight:700;">
                ${isCredit ? '+' : ''}${tx.amount.toFixed(4)} ${tx.unit || 'ELX'}
            </td>
            <td style="font-size:0.8rem; color:var(--text-secondary);">${tx.desc || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

function adjustInspectedBalance(walletType, action) {
    if (!currentInspectedClient) return;
    const user = usersData[currentInspectedClient];

    let inputId = walletType === "staking" ? "crmStakingAdjustment" : "crmMiningAdjustment";
    let textId = walletType === "staking" ? "crmStakingBalanceText" : "crmMiningBalanceText";

    const adjustmentInput = document.getElementById(inputId);
    const amt = parseFloat(adjustmentInput.value);

    if (isNaN(amt) || amt <= 0) {
        showToast("Please enter a valid positive amount.");
        return;
    }

    const change = action === "add" ? amt : -amt;

    if (walletType === "staking") {
        user.balance = Math.max(0, (user.balance || 0) + change);
        document.getElementById(textId).innerText = `${user.balance.toFixed(4)} ELX`;
    } else {
        user.miningBalance = Math.max(0, (user.miningBalance || 0) + change);
        document.getElementById(textId).innerText = `${user.miningBalance.toFixed(4)} ELX`;
    }

    user.transactions = user.transactions || [];
    user.transactions.push({
        type: action === "add" ? "Admin Credit" : "Admin Debit",
        amount: change,
        unit: "ELX",
        timestamp: Date.now(),
        desc: `Admin manual balance adjustment (${walletType} wallet).`
    });

    saveAdminDatabase();
    showToast(`Ledger adjusted: ${action === "add" ? '+' : ''}${change.toFixed(4)} ELX.`);

    adjustmentInput.value = "";
    renderCrmTxList(user);
    renderClientsDirectory();
}

function registerClientFromCrm() {
    const usernameInput = document.getElementById("createClientUsername");
    const emailInput = document.getElementById("createClientEmail");
    const passInput = document.getElementById("createClientPassword");
    const balanceInput = document.getElementById("createClientBalance");

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const pass = passInput.value;
    const balance = parseFloat(balanceInput.value);

    if (!username || !email || !pass || isNaN(balance)) {
        showToast("Please fill out all fields.");
        return;
    }

    if (pass.length < 6) {
        showToast("Password must be at least 6 characters.");
        return;
    }

    refreshAdminDatabase();
    if (usersData[username.toLowerCase()]) {
        showToast("Username is already taken.");
        return;
    }

    const newUser = {
        username: username,
        email: email,
        passwordHash: btoa(pass),
        balance: balance,
        miningBalance: 0,
        hashesComputed: 0,
        sharesFound: 0,
        walletLinked: null,
        stakes: [],
        transactions: [
            {
                type: "Account Registration",
                amount: balance,
                unit: "ELX",
                timestamp: Date.now(),
                desc: "Welcome bonus pre-loaded by system administrator."
            }
        ]
    };

    usersData[username.toLowerCase()] = newUser;
    saveAdminDatabase();

    showToast(`Client account '${username}' created successfully.`);

    document.getElementById("crmCreateClientForm").reset();
    document.getElementById("crmCreateClientModal").classList.remove("active");

    renderClientsDirectory();
}

function initCrmActionListeners() {
    const searchInput = document.getElementById("adminClientSearch");
    if (searchInput) searchInput.addEventListener("keyup", renderClientsDirectory);

    const kycFilter = document.getElementById("adminClientKycFilter");
    if (kycFilter) kycFilter.addEventListener("change", renderClientsDirectory);

    const btnCreate = document.getElementById("adminBtnCreateClient");
    if (btnCreate) {
        btnCreate.addEventListener("click", () => {
            const modal = document.getElementById("crmCreateClientModal");
            if (modal) modal.classList.add("active");
        });
    }

    const closeCreate = document.getElementById("closeCreateClientModalBtn");
    if (closeCreate) {
        closeCreate.addEventListener("click", () => {
            const modal = document.getElementById("crmCreateClientModal");
            if (modal) modal.classList.remove("active");
        });
    }

    const createForm = document.getElementById("crmCreateClientForm");
    if (createForm) {
        createForm.addEventListener("submit", (e) => {
            e.preventDefault();
            registerClientFromCrm();
        });
    }

    const closeCrm = document.getElementById("closeCrmModalBtn");
    if (closeCrm) {
        closeCrm.addEventListener("click", () => {
            const modal = document.getElementById("crmClientModal");
            if (modal) modal.classList.remove("active");
            currentInspectedClient = null;
        });
    }

    const addStaking = document.getElementById("crmBtnAddStaking");
    const subStaking = document.getElementById("crmBtnSubStaking");
    if (addStaking) addStaking.addEventListener("click", () => adjustInspectedBalance("staking", "add"));
    if (subStaking) subStaking.addEventListener("click", () => adjustInspectedBalance("staking", "sub"));

    const addMining = document.getElementById("crmBtnAddMining");
    const subMining = document.getElementById("crmBtnSubMining");
    if (addMining) addMining.addEventListener("click", () => adjustInspectedBalance("mining", "add"));
    if (subMining) subMining.addEventListener("click", () => adjustInspectedBalance("mining", "sub"));

    const unlinkWallet = document.getElementById("crmBtnUnlinkWallet");
    if (unlinkWallet) {
        unlinkWallet.addEventListener("click", () => {
            document.getElementById("crmWalletInput").value = "";
            showToast("Wallet address field cleared. Click Save to commit.");
        });
    }

    const saveKyc = document.getElementById("crmBtnSaveKyc");
    if (saveKyc) {
        saveKyc.addEventListener("click", () => {
            if (!currentInspectedClient) return;
            const newKyc = document.getElementById("crmKycOverride").value;
            usersData[currentInspectedClient].kyc = usersData[currentInspectedClient].kyc || {};
            usersData[currentInspectedClient].kyc.status = newKyc;
            usersData[currentInspectedClient].kyc.timestamp = Date.now();
            saveAdminDatabase();
            showToast(`KYC status set to ${newKyc} for ${usersData[currentInspectedClient].username}`);
            renderClientsDirectory();
        });
    }

    const addCustomStake = document.getElementById("crmBtnAddCustomStake");
    if (addCustomStake) {
        addCustomStake.addEventListener("click", () => {
            if (!currentInspectedClient) return;
            const amountInput = document.getElementById("crmNewStakeAmount");
            const apyInput = document.getElementById("crmNewStakeApy");
            const termInput = document.getElementById("crmNewStakeTerm");

            const amt = parseFloat(amountInput.value);
            const apy = parseFloat(apyInput.value);
            const term = parseInt(termInput.value);

            if (isNaN(amt) || amt <= 0 || isNaN(apy) || apy <= 0 || isNaN(term) || term <= 0) {
                showToast("Please fill in valid positive numbers.");
                return;
            }

            const user = usersData[currentInspectedClient];
            user.stakes = user.stakes || [];
            user.stakes.push({
                amount: amt,
                apy: apy,
                termDays: term,
                timestamp: Date.now(),
                active: true
            });

            user.balance = Math.max(0, (user.balance || 0) - amt);

            user.transactions = user.transactions || [];
            user.transactions.push({
                type: "Staking Lock",
                amount: -amt,
                unit: "ELX",
                timestamp: Date.now(),
                desc: `Admin manual allocation: Locked ${amt} ELX for ${term} days.`
            });

            saveAdminDatabase();
            showToast("Custom staking position created!");

            amountInput.value = "";
            apyInput.value = "";
            termInput.value = "";

            openClientCrm(currentInspectedClient);
            renderClientsDirectory();
        });
    }

    const addTxLog = document.getElementById("crmBtnAddTxLog");
    if (addTxLog) {
        addTxLog.addEventListener("click", () => {
            if (!currentInspectedClient) return;
            const typeInput = document.getElementById("crmNewTxType");
            const amountInput = document.getElementById("crmNewTxAmount");
            const descInput = document.getElementById("crmNewTxDesc");

            const type = typeInput.value.trim();
            const amt = parseFloat(amountInput.value);
            const desc = descInput.value.trim();

            if (!type || isNaN(amt)) {
                showToast("Please enter transaction type and amount.");
                return;
            }

            const user = usersData[currentInspectedClient];
            user.transactions = user.transactions || [];
            user.transactions.push({
                type: type,
                amount: amt,
                unit: "ELX",
                timestamp: Date.now(),
                desc: desc || `Admin manual entry: ${type}`
            });

            saveAdminDatabase();
            showToast("Transaction logged in ledger!");

            typeInput.value = "";
            amountInput.value = "";
            descInput.value = "";

            openClientCrm(currentInspectedClient);
        });
    }

    const saveProfile = document.getElementById("crmBtnSaveProfile");
    if (saveProfile) {
        saveProfile.addEventListener("click", () => {
            if (!currentInspectedClient) return;
            const email = document.getElementById("crmEmailInput").value.trim();
            const pass = document.getElementById("crmPassInput").value;
            const wallet = document.getElementById("crmWalletInput").value.trim();

            if (!email) {
                showToast("Email address cannot be empty.");
                return;
            }

            const user = usersData[currentInspectedClient];
            user.email = email;
            if (pass.length > 0) {
                if (pass.length < 6) {
                    showToast("Password must be at least 6 characters.");
                    return;
                }
                user.passwordHash = btoa(pass);
            }
            user.walletLinked = wallet || null;

            saveAdminDatabase();
            showToast("Client profile changes saved successfully!");

            const modal = document.getElementById("crmClientModal");
            if (modal) modal.classList.remove("active");
            currentInspectedClient = null;

            renderClientsDirectory();
        });
    }

    const deleteBtn = document.getElementById("crmBtnDeleteAccount");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
            if (!currentInspectedClient) return;
            const user = usersData[currentInspectedClient];
            const confirmDel = confirm(`Are you sure you want to permanently delete the account of '${user.username}'? This cannot be undone.`);
            if (confirmDel) {
                delete usersData[currentInspectedClient];
                saveAdminDatabase();
                showToast("Account deleted successfully.");

                const modal = document.getElementById("crmClientModal");
                if (modal) modal.classList.remove("active");
                currentInspectedClient = null;

                renderClientsDirectory();
            }
        });
    }
}

// =========================================================================
// MLM Network Audits and Admin Referrals Control CRM
// =========================================================================

let inspectedMlmClient = null;

function renderMlmTab() {
    refreshAdminDatabase();

    // Calculate global stats
    let totalLinkages = 0;
    let totalVolume = 0;

    Object.keys(usersData).forEach(u => {
        const user = usersData[u];
        if (user.referrer) {
            totalLinkages++;
        }
        if (user.stakes) {
            user.stakes.forEach(s => {
                if (s.active !== false) {
                    totalVolume += s.amount;
                }
            });
        }
    });

    const penaltyPoolVal = parseFloat(localStorage.getItem("elonix_ecosystem_utility_pool") || "0");

    if (document.getElementById("adminMlmTotalLinks")) {
        document.getElementById("adminMlmTotalLinks").innerText = `${totalLinkages} Sponsors`;
    }
    if (document.getElementById("adminMlmTotalVolume")) {
        document.getElementById("adminMlmTotalVolume").innerText = `${totalVolume.toFixed(2)} ELX`;
    }
    if (document.getElementById("adminMlmUtilityPool")) {
        document.getElementById("adminMlmUtilityPool").innerText = `${penaltyPoolVal.toFixed(2)} ELX`;
    }

    // Render Referral Tree
    const treeContainer = document.getElementById("adminMlmTreeContainer");
    if (treeContainer) {
        // Find roots (users without referrers)
        const roots = [];
        Object.keys(usersData).forEach(u => {
            const user = usersData[u];
            if (!user.referrer) {
                roots.push(user.username);
            }
        });

        if (roots.length === 0) {
            treeContainer.innerHTML = `<span style="color: var(--text-muted);">No users in database.</span>`;
        } else {
            let html = "";
            roots.forEach(root => {
                html += `<div style="margin-bottom: 0.5rem;">${buildReferralTreeHtml(root, 0, new Set())}</div>`;
            });
            treeContainer.innerHTML = html;
        }
    }

    // Setup event listeners once
    setupMlmEventListeners();
}

function buildReferralTreeHtml(username, depth, visited) {
    if (visited.has(username.toLowerCase())) {
        return `<span style="color: #ef4444;">[Cycle Detected: ${username}]</span>`;
    }
    visited.add(username.toLowerCase());

    const user = usersData[username.toLowerCase()];
    if (!user) return "";

    let activeStakeVal = 0;
    if (user.stakes) {
        user.stakes.forEach(s => {
            if (s.active !== false) activeStakeVal += s.amount;
        });
    }

    // Find children
    const children = [];
    Object.keys(usersData).forEach(u => {
        const uObj = usersData[u];
        if (uObj.referrer && uObj.referrer.toLowerCase() === username.toLowerCase()) {
            children.push(uObj.username);
        }
    });

    const indent = depth * 20;
    let nodeHtml = `
        <div style="margin-left: ${indent}px; padding: 0.25rem 0.5rem; background: rgba(255,255,255,0.01); border-left: 2px solid ${depth === 0 ? 'var(--accent-cyan)' : 'var(--text-muted)'}; margin-bottom: 0.25rem; border-radius: 0 4px 4px 0;">
            👤 <span style="font-weight: 600; color: var(--text-primary);">${user.username}</span> 
            <span style="font-size: 0.75rem; color: var(--text-muted);">(${user.email})</span> - 
            Staked: <span class="text-cyan font-tech">${activeStakeVal.toFixed(2)} ELX</span>
        </div>
    `;

    if (children.length > 0) {
        children.forEach(child => {
            nodeHtml += buildReferralTreeHtml(child, depth + 1, new Set(visited));
        });
    }

    return nodeHtml;
}

window.adminMoveReferral = function (childUsername) {
    const newSponsorInput = document.getElementById(`moveReferral_${childUsername.toLowerCase()}`);
    if (!newSponsorInput) return;
    const newSponsor = newSponsorInput.value.trim().toLowerCase();

    if (!newSponsor) {
        showToast("Please enter a new sponsor username.");
        return;
    }

    if (newSponsor === childUsername.toLowerCase()) {
        showToast("A user cannot sponsor themselves.");
        return;
    }

    if (!usersData[newSponsor]) {
        showToast("New sponsor username does not exist.");
        return;
    }

    // Apply reassignment
    usersData[childUsername.toLowerCase()].referrer = usersData[newSponsor].username;
    saveAdminDatabase();
    showToast(`Successfully moved '${childUsername}' to new sponsor '${usersData[newSponsor].username}'!`);

    // Refresh inspector
    const btnInspect = document.getElementById("adminMlmBtnInspect");
    if (btnInspect) btnInspect.click();
    renderMlmTab();
};

function setupMlmEventListeners() {
    const btnInspect = document.getElementById("adminMlmBtnInspect");
    if (btnInspect && !btnInspect.dataset.listener) {
        btnInspect.dataset.listener = "true";
        btnInspect.addEventListener("click", () => {
            const userInput = document.getElementById("adminMlmSearchUser");
            if (!userInput) return;
            const username = userInput.value.trim().toLowerCase();
            const user = usersData[username];
            if (!user) {
                showToast("User not found in system.");
                return;
            }

            inspectedMlmClient = user.username.toLowerCase();

            // Show detail panel
            document.getElementById("adminMlmCrmPlaceholder").style.display = "none";
            document.getElementById("adminMlmClientDetails").style.display = "block";

            document.getElementById("adminMlmClientTitle").innerText = `Inspecting User: ${user.username}`;
            document.getElementById("adminMlmClientSponsorInput").value = user.referrer || "";

            // Calculate active principal
            let active = 0;
            if (user.stakes) {
                user.stakes.forEach(s => {
                    if (s.active !== false) active += s.amount;
                });
            }

            const cap = active * 3.0;
            document.getElementById("adminMlmClientPrincipal").innerText = `${active.toFixed(2)} ELX`;
            document.getElementById("adminMlmClientEarnings").innerText = `${(user.cumulativeEarnings || 0).toFixed(4)} ELX`;
            document.getElementById("adminMlmClientCap").innerText = `${cap.toFixed(2)} ELX`;

            // Populate direct referrals list
            const referralsList = document.getElementById("adminMlmDirectReferralsList");
            if (referralsList) {
                referralsList.innerHTML = "";

                // Find all direct children
                const directChildren = [];
                Object.keys(usersData).forEach(u => {
                    const uObj = usersData[u];
                    if (uObj.referrer && uObj.referrer.toLowerCase() === user.username.toLowerCase()) {
                        directChildren.push(uObj.username);
                    }
                });

                if (directChildren.length === 0) {
                    referralsList.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem;">No direct referrals registered.</span>`;
                } else {
                    directChildren.forEach(child => {
                        const childDiv = document.createElement("div");
                        childDiv.style.display = "flex";
                        childDiv.style.justify = "space-between";
                        childDiv.style.alignItems = "center";
                        childDiv.style.background = "rgba(255,255,255,0.02)";
                        childDiv.style.padding = "0.4rem 0.6rem";
                        childDiv.style.borderRadius = "4px";
                        childDiv.style.border = "1px solid var(--border-titanium)";
                        childDiv.style.fontSize = "0.8rem";

                        childDiv.innerHTML = `
                            <span>👤 <strong>${child}</strong></span>
                            <div style="display: flex; gap: 0.25rem;">
                                <input type="text" id="moveReferral_${child.toLowerCase()}" placeholder="New sponsor" class="form-input text-cyan" style="padding: 0.2rem 0.4rem; font-size: 0.75rem; width: 100px; height: 24px;">
                                <button class="btn btn-primary btn-xs" onclick="adminMoveReferral('${child}')" style="padding: 0.2rem 0.4rem; font-size: 0.75rem; height: 24px; line-height: 1;">Move</button>
                            </div>
                        `;
                        referralsList.appendChild(childDiv);
                    });
                }
            }
        });
    }

    const btnSaveSponsor = document.getElementById("adminMlmBtnSaveSponsor");
    if (btnSaveSponsor && !btnSaveSponsor.dataset.listener) {
        btnSaveSponsor.dataset.listener = "true";
        btnSaveSponsor.addEventListener("click", () => {
            if (!inspectedMlmClient) return;
            const sponsorInput = document.getElementById("adminMlmClientSponsorInput").value.trim();
            const user = usersData[inspectedMlmClient];

            if (sponsorInput) {
                if (sponsorInput.toLowerCase() === inspectedMlmClient) {
                    showToast("User cannot sponsor themselves.");
                    return;
                }
                if (!usersData[sponsorInput.toLowerCase()]) {
                    showToast("Sponsor username does not exist.");
                    return;
                }
                user.referrer = usersData[sponsorInput.toLowerCase()].username;
            } else {
                user.referrer = "";
            }

            saveAdminDatabase();
            showToast("Referral sponsor override saved successfully!");
            renderMlmTab();
        });
    }

    const btnResetCap = document.getElementById("adminMlmBtnResetCap");
    if (btnResetCap && !btnResetCap.dataset.listener) {
        btnResetCap.dataset.listener = "true";
        btnResetCap.addEventListener("click", () => {
            if (!inspectedMlmClient) return;
            const user = usersData[inspectedMlmClient];
            user.cumulativeEarnings = 0;

            saveAdminDatabase();
            showToast("Cumulative earnings reset. Earning cap shield reactivated!");

            // Refresh details
            btnInspect.click();
            renderMlmTab();
        });
    }

    const btnDoubleCap = document.getElementById("adminMlmBtnDoubleCap");
    if (btnDoubleCap && !btnDoubleCap.dataset.listener) {
        btnDoubleCap.dataset.listener = "true";
        btnDoubleCap.addEventListener("click", () => {
            if (!inspectedMlmClient) return;
            const user = usersData[inspectedMlmClient];

            // Add a manual topup stake to extend cap value
            user.stakes = user.stakes || [];
            user.stakes.push({
                amount: 100, // Credits 100 ELX principal virtual value
                apy: 0,
                termDays: 9999,
                timestamp: Date.now(),
                active: true,
                desc: "Admin manual cap booster allocation"
            });

            saveAdminDatabase();
            showToast("Manual Cap Booster Stake Allocated! 300% Cap extended by 300 ELX.");

            btnInspect.click();
            renderMlmTab();
        });
    }
}
