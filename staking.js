// ELONIX Staking Program & Client Panel Logic (Integrated with Web Miner)

// Contract & Public Stats configuration
const CONTRACT_ADDRESS = "0x3bFB83927FDA5796Fbe31e6b5b5a5adAd9F856CE";
const BSC_CHAIN_ID = "0x38";
const BSC_RPC_URL = "https://rpc.ankr.com/bsc";

// Staking Pools Configuration
const STAKING_POOLS = {
    sentinel: {
        id: "sentinel",
        name: "Sentinel Core (100d)",
        apy: 18.0,
        monthlyRate: 1.5,
        lockDays: 100,
        minStake: 10,
        badgeClass: "badge-sentinel",
        desc: "100-day validation lock. Monthly profit of 1.5% on deposited ELX plus 1.5% on mined/welcome bonus ELX."
    },
    vortex: {
        id: "vortex",
        name: "Vortex Node Proxy (200d)",
        apy: 30.0,
        monthlyRate: 2.5,
        lockDays: 200,
        minStake: 50,
        badgeClass: "badge-vortex",
        desc: "200-day validation lock. Monthly profit of 2.5% on deposited ELX plus 2.5% on mined/welcome bonus ELX."
    },
    singularity: {
        id: "singularity",
        name: "Singularity Matrix (300d)",
        apy: 42.0,
        monthlyRate: 3.5,
        lockDays: 300,
        minStake: 100,
        badgeClass: "badge-singularity",
        desc: "300-day validation lock. Monthly profit of 3.5% on deposited ELX plus 3.5% on mined/welcome bonus ELX."
    }
};

// Global State
let usersData = JSON.parse(localStorage.getItem("elonix_staking_users")) || {};

// Migration: Reset welcome bonus from 500 to 10 for demo/test accounts in user's browser localStorage
let migrationDone = false;
Object.keys(usersData).forEach(u => {
    const user = usersData[u];
    if (user.balance === 500 && (!user.stakes || user.stakes.length === 0)) {
        user.balance = 10;
        user.welcomeBonus = 10;
        if (user.transactions) {
            user.transactions.forEach(tx => {
                if (tx.type === "Account Registration" && tx.amount === 500) {
                    tx.amount = 10;
                }
            });
        }
        migrationDone = true;
    }
});
if (migrationDone) {
    localStorage.setItem("elonix_staking_users", JSON.stringify(usersData));
}

let activeSession = JSON.parse(localStorage.getItem("elonix_current_session")) || null;

let metamaskAddress = null;

// Ticker interval references
let liveRewardTicker = null;
let nodeStatsTimer = null;

// Web Miner Engine State (Attached to active session)
let minerState = {
    isMining: false,
    hashrate: 0,
    temp: 36.2,
    threads: 4,
    intensity: 50,
    lastTickTime: 0
};

// Web Miner interval timers
let miningTimer = null;
let statsTimer = null;
let loggerTimer = null;

// DOM Selectors
const UI = {
    authContainer: null,
    dashboardContainer: null,
    
    // Auth Forms
    loginTab: null,
    registerTab: null,
    loginForm: null,
    registerForm: null,
    authErrorMsg: null,
    
    // Header Panel
    clientUsername: null,
    clientWalletAddress: null,
    clientElxBalance: null,
    clientMiningBalance: null,
    btnLinkWallet: null,
    btnLogout: null,

    // Dashboard Tabs
    tabBtnStaking: null,
    tabBtnMiner: null,
    stakingHubView: null,
    webMinerView: null,
    
    // Staking Controls
    stakeAmountInput: null,
    poolSelect: null,
    stakeSourceSelect: null,
    stakeSlider: null,
    stakeSliderVal: null,
    btnStakeNow: null,
    
    // Dynamic Calculator Displays
    calcApy: null,
    calcLock: null,
    calcEstWeekly: null,
    calcEstMonthly: null,
    calcEstYearly: null,
    
    // Stats Cards
    statTotalStaked: null,
    statTotalRewards: null,
    statTvl: null,
    statApyAverage: null,
    
    // Tables & Logs
    activeStakesBody: null,
    noStakesRow: null,
    transactionHistoryList: null,

    // Web Miner DOM Elements
    minerStatusDot: null,
    minerStatusText: null,
    threadSlider: null,
    threadValDisplay: null,
    intensitySlider: null,
    intensityValDisplay: null,
    toggleMiningBtn: null,
    hashrateDisplay: null,
    tempDisplay: null,
    hashesDisplay: null,
    sharesDisplay: null,
    terminalOutput: null,

    // Miner Emissions Calculator
    calcRangeSlider: null,
    calcDaysVal: null,
    calcResultMined: null,
    calcResultPercentage: null,
    calcResultShares: null,
    
    // General Toast
    toast: null
};

// KYC Image Upload state
let kycFilesState = {
    idFront: "",
    idBack: ""
};

// Initialize KYC drop zones
function initKycUploadZones() {
    setupDropzone(
        "kycFrontDropZone",
        "kycIdFrontInput",
        "kycFrontPreviewContainer",
        "kycFrontPreviewImg",
        "btnRemoveFront",
        "idFront"
    );
    setupDropzone(
        "kycBackDropZone",
        "kycIdBackInput",
        "kycBackPreviewContainer",
        "kycBackPreviewImg",
        "btnRemoveBack",
        "idBack"
    );

    // Mock buttons logic for demo and easy testing without file pickers
    const btnMockFront = document.getElementById("btnMockFrontKyc");
    if (btnMockFront) {
        btnMockFront.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent opening native dialog
            const mockBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAL0lEQVR42u3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOBvNiwAAcyqjGgAAAAASUVORK5CYII=";
            const previewContainer = document.getElementById("kycFrontPreviewContainer");
            const previewImg = document.getElementById("kycFrontPreviewImg");
            if (previewContainer && previewImg) {
                previewImg.src = mockBase64;
                previewContainer.style.display = "block";
                kycFilesState.idFront = mockBase64;
                showToast("Mock Front ID loaded successfully.");
            }
        });
    }

    const btnMockBack = document.getElementById("btnMockBackKyc");
    if (btnMockBack) {
        btnMockBack.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent opening native dialog
            const mockBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAL0lEQVR42u3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOBvNiwAAcyqjGgAAAAASUVORK5CYII=";
            const previewContainer = document.getElementById("kycBackPreviewContainer");
            const previewImg = document.getElementById("kycBackPreviewImg");
            if (previewContainer && previewImg) {
                previewImg.src = mockBase64;
                previewContainer.style.display = "block";
                kycFilesState.idBack = mockBase64;
                showToast("Mock Selfie loaded successfully.");
            }
        });
    }
}

// Drag & drop file upload zone controller
function setupDropzone(dropZoneId, fileInputId, previewContainerId, previewImgId, removeBtnId, dataKey) {
    const dropZone = document.getElementById(dropZoneId);
    const fileInput = document.getElementById(fileInputId);
    const previewContainer = document.getElementById(previewContainerId);
    const previewImg = document.getElementById(previewImgId);
    const removeBtn = document.getElementById(removeBtnId);

    if (!dropZone || !fileInput) return;

    // Trigger click on file input
    dropZone.addEventListener("click", (e) => {
        if (e.target !== removeBtn && !removeBtn.contains(e.target)) {
            fileInput.click();
        }
    });

    // Dragover visual feedback
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "var(--accent-cyan)";
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.style.borderColor = "var(--border-titanium)";
    });

    // Drop handler
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "var(--border-titanium)";
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Input change handler
    fileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    });

    // Remove file handler
    removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.value = "";
        previewImg.src = "";
        previewContainer.style.display = "none";
        kycFilesState[dataKey] = "";
    });

    function handleFile(file) {
        if (!file.type.startsWith("image/")) {
            showToast("Only image files are supported.");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            previewContainer.style.display = "block";
            kycFilesState[dataKey] = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Initialize Application
window.addEventListener("DOMContentLoaded", () => {
    cacheDOMSelectors();
    setupAuthTabs();
    setupAuthSubmits();
    setupDashboardTabs();
    setupDashboardEventListeners();
    setupWebMinerEventListeners();
    initGlobalMetaMaskListeners();
    initMinerEmissionsCalculator();
    initKycUploadZones();

    // Check if session is already active
    if (activeSession && usersData[activeSession.username]) {
        loadDashboard(activeSession.username);
        
        // Auto routing to miner tab if URL hash is present
        if (window.location.hash === "#miner") {
            if (UI.tabBtnMiner) UI.tabBtnMiner.click();
        }
    } else {
        showAuthScreen();
        
        // Auto-fill referral field from URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get('ref');
        if (refParam) {
            const refInput = document.getElementById("regReferrer");
            if (refInput) {
                refInput.value = refParam.trim();
                if (UI.registerTab) UI.registerTab.click();
            }
        }
    }
    
    initTiltEffect();
    initPublicNodeTracker();
});

// Cache DOM Elements
function cacheDOMSelectors() {
    UI.authContainer = document.getElementById("authContainer");
    UI.dashboardContainer = document.getElementById("dashboardContainer");
    
    UI.loginTab = document.getElementById("loginTab");
    UI.registerTab = document.getElementById("registerTab");
    UI.loginForm = document.getElementById("loginForm");
    UI.registerForm = document.getElementById("registerForm");
    UI.authErrorMsg = document.getElementById("authErrorMsg");
    
    UI.clientUsername = document.getElementById("clientUsername");
    UI.clientWalletAddress = document.getElementById("clientWalletAddress");
    UI.clientElxBalance = document.getElementById("clientElxBalance");
    UI.clientMiningBalance = document.getElementById("clientMiningBalance");
    UI.btnLinkWallet = document.getElementById("btnLinkWallet");
    UI.btnLogout = document.getElementById("btnLogout");

    UI.tabBtnStaking = document.getElementById("tabBtnStaking");
    UI.tabBtnMiner = document.getElementById("tabBtnMiner");
    UI.tabBtnProfile = document.getElementById("tabBtnProfile");
    UI.tabBtnReferrals = document.getElementById("tabBtnReferrals");
    UI.tabBtnWithdraw = document.getElementById("tabBtnWithdraw");
    UI.tabBtnSupport = document.getElementById("tabBtnSupport");
    UI.stakingHubView = document.getElementById("stakingHubView");
    UI.webMinerView = document.getElementById("webMinerView");
    UI.profileKycView = document.getElementById("profileKycView");
    UI.referralsView = document.getElementById("referralsView");
    UI.withdrawView = document.getElementById("withdrawView");
    UI.supportView = document.getElementById("supportView");
    
    UI.stakeAmountInput = document.getElementById("stakeAmountInput");
    UI.poolSelect = document.getElementById("poolSelect");
    UI.stakeSourceSelect = document.getElementById("stakeSourceSelect");
    UI.stakeSlider = document.getElementById("stakeSlider");
    UI.stakeSliderVal = document.getElementById("stakeSliderVal");
    UI.btnStakeNow = document.getElementById("btnStakeNow");
    
    UI.calcApy = document.getElementById("calcApy");
    UI.calcLock = document.getElementById("calcLock");
    UI.calcEstWeekly = document.getElementById("calcEstWeekly");
    UI.calcEstMonthly = document.getElementById("calcEstMonthly");
    UI.calcEstYearly = document.getElementById("calcEstYearly");
    
    UI.statTotalStaked = document.getElementById("statTotalStaked");
    UI.statTotalRewards = document.getElementById("statTotalRewards");
    UI.statTvl = document.getElementById("statTvl");
    UI.statApyAverage = document.getElementById("statApyAverage");
    
    UI.activeStakesBody = document.getElementById("activeStakesBody");
    UI.noStakesRow = document.getElementById("noStakesRow");
    UI.transactionHistoryList = document.getElementById("transactionHistoryList");

    UI.minerStatusDot = document.getElementById("minerStatusDot");
    UI.minerStatusText = document.getElementById("minerStatusText");
    UI.threadSlider = document.getElementById("threadSlider");
    UI.threadValDisplay = document.getElementById("threadValDisplay");
    UI.intensitySlider = document.getElementById("intensitySlider");
    UI.intensityValDisplay = document.getElementById("intensityValDisplay");
    UI.toggleMiningBtn = document.getElementById("toggleMiningBtn");
    UI.hashrateDisplay = document.getElementById("hashrateDisplay");
    UI.tempDisplay = document.getElementById("tempDisplay");
    UI.hashesDisplay = document.getElementById("hashesDisplay");
    UI.sharesDisplay = document.getElementById("sharesDisplay");
    UI.terminalOutput = document.getElementById("terminalOutput");

    UI.calcRangeSlider = document.getElementById("calcRangeSlider");
    UI.calcDaysVal = document.getElementById("calcDaysVal");
    UI.calcResultMined = document.getElementById("calcResultMined");
    UI.calcResultPercentage = document.getElementById("calcResultPercentage");
    UI.calcResultShares = document.getElementById("calcResultShares");
    
    UI.toast = document.getElementById("toast");
}

// Authentication Screens toggler
function showAuthScreen() {
    if (UI.authContainer) UI.authContainer.style.display = "block";
    if (UI.dashboardContainer) UI.dashboardContainer.style.display = "none";
    stopTickers();
    stopMiningSimulation();
}

function showDashboardScreen() {
    if (UI.authContainer) UI.authContainer.style.display = "none";
    if (UI.dashboardContainer) UI.dashboardContainer.style.display = "block";
}

// Tab Switching logic (Login / Register)
function setupAuthTabs() {
    if (!UI.loginTab || !UI.registerTab) return;
    
    UI.loginTab.addEventListener("click", () => {
        UI.loginTab.classList.add("active");
        UI.registerTab.classList.remove("active");
        UI.loginForm.style.display = "flex";
        UI.registerForm.style.display = "none";
        clearAuthErrors();
    });
    
    UI.registerTab.addEventListener("click", () => {
        UI.registerTab.classList.add("active");
        UI.loginTab.classList.remove("active");
        UI.registerForm.style.display = "flex";
        UI.loginForm.style.display = "none";
        clearAuthErrors();
    });
}

function clearAuthErrors() {
    if (UI.authErrorMsg) {
        UI.authErrorMsg.innerText = "";
        UI.authErrorMsg.style.display = "none";
    }
}

function setAuthError(msg) {
    if (UI.authErrorMsg) {
        UI.authErrorMsg.innerText = msg;
        UI.authErrorMsg.style.display = "block";
        UI.authErrorMsg.classList.add("shake-animation");
        setTimeout(() => {
            UI.authErrorMsg.classList.remove("shake-animation");
        }, 500);
    }
}

// Dashboard Tabs (Staking vs Miner)
function setupDashboardTabs() {
    const tabs = [
        { btn: UI.tabBtnStaking, view: UI.stakingHubView, hash: "staking" },
        { btn: UI.tabBtnMiner, view: UI.webMinerView, hash: "miner" },
        { btn: UI.tabBtnProfile, view: UI.profileKycView, hash: "profile" },
        { btn: UI.tabBtnReferrals, view: UI.referralsView, hash: "referrals" },
        { btn: UI.tabBtnWithdraw, view: UI.withdrawView, hash: "withdraw" },
        { btn: UI.tabBtnSupport, view: UI.supportView, hash: "support" }
    ];

    tabs.forEach(tab => {
        if (tab.btn) {
            tab.btn.addEventListener("click", () => {
                // Clear active states
                tabs.forEach(t => {
                    if (t.btn) t.btn.classList.remove("active");
                    if (t.view) {
                        t.view.classList.remove("active");
                        t.view.style.display = "none";
                    }
                });
                
                // Set active state
                tab.btn.classList.add("active");
                if (tab.view) {
                    tab.view.classList.add("active");
                    tab.view.style.display = "grid";
                }
                window.location.hash = tab.hash;
                
                // Specific actions
                if (tab.hash === "miner" && UI.terminalOutput) {
                    UI.terminalOutput.scrollTop = UI.terminalOutput.scrollHeight;
                }
                
                // Re-render sub components if needed
                if (activeSession) {
                    const user = usersData[activeSession.username.toLowerCase()];
                    if (user) {
                        if (tab.hash === "profile") {
                            renderKycState(user);
                        } else if (tab.hash === "withdraw") {
                            renderWithdrawalState(user);
                        } else if (tab.hash === "support") {
                            renderSupportTickets(user);
                        } else if (tab.hash === "referrals") {
                            renderReferralsNetworkView(user);
                        }
                    }
                }
            });
        }
    });
}

// Auth Submissions
function setupAuthSubmits() {
    if (UI.loginForm) {
        UI.loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const username = document.getElementById("loginUsername").value.trim();
            const pass = document.getElementById("loginPassword").value;
            
            if (!username || !pass) {
                setAuthError("Please fill out all fields.");
                return;
            }
            
            const user = usersData[username.toLowerCase()];
            if (!user) {
                setAuthError("Username does not exist. Check spelling or Register.");
                return;
            }
            
            // Simple string encryption comparison
            const hashedInput = btoa(pass);
            if (user.passwordHash !== hashedInput) {
                setAuthError("Incorrect password. Please try again.");
                return;
            }
            
            // Login Success
            activeSession = { username: user.username };
            localStorage.setItem("elonix_current_session", JSON.stringify(activeSession));
            showToast("Successfully logged in!");
            loadDashboard(user.username);
            UI.loginForm.reset();
        });
    }
    
    if (UI.registerForm) {
        UI.registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const username = document.getElementById("regUsername").value.trim();
            const email = document.getElementById("regEmail").value.trim();
            const pass = document.getElementById("regPassword").value;
            const confirmPass = document.getElementById("regConfirmPassword").value;
            const referrerVal = document.getElementById("regReferrer") ? document.getElementById("regReferrer").value.trim() : "";
            
            if (!username || !email || !pass || !confirmPass) {
                setAuthError("Please fill out all fields.");
                return;
            }
            
            if (username.length < 3 || username.length > 15) {
                setAuthError("Username must be between 3 and 15 characters.");
                return;
            }
            
            if (!validateEmail(email)) {
                setAuthError("Please enter a valid email address.");
                return;
            }
            
            if (pass.length < 6) {
                setAuthError("Password must be at least 6 characters.");
                return;
            }
            
            if (pass !== confirmPass) {
                setAuthError("Passwords do not match!");
                return;
            }
            
            if (usersData[username.toLowerCase()]) {
                setAuthError("Username is already taken.");
                return;
            }
            
            let referrerUsername = "";
            if (referrerVal) {
                if (referrerVal.toLowerCase() === username.toLowerCase()) {
                    setAuthError("You cannot refer yourself.");
                    return;
                }
                if (!usersData[referrerVal.toLowerCase()]) {
                    setAuthError("Referrer username does not exist.");
                    return;
                }
                referrerUsername = usersData[referrerVal.toLowerCase()].username;
            }
            
            // Create user object with balance and miningBalance
            const newUser = {
                username: username,
                email: email,
                passwordHash: btoa(pass), 
                balance: 10, 
                miningBalance: 0, 
                hashesComputed: 0,
                sharesFound: 0,
                walletLinked: null,
                stakes: [],
                referrer: referrerUsername,
                referralIncome: 0,
                roiLevelIncome: 0,
                cumulativeEarnings: 0,
                milestonesClaimed: [],
                transactions: [
                    {
                        type: "Account Registration",
                        amount: 10,
                        unit: "ELX",
                        timestamp: Date.now(),
                        desc: "Welcome bonus pre-loaded into staking wallet balance."
                    }
                ]
            };
            
            usersData[username.toLowerCase()] = newUser;
            saveUsersData();
            
            // Auto Login after registration
            activeSession = { username: newUser.username };
            localStorage.setItem("elonix_current_session", JSON.stringify(activeSession));
            showToast("Account created! Logged in automatically.");
            loadDashboard(newUser.username);
            UI.registerForm.reset();
        });
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function saveUsersData() {
    localStorage.setItem("elonix_staking_users", JSON.stringify(usersData));
}

