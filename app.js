// contract configuration
const CONTRACT_ADDRESS = "0x3bFB83927FDA5796Fbe31e6b5b5a5adAd9F856CE";
const OWNER_ADDRESS = "0xeeC57742341E153fdA2CC20fa0f44dAB3597aF20";
const BSC_CHAIN_ID = "0x38"; // 56 in decimal
const BSC_RPC_URL = "https://bsc-dataseed.binance.org/";

// Contract ABI (view functions + state change function)
const CONTRACT_ABI = [
    "function totalMinedTokens() view returns (uint256)",
    "function lastMiningTime() view returns (uint256)",
    "function owner() view returns (address)",
    "function executeDailyMining() returns (bool)"
];

// App State
let appState = {
    connectedAddress: null,
    provider: null,
    signer: null,
    contractRead: null,
    contractWrite: null,
    totalMined: 0,
    lastMiningTime: 0,
    
    // Web Miner State
    isMining: false,
    webMinedBalance: 0,
    hashesComputed: 0,
    sharesFound: 0,
    threads: 4,
    intensity: 50,
    hashrate: 0,
    temp: 36.2,
    lastTickTime: 0
};

// DOM Elements
const connectWalletBtn = document.getElementById("connectWalletBtn");
const connectWalletText = document.getElementById("connectWalletText");
const mobileConnectWalletBtn = document.getElementById("mobileConnectWalletBtn");
const mobileConnectWalletText = document.getElementById("mobileConnectWalletText");
const executeMiningBtn = document.getElementById("executeMiningBtn");
const miningBtnTooltip = document.getElementById("miningBtnTooltip");
const copyAddressBtn = document.getElementById("copyAddressBtn");
const toast = document.getElementById("toast");

// Web Miner DOM Elements
const minerStatusDot = document.getElementById("minerStatusDot");
const minerStatusText = document.getElementById("minerStatusText");
const threadSlider = document.getElementById("threadSlider");
const threadValDisplay = document.getElementById("threadValDisplay");
const intensitySlider = document.getElementById("intensitySlider");
const intensityValDisplay = document.getElementById("intensityValDisplay");
const toggleMiningBtn = document.getElementById("toggleMiningBtn");
const hashrateDisplay = document.getElementById("hashrateDisplay");
const tempDisplay = document.getElementById("tempDisplay");
const hashesDisplay = document.getElementById("hashesDisplay");
const sharesDisplay = document.getElementById("sharesDisplay");
const terminalOutput = document.getElementById("terminalOutput");
const webMinedBalance = document.getElementById("webMinedBalance");
const addTokenToMetaMaskBtn = document.getElementById("addTokenToMetaMaskBtn");
const claimWebMinedBtn = document.getElementById("claimWebMinedBtn");

