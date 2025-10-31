import pytesseract
import cv2
import numpy as np
import time
import re
import mss
import threading
import requests
import json
import os
import pickle
from datetime import datetime, timedelta

# --- Tesseract path ---
pytesseract.pytesseract.tesseract_cmd = r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"

SCAN_INTERVAL = 1.0  # seconds
SERVER_URL = "http://localhost:3000"  # Your Node.js server

# PERSISTENT duplicate tracking - survives restarts!
CACHE_FILE = "ocr_contracts_cache.pkl"
CACHE_EXPIRY_HOURS = 48  # Keep contracts for 48 hours

def load_contract_cache():
    """Load persistent contract cache from disk"""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'rb') as f:
                cache = pickle.load(f)
                # Clean expired entries (older than CACHE_EXPIRY_HOURS)
                cutoff = datetime.now() - timedelta(hours=CACHE_EXPIRY_HOURS)
                cleaned = {k: v for k, v in cache.items() if v > cutoff}
                print(f"📦 Loaded {len(cleaned)} cached contracts (removed {len(cache) - len(cleaned)} expired)")
                return cleaned
        except Exception as e:
            print(f"⚠️ Error loading cache: {e}")
            return {}
    return {}

def save_contract_cache(cache):
    """Save contract cache to disk"""
    try:
        with open(CACHE_FILE, 'wb') as f:
            pickle.dump(cache, f)
    except Exception as e:
        print(f"⚠️ Error saving cache: {e}")

# Load existing cache
recent_contracts = load_contract_cache()
recent_contracts_lock = threading.Lock()

# 🚀 TRAINING MODE - Learn existing messages before sending anything
STARTUP_TIME = datetime.now()
TRAINING_MODE_DURATION = 15  # seconds - scan but DON'T send for first 15 seconds
training_mode = True

def is_in_training_mode():
    """Check if we're still in training mode"""
    global training_mode
    elapsed = (datetime.now() - STARTUP_TIME).total_seconds()
    if training_mode and elapsed >= TRAINING_MODE_DURATION:
        training_mode = False
        print("\n" + "="*80)
        print("✅ TRAINING MODE COMPLETE - NOW SENDING TRADES TO SERVER")
        print("="*80 + "\n")
    return training_mode

# Trader filtering rules
TRADER_RULES = {
    'elite': {
        'allowed_tickers': ['QQQ'],  # Elite can only trade QQQ
        'priority': 1  # Highest priority
    },
    'trader2': {
        'allowed_tickers': None,  # None = all tickers allowed
        'priority': 2
    },
    'trader3': {
        'allowed_tickers': None,  # None = all tickers allowed
        'priority': 3
    }
}

# --- Detect trader from text ---
def detect_trader(text):
    """
    Detect which trader posted the alert
    Returns: trader name or None
    """
    text_lower = text.lower()
    
    # Add your trader detection logic here
    # Example: look for usernames, channel names, or patterns
    if 'elite' in text_lower or 'eclipsetrades' in text_lower:
        return 'elite'
    elif 'trader2' in text_lower:  # Replace with actual identifier
        return 'trader2'
    elif 'trader3' in text_lower:  # Replace with actual identifier
        return 'trader3'
    
    # Default to trader2 if unknown (or return None to skip)
    return 'trader2'

# --- Validate ticker against trader rules ---
def validate_trade(trader, ticker):
    """
    Check if trader is allowed to trade this ticker
    """
    if trader not in TRADER_RULES:
        return False
    
    rules = TRADER_RULES[trader]
    allowed = rules['allowed_tickers']
    
    # If allowed_tickers is None, all tickers are allowed
    if allowed is None:
        return True
    
    # Check if ticker is in allowed list
    return ticker.upper() in allowed

# --- Parse ticker alert into normalized contract format ---
def parse_ticker_alert(text, trader=None):
    """
    Parse various formats and normalize to:
    {root, expiration, strike, right, price, trader}
    
    Supported formats:
    - $QQQ 8/25 572 PUT @ 0.50
    - QQQ 8/25 572P @ 0.50
    - $QQQ Aug 25 572 PUT @ 0.50
    """
    # Format 1: $TICKER MM/DD STRIKE CALL/PUT @ PRICE
    match = re.search(
        r"\$?([A-Za-z]{1,6})\s+(\d{1,2})/(\d{1,2})\s+(\d{2,5})\s*(CALL|PUT|C|P)\s*@\s*([\d\.]+)",
        text,
        re.IGNORECASE
    )
    
    if not match:
        return None
    
    root = match.group(1).upper()
    month = match.group(2).zfill(2)
    day = match.group(3).zfill(2)
    strike = float(match.group(4))
    right_raw = match.group(5).upper()
    price = float(match.group(6))

    # VALIDATE & AUTO-CORRECT TICKER
    validated_root = validate_ticker(root)
    if validated_root is None:
        # Ticker is blocked (index/invalid)
        return None
    if validated_root != root:
        print(f"🔧 Ticker validated: {root} → {validated_root}")
    root = validated_root

    # Normalize CALL/PUT to C/P
    if right_raw in ['CALL', 'C']:
        right = 'C'
    elif right_raw in ['PUT', 'P']:
        right = 'P'
    else:
        return None

    # Convert date to YYYYMMDD format (assume current year)
    current_year = datetime.now().year
    expiration = f"{current_year}{month}{day}"

    # Validate against trader rules
    if trader and not validate_trade(trader, root):
        print(f"⚠️ {trader} not allowed to trade {root} - BLOCKED")
        return None
    
    return {
        'root': root,
        'expiration': expiration,
        'strike': strike,
        'right': right,
        'price': price,
        'trader': trader or 'unknown',
        'priority': TRADER_RULES.get(trader, {}).get('priority', 99) if trader else 99,
        'timestamp': datetime.now().isoformat()
    }

