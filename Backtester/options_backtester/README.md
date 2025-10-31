# Options Backtesting System for 0-7 DTE Strategies

A bulletproof local options backtesting system designed specifically for short-dated (0-7 DTE) options strategies. Built with institutional-grade point-in-time data architecture to prevent look-ahead bias.

## Features

### Core Architecture
- **Point-in-Time Data System**: Dual-timestamp architecture prevents look-ahead bias
- **Event-Driven Backtesting**: Proper event sequencing ensures realistic simulation
- **Realistic Execution Modeling**: Bid-ask spreads, slippage, and 0DTE-specific challenges
- **T+1 Settlement**: Proper cash settlement modeling

### Data Management
- **Local Storage**: SQLite/PostgreSQL (no AWS dependencies)
- **Parquet Support**: Efficient columnar data storage
- **Survivorship Bias Prevention**: Tracks delisted securities
- **Corporate Actions**: Handles splits, dividends, and other adjustments

### Validation & Risk Management
- **Walk-Forward Optimization**: Prevents curve-fitting
- **Statistical Validation**: Monte Carlo permutation tests, Deflated Sharpe Ratio
- **Greeks Calculation**: Dynamic Greeks using implied volatility
- **Pattern Discovery**: Systematic pattern mining with validation

## Installation

### 1. Install Dependencies

```bash
cd options_backtester
pip install -r requirements.txt
```

### 2. Create Database Schema

```bash
cd src
python database.py
```

This creates a SQLite database at `data/sqlite/options_backtest.db`.

For PostgreSQL instead:
```python
from database import get_database

db = get_database(
    db_type='postgresql',
    postgres_url='postgresql://user:password@localhost/dbname'
)
db.create_schema()
```

### 3. Run Tests

```bash
cd tests
python test_pit.py
```

All tests must pass before running backtests!

## Quick Start

### Load Historical Data

```python
import sys
sys.path.append('src')

from database import get_database
from data_loader import PointInTimeDataLoader

# Initialize
db = get_database(db_type='sqlite')
loader = PointInTimeDataLoader(db.get_connection())

# Load options data
loader.load_options_data(
    csv_path='data/raw/spy_options_20240115.csv',
    symbol='SPY',
    date='2024-01-15',
    validate=True  # Run validation checks
)
```

### Run a Backtest

```python
from backtest import Backtest
from example_strategy import SimplePremiumSelling
from database import get_database

# Initialize database
db = get_database(db_type='sqlite')

# Create backtest
backtest = Backtest(
    symbols=['SPY'],
    start_date='2024-01-01',
    end_date='2024-12-31',
    initial_capital=100000,
    strategy_class=SimplePremiumSelling,
    db_connection=db.get_connection(),
    commission=0.65
)

# Run backtest
results = backtest.run(verbose=True)

# View results
print(f"Total Return: {results['total_return']:.2f}%")
print(f"Sharpe Ratio: {results['sharpe_ratio']:.2f}")
print(f"Max Drawdown: {results['max_drawdown']:.2f}%")
print(f"Total Trades: {results['total_trades']}")

# Plot results
backtest.plot_results(results, save_path='backtest_results.png')
```

## Creating Your Own Strategy

Inherit from the `Strategy` base class:

```python
from strategy import Strategy
from events import MarketEvent

class MyStrategy(Strategy):
    def __init__(self, events_queue, data_handler):
        super().__init__(events_queue, data_handler)
        # Your initialization

    def calculate_signals(self, market_event: MarketEvent):
        """
        Generate signals from market data.

        CRITICAL: Use ONLY data from market_event (point-in-time)
        """
        for symbol, data in market_event.data.items():
            # Your strategy logic here

            # Find target option
            option = self.find_delta_strike(
                data,
                target_delta=0.30,
                option_type='P'
            )

            if option is not None:
                # Generate signal
                self.create_signal(
                    symbol=symbol,
                    signal_type='SHORT',
                    strength=1.0,
                    strikes=[option['strike']],
                    metadata={'delta': option['delta']}
                )
```

## Walk-Forward Optimization

Prevent overfitting with walk-forward analysis:

```python
from validation import WalkForwardOptimizer

def run_backtest(start_date, end_date, params):
    """Your backtest function."""
    # Run backtest with params
    # Return results dict
    pass

# Define parameter grid
param_grid = {
    'iv_rank_threshold': [70, 75, 80],
    'target_delta': [0.25, 0.30, 0.35],
    'profit_target': [0.40, 0.50, 0.60]
}

# Run walk-forward optimization
optimizer = WalkForwardOptimizer(
    backtest_fn=run_backtest,
    param_grid=param_grid,
    n_splits=10
)

results, wfe = optimizer.optimize(data_dates)

# WFE > 0.7 = excellent
# WFE 0.4-0.7 = acceptable
# WFE < 0.4 = severe overfitting (reject!)
```

## Statistical Validation

Validate your strategy before live trading:

```python
from validation import StatisticalValidator

validator = StatisticalValidator()

# 1. Monte Carlo Permutation Test
perm_result = validator.monte_carlo_permutation_test(
    returns=results['equity_curve']['returns'],
    n_simulations=1000
)
# p-value < 0.05 required!

# 2. Deflated Sharpe Ratio
dsr_result = validator.deflated_sharpe_ratio(
    observed_sr=results['sharpe_ratio'],
    n_trials=100,
    skewness=returns.skew(),
    kurtosis=returns.kurtosis(),
    n_observations=len(returns)
)
# Accounts for multiple testing bias

# 3. Drawdown Analysis
percentiles, drawdowns = validator.monte_carlo_drawdown_simulation(
    trade_returns=trade_returns.values,
    n_simulations=1000
)
# Use 95th percentile for capital planning
```