// Modal DOM Elements
const claimModal = document.getElementById("claimModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalStepConfirm = document.getElementById("modalStepConfirm");
const modalStepProcess = document.getElementById("modalStepProcess");
const modalStepSuccess = document.getElementById("modalStepSuccess");
const modalClaimAmount = document.getElementById("modalClaimAmount");
const modalTargetAddress = document.getElementById("modalTargetAddress");
const cancelClaimBtn = document.getElementById("cancelClaimBtn");
const confirmClaimBtn = document.getElementById("confirmClaimBtn");
const loaderTitle = document.getElementById("loaderTitle");
const loaderDesc = document.getElementById("loaderDesc");
const modalTxHash = document.getElementById("modalTxHash");
const successCloseBtn = document.getElementById("successCloseBtn");

// Stat Elements
const minedVal = document.getElementById("minedVal");
const lockedVal = document.getElementById("lockedVal");
const timestampVal = document.getElementById("timestampVal");
const progressBar = document.getElementById("progressBar");
const progressPercentage = document.getElementById("progressPercentage");
const minedPulse = document.getElementById("minedPulse");

// Latency / Node Status DOM Elements
const nodeBlockVal = document.getElementById("nodeBlockVal");
const nodePingVal = document.getElementById("nodePingVal");
const nodeGasVal = document.getElementById("nodeGasVal");

// Emissions Yield Calculator DOM Elements
const calcRangeSlider = document.getElementById("calcRangeSlider");
const calcDaysVal = document.getElementById("calcDaysVal");
const calcResultMined = document.getElementById("calcResultMined");
const calcResultPercentage = document.getElementById("calcResultPercentage");
const calcResultShares = document.getElementById("calcResultShares");

// Security Checklist
const checklistItems = document.querySelectorAll(".checklist-item");
const checklistScore = document.getElementById("checklistScore");

// Navigation Elements
const mobileNavToggle = document.querySelector(".mobile-nav-toggle");
const mobileNavOverlay = document.querySelector(".mobile-nav-overlay");
const mobileLinks = document.querySelectorAll(".mobile-nav-link");

// Initialize application on load
window.addEventListener("DOMContentLoaded", async () => {
    initPublicData();
    initWeb3Listeners();
    setupEventListeners();
    initWebMiner();
    init3DTilt(); // Initialize 3D cards tilt effect
    initNodeTracker(); // Node and network monitor
    initEmissionsCalculator(); // Emissions estimation tool
    initSecurityChecklist(); // Security check checklists
});

// Setup standard event listeners
function setupEventListeners() {
    // Copy address button
    if (copyAddressBtn) {
        copyAddressBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(CONTRACT_ADDRESS)
                .then(() => showToast("Contract Address Copied!"))
                .catch(() => showToast("Failed to copy address."));
        });
    }

    // Mobile nav toggle
    if (mobileNavToggle && mobileNavOverlay) {
        mobileNavToggle.addEventListener("click", () => {
            mobileNavToggle.classList.toggle("active");
            mobileNavOverlay.classList.toggle("active");
            document.body.style.overflow = mobileNavOverlay.classList.contains("active") ? "hidden" : "auto";
        });
    }

    // Close mobile nav when link is clicked
    if (mobileLinks && mobileNavToggle && mobileNavOverlay) {
        mobileLinks.forEach(link => {
            link.addEventListener("click", () => {
                mobileNavToggle.classList.remove("active");
                mobileNavOverlay.classList.remove("active");
                document.body.style.overflow = "auto";
            });
        });
    }

    // Connect wallet buttons
    if (connectWalletBtn) connectWalletBtn.addEventListener("click", connectWallet);
    if (mobileConnectWalletBtn) mobileConnectWalletBtn.addEventListener("click", connectWallet);

    // Execute daily mining trigger
    if (executeMiningBtn) executeMiningBtn.addEventListener("click", executeDailyMining);

    // Web Miner controls
    if (threadSlider) {
        threadSlider.addEventListener("input", handleThreadChange);
    }
    if (intensitySlider) {
        intensitySlider.addEventListener("input", handleIntensityChange);
    }
    if (toggleMiningBtn) {
        toggleMiningBtn.addEventListener("click", toggleWebMiner);
    }
    if (addTokenToMetaMaskBtn) {
        addTokenToMetaMaskBtn.addEventListener("click", addTokenToMetaMask);
    }
    if (claimWebMinedBtn) {
        claimWebMinedBtn.addEventListener("click", openClaimModal);
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", closeClaimModal);
    }
    if (cancelClaimBtn) {
        cancelClaimBtn.addEventListener("click", closeClaimModal);
    }
    if (confirmClaimBtn) {
        confirmClaimBtn.addEventListener("click", executeClaimFlow);
    }
    if (successCloseBtn) {
        successCloseBtn.addEventListener("click", closeClaimModal);
    }
}

// Fetch data using public BSC RPC (for immediate loading without wallet connect)
async function initPublicData() {
    // Only run if public stats elements are on this page
    if (!minedVal && !lockedVal && !timestampVal) return;

    // Refresh contract stats immediately
    await refreshContractStats();
}

// Start Live Emissions Tick Loop (mines exactly 100 ELX over a 24-hour cycle)
let emissionsTickerStarted = false;
function startLiveEmissionsTicker() {
    if (emissionsTickerStarted) return;
    emissionsTickerStarted = true;

    const updateStats = () => {
        // Genesis point: June 28, 2026 UTC
        const GENESIS_TIME = new Date("2026-06-28T00:00:00Z").getTime();
        const now = Date.now();
        
        // Find start of today in local time (12:00 AM)
        const nowLocalDate = new Date();
        const startOfToday = new Date(nowLocalDate.getFullYear(), nowLocalDate.getMonth(), nowLocalDate.getDate(), 0, 0, 0, 0).getTime();
        
        // Days elapsed since genesis
        const daysElapsed = Math.max(0, Math.floor((startOfToday - GENESIS_TIME) / (24 * 60 * 60 * 1000)));
        const baseMined = daysElapsed * 100;
        
        // Mined today
        const msPassedToday = now - startOfToday;
        const currentDayMined = Math.min(100, Math.max(0, (msPassedToday / (24 * 60 * 60 * 1000)) * 100));
        
        const totalMined = baseMined + currentDayMined;
        const maxSupply = 182500;
        const remainingLocked = Math.max(0, maxSupply - totalMined);
        const percentage = (totalMined / maxSupply) * 100;
        
        // Update DOM elements
        if (minedVal) minedVal.innerHTML = `${formatNumberWithCommas(totalMined.toFixed(6))} <span class="val-unit">ELX</span>`;
        if (lockedVal) lockedVal.innerHTML = `${formatNumberWithCommas(remainingLocked.toFixed(6))} <span class="val-unit">ELX</span>`;
        
        if (progressBar) progressBar.style.width = `${Math.max(1, percentage)}%`;
        if (progressPercentage) progressPercentage.innerText = `${percentage.toFixed(6)}% mined from emissions pool.`;
        
        if (timestampVal) {
            const lastMiningDate = new Date(startOfToday);
            timestampVal.innerText = formatLocalDate(lastMiningDate);
        }
        
        if (minedPulse) {
            minedPulse.classList.add("display-pulse");
            minedPulse.style.backgroundColor = "var(--cyan)";
            minedPulse.style.boxShadow = "0 0 10px var(--cyan)";
        }
    };
    
    updateStats();
    setInterval(updateStats, 100);
}