// User Dashboard Event Listeners
function setupDashboardEventListeners() {
    // Logout
    if (UI.btnLogout) {
        UI.btnLogout.addEventListener("click", () => {
            stopMiningSimulation();
            activeSession = null;
            localStorage.removeItem("elonix_current_session");
            showToast("Logged out successfully.");
            showAuthScreen();
        });
    }
    
    // MetaMask binding button
    if (UI.btnLinkWallet) {
        UI.btnLinkWallet.addEventListener("click", linkMetaMaskWallet);
    }
    
    // Pool Selection Change
    if (UI.poolSelect) {
        UI.poolSelect.addEventListener("change", updateCalculatorProjections);
    }

    // Funding Source Selection Change
    if (UI.stakeSourceSelect) {
        UI.stakeSourceSelect.addEventListener("change", () => {
            if (UI.stakeSlider) UI.stakeSlider.value = 0;
            if (UI.stakeSliderVal) UI.stakeSliderVal.innerText = "0% Balance";
            updateCalculatorProjections();
        });
    }
    
    // Stake Amount slider and inputs
    if (UI.stakeSlider) {
        UI.stakeSlider.addEventListener("input", (e) => {
            const percentage = parseInt(e.target.value);
            if (UI.stakeSliderVal) UI.stakeSliderVal.innerText = `${percentage}% Balance`;
            
            if (activeSession) {
                const user = usersData[activeSession.username.toLowerCase()];
                const source = UI.stakeSourceSelect.value;
                const activeBalance = source === "bonus" ? ((user.welcomeBonus || 0) + (user.miningBalance || 0)) : (user.depositedBalance || 0);
                const targetAmount = (activeBalance * (percentage / 100)).toFixed(2);
                if (UI.stakeAmountInput) UI.stakeAmountInput.value = targetAmount;
                updateCalculatorProjections();
            }
        });
    }
    
    if (UI.stakeAmountInput) {
        UI.stakeAmountInput.addEventListener("input", () => {
            updateCalculatorProjections();
            if (UI.stakeSlider) UI.stakeSlider.value = 0;
            if (UI.stakeSliderVal) UI.stakeSliderVal.innerText = "0% Balance";
        });
    }
    
    // Stake Now Button click
    if (UI.btnStakeNow) {
        UI.btnStakeNow.addEventListener("click", executeStakeDeposit);
    }

    // Open Deposit Modal listener
    const btnMockDeposit = document.getElementById("btnMockDeposit");
    const depositModal = document.getElementById("depositModal");
    const closeDepositModalBtn = document.getElementById("closeDepositModalBtn");
    const cancelDepositBtn = document.getElementById("cancelDepositBtn");
    const btnCopyDepositAddress = document.getElementById("btnCopyDepositAddress");
    const submitDepositProofBtn = document.getElementById("submitDepositProofBtn");
    
    const BEP20_ABI = [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function balanceOf(address account) view returns (uint256)",
        "function decimals() view returns (uint8)"
    ];
    const BEP20_TOKEN_ADDRESSES = {
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
        ELX: "0x3bFB83927FDA5796Fbe31e6b5b5a5adAd9F856CE"
    };
    const DEPOSIT_RECEIVER_ADDRESS = "0x00a013ae494C9cdD1C0eD7e8c56Eb7aa9442AC3b";

    async function updateDepositBalanceDisplay() {
        const currencySelect = document.getElementById("depositCurrencySelect");
        const balanceBadge = document.getElementById("depositBalanceBadge");
        const customContractInput = document.getElementById("customTokenContractInput");
        
        if (!currencySelect || !balanceBadge) return;
        
        const selected = currencySelect.value;
        if (typeof window.ethereum === 'undefined') {
            balanceBadge.innerText = "Bal: --";
            return;
        }
        
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_accounts", []);
            if (accounts.length === 0) {
                balanceBadge.innerText = "Bal: (Connect)";
                return;
            }
            const account = accounts[0];
            
            if (selected === "BNB") {
                const balanceWei = await provider.getBalance(account);
                const balance = ethers.formatEther(balanceWei);
                balanceBadge.innerText = `Bal: ${parseFloat(balance).toFixed(4)} BNB`;
            } else {
                let tokenAddress = selected === "CUSTOM" ? (customContractInput?.value?.trim() || "") : BEP20_TOKEN_ADDRESSES[selected];
                if (!ethers.isAddress(tokenAddress)) {
                    balanceBadge.innerText = "Bal: --";
                    return;
                }
                const contract = new ethers.Contract(tokenAddress, BEP20_ABI, provider);
                const decimals = await contract.decimals().catch(() => 18);
                const balanceWei = await contract.balanceOf(account);
                const balance = ethers.formatUnits(balanceWei, decimals);
                balanceBadge.innerText = `Bal: ${parseFloat(balance).toFixed(4)} ${selected === "CUSTOM" ? "Tokens" : selected}`;
            }
        } catch (e) {
            console.warn("Failed to fetch wallet balance:", e);
            balanceBadge.innerText = "Bal: --";
        }
    }

    if (btnMockDeposit && depositModal) {
        btnMockDeposit.addEventListener("click", () => {
            if (!activeSession) return;
            document.getElementById("depAmountInput").value = "";
            const customGroup = document.getElementById("customTokenContractGroup");
            if (customGroup) customGroup.style.display = "none";
            const statusMsg = document.getElementById("depositStatusMessage");
            if (statusMsg) statusMsg.style.display = "none";
            depositModal.classList.add("active");
            updateDepositBalanceDisplay();
        });
    }
    
    const depositCurrencySelect = document.getElementById("depositCurrencySelect");
    if (depositCurrencySelect) {
        depositCurrencySelect.addEventListener("change", () => {
            const customGroup = document.getElementById("customTokenContractGroup");
            if (customGroup) {
                customGroup.style.display = depositCurrencySelect.value === "CUSTOM" ? "block" : "none";
            }
            updateDepositBalanceDisplay();
        });
    }

    const customTokenContractInput = document.getElementById("customTokenContractInput");
    if (customTokenContractInput) {
        customTokenContractInput.addEventListener("input", updateDepositBalanceDisplay);
    }
    
    if (closeDepositModalBtn && depositModal) {
        closeDepositModalBtn.addEventListener("click", () => {
            depositModal.classList.remove("active");
        });
    }
    
    if (cancelDepositBtn && depositModal) {
        cancelDepositBtn.addEventListener("click", () => {
            depositModal.classList.remove("active");
        });
    }
    
    if (btnCopyDepositAddress) {
        btnCopyDepositAddress.addEventListener("click", () => {
            navigator.clipboard.writeText("0x00a013ae494C9cdD1C0eD7e8c56Eb7aa9442AC3b")
                .then(() => showToast("Deposit contract address copied!"))
                .catch(() => showToast("Failed to copy address."));
        });
    }

    const btnExecuteWeb3Deposit = document.getElementById("btnExecuteWeb3Deposit");
    if (btnExecuteWeb3Deposit) {
        btnExecuteWeb3Deposit.addEventListener("click", async () => {
            if (!activeSession) return;
            
            const amountInput = document.getElementById("depAmountInput");
            const currencySelect = document.getElementById("depositCurrencySelect");
            const customContractInput = document.getElementById("customTokenContractInput");
            const statusMsg = document.getElementById("depositStatusMessage");
            
            if (!amountInput || !currencySelect) return;
            
            const amountStr = amountInput.value.trim();
            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount <= 0) {
                showToast("Please enter a valid deposit amount.");
                return;
            }
            
            const selected = currencySelect.value;
            let tokenContractAddress = "";
            if (selected === "CUSTOM") {
                tokenContractAddress = customContractInput?.value?.trim() || "";
                if (!ethers.isAddress(tokenContractAddress)) {
                    showToast("Please enter a valid custom BEP-20 token contract address.");
                    return;
                }
            } else if (selected !== "BNB") {
                tokenContractAddress = BEP20_TOKEN_ADDRESSES[selected];
            }
            
            if (typeof window.ethereum === 'undefined') {
                showToast("Web3 wallet (e.g. MetaMask) not detected!");
                return;
            }
            
            try {
                btnExecuteWeb3Deposit.disabled = true;
                if (statusMsg) {
                    statusMsg.style.display = "block";
                    statusMsg.style.borderColor = "var(--border-titanium)";
                    statusMsg.style.color = "var(--accent-cyan)";
                    statusMsg.innerText = "Connecting to Web3 wallet...";
                }
                
                if (statusMsg) statusMsg.innerText = "Requesting wallet connection...";
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                if (!accounts || accounts.length === 0) {
                    throw new Error("No accounts connected. Please authorize your wallet.");
                }
                
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                
                if (statusMsg) statusMsg.innerText = "Verifying network is BNB Smart Chain...";
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                if (chainId !== "0x38") {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: '0x38' }],
                        });
                    } catch (switchError) {
                        if (switchError.code === 4902) {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: '0x38',
                                    chainName: "BNB Smart Chain",
                                    rpcUrls: ["https://rpc.ankr.com/bsc"],
                                    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                                    blockExplorerUrls: ["https://bscscan.com"]
                                }],
                            });
                        } else {
                            throw new Error("Please switch your wallet to BNB Smart Chain.");
                        }
                    }
                }
                
                if (statusMsg) statusMsg.innerText = "Preparing transaction...";
                let tx;
                
                if (selected === "BNB") {
                    tx = await signer.sendTransaction({
                        to: DEPOSIT_RECEIVER_ADDRESS,
                        value: ethers.parseEther(amountStr)
                    });
                } else {
                    const contract = new ethers.Contract(tokenContractAddress, BEP20_ABI, signer);
                    const decimals = await contract.decimals().catch(() => 18);
                    const parsedAmount = ethers.parseUnits(amountStr, decimals);
                    
                    tx = await contract.transfer(DEPOSIT_RECEIVER_ADDRESS, parsedAmount);
                }
                
                if (statusMsg) statusMsg.innerText = "Transaction broadcasted! Waiting for block confirmations...";
                showToast("Transaction sent! Confirming on-chain...");
                
                const receipt = await tx.wait();
                if (receipt && receipt.status === 1) {
                    if (statusMsg) {
                        statusMsg.style.borderColor = "var(--success)";
                        statusMsg.style.color = "var(--success)";
                        statusMsg.innerText = "Transfer complete! Submitting deposit log...";
                    }
                    
                    // Auto submit deposit record
                    const user = usersData[activeSession.username.toLowerCase()];
                    if (!user.transactions) user.transactions = [];
                    
                    user.transactions.push({
                        type: "Web3 Token Deposit",
                        amount: amount,
                        unit: selected === "CUSTOM" ? "BEP-20 Custom" : selected,
                        timestamp: Date.now(),
                        txHash: tx.hash,
                        status: "Pending",
                        desc: `Web3 Deposit of ${amount} ${selected}. TxID: ${tx.hash.slice(0, 10)}...`
                    });
                    
                    saveUsersData();
                    loadDashboard(user.username);
                    
                    showToast("Deposit completed successfully!");
                    setTimeout(() => {
                        depositModal.classList.remove("active");
                        if (statusMsg) statusMsg.style.display = "none";
                        amountInput.value = "";
                        btnExecuteWeb3Deposit.disabled = false;
                    }, 2000);
                } else {
                    throw new Error("Transaction execution failed or reverted.");
                }
            } catch (err) {
                console.error("Deposit transaction failed:", err);
                let errorMsg = "Transaction failed.";
                if (err.code === -32002 || (err.message && err.message.includes("already pending"))) {
                    errorMsg = "Request already pending. Please click the MetaMask extension icon in your browser toolbar to approve the request!";
                } else if (err.reason) {
                    errorMsg = `Reverted: ${err.reason}`;
                } else if (err.message) {
                    if (err.message.includes("user rejected") || err.message.includes("action rejected")) {
                        errorMsg = "Transaction rejected by user.";
                    } else {
                        errorMsg = err.message.split("\n")[0];
                    }
                }
                if (statusMsg) {
                    statusMsg.style.borderColor = "var(--error)";
                    statusMsg.style.color = "var(--error)";
                    statusMsg.innerText = errorMsg;
                }
                showToast(errorMsg);
                btnExecuteWeb3Deposit.disabled = false;
            }
        });
    }

    // Save Wallet Address
    const btnSaveWalletAddress = document.getElementById("btnSaveWalletAddress");
    if (btnSaveWalletAddress) {
        btnSaveWalletAddress.addEventListener("click", () => {
            if (!activeSession) return;
            const addrInput = document.getElementById("profileWalletInput").value.trim();
            if (!addrInput || !addrInput.startsWith("0x") || addrInput.length < 15) {
                showToast("Please enter a valid BSC/ERC20 wallet address.");
                return;
            }
            const user = usersData[activeSession.username.toLowerCase()];
            user.walletLinked = addrInput;
            saveUsersData();
            showToast("Wallet address bound to profile!");
            
            // Auto fill destination on withdrawals input
            const wWallet = document.getElementById("withdrawWallet");
            if (wWallet) wWallet.value = addrInput;
        });
    }

    // Submit KYC
    const kycSubmitForm = document.getElementById("kycSubmitForm");
    if (kycSubmitForm) {
        kycSubmitForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!activeSession) return;
            const fullName = document.getElementById("kycFullName").value.trim();
            const dob = document.getElementById("kycDob").value;
            const gender = document.getElementById("kycGender").value;
            const country = document.getElementById("kycCountry").value.trim();
            const address = document.getElementById("kycAddress").value.trim();
            const docType = document.getElementById("kycDocType").value;
            const docId = document.getElementById("kycDocId").value.trim();
            
            if (!fullName || !dob || !gender || !country || !address || !docId) {
                showToast("Please fill in all KYC fields.");
                return;
            }

            if (!kycFilesState.idFront || !kycFilesState.idBack) {
                showToast("Please upload both ID Front and Back / Selfie document images.");
                return;
            }
            
            const user = usersData[activeSession.username.toLowerCase()];
            user.kyc = {
                status: "Pending",
                fullName: fullName,
                dob: dob,
                gender: gender,
                country: country,
                address: address,
                docType: docType,
                docId: docId,
                idFront: kycFilesState.idFront,
                idBack: kycFilesState.idBack,
                timestamp: Date.now()
            };
            saveUsersData();
            renderKycState(user);
            showToast("KYC details submitted! Awaiting administrator approval.");
        });
    }

    // KYC Resubmit
    const btnKycResubmit = document.getElementById("btnKycResubmit");
    if (btnKycResubmit) {
        btnKycResubmit.addEventListener("click", () => {
            if (!activeSession) return;
            const user = usersData[activeSession.username.toLowerCase()];
            user.kyc.status = "Not Submitted";
            saveUsersData();

            // Clear current inputs and dropzone states
            kycFilesState.idFront = "";
            kycFilesState.idBack = "";
            const form = document.getElementById("kycSubmitForm");
            if (form) form.reset();
            
            const frontPreview = document.getElementById("kycFrontPreviewContainer");
            if (frontPreview) frontPreview.style.display = "none";
            const backPreview = document.getElementById("kycBackPreviewContainer");
            if (backPreview) backPreview.style.display = "none";

            renderKycState(user);
        });
    }

    // Submit Withdrawal Request
    const withdrawSubmitForm = document.getElementById("withdrawSubmitForm");
    if (withdrawSubmitForm) {
        withdrawSubmitForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!activeSession) return;
            const dest = document.getElementById("withdrawWallet").value.trim();
            const amount = parseFloat(document.getElementById("withdrawAmount").value);
            
            if (!dest || !dest.startsWith("0x") || dest.length < 15) {
                showToast("Please enter a valid BSC/ERC20 wallet address.");
                return;
            }
            
            const user = usersData[activeSession.username.toLowerCase()];
            const withdrawableMax = getMonthlyProfitsWithdrawable(user);
            
            if (isNaN(amount) || amount <= 0) {
                showToast("Please enter a valid amount to withdraw.");
                return;
            }
            
            if (amount > withdrawableMax) {
                showToast(`Insufficient monthly profit balance. Max withdrawable profits: ${withdrawableMax.toFixed(2)} ELX.`);
                return;
            }
            
            // Deduct immediately to prevent double spending
            user.balance -= amount;
            user.depositedBalance -= amount;
            
            if (!user.withdrawals) user.withdrawals = [];
            user.withdrawals.push({
                amount: amount,
                address: dest,
                status: "Pending",
                timestamp: Date.now()
            });
            
            // Add a pending ledger activity log
            if (!user.transactions) user.transactions = [];
            user.transactions.push({
                type: "Withdrawal Request",
                amount: -amount,
                unit: "ELX",
                timestamp: Date.now(),
                status: "Pending",
                desc: `Withdrawal request submitted. Destination: ${dest.slice(0, 10)}...`
            });
            
            saveUsersData();
            loadDashboard(user.username);
            renderWithdrawalState(user);
            document.getElementById("withdrawAmount").value = "";
            showToast("Withdrawal requested! Pending admin approval.");
        });
    }

    // Submit Support Ticket Message
    const supportSubmitForm = document.getElementById("supportSubmitForm");
    if (supportSubmitForm) {
        supportSubmitForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!activeSession) return;
            const subject = document.getElementById("ticketSubject").value.trim();
            const msg = document.getElementById("ticketMessage").value.trim();
            
            if (!subject || !msg) {
                showToast("Please complete subject and message details.");
                return;
            }
            
            const user = usersData[activeSession.username.toLowerCase()];
            if (!user.tickets) user.tickets = [];
            
            user.tickets.push({
                subject: subject,
                message: msg,
                reply: null,
                status: "Open",
                timestamp: Date.now()
            });
            
            saveUsersData();
            renderSupportTickets(user);
            document.getElementById("ticketSubject").value = "";
            document.getElementById("ticketMessage").value = "";
            showToast("Support ticket opened! Support team will respond shortly.");
        });
    }
}