## Pattern Discovery

Mine for profitable patterns:

```python
from patterns import PatternDiscovery

# Load historical data
data = pd.read_csv('data/processed/options_history.csv')

# Initialize pattern discovery
discovery = PatternDiscovery(data)

# Find IV patterns
high_iv_setups = discovery.mine_iv_patterns()

# Find optimal Greeks
delta_30_setups = discovery.mine_greeks_patterns()

# Find spread opportunities
spreads = discovery.mine_spread_patterns()

# Identify market regimes
regimes = discovery.cluster_regimes(n_clusters=5)
```

## Project Structure

```
options_backtester/
├── data/
│   ├── raw/              # Your historical CSV files
│   ├── processed/        # Cleaned Parquet files
│   └── sqlite/           # SQLite database
├── src/
│   ├── database.py       # Database schema & connection
│   ├── data_loader.py    # Point-in-time data loading
│   ├── events.py         # Event classes
│   ├── data_handler.py   # DataHandler class
│   ├── strategy.py       # Base Strategy class
│   ├── portfolio.py      # Portfolio management
│   ├── execution.py      # Execution with slippage
│   ├── backtest.py       # Main Backtest engine
│   ├── greeks.py         # Greeks calculator
│   ├── validation.py     # Statistical validation
│   ├── patterns.py       # Pattern discovery
│   └── example_strategy.py  # Example strategies
├── tests/
│   └── test_pit.py       # Point-in-time tests
└── requirements.txt
```

## Data Format Requirements

### Options Data CSV

Required columns:
- `symbol`: Option symbol
- `underlying_symbol`: Underlying ticker (e.g., 'SPY')
- `option_type`: 'C' or 'P'
- `strike`: Strike price
- `expiration_timestamp`: Expiration timestamp (microseconds)
- `underlying_price`: Current underlying price
- `bid_price`, `ask_price`, `mid_price`
- `delta`, `gamma`, `theta`, `vega`, `implied_vol`
- `volume`, `open_interest`
- `quote_time`: When quote was captured (optional)

### Validation Checks

Data loader automatically validates:
- ✓ Delta ranges (calls: 0-1, puts: -1-0)
- ✓ Gamma positive
- ✓ Bid <= Ask
- ✓ Reasonable spreads
- ✓ Stale quote detection
- ✓ Put-call parity

## Success Criteria Before Live Trading

Before deploying ANY strategy, ensure:

1. **Walk-Forward Efficiency > 0.5** (preferably > 0.7)
2. **Monte Carlo p-value < 0.05** (statistically significant)
3. **Deflated Sharpe Ratio > 0.95** at 95% confidence
4. **Minimum 100 trades** (500+ ideal) in backtest
5. **Tested across crisis periods** (2008, 2020, 2022)
6. **Profitable at 2× transaction costs**
7. **Positive in 4 of 5 market regimes**
8. **Paper trading 30-60 days** matches backtest within 30%

## Critical Reminders

### DON'T DO THIS ❌
- ❌ Use AWS Athena/S3/Glue
- ❌ Assume mid-price fills
- ❌ Use historical volatility for Greeks
- ❌ Forward-fill missing data
- ❌ Test on same out-of-sample data multiple times
- ❌ Ignore survivorship bias
- ❌ Skip walk-forward validation

### DO THIS ✓
- ✓ Use local PostgreSQL or SQLite
- ✓ Store Parquet files locally for speed
- ✓ Model bid-ask spreads and slippage
- ✓ Use implied volatility from actual quotes
- ✓ Validate Greeks (delta ranges, gamma positive)
- ✓ Include delisted securities
- ✓ Implement proper event sequencing
- ✓ Calculate point-in-time IV Rank/Percentile
- ✓ Test with Monte Carlo permutation
- ✓ Use walk-forward optimization
- ✓ Calculate Deflated Sharpe Ratio
- ✓ Model T+1 settlement properly
- ✓ Close 0DTE by 3:30 PM (avoid assignment risk)

## Advanced Features

### Greeks Recalculation

```python
from greeks import GreeksCalculator

calc = GreeksCalculator(risk_free_rate=0.043)

greeks = calc.calculate_greeks(
    option_type='P',
    S=450.0,      # Underlying
    K=445.0,      # Strike
    t=0.0192,     # ~7 days
    r=0.043,      # Risk-free rate
    sigma=0.25    # Implied vol
)
```

### Vectorized Greeks

For entire chains:
```python
# Add time to expiry
df['time_to_expiry_years'] = df['days_to_expiry'] / 365

# Calculate Greeks for entire chain
df_with_greeks = calc.vectorized_greeks(df)
```

## Troubleshooting

### No data returned from queries
- Check that data is loaded for the date range
- Verify timestamp format (microseconds)
- Run `test_pit.py` to validate setup

### Greeks calculation errors
- Ensure implied_vol is in decimal format (0.25, not 25)
- Check that time to expiry > 0
- Verify strike prices are reasonable

### Backtest runs slowly
- Use Parquet files instead of CSV
- Add database indexes (already included)
- Reduce number of symbols
- Filter DTE range more aggressively

## Contributing

This is a reference implementation based on institutional best practices. Customize for your needs:

1. Add your data sources
2. Implement your strategies
3. Add custom validation metrics
4. Extend pattern discovery

## License

MIT License - See LICENSE file

## Disclaimer

This software is for educational and research purposes only. Options trading involves substantial risk. Past performance does not guarantee future results. Always paper trade extensively before risking real capital.

---

Built with ❤️ for serious options traders who demand institutional-grade backtesting.