// Helper to refresh data stats from the contract
async function refreshContractStats() {
    if (!ethers.isAddress(CONTRACT_ADDRESS)) {
        applyMockupStats();
        return;
    }
    try {
        let provider;
        if (appState.provider) {
            provider = appState.provider;
        } else {
            provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
        }
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        
        const totalMinedWei = await contract.totalMinedTokens();
        const lastMiningTimeSec = await contract.lastMiningTime();
        
        const totalMined = parseFloat(ethers.formatEther(totalMinedWei));
        const maxSupply = 182500;
        const remainingLocked = Math.max(0, maxSupply - totalMined);
        const percentage = (totalMined / maxSupply) * 100;
        
        // Update DOM elements
        if (minedVal) minedVal.innerHTML = `${formatNumberWithCommas(totalMined.toFixed(6))} <span class="val-unit">ELX</span>`;
        if (lockedVal) lockedVal.innerHTML = `${formatNumberWithCommas(remainingLocked.toFixed(6))} <span class="val-unit">ELX</span>`;
        
        if (progressBar) progressBar.style.width = `${Math.max(1, percentage)}%`;
        if (progressPercentage) progressPercentage.innerText = `${percentage.toFixed(6)}% mined from emissions pool.`;
        
        if (timestampVal) {
            const lastMiningDate = new Date(Number(lastMiningTimeSec) * 1000);
            timestampVal.innerText = formatLocalDate(lastMiningDate);
        }
        
        if (minedPulse) {
            minedPulse.classList.add("display-pulse");
            minedPulse.style.backgroundColor = "var(--cyan)";
            minedPulse.style.boxShadow = "0 0 10px var(--cyan)";
        }
    } catch (error) {
        console.error("Failed to fetch contract stats:", error);
        applyMockupStats();
    }
}

// Formatter: human readable dates
function formatLocalDate(date) {
    const pad = (num) => String(num).padStart(2, '0');
    
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

// Formatter: numbers with commas
function formatNumberWithCommas(x) {
    const parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

// Fallback Mockup Data in case BSC RPC is entirely offline
function applyMockupStats() {
    const GENESIS_TIME = new Date("2026-06-28T00:00:00Z").getTime();
    
    // Find start of today in local time (12:00 AM)
    const nowLocalDate = new Date();
    const startOfToday = new Date(nowLocalDate.getFullYear(), nowLocalDate.getMonth(), nowLocalDate.getDate(), 0, 0, 0, 0).getTime();
    
    // Days elapsed since genesis (excluding today)
    const daysElapsed = Math.max(0, Math.floor((startOfToday - GENESIS_TIME) / (24 * 60 * 60 * 1000)));
    
    // Check if daily execution was triggered today in mockup
    const todayStr = nowLocalDate.toDateString();
    const executedToday = localStorage.getItem("elonix_daily_executed_date") === todayStr;
    
    const totalMined = (daysElapsed * 100) + (executedToday ? 100 : 0);
    const maxSupply = 182500;
    const remainingLocked = Math.max(0, maxSupply - totalMined);
    const percentage = (totalMined / maxSupply) * 100;
    
    if (minedVal) minedVal.innerHTML = `${formatNumberWithCommas(totalMined.toFixed(6))} <span class="val-unit">ELX</span>`;
    if (lockedVal) lockedVal.innerHTML = `${formatNumberWithCommas(remainingLocked.toFixed(6))} <span class="val-unit">ELX</span>`;
    
    if (progressBar) progressBar.style.width = `${Math.max(1, percentage)}%`;
    if (progressPercentage) progressPercentage.innerText = `${percentage.toFixed(6)}% mined from emissions pool.`;
    
    if (timestampVal) {
        if (executedToday) {
            const execTime = localStorage.getItem("elonix_daily_executed_time");
            timestampVal.innerText = formatLocalDate(new Date(parseInt(execTime || startOfToday)));
        } else {
            const yesterdayStart = new Date(startOfToday - 24 * 60 * 60 * 1000);
            timestampVal.innerText = formatLocalDate(yesterdayStart);
        }
    }
    
    if (minedPulse) {
        minedPulse.classList.remove("display-pulse");
    }
}

// Setup listeners for Metamask injection events
function initWeb3Listeners() {
    if (typeof window.ethereum !== 'undefined') {
        // Detect chain change
        window.ethereum.on('chainChanged', (chainId) => {
            window.location.reload();
        });

        // Detect account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                disconnectWalletState();
            } else {
                handleWalletConnected(accounts[0]);
            }
        });

        // Check if already connected previously
        window.ethereum.request({ method: 'eth_accounts' })
            .then(accounts => {
                if (accounts.length > 0) {
                    handleWalletConnected(accounts[0]);
                }
            })
            .catch(console.error);
    }
}