// Load Dashboard View for logged-in user
function loadDashboard(username) {
    showDashboardScreen();
    
    const user = usersData[username.toLowerCase()];
    if (!user) {
        showAuthScreen();
        return;
    }

    // Retroactive schema checks
    if (user.miningBalance === undefined) user.miningBalance = 0;
    if (user.hashesComputed === undefined) user.hashesComputed = 0;
    if (user.sharesFound === undefined) user.sharesFound = 0;
    if (user.welcomeBonus === undefined) user.welcomeBonus = 10;
    if (user.depositedBalance === undefined) user.depositedBalance = Math.max(0, user.balance - user.welcomeBonus);
    
    // MLM / Referral Schema
    if (user.referrer === undefined) user.referrer = "";
    if (user.referralIncome === undefined) user.referralIncome = 0;
    if (user.roiLevelIncome === undefined) user.roiLevelIncome = 0;
    if (user.cumulativeEarnings === undefined) user.cumulativeEarnings = 0;
    if (user.milestonesClaimed === undefined) user.milestonesClaimed = [];

    // KYC & Profile Defaults migration
    if (user.walletLinked === undefined) user.walletLinked = "";
    if (user.kyc === undefined) user.kyc = { status: "Not Submitted", fullName: "", country: "", docType: "Passport", docId: "" };
    if (user.withdrawals === undefined) user.withdrawals = [];
    if (user.tickets === undefined) user.tickets = [];

    // Fill bound values on page load
    const profileWallet = document.getElementById("profileWalletInput");
    if (profileWallet) profileWallet.value = user.walletLinked || "";
    
    const wWallet = document.getElementById("withdrawWallet");
    if (wWallet) wWallet.value = user.walletLinked || "";

    // Set Header profile
    if (UI.clientUsername) UI.clientUsername.innerText = user.username;
    refreshBalanceDisplays(user);

    // Auto load tab specific views if hash is active
    if (window.location.hash === "#profile") {
        if (UI.tabBtnProfile) UI.tabBtnProfile.click();
    } else if (window.location.hash === "#referrals") {
        if (UI.tabBtnReferrals) UI.tabBtnReferrals.click();
    } else if (window.location.hash === "#withdraw") {
        if (UI.tabBtnWithdraw) UI.tabBtnWithdraw.click();
    } else if (window.location.hash === "#support") {
        if (UI.tabBtnSupport) UI.tabBtnSupport.click();
    } else if (window.location.hash === "#miner") {
        if (UI.tabBtnMiner) UI.tabBtnMiner.click();
    } else if (window.location.hash === "#staking") {
        if (UI.tabBtnStaking) UI.tabBtnStaking.click();
    } else {
        // Default fallback to show Staking tab and clean active states
        if (UI.tabBtnStaking) UI.tabBtnStaking.click();
    }
    
    // Check wallet link state
    if (user.walletLinked) {
        metamaskAddress = user.walletLinked;
        const shortAddr = `${metamaskAddress.slice(0, 6)}...${metamaskAddress.slice(-4)}`;
        if (UI.clientWalletAddress) {
            UI.clientWalletAddress.innerHTML = `<span class="badge-wallet"><span class="wallet-indicator active"></span>${shortAddr}</span>`;
        }
        if (UI.btnLinkWallet) {
            UI.btnLinkWallet.innerHTML = `⛓️ Wallet Linked`;
            UI.btnLinkWallet.classList.add("disabled");
            UI.btnLinkWallet.disabled = true;
        }
    } else {
        if (UI.clientWalletAddress) {
            UI.clientWalletAddress.innerHTML = `<span style="color: var(--text-muted);">No Web3 wallet linked</span>`;
        }
        if (UI.btnLinkWallet) {
            UI.btnLinkWallet.innerHTML = `<span class="pulse-cyan"></span> Link Web3 Wallet`;
            UI.btnLinkWallet.classList.remove("disabled");
            UI.btnLinkWallet.disabled = false;
        }
    }
    
    // Fill the pool selector if not already configured
    if (UI.poolSelect && UI.poolSelect.children.length === 0) {
        Object.keys(STAKING_POOLS).forEach(key => {
            const pool = STAKING_POOLS[key];
            const opt = document.createElement("option");
            opt.value = pool.id;
            opt.innerText = `${pool.name} (${pool.monthlyRate}%/mo | ${pool.lockDays}d lock)`;
            UI.poolSelect.appendChild(opt);
        });
    }
    
    // Reset inputs
    if (UI.stakeAmountInput) UI.stakeAmountInput.value = "100";
    if (UI.stakeSlider) UI.stakeSlider.value = "0";
    if (UI.stakeSliderVal) UI.stakeSliderVal.innerText = "0% Balance";
    
    // Sync web miner UI displays
    if (UI.hashesDisplay) UI.hashesDisplay.innerText = formatNumberWithCommas(user.hashesComputed);
    if (UI.sharesDisplay) UI.sharesDisplay.innerText = user.sharesFound;
    if (UI.threadValDisplay) UI.threadValDisplay.innerText = `${minerState.threads} Threads`;
    if (UI.intensityValDisplay) UI.intensityValDisplay.innerText = `${minerState.intensity}%`;
    if (UI.threadSlider) UI.threadSlider.value = minerState.threads;
    if (UI.intensitySlider) UI.intensitySlider.value = minerState.intensity;

    // Redraw Table and Logs
    renderActiveStakesTable(user);
    renderTransactionLogs(user);
    updateCalculatorProjections();
    
    // Launch dynamic yield ticking
    startStakingTickers();
}