# --- Send contract to server for tracking and analysis ---
def send_trade_to_server(contract):
    """
    Send normalized trade to Node.js server for:
    1. WebSocket streaming
    2. Real-time analysis
    3. Display on website

    During TRAINING MODE: Just cache contracts, don't send
    After TRAINING MODE: Only send NEW contracts not in cache
    """
    contract_key = f"{contract['root']}:{contract['expiration']}:{contract['strike']}:{contract['right']}"

    with recent_contracts_lock:
        # Check if already seen
        if contract_key in recent_contracts:
            return False  # Already cached/sent

        # 🎓 TRAINING MODE - Cache but don't send
        if is_in_training_mode():
            recent_contracts[contract_key] = datetime.now()
            save_contract_cache(recent_contracts)  # Save to disk
            trader_badge = f"[{contract['trader'].upper()}]"
            print(f"📚 TRAINING: Cached {trader_badge} {contract['root']} {contract['strike']}{contract['right']} (not sending)")
            return False

        # ✅ LIVE MODE - This is a NEW contract, add to cache and send
        recent_contracts[contract_key] = datetime.now()
        save_contract_cache(recent_contracts)  # Save to disk
    
    try:
        # Send to server for tracking AND analysis
        response = requests.post(
            f"{SERVER_URL}/api/trade-signal",
            json=contract,
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                trader_badge = f"[{contract['trader'].upper()}]"
                print(f"✅ {trader_badge} Trade sent: {contract['root']} {contract['strike']}{contract['right']} @ ${contract['price']}")
                return True
            else:
                print(f"⚠️ Server rejected: {result.get('error')}")
        else:
            print(f"❌ Server error: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Connection error: {e}")
    
    return False

# --- Cleaners ---
def clean_boughtsold(raw_text):
    """
    Clean BOUGHT/SOLD signals
    """
    cleaned_lines = []
    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue

        # remove @mentions and usernames
        line = re.sub(r"@\w+", "", line)
        # remove leading junk before BOUGHT or SOLD
        line = re.sub(r"^.*?\b(BOUGHT|SOLD)\b", r"\1", line, flags=re.IGNORECASE)
        # remove unwanted characters
        filtered = re.sub(r"[^A-Za-z0-9\s\.\|\(\)\:/,'%\+\-\$]+", "", line).strip()

        # keep only clean lines that contain BOUGHT or SOLD
        if re.search(r"\b(BOUGHT|SOLD)\b", filtered, re.IGNORECASE):
            cleaned_lines.append(filtered)
    return "\n".join(cleaned_lines)


def clean_tickers(raw_text):
    """
    Clean and normalize ticker alerts, then send to server
    """
    # STEP 1: Apply OCR error corrections
    raw_text = correct_ocr_errors(raw_text)

    cleaned_lines = []
    contracts_found = []

    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Detect trader first
        trader = detect_trader(line)

        # remove @mentions, usernames, and Discord noise
        line = re.sub(r"@\w+", "", line)
        line = re.sub(r"EclipseTrades\s*\(.*?\)", "", line, flags=re.IGNORECASE)
        # strip everything before first $TICKER
        line = re.sub(r"^.*?(?=\$[A-Za-z])", "", line)
        # clean broken OCR characters
        filtered = re.sub(r"[^A-Za-z0-9\s\.\|\(\)\:/,'%\+\-\$@]+", "", line).strip()

        # Match ticker trade alerts
        if re.search(
            r"\$?[A-Za-z]{1,6}\s+\d{1,2}/\d{1,2}\s+\d{2,5}\s*(CALL|PUT|C|P)\s*@\s*[\d\.]+",
            filtered,
            re.IGNORECASE
        ):
            # Parse and validate
            contract = parse_ticker_alert(filtered, trader)
            if contract:
                cleaned_lines.append(f"[{contract['trader'].upper()}] {filtered}")
                contracts_found.append(contract)

    # Send contracts to server for tracking and analysis
    for contract in contracts_found:
        send_trade_to_server(contract)

    return "\n".join(cleaned_lines)

# --- OCR helper with enhanced preprocessing ---
def grab_text(monitor):
    with mss.mss() as sct:
        img = np.array(sct.grab(monitor))

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)

        # 1. UPSCALE image for better character recognition (2x scale)
        gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

        # 2. DENOISE - remove noise while preserving edges
        gray = cv2.fastNlMeansDenoising(gray, h=10)

        # 3. THRESHOLD - convert to pure black & white for clarity
        # Using adaptive threshold for better results with varying lighting
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )

        # 4. MORPHOLOGY - clean up small noise
        kernel = np.ones((1, 1), np.uint8)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

        # 5. OCR with character whitelist (only letters, numbers, common symbols)
        # PSM 6 = uniform block of text
        # Character whitelist helps prevent misreads
        custom_config = r'--psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$/@.%+- '
        text = pytesseract.image_to_string(thresh, config=custom_config)

        return text.strip()