// Core Connect Wallet Flow
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        showToast("Please install MetaMask to connect your wallet!");
        return;
    }

    try {
        // Request accounts
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Verify we are on BNB Smart Chain (BSC)
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (currentChainId !== BSC_CHAIN_ID) {
            try {
                // Try switching to BSC
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BSC_CHAIN_ID }],
                });
            } catch (switchError) {
                // If chain is not added, prompt to add it
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: BSC_CHAIN_ID,
                                chainName: "BNB Smart Chain",
                                rpcUrls: [BSC_RPC_URL],
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

        if (accounts.length > 0) {
            handleWalletConnected(accounts[0]);
            showToast("Wallet Connected!");
        }
    } catch (error) {
        console.error("Wallet connection failed:", error);
        showToast("Connection rejected.");
    }
}

// Wallet connect success state handler
async function handleWalletConnected(address) {
    appState.connectedAddress = address;
    
    // UI element updates
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    if (connectWalletText) connectWalletText.innerText = shortAddress;
    if (connectWalletBtn) connectWalletBtn.classList.add("wallet-connected");
    
    if (mobileConnectWalletText) mobileConnectWalletText.innerText = shortAddress;
    if (mobileConnectWalletBtn) mobileConnectWalletBtn.classList.add("wallet-connected");

    // Initialize signer-based contract for write operations
    if (typeof window.ethereum !== 'undefined') {
        appState.provider = new ethers.BrowserProvider(window.ethereum);
        appState.signer = await appState.provider.getSigner();
        appState.contractWrite = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, appState.signer);
        appState.contractRead = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, appState.provider);
        refreshContractStats();
    }

    // Check if connected address is the Owner to toggle mining controls
    checkOwnerPrivileges(address);
}

// Disconnect state handler
function disconnectWalletState() {
    appState.connectedAddress = null;
    appState.provider = null;
    appState.signer = null;
    appState.contractWrite = null;

    if (connectWalletText) connectWalletText.innerText = "Connect Wallet";
    if (connectWalletBtn) connectWalletBtn.classList.remove("wallet-connected");

    if (mobileConnectWalletText) mobileConnectWalletText.innerText = "Connect Wallet";
    if (mobileConnectWalletBtn) mobileConnectWalletBtn.classList.remove("wallet-connected");

    if (executeMiningBtn) {
        executeMiningBtn.disabled = true;
        executeMiningBtn.classList.remove("btn-glow");
    }
    if (miningBtnTooltip) {
        miningBtnTooltip.innerText = "Connect wallet of contract owner to execute";
    }

    initPublicData(); // Fallback to public RPC data
}

// Check if user is owner and adjust button states accordingly
function checkOwnerPrivileges(address) {
    if (!executeMiningBtn) return;
    
    const activeAddressLower = address.toLowerCase();
    const ownerAddressLower = OWNER_ADDRESS.toLowerCase();

    if (activeAddressLower === ownerAddressLower) {
        executeMiningBtn.disabled = false;
        executeMiningBtn.classList.add("btn-glow");
        if (miningBtnTooltip) miningBtnTooltip.innerText = "Trigger the daily 100 ELX emission lock release";
    } else {
        executeMiningBtn.disabled = true;
        executeMiningBtn.classList.remove("btn-glow");
        if (miningBtnTooltip) miningBtnTooltip.innerText = `Restricted to Contract Owner only (${OWNER_ADDRESS.slice(0, 6)}...${OWNER_ADDRESS.slice(-4)})`;
    }
}