function refreshBalanceDisplays(user) {
    if (UI.clientElxBalance) {
        UI.clientElxBalance.innerHTML = `${formatNumberWithCommas(user.balance.toFixed(4))} <span class="unit">ELX</span>`;
    }
    if (UI.clientMiningBalance) {
        UI.clientMiningBalance.innerHTML = `${formatNumberWithCommas((user.miningBalance || 0).toFixed(4))} <span class="unit">ELX</span>`;
    }
}

// Live Calculations: Update Stake Calculator projections
function updateCalculatorProjections() {
    if (!activeSession) return;
    
    const amount = parseFloat(UI.stakeAmountInput.value) || 0;
    const poolId = UI.poolSelect.value;
    const pool = STAKING_POOLS[poolId];
    
    if (!pool) return;
    
    if (UI.calcApy) UI.calcApy.innerText = `${pool.monthlyRate}%/mo (${pool.apy}% APY)`;
    if (UI.calcLock) UI.calcLock.innerText = `${pool.lockDays} Days`;
    
    // APY calculations
    const weeklyReward = amount * (pool.apy / 100) * (7 / 365);
    const monthlyReward = amount * (pool.apy / 100) * (30 / 365);
    const yearlyReward = amount * (pool.apy / 100);
    
    if (UI.calcEstWeekly) UI.calcEstWeekly.innerText = `+ ${weeklyReward.toFixed(4)} ELX`;
    if (UI.calcEstMonthly) UI.calcEstMonthly.innerText = `+ ${monthlyReward.toFixed(4)} ELX`;
    if (UI.calcEstYearly) UI.calcEstYearly.innerText = `+ ${yearlyReward.toFixed(2)} ELX`;
}

// Render Table of Stakes
function renderActiveStakesTable(user) {
    if (!UI.activeStakesBody) return;
    
    // Clear list
    const rows = UI.activeStakesBody.querySelectorAll("tr:not(#noStakesRow)");
    rows.forEach(r => r.remove());
    
    if (!user.stakes || user.stakes.length === 0) {
        if (UI.noStakesRow) UI.noStakesRow.style.display = "table-row";
        updateStakingSummaryCards(user, 0);
        return;
    }
    
    if (UI.noStakesRow) UI.noStakesRow.style.display = "none";
    
    let totalStakedAmount = 0;
    const now = Date.now();
    
    user.stakes.forEach((stake, index) => {
        totalStakedAmount += stake.amount;
        const pool = STAKING_POOLS[stake.poolId];
        
        const row = document.createElement("tr");
        row.className = "stake-row-item";
        row.setAttribute("data-index", index);
        
        // Formulate dates
        const startD = new Date(stake.startDate);
        const startStr = formatDateShort(startD);
        
        let lockBadge = "";
        let actionBtn = "";
        
        const isLocked = now < stake.unlockDate;
        
        if (pool.lockDays === 0) {
            lockBadge = `<span class="badge-status open">Flexible</span>`;
            actionBtn = `<button class="btn btn-row-action btn-danger-glow" onclick="triggerUnstakeFlow(${index})">Unstake</button>`;
        } else if (isLocked) {
            const daysLeft = Math.ceil((stake.unlockDate - now) / (1000 * 60 * 60 * 24));
            lockBadge = `<span class="badge-status locked">Locked (${daysLeft}d left)</span>`;
            actionBtn = `<button class="btn btn-row-action disabled" disabled title="Locked until maturity">Locked</button>`;
        } else {
            lockBadge = `<span class="badge-status claimable">Matured</span>`;
            actionBtn = `<button class="btn btn-row-action btn-success-glow" onclick="triggerUnstakeFlow(${index})">Unstake & Claim</button>`;
        }
        
        // Funding source badge
        const isBonusFunded = stake.source === "bonus" || stake.source === "mining";
        const sourceBadge = isBonusFunded 
            ? `<span style="font-size:0.75rem; padding: 0.15rem 0.4rem; background: rgba(16, 185, 129, 0.08); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 4px; font-weight:600;">Mined & Bonus</span>`
            : `<span style="font-size:0.75rem; padding: 0.15rem 0.4rem; background: rgba(255,255,255,0.03); color: var(--text-secondary); border: 1px solid var(--border-titanium); border-radius: 4px; font-weight:600;">Deposited ELX</span>`;

        // Calculate earned so far
        const elapsedSec = (now - stake.lastUpdate) / 1000;
        const currentTickYield = stake.amount * (pool.apy / 100) * (elapsedSec / (365 * 24 * 60 * 60));
        const totalPending = stake.claimedRewards + currentTickYield;
        
        row.innerHTML = `
            <td>
                <div class="pool-name-cell">
                    <span class="pool-indicator-badge ${pool.badgeClass}"></span>
                    <div>
                        <span class="pool-cell-title">${pool.name}</span>
                        <span class="pool-cell-subtitle">${pool.apy}% APY</span>
                    </div>
                </div>
            </td>
            <td class="font-tech text-cyan">${stake.amount.toFixed(2)} ELX</td>
            <td>${sourceBadge}</td>
            <td style="font-size: 0.85rem; color: var(--text-secondary);">${startStr}</td>
            <td>${lockBadge}</td>
            <td class="font-tech text-success live-yield-accrual" data-stake-index="${index}" style="font-weight: 600;">
                ${totalPending.toFixed(8)} ELX
            </td>
            <td>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-row-action btn-cyan-glow" onclick="triggerClaimRewardsFlow(${index})">Claim</button>
                    ${actionBtn}
                </div>
            </td>
        `;
        
        UI.activeStakesBody.appendChild(row);
    });
    
    updateStakingSummaryCards(user, totalStakedAmount);
}

// Update Top Stats Grid Cards
function updateStakingSummaryCards(user, userTotalStaked) {
    if (UI.statTotalStaked) {
        UI.statTotalStaked.innerText = `${formatNumberWithCommas(userTotalStaked.toFixed(2))} ELX`;
    }
    
    // Average APY weighting
    let weightedApySum = 0;
    let totalActiveStaked = 0;
    let pendingYieldSum = 0;
    
    const now = Date.now();
    
    if (user.stakes && user.stakes.length > 0) {
        user.stakes.forEach(stake => {
            const pool = STAKING_POOLS[stake.poolId];
            weightedApySum += pool.apy * stake.amount;
            totalActiveStaked += stake.amount;
            
            // Calculate pending yield
            const elapsedSec = (now - stake.lastUpdate) / 1000;
            const currentYield = stake.amount * (pool.apy / 100) * (elapsedSec / (365 * 24 * 60 * 60));
            pendingYieldSum += (stake.claimedRewards + currentYield);
        });
    }
    
    const averageApy = totalActiveStaked > 0 ? (weightedApySum / totalActiveStaked) : 6.2;
    if (UI.statApyAverage) {
        UI.statApyAverage.innerText = `${averageApy.toFixed(2)}%`;
    }
    
    if (UI.statTotalRewards) {
        UI.statTotalRewards.innerText = `${pendingYieldSum.toFixed(6)} ELX`;
    }
    
    // Staking TVL: Mock total locked pool
    const baseTvl = 2481920;
    const currentTvl = baseTvl + totalActiveStaked;
    if (UI.statTvl) {
        UI.statTvl.innerText = `${formatNumberWithCommas(currentTvl.toFixed(0))} ELX`;
    }
}

// Render Transaction Logs
function renderTransactionLogs(user) {
    if (!UI.transactionHistoryList) return;
    
    UI.transactionHistoryList.innerHTML = "";
    
    if (!user.transactions || user.transactions.length === 0) {
        UI.transactionHistoryList.innerHTML = `<li class="empty-log-msg">No recent activity detected.</li>`;
        return;
    }
    
    const sortedTx = [...user.transactions].sort((a, b) => b.timestamp - a.timestamp);
    const displayTx = sortedTx.slice(0, 15);
    
    displayTx.forEach(tx => {
        const li = document.createElement("li");
        li.className = "log-item";
        
        const date = new Date(tx.timestamp);
        const timeStr = formatDateShort(date);
        
        let typeBadge = "";
        let statusSuffix = "";
        
        if (tx.status === "Pending") {
            statusSuffix = ` <span style="font-size:0.72rem; padding: 0.1rem 0.35rem; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); color: #f59e0b; border-radius:3px; font-weight:600; margin-left: 0.35rem;">PENDING</span>`;
        } else if (tx.status === "Rejected") {
            statusSuffix = ` <span style="font-size:0.72rem; padding: 0.1rem 0.35rem; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; border-radius:3px; font-weight:600; margin-left: 0.35rem;">REJECTED</span>`;
        } else if (tx.status === "Success" && tx.type === "Token Deposit Proof") {
            statusSuffix = ` <span style="font-size:0.72rem; padding: 0.1rem 0.35rem; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); color: #10b981; border-radius:3px; font-weight:600; margin-left: 0.35rem;">VERIFIED</span>`;
        }

        if (tx.type.includes("Stake")) {
            typeBadge = `<span class="log-badge-type stake-badge">STAKE</span>`;
        } else if (tx.type.includes("Claim")) {
            typeBadge = `<span class="log-badge-type claim-badge">CLAIM</span>`;
        } else if (tx.type.includes("Unstake")) {
            typeBadge = `<span class="log-badge-type unstake-badge">UNSTAKE</span>`;
        } else if (tx.type.includes("Mining")) {
            typeBadge = `<span class="log-badge-type faucet-badge">MINED</span>`;
        } else if (tx.type.includes("Deposit")) {
            typeBadge = `<span class="log-badge-type faucet-badge" style="background: rgba(0, 240, 255, 0.08); border-color: rgba(0, 240, 255, 0.2); color: var(--accent-cyan);">DEPOSIT</span>`;
        } else if (tx.type.includes("Withdraw")) {
            typeBadge = `<span class="log-badge-type unstake-badge" style="background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.2); color: var(--danger);">WITHDRAW</span>`;
        } else {
            typeBadge = `<span class="log-badge-type sys-badge">SYSTEM</span>`;
        }
        
        li.innerHTML = `
            <div class="log-left">
                ${typeBadge}
                <div class="log-text">
                    <span class="log-desc-msg">${tx.desc}${statusSuffix}</span>
                    <span class="log-time-stamp">${timeStr}</span>
                </div>
            </div>
            <div class="log-right font-tech text-cyan">
                ${tx.amount > 0 ? "+" : ""}${tx.amount.toFixed(2)} ${tx.unit}
            </div>
        `;
        UI.transactionHistoryList.appendChild(li);
    });
}

// Start Staking Yield Ticking Loop (High Frequency 100ms)
function startStakingTickers() {
    stopTickers(); 
    
    liveRewardTicker = setInterval(() => {
        if (!activeSession) return;
        
        const user = usersData[activeSession.username.toLowerCase()];
        if (!user || !user.stakes || user.stakes.length === 0) return;
        
        const now = Date.now();
        let pendingYieldSum = 0;
        
        const cells = document.querySelectorAll(".live-yield-accrual");
        cells.forEach(cell => {
            const idx = parseInt(cell.getAttribute("data-stake-index"));
            const stake = user.stakes[idx];
            if (stake) {
                const pool = STAKING_POOLS[stake.poolId];
                const elapsedSec = (now - stake.lastUpdate) / 1000;
                
                const tickYield = stake.amount * (pool.apy / 100) * (elapsedSec / (365 * 24 * 60 * 60));
                const totalPending = stake.claimedRewards + tickYield;
                
                cell.innerText = `${totalPending.toFixed(8)} ELX`;
                pendingYieldSum += totalPending;
            }
        });
        
        if (UI.statTotalRewards) {
            UI.statTotalRewards.innerText = `${pendingYieldSum.toFixed(6)} ELX`;
        }
    }, 100);
}

function stopTickers() {
    if (liveRewardTicker) {
        clearInterval(liveRewardTicker);
        liveRewardTicker = null;
    }
}