# --- Post-OCR correction for common misreads ---
def correct_ocr_errors(text):
    """
    Fix common OCR misreads
    """
    # Common ticker corrections
    corrections = {
        'QQ ': 'QQQ ',   # Missing Q
        'QQ$': 'QQQ$',
        'SPY ': 'SPY ',  # SPY is correct, but catch variations
        'SP ': 'SPY ',   # Missing Y
        'TSL ': 'TSLA ', # Missing A
        'NVDA': 'NVDA',  # Correct as-is
        'NVD ': 'NVDA ', # Missing A
        'AMZ ': 'AMZN ', # Missing N
        'GOO ': 'GOOG ', # Missing G
        'MSF ': 'MSFT ', # Missing T
        'AAP ': 'AAPL ', # Missing L
        'AAPL': 'AAPL',  # Correct

        # Number corrections
        'O': '0',  # Letter O → Number 0
        'l': '1',  # Lowercase L → Number 1
        'S': '5',  # In context of prices/strikes
        'g': '9',  # Common misread

        # Word corrections
        'CAI L': 'CALL',
        'CAl L': 'CALL',
        'CALI': 'CALL',
        'PUI': 'PUT',
        'PlIT': 'PUT',
    }

    corrected = text
    for wrong, right in corrections.items():
        corrected = corrected.replace(wrong, right)

    return corrected

# --- Validate ticker against known symbols ---
KNOWN_TICKERS = {'QQQ', 'SPY', 'TSLA', 'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOG', 'META', 'NFLX', 'AMD', 'COIN'}

# Indices and special symbols to REJECT (not tradeable stocks/ETFs)
BLOCKED_TICKERS = {'SPX', 'VIX', 'NDX', 'RUT', 'DJX', 'XSP', 'SPXW', 'VXX', 'UVXY', 'VIXY'}

def validate_ticker(ticker):
    """
    Check if ticker is likely valid
    Returns None if ticker is blocked (index)
    """
    ticker = ticker.upper().strip('$')

    # REJECT indices and special symbols
    if ticker in BLOCKED_TICKERS:
        print(f"🚫 BLOCKED INDEX: {ticker} - Not a tradeable ticker")
        return None

    # Exact match
    if ticker in KNOWN_TICKERS:
        return ticker

    # Check for close matches (1 character off)
    if len(ticker) >= 2:
        # Try adding common missing letters
        for known in KNOWN_TICKERS:
            if len(known) == len(ticker) + 1:
                # Check if ticker is missing one letter
                for i in range(len(known)):
                    if known[:i] + known[i+1:] == ticker:
                        print(f"🔧 Auto-corrected: {ticker} → {known}")
                        return known

    # If not in known list, return as-is (might be valid)
    return ticker

# --- OCR loop ---
def ocr_loop(region, label, cleaner):
    while True:
        text = grab_text(region)
        cleaned = cleaner(text)
        if cleaned:
            ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"\n🕐 {ts} — {label}\n{cleaned}\n{'-'*70}")
        time.sleep(SCAN_INTERVAL)

# --- Main ---
def main():
    print("=" * 80)
    print("🚀 OCR BRIDGE - Multi-Trader Signal Capture")
    print("=" * 80)
    print(f"📡 Server: {SERVER_URL}")
    print(f"⏱️ Scan interval: {SCAN_INTERVAL}s")
    print(f"\n📋 Trader Rules:")
    for trader, rules in TRADER_RULES.items():
        allowed = rules['allowed_tickers']
        allowed_str = ', '.join(allowed) if allowed else 'ALL TICKERS'
        print(f"  {trader.upper()}: {allowed_str} (Priority: {rules['priority']})")
    print("=" * 80 + "\n")
    
    with mss.mss() as sct:
        if len(sct.monitors) < 2:
            print("❌ Only one monitor detected! Please connect your second display.")
            return

        # Capture the full second monitor
        monitor2 = sct.monitors[2]
        print(f"✅ OCR started on full Monitor 2: {monitor2}")

        # Two threads — Bought/Sold + Tickers
        t1 = threading.Thread(target=ocr_loop, args=(monitor2, "BOUGHT/SOLD SIGNALS", clean_boughtsold), daemon=True)
        t2 = threading.Thread(target=ocr_loop, args=(monitor2, "TICKER ALERTS", clean_tickers), daemon=True)

        t1.start()
        t2.start()

        print("\n✅ OCR Bridge running!")
        print("📊 Trades will be normalized, filtered, and sent to server.")
        print("⚡ Real-time analysis will begin automatically.\n")

        while True:
            time.sleep(1)

if __name__ == "__main__":
    main()