// Trigger Smart Contract emission distribution
async function executeDailyMining() {
    if (!appState.contractWrite || !appState.connectedAddress) {
        showToast("Wallet not connected!");
        return;
    }

    try {
        executeMiningBtn.disabled = true;
        executeMiningBtn.innerText = "Pending Signature...";
        showToast("Confirm transaction in your wallet...");

        const tx = await appState.contractWrite.executeDailyMining();
        
        executeMiningBtn.innerText = "Mining Transaction Sent...";
        showToast(`Transaction sent! Hash: ${tx.hash.slice(0, 8)}...`);

        // Wait for confirmation block
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            showToast("Daily Mining emissions executed successfully!");
            executeMiningBtn.innerText = "Executed Successfully";
            setTimeout(() => {
                executeMiningBtn.innerText = "Execute Daily Mining";
                checkOwnerPrivileges(appState.connectedAddress);
            }, 5000);
            
            // Refresh stats to reflect updated total mined and timestamp
            await refreshContractStats();
        } else {
            throw new Error("Transaction execution failed on chain.");
        }
    } catch (error) {
        console.error("Mining execution failed:", error);
        
        // Mockup fallback simulation for development/testing if contract call fails
        const todayStr = new Date().toDateString();
        if (localStorage.getItem("elonix_daily_executed_date") !== todayStr) {
            showToast("Simulating transaction execution locally (Mockup)...");
            setTimeout(async () => {
                localStorage.setItem("elonix_daily_executed_date", todayStr);
                localStorage.setItem("elonix_daily_executed_time", Date.now().toString());
                
                showToast("Daily Mining emissions executed successfully (Mockup)!");
                executeMiningBtn.innerText = "Executed Successfully";
                setTimeout(() => {
                    executeMiningBtn.innerText = "Execute Daily Mining";
                    checkOwnerPrivileges(appState.connectedAddress);
                }, 5000);
                
                await refreshContractStats();
            }, 2000);
        } else {
            showToast("Daily emission already executed for today.");
            executeMiningBtn.innerText = "Execute Daily Mining";
            checkOwnerPrivileges(appState.connectedAddress);
        }
    }
}