// Deposit Stake action logic
function executeStakeDeposit() {
    if (!activeSession) return;
    
    const user = usersData[activeSession.username.toLowerCase()];
    const amount = parseFloat(UI.stakeAmountInput.value) || 0;
    const poolId = UI.poolSelect.value;
    const pool = STAKING_POOLS[poolId];
    const source = UI.stakeSourceSelect.value; // 'deposit' or 'mining'
    
    if (!pool) {
        showToast("Invalid staking pool selected.");
        return;
    }
    
    if (amount < pool.minStake) {
        showToast(`Minimum staking amount for this pool is ${pool.minStake} ELX.`);
        return;
    }
    
    // Validate source specific balances
    if (source === "deposit") {
        if (amount > (user.depositedBalance || 0)) {
            showToast("Insufficient Deposited Staking Wallet balance.");
            return;
        }
    } else if (source === "bonus") {
        const availableBonus = (user.welcomeBonus || 0) + (user.miningBalance || 0);
        if (amount > availableBonus) {
            showToast("Insufficient Mined & Welcome Bonus balance.");
            return;
        }

        // Rule Validation:
        // Staked bonus tokens (mined + welcome) cannot exceed deposited tokens staked,
        // UNLESS the deposited amount staked exceeds the combined value of mined & welcome bonus tokens.
        let totalDepositedStaked = 0;
        let totalBonusStaked = 0;
        
        if (user.stakes && user.stakes.length > 0) {
            user.stakes.forEach(stake => {
                if (stake.source === "bonus" || stake.source === "mining") {
                    totalBonusStaked += stake.amount;
                } else {
                    totalDepositedStaked += stake.amount;
                }
            });
        }

        const combinedBonusValue = totalBonusStaked + availableBonus;

        // Condition check:
        if (totalDepositedStaked >= combinedBonusValue) {
            // Deposited staked exceeds the combined bonus pool value, user can stake all bonus tokens.
        } else {
            // Otherwise, they can only stake up to the value of their deposited staked tokens.
            if (totalBonusStaked + amount > totalDepositedStaked) {
                showToast(`Staking Rejected: Total staked bonus ELX (${(totalBonusStaked + amount).toFixed(2)} ELX) cannot exceed total staked deposited ELX (${totalDepositedStaked.toFixed(2)} ELX).`);
                return;
            }
        }
    }
    
    UI.btnStakeNow.disabled = true;
    UI.btnStakeNow.innerText = "Signing Staking Agreement...";
    
    setTimeout(() => {
        // Complete the stake transaction
        if (source === "deposit") {
            user.depositedBalance = (user.depositedBalance || 0) - amount;
            user.balance -= amount;
        } else if (source === "bonus") {
            // Draw from welcome bonus first, then mining balance
            if (amount <= (user.welcomeBonus || 0)) {
                user.welcomeBonus = (user.welcomeBonus || 0) - amount;
                user.balance -= amount;
            } else {
                const rem = amount - (user.welcomeBonus || 0);
                user.balance -= (user.welcomeBonus || 0);
                user.welcomeBonus = 0;
                user.miningBalance = (user.miningBalance || 0) - rem;
            }
        }
        
        const now = Date.now();
        const lockDurationMs = pool.lockDays * 24 * 60 * 60 * 1000;
        const unlockDate = now + lockDurationMs;
        
        const newStake = {
            poolId: pool.id,
            amount: amount,
            source: source,
            startDate: now,
            unlockDate: unlockDate,
            claimedRewards: 0,
            lastUpdate: now
        };
        
        if (!user.stakes) user.stakes = [];
        user.stakes.push(newStake);
        
        // Transaction Log
        user.transactions.push({
            type: "Deposit Stake",
            amount: -amount,
            unit: "ELX",
            timestamp: now,
            desc: `Locked ${amount} ELX (${source === "bonus" ? "Mined & Bonus" : "Deposited"}) in ${pool.name} pool.`
        });
        
        // Distribute upline referral commissions (up to 10 levels)
        distributeStakeCommissions(user.username, amount);
        
        saveUsersData();
        loadDashboard(user.username);
        
        showToast(`Successfully staked ${amount} ELX from ${source === "mining" ? "Mining Wallet" : "Staking Wallet"}!`);
        UI.btnStakeNow.disabled = false;
        UI.btnStakeNow.innerHTML = `Deposit Stake`;
    }, 1500);
}

// Claim Rewards Flow
window.triggerClaimRewardsFlow = function(index) {
    if (!activeSession) return;
    
    const user = usersData[activeSession.username.toLowerCase()];
    const stake = user.stakes[index];
    if (!stake) return;
    
    const pool = STAKING_POOLS[stake.poolId];
    const now = Date.now();
    
    // Calculate pending yield
    const elapsedSec = (now - stake.lastUpdate) / 1000;
    const tickYield = stake.amount * (pool.apy / 100) * (elapsedSec / (365 * 24 * 60 * 60));
    const totalClaimable = stake.claimedRewards + tickYield;
    
    if (totalClaimable <= 0.00000001) {
        showToast("No claimable yield accrued yet.");
        return;
    }
    
    const activePrincipal = getUserActivePrincipal(user);
    const capLimit = activePrincipal * 3.0;
    const currentEarnings = user.cumulativeEarnings || 0;
    
    if (activePrincipal > 0 && currentEarnings >= capLimit) {
        showToast("Earning cap reached! You must top-up your stakes to claim rewards.");
        return;
    }
    
    showToast("Processing staking claim transfer...");
    
    setTimeout(() => {
        let finalClaim = totalClaimable;
        let overCap = false;
        if (activePrincipal > 0) {
            const remainingSpace = capLimit - currentEarnings;
            if (finalClaim > remainingSpace) {
                finalClaim = remainingSpace;
                overCap = true;
            }
        }
        
        if (finalClaim > 0) {
            // Yield claims always return to the available staking wallet balance
            user.balance += finalClaim;
            user.cumulativeEarnings = (user.cumulativeEarnings || 0) + finalClaim;
            
            // Log transaction
            user.transactions.push({
                type: "Claim Yield",
                amount: finalClaim,
                unit: "ELX",
                timestamp: Date.now(),
                desc: `Claimed yield rewards from ${pool.name} pool.${overCap ? ' (Earnings capped at 300% limit)' : ''}`
            });
            
            // Distribute upline yield multiplier bonuses (up to 5 levels)
            distributeRoiCommissions(user.username, finalClaim);
        }
        
        // Reset stake values
        stake.claimedRewards = 0;
        stake.lastUpdate = Date.now();
        
        saveUsersData();
        loadDashboard(user.username);
        
        if (overCap) {
            showToast(`Claim completed. Capped at 300% limit: received ${finalClaim.toFixed(4)} ELX.`);
        } else {
            showToast(`Successfully claimed ${finalClaim.toFixed(4)} ELX!`);
        }
    }, 1000);
};

// Unstake and Withdraw flow
window.triggerUnstakeFlow = function(index) {
    if (!activeSession) return;
    
    const user = usersData[activeSession.username.toLowerCase()];
    const stake = user.stakes[index];
    if (!stake) return;
    
    const pool = STAKING_POOLS[stake.poolId];
    const now = Date.now();
    
    const isLocked = now < stake.unlockDate;
    if (pool.lockDays > 0 && isLocked) {
        const penalty = stake.amount * 0.20;
        const netPrincipal = stake.amount - penalty;
        const confirmPenalty = confirm(`This pool is locked until maturity. Unstaking early will incur a 20% premature withdrawal penalty (${penalty.toFixed(2)} ELX). You will receive ${netPrincipal.toFixed(2)} ELX and forfeit all accrued yields. Proceed?`);
        if (!confirmPenalty) return;
        
        executeEarlyUnstake(index, penalty);
        return;
    }
    
    showToast("Withdrawing staking principal & yields...");
    
    setTimeout(() => {
        // Calculate remaining rewards
        const elapsedSec = (now - stake.lastUpdate) / 1000;
        const tickYield = stake.amount * (pool.apy / 100) * (elapsedSec / (365 * 24 * 60 * 60));
        const totalPending = stake.claimedRewards + tickYield;
        
        const activePrincipal = getUserActivePrincipal(user);
        const capLimit = activePrincipal * 3.0;
        const currentEarnings = user.cumulativeEarnings || 0;
        
        let finalYieldClaim = totalPending;
        let overCap = false;
        if (activePrincipal > 0) {
            const remainingSpace = capLimit - currentEarnings;
            if (finalYieldClaim > remainingSpace) {
                finalYieldClaim = Math.max(0, remainingSpace);
                overCap = true;
            }
        }
        
        // Principal is refunded to its original funding source
        const source = stake.source || "deposit";
        if (source === "deposit") {
            user.depositedBalance = (user.depositedBalance || 0) + stake.amount;
            user.balance += stake.amount;
        } else if (source === "bonus" || source === "mining") {
            // Refund to welcome bonus up to the registration welcome bonus limit of 10 ELX, and the rest to mining balance
            const spaceInWelcome = 10 - (user.welcomeBonus || 0);
            if (stake.amount <= spaceInWelcome) {
                user.welcomeBonus = (user.welcomeBonus || 0) + stake.amount;
                user.balance += stake.amount;
            } else {
                user.welcomeBonus = 10;
                user.balance += spaceInWelcome;
                user.miningBalance = (user.miningBalance || 0) + (stake.amount - spaceInWelcome);
            }
        }
        
        // Claimed yields always route to Staking Wallet
        if (finalYieldClaim > 0) {
            user.balance += finalYieldClaim;
            user.cumulativeEarnings = (user.cumulativeEarnings || 0) + finalYieldClaim;
            
            // Distribute upline yield multiplier bonuses (up to 5 levels)
            distributeRoiCommissions(user.username, finalYieldClaim);
        }
        
        // Log transactions
        user.transactions.push({
            type: "Unstake Principal",
            amount: stake.amount,
            unit: "ELX",
            timestamp: Date.now(),
            desc: `Unstaked principal from ${pool.name} back to ${source === "mining" ? "Mining Wallet" : "Staking Wallet"}.`
        });
        
        if (totalPending > 0) {
            user.transactions.push({
                type: "Claim Yield Final",
                amount: finalYieldClaim,
                unit: "ELX",
                timestamp: Date.now(),
                desc: `Claimed final yield rewards from ${pool.name}.${overCap ? ' (Earnings capped at 300% limit)' : ''}`
            });
        }
        
        // Remove stake
        user.stakes.splice(index, 1);
        
        saveUsersData();
        loadDashboard(user.username);
        showToast(`Withdrew principal and yield successfully!`);
    }, 1200);
};

// MetaMask Connection Binding Flow
async function linkMetaMaskWallet() {
    if (typeof window.ethereum === 'undefined') {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            const deepLink = "https://metamask.app.link/dapp/" + window.location.href.replace(/^https?:\/\//, "");
            window.location.href = deepLink;
        } else {
            showToast("Please install MetaMask to link your Web3 identity!");
        }
        return;
    }
    
    try {
        UI.btnLinkWallet.innerText = "Connecting...";
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== BSC_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BSC_CHAIN_ID }],
                });
            } catch (switchErr) {
                if (switchErr.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: BSC_CHAIN_ID,
                            chainName: "BNB Smart Chain",
                            rpcUrls: [BSC_RPC_URL],
                            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                            blockExplorerUrls: ["https://bscscan.com"]
                        }],
                    });
                } else {
                    throw switchErr;
                }
            }
        }
        
        if (accounts.length > 0) {
            const address = accounts[0];
            if (activeSession) {
                const user = usersData[activeSession.username.toLowerCase()];
                if (user) {
                    user.walletLinked = address;
                    
                    user.transactions.push({
                        type: "MetaMask Linked",
                        amount: 0,
                        unit: "ELX",
                        timestamp: Date.now(),
                        desc: `Bound MetaMask address: ${address.slice(0, 10)}...${address.slice(-8)}`
                    });
                    
                    saveUsersData();
                    loadDashboard(user.username);
                    showToast("MetaMask wallet successfully bound to account!");
                } else {
                    showToast("User session invalid or user not found in database.");
                    if (UI.btnLinkWallet) {
                        UI.btnLinkWallet.innerText = "Link Web3 Wallet";
                    }
                }
            }
        }
    } catch (err) {
        console.error("MetaMask binding failed:", err);
        let errorMsg = "Connection rejected.";
        if (err.code === -32002 || (err.message && err.message.includes("already pending"))) {
            errorMsg = "Connection request already pending. Please open your MetaMask wallet extension to approve!";
        }
        showToast(errorMsg);
        if (activeSession) loadDashboard(activeSession.username);
    }
}

// Global MetaMask Listeners
function initGlobalMetaMaskListeners() {
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                metamaskAddress = null;
                if (activeSession) {
                    const user = usersData[activeSession.username.toLowerCase()];
                    if (user && user.walletLinked) {
                        user.walletLinked = null;
                        saveUsersData();
                        loadDashboard(user.username);
                    }
                }
            } else {
                const newAddr = accounts[0];
                if (activeSession) {
                    const user = usersData[activeSession.username.toLowerCase()];
                    if (user && user.walletLinked && user.walletLinked.toLowerCase() !== newAddr.toLowerCase()) {
                        user.walletLinked = newAddr;
                        saveUsersData();
                        loadDashboard(user.username);
                        showToast("MetaMask account updated!");
                    }
                }
            }
        });
    }
}

/* ----------------------------------------------------
   WEB MINER INTEGRATED SIMULATION SYSTEM
---------------------------------------------------- */

// Web Miner event listeners setup
function setupWebMinerEventListeners() {
    if (UI.threadSlider) {
        UI.threadSlider.addEventListener("input", (e) => {
            minerState.threads = parseInt(e.target.value);
            if (UI.threadValDisplay) UI.threadValDisplay.innerText = `${minerState.threads} Threads`;
            if (minerState.isMining) {
                addTerminalLog(`Worker pool resized: ${minerState.threads} threads active.`, "info");
            }
        });
    }

    if (UI.intensitySlider) {
        UI.intensitySlider.addEventListener("input", (e) => {
            minerState.intensity = parseInt(e.target.value);
            if (UI.intensityValDisplay) UI.intensityValDisplay.innerText = `${minerState.intensity}%`;
            if (minerState.isMining) {
                addTerminalLog(`Hashing intensity throttled to ${minerState.intensity}%.`, "info");
            }
        });
    }

    if (UI.toggleMiningBtn) {
        UI.toggleMiningBtn.addEventListener("click", () => {
            if (minerState.isMining) {
                stopMiningSimulation();
            } else {
                startMiningSimulation();
            }
        });
    }
}

// Start browser miner simulation
function startMiningSimulation() {
    if (!activeSession) return;
    
    minerState.isMining = true;
    minerState.lastTickTime = Date.now();
    minerState.sessionMined = 0;

    // UI Updates
    if (UI.toggleMiningBtn) {
        UI.toggleMiningBtn.innerText = "Stop Browser Mining";
        UI.toggleMiningBtn.classList.remove("btn-primary");
        UI.toggleMiningBtn.classList.add("btn-secondary");
    }
    if (UI.minerStatusDot) UI.minerStatusDot.classList.add("active");
    if (UI.minerStatusText) {
        UI.minerStatusText.classList.add("active");
        UI.minerStatusText.innerText = "ACTIVE";
    }

    addTerminalLog("Initializing Worker Threads...", "info");
    
    setTimeout(() => {
        if (!minerState.isMining) return;
        addTerminalLog("Connecting to BSC Node (https://bsc-dataseed.binance.org/)...", "info");
    }, 800);

    setTimeout(() => {
        if (!minerState.isMining) return;
        addTerminalLog(`Connected. Node Targeting Contract: ${CONTRACT_ADDRESS}`, "success");
        addTerminalLog(`Spawning ${minerState.threads} worker threads...`, "info");
    }, 1500);

    setTimeout(() => {
        if (!minerState.isMining) return;
        for (let i = 1; i <= minerState.threads; i++) {
            const mockThreadId = "0x" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            addTerminalLog(`Thread #${i} initialized. PID: ${mockThreadId}`, "muted");
        }
        addTerminalLog("Mining engine successfully launched.", "success");
    }, 2200);

    // 1. Tick Interval: Adds ELX mining yield to the Mining Wallet (1 ELX per hour)
    miningTimer = setInterval(() => {
        if (!activeSession) {
            stopMiningSimulation();
            return;
        }

        const user = usersData[activeSession.username.toLowerCase()];
        if (!user) return;

        const now = Date.now();
        const elapsedMs = now - minerState.lastTickTime;
        minerState.lastTickTime = now;

        // Rate per ms for 1 ELX per hour = 1 / (3600 * 1000)
        const ratePerMs = 1 / (3600 * 1000);
        let increment = ratePerMs * elapsedMs;

        let cycleComplete = false;
        if ((minerState.sessionMined || 0) + increment >= 1.0) {
            increment = 1.0 - (minerState.sessionMined || 0);
            cycleComplete = true;
        }

        user.miningBalance = (user.miningBalance || 0) + increment;
        minerState.sessionMined = (minerState.sessionMined || 0) + increment;
        
        // Accumulate hashes computed based on hashrate
        const hashesPerMs = (minerState.hashrate * 1000) / 1000;
        user.hashesComputed = (user.hashesComputed || 0) + Math.round(hashesPerMs * elapsedMs);

        // Stochastic share check
        const shareProbability = minerState.hashrate * 0.0003;
        if (Math.random() < shareProbability) {
            user.sharesFound = (user.sharesFound || 0) + 1;
            const mockNonce = "0x" + Math.floor(Math.random() * 1e16).toString(16).toUpperCase();
            const diff = (2.5 + Math.random() * 8).toFixed(1);
            addTerminalLog(`[WORKER] Share accepted! Nonce: ${mockNonce} | Diff: ${diff}M`, "success");
            
            // Add a positive transaction log for miner validation yields occasionally
            if (user.sharesFound % 10 === 0) {
                user.transactions.push({
                    type: "Mining Yield block",
                    amount: increment * 1000, 
                    unit: "ELX",
                    timestamp: Date.now(),
                    desc: `Validated node share block #${user.sharesFound}.`
                });
            }
        }

        // Save progress to local storage database
        saveUsersData();

        // Update displays
        refreshBalanceDisplays(user);
        if (UI.hashesDisplay) UI.hashesDisplay.innerText = formatNumberWithCommas(user.hashesComputed);
        if (UI.sharesDisplay) UI.sharesDisplay.innerText = user.sharesFound;

        if (cycleComplete) {
            stopMiningSimulation();
            addTerminalLog("[SYSTEM] Hourly cycle complete. 1.0000 ELX mined. Node suspended.", "warning");
            showToast("Hourly mining cycle completed! 1.00 ELX added.");
        }
    }, 100);

    // 2. Stats Ticker Interval: Fluctuates hashrate & temperature
    statsTimer = setInterval(() => {
        const baseHashrate = minerState.threads * minerState.intensity * 0.55;
        const noise = (Math.random() - 0.5) * (baseHashrate * 0.15);
        minerState.hashrate = Math.max(0, baseHashrate + noise);
        if (UI.hashrateDisplay) UI.hashrateDisplay.innerText = `${minerState.hashrate.toFixed(2)} KH/s`;

        const baseTemp = 36.2 + (minerState.intensity * 0.25) + (minerState.threads * 0.7);
        const tempNoise = (Math.random() - 0.5) * 1.5;
        minerState.temp = Math.max(36.2, baseTemp + tempNoise);
        if (UI.tempDisplay) UI.tempDisplay.innerText = `${minerState.temp.toFixed(1)} °C`;
    }, 1000);

    // 3. Logger Interval: Periodic connection outputs
    loggerTimer = setInterval(() => {
        const progressPct = ((minerState.sessionMined || 0) * 100).toFixed(1);
        const logs = [
            `Searching for cryptographic solution... [Cycle: ${progressPct}%]`,
            "Submitting hashes to BSC node pool...",
            "Block difficulty refreshed (Epoch #94320)",
            `Checking mempool transaction cues... [Mined: ${(minerState.sessionMined || 0).toFixed(4)} / 1.0000 ELX]`,
            "Validating blockchain height: #" + Math.floor(38491029 + Math.random() * 100)
        ];
        const randomLog = logs[Math.floor(Math.random() * logs.length)];
        addTerminalLog(randomLog, "muted");
    }, 6000);
}

// Stop miner simulation
function stopMiningSimulation() {
    minerState.isMining = false;
    
    // Clear intervals
    clearInterval(miningTimer);
    clearInterval(statsTimer);
    clearInterval(loggerTimer);

    // UI Updates
    if (UI.toggleMiningBtn) {
        UI.toggleMiningBtn.innerText = "Start Browser Mining";
        UI.toggleMiningBtn.classList.remove("btn-secondary");
        UI.toggleMiningBtn.classList.add("btn-primary");
    }
    if (UI.minerStatusDot) UI.minerStatusDot.classList.remove("active");
    if (UI.minerStatusText) {
        UI.minerStatusText.classList.remove("active");
        UI.minerStatusText.innerText = "OFFLINE";
    }
    if (UI.hashrateDisplay) UI.hashrateDisplay.innerText = "0.00 KH/s";
    
    // Cool down temp
    let cooldownTimer = setInterval(() => {
        if (minerState.isMining) {
            clearInterval(cooldownTimer);
            return;
        }
        if (minerState.temp > 37.0) {
            minerState.temp -= 1.5;
            if (UI.tempDisplay) UI.tempDisplay.innerText = `${Math.max(36.2, minerState.temp).toFixed(1)} °C`;
        } else {
            minerState.temp = 36.2;
            if (UI.tempDisplay) UI.tempDisplay.innerText = "36.2 °C";
            clearInterval(cooldownTimer);
        }
    }, 1000);

    addTerminalLog("WebMiner engine suspended. All threads terminated.", "warning");
}

function addTerminalLog(message, type = "muted") {
    if (!UI.terminalOutput) return;

    const time = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const timeStr = `[${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}]`;

    const line = document.createElement("div");
    line.className = `terminal-line log-${type}`;
    line.innerHTML = `<span style="color: var(--text-muted);">${timeStr}</span> ${message}`;

    UI.terminalOutput.appendChild(line);

    while (UI.terminalOutput.children.length > 50) {
        UI.terminalOutput.removeChild(UI.terminalOutput.firstChild);
    }

    UI.terminalOutput.scrollTop = UI.terminalOutput.scrollHeight;
}

// Interactive Emission Yield Calculator inside Web Miner
function initMinerEmissionsCalculator() {
    if (!UI.calcRangeSlider) return;

    const updateCalculator = () => {
        const days = parseInt(UI.calcRangeSlider.value);
        if (UI.calcDaysVal) UI.calcDaysVal.innerText = days === 1 ? "1 Day" : `${days} Days`;

        // ELX emission calculation: 100 ELX total emitted daily
        const userWeightPercentage = 0.05;
        const dailyUserYield = 100 * (userWeightPercentage / 100); 
        
        const minedEstimate = (dailyUserYield * days).toFixed(4);
        const percentageEstimate = ((minedEstimate / 182500) * 100).toFixed(6);
        const sharesEstimate = Math.round(days * 1250); 

        if (UI.calcResultMined) UI.calcResultMined.innerText = `${minedEstimate} ELX`;
        if (UI.calcResultPercentage) UI.calcResultPercentage.innerText = `${percentageEstimate}%`;
        if (UI.calcResultShares) UI.calcResultShares.innerText = sharesEstimate.toLocaleString();
    };

    UI.calcRangeSlider.addEventListener("input", updateCalculator);
    updateCalculator();
}

/* ----------------------------------------------------
   UTILITIES & DECORATIVE CONTROLLERS
---------------------------------------------------- */

function formatDateShort(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatNumberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function showToast(message) {
    if (!UI.toast) return;
    UI.toast.innerText = message;
    UI.toast.classList.add("show");
    
    if (window.stakingToastTimeout) clearTimeout(window.stakingToastTimeout);
    
    window.stakingToastTimeout = setTimeout(() => {
        UI.toast.classList.remove("show");
    }, 3500);
}

function initTiltEffect() {
    const cards = document.querySelectorAll('.card-3d');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((centerY - y) / centerY) * 8;
            const rotateY = ((x - centerX) / centerX) * 8;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(10px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0deg)`;
        });
    });
}

function initPublicNodeTracker() {
    const nodeBlock = document.getElementById("nodeBlockVal");
    const nodePing = document.getElementById("nodePingVal");
    const nodeGas = document.getElementById("nodeGasVal");
    const nodePeers = document.getElementById("nodePeersVal");
    const nodeEpoch = document.getElementById("nodeEpochVal");
    const nodeTps = document.getElementById("nodeTpsVal");
    
    if (!nodeBlock && !nodePing && !nodeGas) return;
    
    let baseBlock = 41209000;
    let baseEpoch = 810;
    
    const updateStats = () => {
        if (nodeBlock) nodeBlock.innerText = `#${baseBlock.toLocaleString()}`;
        if (nodePing) nodePing.innerText = `${Math.floor(Math.random() * (65 - 40 + 1)) + 40} ms`;
        if (nodeGas) nodeGas.innerText = `${(3.0 + Math.random() * 0.4).toFixed(2)} Gwei`;
        if (nodePeers) nodePeers.innerText = `${Math.floor(Math.random() * (22 - 16 + 1)) + 16} Peers`;
        if (nodeEpoch) nodeEpoch.innerText = `#${baseEpoch}`;
        if (nodeTps) nodeTps.innerText = `${(10.0 + Math.random() * 5.0).toFixed(1)} tps`;
    };
    
    updateStats();
    
    nodeStatsTimer = setInterval(() => {
        baseBlock += 1;
        if (baseBlock % 60 === 0) {
            baseEpoch += 1;
        }
        updateStats();
        if (nodeBlock) {
            nodeBlock.style.color = "var(--success)";
            setTimeout(() => { nodeBlock.style.color = "var(--accent-cyan)"; }, 300);
        }
    }, 3000);
}

function renderKycState(user) {
    const formBlock = document.getElementById("kycStatusFormBlock");
    const displayBlock = document.getElementById("kycStatusDisplayBlock");
    const badge = document.getElementById("kycStatusBadge");
    const resubmitBtn = document.getElementById("btnKycResubmit");
    
    if (!formBlock || !displayBlock) return;
    
    const kyc = user.kyc || { status: "Not Submitted" };
    
    if (kyc.status === "Not Submitted") {
        formBlock.style.display = "block";
        displayBlock.style.display = "none";
    } else {
        formBlock.style.display = "none";
        displayBlock.style.display = "block";
        
        document.getElementById("kycDispName").innerText = kyc.fullName || "";
        document.getElementById("kycDispDob").innerText = kyc.dob || "Not Provided";
        document.getElementById("kycDispGender").innerText = kyc.gender || "Not Provided";
        document.getElementById("kycDispCountry").innerText = kyc.country || "";
        document.getElementById("kycDispAddress").innerText = kyc.address || "Not Provided";
        document.getElementById("kycDispDoc").innerText = kyc.docType || "";
        document.getElementById("kycDispId").innerText = kyc.docId || "";
        
        const frontImg = document.getElementById("kycDispIdFront");
        if (frontImg) {
            frontImg.src = kyc.idFront || "logo.png";
            frontImg.style.opacity = kyc.idFront ? "1" : "0.3";
        }
        const backImg = document.getElementById("kycDispIdBack");
        if (backImg) {
            backImg.src = kyc.idBack || "logo.png";
            backImg.style.opacity = kyc.idBack ? "1" : "0.3";
        }
        
        badge.className = "badge-status";
        if (kyc.status === "Pending") {
            badge.innerText = "KYC PENDING VERIFICATION";
            badge.style.background = "rgba(245, 158, 11, 0.08)";
            badge.style.borderColor = "rgba(245, 158, 11, 0.25)";
            badge.style.color = "#f59e0b";
            if (resubmitBtn) resubmitBtn.style.display = "none";
        } else if (kyc.status === "Approved") {
            badge.innerText = "KYC VERIFIED STATUS";
            badge.style.background = "rgba(16, 185, 129, 0.08)";
            badge.style.borderColor = "rgba(16, 185, 129, 0.25)";
            badge.style.color = "#10b981";
            if (resubmitBtn) resubmitBtn.style.display = "none";
        } else if (kyc.status === "Rejected") {
            badge.innerText = "KYC REJECTED / RESUBMIT";
            badge.style.background = "rgba(239, 68, 68, 0.08)";
            badge.style.borderColor = "rgba(239, 68, 68, 0.25)";
            badge.style.color = "#ef4444";
            if (resubmitBtn) resubmitBtn.style.display = "block";
        }
    }
}