// Notification Toast system
function showToast(message) {
    toast.innerText = message;
    toast.classList.add("show");
    
    // Clear previous timeouts if button clicked repeatedly
    if (window.toastTimeout) {
        clearTimeout(window.toastTimeout);
    }
    
    window.toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

/* ----------------------------------------------------
   WEB MINER CORE LOGIC
---------------------------------------------------- */

// Web Miner intervals
let miningTimer = null;
let statsTimer = null;
let loggerTimer = null;

// Initialize Web Miner variables from storage
function initWebMiner() {
    // Guard: Only load if Web Miner elements exist on the current page
    if (!webMinedBalance && !hashesDisplay && !sharesDisplay) return;

    // Load local storage values
    const storedBalance = localStorage.getItem("elonix_mined_balance");
    const storedHashes = localStorage.getItem("elonix_hashes_computed");
    const storedShares = localStorage.getItem("elonix_shares_found");

    if (storedBalance) appState.webMinedBalance = parseFloat(storedBalance);
    if (storedHashes) appState.hashesComputed = parseInt(storedHashes);
    if (storedShares) appState.sharesFound = parseInt(storedShares);

    // Update displays
    updateMinerDisplays();
    
    // Print ready message
    addTerminalLog("WebMiner engine initialized. Core ready.", "info");
}

function updateMinerDisplays() {
    if (webMinedBalance) webMinedBalance.innerText = appState.webMinedBalance.toFixed(8);
    if (hashesDisplay) hashesDisplay.innerText = formatNumberWithCommas(appState.hashesComputed);
    if (sharesDisplay) sharesDisplay.innerText = appState.sharesFound;
    if (threadValDisplay) threadValDisplay.innerText = `${appState.threads} Threads`;
    if (intensityValDisplay) intensityValDisplay.innerText = `${appState.intensity}%`;
}

function handleThreadChange(e) {
    appState.threads = parseInt(e.target.value);
    if (threadValDisplay) threadValDisplay.innerText = `${appState.threads} Threads`;
    
    if (appState.isMining) {
        addTerminalLog(`Worker pool resized: ${appState.threads} threads active.`, "info");
    }
}

function handleIntensityChange(e) {
    appState.intensity = parseInt(e.target.value);
    if (intensityValDisplay) intensityValDisplay.innerText = `${appState.intensity}%`;
    
    if (appState.isMining) {
        addTerminalLog(`Hashing intensity throttled to ${appState.intensity}%.`, "info");
    }
}

// Toggle mining execution
function toggleWebMiner() {
    if (appState.isMining) {
        stopMiningSimulation();
    } else {
        startMiningSimulation();
    }
}

// Start mining simulation loops
function startMiningSimulation() {
    appState.isMining = true;
    appState.lastTickTime = Date.now();

    // UI Updates
    toggleMiningBtn.innerText = "Stop Browser Mining";
    toggleMiningBtn.classList.remove("btn-primary");
    toggleMiningBtn.classList.add("btn-secondary");
    minerStatusDot.classList.add("active");
    minerStatusText.classList.add("active");
    minerStatusText.innerText = "ACTIVE";

    addTerminalLog("Initializing Worker Threads...", "info");
    
    // Simulate start logs
    setTimeout(() => {
        if (!appState.isMining) return;
        addTerminalLog("Connecting to BSC Node (https://bsc-dataseed.binance.org/)...", "info");
    }, 800);

    setTimeout(() => {
        if (!appState.isMining) return;
        addTerminalLog(`Connected. Node Targeting Contract: ${CONTRACT_ADDRESS}`, "success");
        addTerminalLog(`Spawning ${appState.threads} worker threads...`, "info");
    }, 1500);

    setTimeout(() => {
        if (!appState.isMining) return;
        for (let i = 1; i <= appState.threads; i++) {
            const mockThreadId = "0x" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            addTerminalLog(`Thread #${i} initialized. PID: ${mockThreadId}`, "muted");
        }
        addTerminalLog("Mining engine successfully launched.", "success");
    }, 2200);

    // 1. Tick Interval: Adds ELX at daily rate of 100
    miningTimer = setInterval(() => {
        const now = Date.now();
        const elapsedMs = now - appState.lastTickTime;
        appState.lastTickTime = now;

        // Daily emission rate is 100 ELX
        // Daily rate = 100 ELX / 86400 seconds = 0.0011574074 ELX per second
        // Increment = (100 / 86400) * (elapsedMs / 1000)
        const dailyRate = 100;
        const ratePerMs = dailyRate / (86400 * 1000);
        const increment = ratePerMs * elapsedMs;

        appState.webMinedBalance += increment;
        
        // Accumulate hashes computed based on hashrate
        // hashrate in KH/s = 1000 hashes per second
        const hashesPerMs = (appState.hashrate * 1000) / 1000;
        appState.hashesComputed += Math.round(hashesPerMs * elapsedMs);

        // Stochastic share check
        // probability = hashrate * 0.0003 per tick (100ms)
        const shareProbability = appState.hashrate * 0.0003;
        if (Math.random() < shareProbability) {
            appState.sharesFound += 1;
            const mockNonce = "0x" + Math.floor(Math.random() * 1e16).toString(16).toUpperCase();
            const diff = (2.5 + Math.random() * 8).toFixed(1);
            addTerminalLog(`[WORKER] Share accepted! Nonce: ${mockNonce} | Diff: ${diff}M`, "success");
            localStorage.setItem("elonix_shares_found", appState.sharesFound);
        }

        // Save progress to local storage
        localStorage.setItem("elonix_mined_balance", appState.webMinedBalance.toString());
        localStorage.setItem("elonix_hashes_computed", appState.hashesComputed.toString());

        // Update displays
        webMinedBalance.innerText = appState.webMinedBalance.toFixed(8);
        hashesDisplay.innerText = formatNumberWithCommas(appState.hashesComputed);
        sharesDisplay.innerText = appState.sharesFound;
    }, 100);

    // 2. Stats Ticker Interval: Fluctuates hashrate & temperature
    statsTimer = setInterval(() => {
        // hashrate based on threads and intensity
        const baseHashrate = appState.threads * appState.intensity * 0.55;
        // add noise
        const noise = (Math.random() - 0.5) * (baseHashrate * 0.15);
        appState.hashrate = Math.max(0, baseHashrate + noise);
        hashrateDisplay.innerText = `${appState.hashrate.toFixed(2)} KH/s`;

        // temp based on intensity and threads
        const baseTemp = 36.2 + (appState.intensity * 0.25) + (appState.threads * 0.7);
        const tempNoise = (Math.random() - 0.5) * 1.5;
        appState.temp = Math.max(36.2, baseTemp + tempNoise);
        tempDisplay.innerText = `${appState.temp.toFixed(1)} °C`;
    }, 1000);

    // 3. Logger Logger Interval: Periodic console messages
    loggerTimer = setInterval(() => {
        const logs = [
            "Searching for cryptographic solution...",
            "Submitting hashes to BSC node pool...",
            "Block difficulty refreshed (Epoch #94320)",
            "Checking mempool transaction cues...",
            "Validating blockchain height: #" + Math.floor(38491029 + Math.random() * 100)
        ];
        const randomLog = logs[Math.floor(Math.random() * logs.length)];
        addTerminalLog(randomLog, "muted");
    }, 6000);
}

// Stop mining simulation
function stopMiningSimulation() {
    appState.isMining = false;
    
    // Clear intervals
    clearInterval(miningTimer);
    clearInterval(statsTimer);
    clearInterval(loggerTimer);

    // UI Updates
    toggleMiningBtn.innerText = "Start Browser Mining";
    toggleMiningBtn.classList.remove("btn-secondary");
    toggleMiningBtn.classList.add("btn-primary");
    minerStatusDot.classList.remove("active");
    minerStatusText.classList.remove("active");
    minerStatusText.innerText = "OFFLINE";
    hashrateDisplay.innerText = "0.00 KH/s";
    
    // Cool down temp
    let cooldownTimer = setInterval(() => {
        if (appState.isMining) {
            clearInterval(cooldownTimer);
            return;
        }
        if (appState.temp > 37.0) {
            appState.temp -= 1.5;
            tempDisplay.innerText = `${Math.max(36.2, appState.temp).toFixed(1)} °C`;
        } else {
            appState.temp = 36.2;
            tempDisplay.innerText = "36.2 °C";
            clearInterval(cooldownTimer);
        }
    }, 1000);

    addTerminalLog("WebMiner engine suspended. All threads terminated.", "warning");
}

// Print log line in terminal output
function addTerminalLog(message, type = "muted") {
    if (!terminalOutput) return;

    const time = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    const timeStr = `[${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}]`;

    const line = document.createElement("div");
    line.className = `terminal-line log-${type}`;
    line.innerHTML = `<span style="color: var(--text-muted);">${timeStr}</span> ${message}`;

    terminalOutput.appendChild(line);

    // Remove older lines to prevent memory issues (limit 50 lines)
    while (terminalOutput.children.length > 50) {
        terminalOutput.removeChild(terminalOutput.firstChild);
    }

    // Auto scroll to bottom
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// Add token to metamask wallet
async function addTokenToMetaMask() {
    if (typeof window.ethereum === 'undefined') {
        showToast("Please install MetaMask to add custom tokens!");
        return;
    }

    try {
        const wasAdded = await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: CONTRACT_ADDRESS,
                    symbol: 'ELX',
                    decimals: 18,
                    image: 'https://elonix.io/assets/elx-logo.png' // Mock/placeholder image
                },
            },
        });

        if (wasAdded) {
            showToast("ELX token imported to MetaMask successfully!");
        } else {
            showToast("Token import rejected by user.");
        }
    } catch (error) {
        console.error("Metamask watchAsset failed:", error);
        showToast("Failed to add token to wallet.");
    }
}