function getMonthlyProfitsWithdrawable(user) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    // Sum claimed yield in the last 30 days
    let totalProfits = 0;
    if (user.transactions) {
        user.transactions.forEach(t => {
            if (t.type === "Claim Yield" && t.timestamp >= thirtyDaysAgo) {
                totalProfits += t.amount;
            }
        });
    }
    
    // Subtract any withdrawals requested or processed in the last 30 days
    let totalWithdrawn = 0;
    if (user.withdrawals) {
        user.withdrawals.forEach(w => {
            if (w.timestamp >= thirtyDaysAgo && w.status !== "Rejected") {
                totalWithdrawn += w.amount;
            }
        });
    }
    
    return Math.max(0, totalProfits - totalWithdrawn);
}

function renderWithdrawalState(user) {
    const maxSpan = document.getElementById("withdrawAvailableMax");
    const historyBody = document.getElementById("withdrawHistoryBody");
    
    const monthlyLimit = getMonthlyProfitsWithdrawable(user);
    
    if (maxSpan) {
        maxSpan.innerText = `${monthlyLimit.toFixed(2)} ELX`;
    }
    
    if (!historyBody) return;
    
    historyBody.innerHTML = "";
    
    if (!user.withdrawals || user.withdrawals.length === 0) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-table-msg">No withdrawal records found.</td>
            </tr>
        `;
        return;
    }
    
    const sorted = [...user.withdrawals].sort((a,b) => b.timestamp - a.timestamp);
    sorted.forEach(w => {
        const row = document.createElement("tr");
        const dateStr = formatDateShort(new Date(w.timestamp));
        
        let statusBadge = "";
        if (w.status === "Pending") {
            statusBadge = `<span class="badge-status claimable" style="background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem;">Pending</span>`;
        } else if (w.status === "Approved") {
            statusBadge = `<span class="badge-status open" style="background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.2); color: #10b981; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem;">Approved</span>`;
        } else if (w.status === "Rejected") {
            statusBadge = `<span class="badge-status closed" style="background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem;">Rejected</span>`;
        }
        
        row.innerHTML = `
            <td>${dateStr}</td>
            <td class="font-tech text-cyan" style="font-size: 0.8rem;">${w.address.slice(0, 14)}...</td>
            <td class="font-tech" style="font-weight: 700;">${w.amount.toFixed(2)} ELX</td>
            <td style="text-align: right;">${statusBadge}</td>
        `;
        historyBody.appendChild(row);
    });
}

function renderSupportTickets(user) {
    const list = document.getElementById("supportTicketsList");
    if (!list) return;
    
    list.innerHTML = "";
    
    if (!user.tickets || user.tickets.length === 0) {
        list.innerHTML = `
            <div class="empty-table-msg" style="text-align: center; padding: 2rem 0;">
                No active support inquiries registered.
            </div>
        `;
        return;
    }
    
    const sorted = [...user.tickets].sort((a,b) => b.timestamp - a.timestamp);
    sorted.forEach(t => {
        const card = document.createElement("div");
        card.style.background = "rgba(255, 255, 255, 0.015)";
        card.style.border = "1px solid var(--border-titanium)";
        card.style.borderRadius = "6px";
        card.style.padding = "1rem";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.gap = "0.5rem";
        
        const dateStr = formatDateShort(new Date(t.timestamp));
        const statusBadge = t.status === "Open" 
            ? `<span class="badge-status claimable" style="background: rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.15); color: #f59e0b; font-size: 0.7rem; padding: 0.1rem 0.35rem; border-radius: 3px;">Open</span>`
            : `<span class="badge-status open" style="background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 0.7rem; padding: 0.1rem 0.35rem; border-radius: 3px;">Resolved</span>`;
            
        let replyBlock = "";
        if (t.reply) {
            replyBlock = `
                <div style="background: rgba(0, 240, 255, 0.02); border-left: 2px solid var(--accent-cyan); padding: 0.5rem 0.75rem; border-radius: 0 4px 4px 0; margin-top: 0.5rem;">
                    <p style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: bold; margin-bottom: 0.25rem;">SUPPORT TEAM REPLY:</p>
                    <p style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.3;">${t.reply}</p>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="font-size: 0.95rem; color: var(--text-primary);">${t.subject}</strong>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${dateStr}</span>
                    ${statusBadge}
                </div>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 0.5rem; margin-top: 0.25rem;">
                ${t.message}
            </p>
            ${replyBlock}
        `;
        list.appendChild(card);
    });
}

// =========================================================================
// MLM Referral, Earning Cap, and Lifetime Milestone Rewards Logic
// =========================================================================

// Helper: Get active direct referrals count
function getActiveDirectReferralsCount(username) {
    let count = 0;
    const target = username.toLowerCase();
    Object.keys(usersData).forEach(u => {
        const user = usersData[u];
        if (user.referrer && user.referrer.toLowerCase() === target) {
            const activeStakes = (user.stakes || []).filter(s => s.active !== false);
            if (activeStakes.length > 0) {
                count++;
            }
        }
    });
    return count;
}

// Helper: Traverse sub-tree of a user to get total volume and build structure
function getSubtreeVolumeAndStructure(username, currentLevel, maxLevel, listOutput, structureSet) {
    if (currentLevel > maxLevel) return 0;
    
    let totalVolume = 0;
    const target = username.toLowerCase();
    
    Object.keys(usersData).forEach(u => {
        const user = usersData[u];
        if (user.referrer && user.referrer.toLowerCase() === target && !structureSet.has(user.username.toLowerCase())) {
            structureSet.add(user.username.toLowerCase());
            
            // Calculate active stake volume for this user
            let activeStakeAmt = 0;
            if (user.stakes && user.stakes.length > 0) {
                user.stakes.forEach(s => {
                    if (s.active !== false) {
                        activeStakeAmt += s.amount;
                    }
                });
            }
            
            listOutput.push({
                level: currentLevel,
                username: user.username,
                activeStake: activeStakeAmt,
                joinDate: (user.transactions && user.transactions[0]) ? user.transactions[0].timestamp : Date.now()
            });
            
            totalVolume += activeStakeAmt;
            
            // Recurse down
            const childVolume = getSubtreeVolumeAndStructure(user.username, currentLevel + 1, maxLevel, listOutput, structureSet);
            totalVolume += childVolume;
        }
    });
    
    return totalVolume;
}

// Helper: Get full downline stats including legs and qualified milestone volume
function getDownlineNetworkStats(username) {
    const directLegs = [];
    const target = username.toLowerCase();
    
    // Find all direct referrals (legs)
    Object.keys(usersData).forEach(u => {
        const user = usersData[u];
        if (user.referrer && user.referrer.toLowerCase() === target) {
            directLegs.push(user.username);
        }
    });
    
    let totalDownlineVolume = 0;
    const allMembers = [];
    const legsVolumes = {};
    
    directLegs.forEach(leg => {
        const legMembers = [];
        const structureSet = new Set([username.toLowerCase(), leg.toLowerCase()]);
        
        let legActiveStakeAmt = 0;
        const legUser = usersData[leg.toLowerCase()];
        if (legUser && legUser.stakes) {
            legUser.stakes.forEach(s => {
                if (s.active !== false) legActiveStakeAmt += s.amount;
            });
        }
        
        legMembers.push({
            level: 1,
            username: leg,
            activeStake: legActiveStakeAmt,
            joinDate: (legUser && legUser.transactions && legUser.transactions[0]) ? legUser.transactions[0].timestamp : Date.now()
        });
        
        const subVolume = getSubtreeVolumeAndStructure(leg, 2, 10, legMembers, structureSet);
        const legTotalVolume = legActiveStakeAmt + subVolume;
        
        legsVolumes[leg.toLowerCase()] = legTotalVolume;
        totalDownlineVolume += legTotalVolume;
        
        legMembers.forEach(m => allMembers.push(m));
    });
    
    return {
        totalVolume: totalDownlineVolume,
        members: allMembers,
        legsVolumes: legsVolumes
    };
}

// Helper: Calculate qualified volume for a milestone target using matching lines volume rule
function getQualifiedMilestoneVolume(legsVolumes, targetT) {
    const vols = Object.values(legsVolumes).sort((a, b) => b - a);
    if (vols.length === 0) return 0;
    if (vols.length === 1) return 0; // matching requires at least 2 lines
    
    const strongest = vols[0];
    const restSum = vols.slice(1).reduce((sum, v) => sum + v, 0);
    
    return Math.min(strongest, restSum);
}

// Helper: Get user active staked principal
function getUserActivePrincipal(user) {
    let active = 0;
    if (user.stakes) {
        user.stakes.forEach(s => {
            if (s.active !== false) {
                active += s.amount;
            }
        });
    }
    return active;
}

// Distribution: Multi-level stake referral commissions (up to 10 levels)
function distributeStakeCommissions(stakerUsername, stakeAmount) {
    const commissionRates = {
        1: 0.05, // 5%
        2: 0.02, // 2%
        3: 0.01, // 1%
        4: 0.01, // 1%
        5: 0.01, // 1%
        6: 0.004, // 0.4%
        7: 0.004,
        8: 0.004,
        9: 0.004,
        10: 0.004
    };
    
    let currentUpline = usersData[stakerUsername.toLowerCase()].referrer;
    let level = 1;
    
    while (currentUpline && level <= 10) {
        const uplineUser = usersData[currentUpline.toLowerCase()];
        if (!uplineUser) break;
        
        // Qualification check: Direct active referrals
        let qualified = false;
        const activeDirects = getActiveDirectReferralsCount(uplineUser.username);
        
        if (level === 1) {
            qualified = true; // Level 1 is direct, always qualified
        } else {
            qualified = activeDirects >= level;
        }
        
        if (qualified) {
            const activePrincipal = getUserActivePrincipal(uplineUser);
            const capLimit = activePrincipal * 3.0;
            const currentEarnings = uplineUser.cumulativeEarnings || 0;
            
            if (activePrincipal > 0 && currentEarnings < capLimit) {
                let commission = stakeAmount * commissionRates[level];
                const remainingSpace = capLimit - currentEarnings;
                
                if (commission > remainingSpace) {
                    commission = remainingSpace;
                }
                
                if (commission > 0) {
                    uplineUser.balance = (uplineUser.balance || 0) + commission;
                    uplineUser.referralIncome = (uplineUser.referralIncome || 0) + commission;
                    uplineUser.cumulativeEarnings = (uplineUser.cumulativeEarnings || 0) + commission;
                    
                    uplineUser.transactions = uplineUser.transactions || [];
                    uplineUser.transactions.push({
                        type: "Referral Commission",
                        amount: commission,
                        unit: "ELX",
                        timestamp: Date.now(),
                        desc: `Received Level ${level} network commission from downline user ${stakerUsername}.`
                    });
                }
            }
        }
        
        currentUpline = uplineUser.referrer;
        level++;
    }
}

// Distribution: Yield ROI Multiplier Bonus (up to 5 levels)
function distributeRoiCommissions(stakerUsername, yieldAmount) {
    const roiRates = {
        1: 0.10, // 10%
        2: 0.05, // 5%
        3: 0.03, // 3%
        4: 0.02, // 2%
        5: 0.01  // 1%
    };
    
    let currentUpline = usersData[stakerUsername.toLowerCase()].referrer;
    let level = 1;
    
    while (currentUpline && level <= 5) {
        const uplineUser = usersData[currentUpline.toLowerCase()];
        if (!uplineUser) break;
        
        const activePrincipal = getUserActivePrincipal(uplineUser);
        const capLimit = activePrincipal * 3.0;
        const currentEarnings = uplineUser.cumulativeEarnings || 0;
        
        if (activePrincipal > 0 && currentEarnings < capLimit) {
            let commission = yieldAmount * roiRates[level];
            const remainingSpace = capLimit - currentEarnings;
            
            if (commission > remainingSpace) {
                commission = remainingSpace;
            }
            
            if (commission > 0) {
                uplineUser.balance = (uplineUser.balance || 0) + commission;
                uplineUser.roiLevelIncome = (uplineUser.roiLevelIncome || 0) + commission;
                uplineUser.cumulativeEarnings = (uplineUser.cumulativeEarnings || 0) + commission;
                
                uplineUser.transactions = uplineUser.transactions || [];
                uplineUser.transactions.push({
                    type: "ROI Level Bonus",
                    amount: commission,
                    unit: "ELX",
                    timestamp: Date.now(),
                    desc: `Received Level ${level} yield multiplier bonus from downline user ${stakerUsername}.`
                });
            }
        }
        
        currentUpline = uplineUser.referrer;
        level++;
    }
}

// Premature withdrawal execution helper
function executeEarlyUnstake(index, penalty) {
    const user = usersData[activeSession.username.toLowerCase()];
    const stake = user.stakes[index];
    const pool = STAKING_POOLS[stake.poolId];
    const netPrincipal = stake.amount - penalty;
    
    // Increment global ecosystem utility pool penalties
    let utilityPool = parseFloat(localStorage.getItem("elonix_ecosystem_utility_pool") || "0");
    utilityPool += penalty;
    localStorage.setItem("elonix_ecosystem_utility_pool", utilityPool.toString());
    
    // Principal returned to original source minus penalty
    const source = stake.source || "deposit";
    if (source === "deposit") {
        user.depositedBalance = (user.depositedBalance || 0) + netPrincipal;
        user.balance += netPrincipal;
    } else {
        const spaceInWelcome = 10 - (user.welcomeBonus || 0);
        if (netPrincipal <= spaceInWelcome) {
            user.welcomeBonus = (user.welcomeBonus || 0) + netPrincipal;
            user.balance += netPrincipal;
        } else {
            user.welcomeBonus = 10;
            user.balance += spaceInWelcome;
            user.miningBalance = (user.miningBalance || 0) + (netPrincipal - spaceInWelcome);
        }
    }
    
    // Log transaction
    user.transactions.push({
        type: "Premature Unstake",
        amount: netPrincipal,
        unit: "ELX",
        timestamp: Date.now(),
        desc: `Prematurely unstaked from ${pool.name} with 20% penalty of ${penalty.toFixed(2)} ELX.`
    });
    
    // Remove stake
    user.stakes.splice(index, 1);
    
    saveUsersData();
    loadDashboard(user.username);
    showToast(`Early unstake complete. ${penalty.toFixed(2)} ELX penalty applied.`);
}

// Render Referral Tab view
// Render Referral Tab view
window.switchRefSubTab = function(tabName) {
    const tabEarnings = document.getElementById("refEarningsSubTab");
    const tabTree = document.getElementById("refTreeSubTab");
    const tabLinks = document.getElementById("refLinksSubTab");
    
    const btnEarnings = document.getElementById("refSubBtnEarnings");
    const btnTree = document.getElementById("refSubBtnTree");
    const btnLinks = document.getElementById("refSubBtnLinks");
    
    if (tabEarnings) tabEarnings.style.display = tabName === 'earnings' ? 'grid' : 'none';
    if (tabTree) tabTree.style.display = tabName === 'tree' ? 'block' : 'none';
    if (tabLinks) tabLinks.style.display = tabName === 'links' ? 'grid' : 'none';
    
    if (btnEarnings) btnEarnings.classList.toggle("active", tabName === 'earnings');
    if (btnTree) btnTree.classList.toggle("active", tabName === 'tree');
    if (btnLinks) btnLinks.classList.toggle("active", tabName === 'links');
};

function setupReferralsEventListeners() {
    const searchInput = document.getElementById("downlineSearchInput");
    const statusFilter = document.getElementById("downlineStatusFilter");
    
    if (searchInput && !searchInput.dataset.listener) {
        searchInput.dataset.listener = "true";
        searchInput.addEventListener("input", () => {
            if (activeSession) {
                renderReferralsNetworkView(usersData[activeSession.username.toLowerCase()]);
            }
        });
    }
    
    if (statusFilter && !statusFilter.dataset.listener) {
        statusFilter.dataset.listener = "true";
        statusFilter.addEventListener("change", () => {
            if (activeSession) {
                renderReferralsNetworkView(usersData[activeSession.username.toLowerCase()]);
            }
        });
    }
}

function renderReferralsNetworkView(user) {
    setupReferralsEventListeners();

    const referralUrlInput = document.getElementById("referralUrlInput");
    if (referralUrlInput) {
        const loc = window.location;
        referralUrlInput.value = `${loc.protocol}//${loc.host}${loc.pathname}?ref=${user.username}`;
    }
    
    const btnCopy = document.getElementById("btnCopyReferralUrl");
    if (btnCopy) {
        btnCopy.onclick = () => {
            if (referralUrlInput) {
                referralUrlInput.select();
                referralUrlInput.setSelectionRange(0, 99999);
                navigator.clipboard.writeText(referralUrlInput.value);
                showToast("Referral link copied!");
            }
        };
    }
    
    const directSponsorText = document.getElementById("refDirectSponsor");
    if (directSponsorText) {
        directSponsorText.innerText = user.referrer || "None";
    }
    
    const stats = getDownlineNetworkStats(user.username);
    const activeDirects = getActiveDirectReferralsCount(user.username);
    
    let totalDirectsCount = 0;
    Object.keys(usersData).forEach(u => {
        const uObj = usersData[u];
        if (uObj.referrer && uObj.referrer.toLowerCase() === user.username.toLowerCase()) {
            totalDirectsCount++;
        }
    });
    
    const refReferralCounts = document.getElementById("refReferralCounts");
    if (refReferralCounts) {
        refReferralCounts.innerText = `${activeDirects} / ${totalDirectsCount}`;
    }
    
    const refDownlineVolume = document.getElementById("refDownlineVolume");
    if (refDownlineVolume) {
        refDownlineVolume.innerText = `${stats.totalVolume.toFixed(2)} ELX`;
    }
    
    const refReferralIncome = document.getElementById("refReferralIncome");
    if (refReferralIncome) {
        refReferralIncome.innerText = `${(user.referralIncome || 0).toFixed(4)} ELX`;
    }
    
    const refRoiLevelIncome = document.getElementById("refRoiLevelIncome");
    if (refRoiLevelIncome) {
        refRoiLevelIncome.innerText = `${(user.roiLevelIncome || 0).toFixed(4)} ELX`;
    }
    
    const activePrincipal = getUserActivePrincipal(user);
    const capLimit = activePrincipal * 3.0;
    const currentEarnings = user.cumulativeEarnings || 0;
    
    const capActivePrincipal = document.getElementById("capActivePrincipal");
    if (capActivePrincipal) {
        capActivePrincipal.innerText = `${activePrincipal.toFixed(2)} ELX`;
    }
    const capCumulativeEarnings = document.getElementById("capCumulativeEarnings");
    if (capCumulativeEarnings) {
        capCumulativeEarnings.innerText = `${currentEarnings.toFixed(4)} ELX`;
    }
    const capMaxLimit = document.getElementById("capMaxLimit");
    if (capMaxLimit) {
        capMaxLimit.innerText = `${capLimit.toFixed(2)} ELX`;
    }
    
    const capProgressBar = document.getElementById("capProgressBar");
    const capStatusAlert = document.getElementById("capStatusAlert");
    
    let progressPercent = 0;
    if (capLimit > 0) {
        progressPercent = Math.min(100, (currentEarnings / capLimit) * 100);
    }
    if (capProgressBar) {
        capProgressBar.style.width = `${progressPercent}%`;
    }
    if (capStatusAlert) {
        if (capLimit > 0 && currentEarnings >= capLimit) {
            capStatusAlert.style.display = "block";
        } else {
            capStatusAlert.style.display = "none";
        }
    }
    
    const milestones = [
        { id: "star", name: "Star Core Node", target: 5000, rewardText: "Smartwatch OR 100 ELX Cash", rewardAmt: 100 },
        { id: "silver", name: "Silver Master Node", target: 20000, rewardText: "High-End Laptop OR 400 ELX Cash", rewardAmt: 400 },
        { id: "gold", name: "Gold Executive Node", target: 50000, rewardText: "Sports Motorcycle OR 1,000 ELX Cash", rewardAmt: 1000 },
        { id: "diamond", name: "Diamond Legend Node", target: 200000, rewardText: "Luxury Sedan OR 5,000 ELX Cash", rewardAmt: 5000 },
        { id: "double_diamond", name: "Double Diamond Sovereign", target: 800000, rewardText: "Luxury SUV OR 7,000 ELX Cash", rewardAmt: 7000 }
    ];
    
    const mContainer = document.getElementById("milestonesContainer");
    if (mContainer) {
        mContainer.innerHTML = "";
        
        milestones.forEach(m => {
            const qualifiedVol = getQualifiedMilestoneVolume(stats.legsVolumes, m.target);
            const progressPct = Math.min(100, (qualifiedVol / m.target) * 100);
            
            const isClaimed = (user.milestonesClaimed || []).includes(m.id);
            const canClaim = qualifiedVol >= m.target && !isClaimed;
            
            let statusBadge = "";
            let actionBtn = "";
            
            if (isClaimed) {
                statusBadge = `<span class="badge-status open" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: var(--success);">Claimed</span>`;
            } else if (qualifiedVol >= m.target) {
                statusBadge = `<span class="badge-status open" style="background: rgba(0, 240, 255, 0.1); border-color: var(--accent-cyan); color: var(--accent-cyan);">Unlocked</span>`;
                actionBtn = `<button class="btn btn-primary btn-glow btn-sm" onclick="claimMilestoneReward('${m.id}')" style="margin-top: 0.5rem; width: 100%; padding: 0.35rem;">Claim ${m.rewardAmt} ELX</button>`;
            } else {
                statusBadge = `<span class="badge-status closed" style="background: rgba(255, 255, 255, 0.02); border-color: var(--border-titanium); color: var(--text-muted);">Locked</span>`;
            }
            
            const mDiv = document.createElement("div");
            mDiv.style.background = "rgba(255, 255, 255, 0.01)";
            mDiv.style.border = "1px solid var(--border-titanium)";
            mDiv.style.padding = "0.75rem";
            mDiv.style.borderRadius = "6px";
            
            mDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <strong style="font-size: 0.85rem;">${m.name} ($${m.target.toLocaleString()})</strong>
                    ${statusBadge}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                    Reward: ${m.rewardText}
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                    <span>Qualified Volume: ${qualifiedVol.toFixed(2)} / ${m.target.toLocaleString()} ELX</span>
                    <span>${progressPct.toFixed(1)}%</span>
                </div>
                <div class="progress-container" style="height: 6px; background: rgba(255, 255, 255, 0.02); border-radius: 3px; overflow: hidden;">
                    <div style="width: ${progressPct}%; height: 100%; background: var(--accent-cyan);"></div>
                </div>
                ${actionBtn}
            `;
            mContainer.appendChild(mDiv);
        });
    }
    
    const treeBody = document.getElementById("downlineNetworkBody");
    if (treeBody) {
        treeBody.innerHTML = "";
        
        const searchInput = document.getElementById("downlineSearchInput");
        const statusFilter = document.getElementById("downlineStatusFilter");
        const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
        const statusVal = statusFilter ? statusFilter.value : "ALL";
        
        let filteredMembers = stats.members;
        if (query) {
            filteredMembers = filteredMembers.filter(m => m.username.toLowerCase().includes(query));
        }
        if (statusVal !== "ALL") {
            filteredMembers = filteredMembers.filter(m => {
                const isActive = m.activeStake > 0;
                return statusVal === "ACTIVE" ? isActive : !isActive;
            });
        }
        
        const sortedMembers = filteredMembers.sort((a, b) => a.level - b.level);
        if (sortedMembers.length === 0) {
            treeBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-table-msg" style="text-align: center; padding: 2rem 0; font-size: 0.8rem; color: var(--text-muted);">
                        No downline connections match the current filters.
                    </td>
                </tr>
            `;
            return;
        }
        
        sortedMembers.forEach(m => {
            const userObj = usersData[m.username.toLowerCase()];
            const joinDateVal = userObj && userObj.joinDate ? userObj.joinDate : Date.now();
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-weight: 600;">L${m.level}</td>
                <td class="font-tech text-cyan">${m.username}</td>
                <td class="font-tech">${m.activeStake.toFixed(2)} ELX</td>
                <td>${formatDateShort(new Date(joinDateVal))}</td>
                <td style="text-align: right;">
                    <span class="badge-status ${m.activeStake > 0 ? 'open' : 'closed'}">
                        ${m.activeStake > 0 ? 'Active' : 'Inactive'}
                    </span>
                </td>
            `;
            treeBody.appendChild(tr);
        });
    }
}

// Claim Milestone Reward logic
window.claimMilestoneReward = function(milestoneId) {
    if (!activeSession) return;
    const user = usersData[activeSession.username.toLowerCase()];
    if (!user) return;
    
    const stats = getDownlineNetworkStats(user.username);
    
    const milestones = {
        star: { target: 5000, amt: 100, name: "Star Core Node" },
        silver: { target: 20000, amt: 400, name: "Silver Master Node" },
        gold: { target: 50000, amt: 1000, name: "Gold Executive Node" },
        diamond: { target: 200000, amt: 5000, name: "Diamond Legend Node" },
        double_diamond: { target: 800000, amt: 7000, name: "Double Diamond Sovereign" }
    };
    
    const m = milestones[milestoneId];
    if (!m) return;
    
    const qualifiedVol = getQualifiedMilestoneVolume(stats.legsVolumes, m.target);
    if (qualifiedVol < m.target) {
        showToast("You are not qualified for this milestone reward.");
        return;
    }
    
    user.milestonesClaimed = user.milestonesClaimed || [];
    if (user.milestonesClaimed.includes(milestoneId)) {
        showToast("Milestone reward already claimed.");
        return;
    }
    
    user.milestonesClaimed.push(milestoneId);
    user.balance = (user.balance || 0) + m.amt;
    
    user.transactions = user.transactions || [];
    user.transactions.push({
        type: "Milestone Reward",
        amount: m.amt,
        unit: "ELX",
        timestamp: Date.now(),
        desc: `Claimed Cash Reward for achieving rank ${m.name}!`
    });
    
    saveUsersData();
    renderReferralsNetworkView(user);
    refreshBalanceDisplays(user);
    showToast(`Congratulations! Claimed ${m.amt} ELX cash reward!`);
};