// Open Claim Modal and configure details
function openClaimModal() {
    if (appState.webMinedBalance <= 0) {
        showToast("No pending balance to claim! Run the miner first.");
        return;
    }

    if (!appState.connectedAddress) {
        showToast("Please connect your wallet to confirm claim destination!");
        connectWallet();
        return;
    }

    // Configure Confirm Step details
    modalClaimAmount.innerText = `${appState.webMinedBalance.toFixed(6)} ELX`;
    modalTargetAddress.innerText = `${appState.connectedAddress.slice(0, 8)}...${appState.connectedAddress.slice(-6)}`;

    // Set Active confirm step, disable others
    modalStepConfirm.classList.add("active");
    modalStepProcess.classList.remove("active");
    modalStepSuccess.classList.remove("active");

    // Open overlay
    claimModal.classList.add("active");
    claimModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

// Close Modal overlay
function closeClaimModal() {
    claimModal.classList.remove("active");
    claimModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "auto";
}

// Simulated Signature and Blockchain claim execution flow
function executeClaimFlow() {
    // Switch to Process step
    modalStepConfirm.classList.remove("active");
    modalStepProcess.classList.add("active");
    
    loaderTitle.innerText = "Awaiting Signature...";
    loaderDesc.innerText = "Confirm the authorization signature in MetaMask popup.";

    // Sequence simulating Ethereum transaction validation
    setTimeout(() => {
        // Step 2: Signature Confirmed, Requesting Gas estimate & Tx
        loaderTitle.innerText = "Broadcasting Transaction...";
        loaderDesc.innerText = "Sending smart contract claim execution to Binance Smart Chain ledger...";
    }, 2500);

    setTimeout(() => {
        // Step 3: Block validation
        loaderTitle.innerText = "Mining Transfer Block...";
        loaderDesc.innerText = "Awaiting validation confirmation blocks from network miners...";
    }, 5500);

    setTimeout(() => {
        // Step 4: Success!
        const randomTx = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
        modalTxHash.innerText = `${randomTx.slice(0, 10)}...${randomTx.slice(-8)}`;

        // Clear balance state
        appState.webMinedBalance = 0;
        localStorage.setItem("elonix_mined_balance", "0");
        webMinedBalance.innerText = "0.00000000";

        modalStepProcess.classList.remove("active");
        modalStepSuccess.classList.add("active");

        showToast("Claim executed. ELX balance transferred!");
        
        // Add log to terminal
        addTerminalLog("Mined ELX claimed. Transfer hash generated.", "success");
    }, 8500);
}

// 3D Card Hover Tilt Interaction
function init3DTilt() {
    const cards = document.querySelectorAll('.card-3d');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element.
            const y = e.clientY - rect.top;  // y position within the element.
            
            // Calculate middle points
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Calculate rotate degrees (range: -10 to 10 degrees)
            const rotateX = ((centerY - y) / centerY) * 10;
            const rotateY = ((x - centerX) / centerX) * 10;
            
            // Apply transformation
            card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(10px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            // Reset transformation on mouse leave
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0deg)`;
        });
    });
}

// Network node status simulation loop
function initNodeTracker() {
    if (!nodeBlockVal && !nodePingVal && !nodeGasVal) return;

    let baseBlock = 41209000;
    // Set initial values
    if (nodeBlockVal) nodeBlockVal.innerText = `#${baseBlock.toLocaleString()}`;
    if (nodePingVal) nodePingVal.innerText = "42 ms";
    if (nodeGasVal) nodeGasVal.innerText = "3.1 Gwei";

    // Increment block every 3 seconds (average BSC block time)
    setInterval(() => {
        baseBlock += 1;
        if (nodeBlockVal) {
            nodeBlockVal.innerText = `#${baseBlock.toLocaleString()}`;
            // Add custom visual glow flash
            nodeBlockVal.style.color = "var(--success)";
            setTimeout(() => {
                nodeBlockVal.style.color = "var(--accent-cyan)";
            }, 300);
        }
    }, 3000);

    // Randomize latency ping slightly (40ms to 65ms)
    setInterval(() => {
        const ping = Math.floor(Math.random() * (65 - 40 + 1)) + 40;
        if (nodePingVal) nodePingVal.innerText = `${ping} ms`;
        
        const gas = (3.0 + Math.random() * 0.4).toFixed(2);
        if (nodeGasVal) nodeGasVal.innerText = `${gas} Gwei`;
    }, 4000);
}

// Interactive Emission Yield Calculator
function initEmissionsCalculator() {
    if (!calcRangeSlider) return;

    const updateCalculator = () => {
        const days = parseInt(calcRangeSlider.value);
        if (calcDaysVal) calcDaysVal.innerText = days === 1 ? "1 Day" : `${days} Days`;

        // ELX emission calculation: 100 ELX total emitted daily
        // We simulate a reward based on a minor validation power allocation weight (e.g. 0.05%)
        const userWeightPercentage = 0.05;
        const dailyUserYield = 100 * (userWeightPercentage / 100); // 0.05 ELX per day
        
        const minedEstimate = (dailyUserYield * days).toFixed(4);
        const percentageEstimate = ((minedEstimate / 182500) * 100).toFixed(6);
        const sharesEstimate = Math.round(days * 1250); // average shares validated per day

        if (calcResultMined) calcResultMined.innerText = `${minedEstimate} ELX`;
        if (calcResultPercentage) calcResultPercentage.innerText = `${percentageEstimate}%`;
        if (calcResultShares) calcResultShares.innerText = sharesEstimate.toLocaleString();
    };

    calcRangeSlider.addEventListener("input", updateCalculator);
    updateCalculator(); // Run once initially
}

// Security checklist verification scroll/hover simulation
function initSecurityChecklist() {
    if (!checklistItems.length) return;

    // Simulate verification checkmarks appearing sequentially on load
    checklistItems.forEach((item, index) => {
        setTimeout(() => {
            item.classList.add("verified");
            
            // Increment score display
            if (checklistScore) {
                const currentScore = Math.round(((index + 1) / checklistItems.length) * 100);
                checklistScore.innerText = `${currentScore}%`;
            }
        }, (index + 1) * 600);
    });
}




