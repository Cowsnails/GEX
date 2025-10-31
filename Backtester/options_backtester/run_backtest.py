#!/usr/bin/env python3
"""
Backtest Runner Script

Runs a backtest configuration and outputs results in JSON format
Called by Node.js backtester bridge
"""

import sys
import json
import os
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from backtest import Backtest
from database import get_database
from strategy import BuyAndHoldStrategy
from metrics import calculate_advanced_metrics
from strategy_validation import StrategyValidator
import pandas as pd
import requests


def load_config(config_path):
    """Load backtest configuration from JSON file"""
    with open(config_path, 'r') as f:
        return json.load(f)


def fetch_spy_data(start_date, end_date):
    """
    Fetch SPY benchmark data for alpha/beta calculation

    Args:
        start_date: Start date string (YYYY-MM-DD)
        end_date: End date string (YYYY-MM-DD)

    Returns:
        DataFrame with timestamp and price columns, or None if fetch fails
    """
    try:
        # Try to fetch from ThetaData local terminal
        # Using stock endpoint for SPY
        print(f"Fetching SPY benchmark data from {start_date} to {end_date}...")

        # Format dates for ThetaData API (YYYYMMDD)
        start_formatted = start_date.replace('-', '')
        end_formatted = end_date.replace('-', '')

        url = f"http://127.0.0.1:25510/v2/hist/stock/quote?root=SPY&start_date={start_formatted}&end_date={end_formatted}"

        response = requests.get(url, timeout=30)

        if response.status_code == 200:
            data = response.json()
            if 'response' in data and len(data['response']) > 0:
                # Parse ThetaData response
                spy_data = []
                for record in data['response']:
                    # ThetaData format: [ms_of_day, bid, bid_size, ask, ask_size, date]
                    # For simplicity, use mid price
                    if len(record) >= 6:
                        date = record[5]  # YYYYMMDD format
                        bid = record[1]
                        ask = record[3]
                        mid_price = (bid + ask) / 2 if bid and ask else None

                        if mid_price:
                            # Convert date to datetime
                            date_str = str(date)
                            timestamp = pd.to_datetime(date_str, format='%Y%m%d')
                            spy_data.append({
                                'timestamp': timestamp,
                                'price': mid_price
                            })

                if spy_data:
                    df = pd.DataFrame(spy_data)
                    # Group by date and take last price of each day
                    df['date'] = df['timestamp'].dt.date
                    df = df.groupby('date').last().reset_index()
                    print(f"✅ Fetched {len(df)} SPY data points")
                    return df

        print("⚠️ Could not fetch SPY data from ThetaData, alpha/beta will not be calculated")
        return None

    except Exception as e:
        print(f"⚠️ Error fetching SPY data: {e}")
        print("Alpha/beta calculation will be skipped")
        return None


def run_backtest_from_config(config):
    """
    Run backtest from configuration dictionary

    Args:
        config: Configuration dictionary with:
            - config_id: Unique ID for this backtest
            - symbols: List of symbols to trade
            - start_date: Start date (YYYY-MM-DD)
            - end_date: End date (YYYY-MM-DD)
            - initial_capital: Starting capital
            - strategy_name: Strategy class name
            - strategy_params: Strategy parameters
            - commission: Commission per contract

    Returns:
        Dictionary with backtest results
    """

    print(f"\n{'='*60}")
    print(f"STARTING BACKTEST: {config['config_id']}")
    print(f"{'='*60}\n")

    # Get database connection
    db = get_database(db_type='sqlite')

    # Map strategy name to strategy class
    # For now, only BuyAndHoldStrategy is available
    # TODO: Add more strategies
    strategy_map = {
        'BuyAndHold': BuyAndHoldStrategy,
        'BuyAndHoldStrategy': BuyAndHoldStrategy
    }

    strategy_name = config.get('strategy_name', 'BuyAndHold')
    strategy_class = strategy_map.get(strategy_name, BuyAndHoldStrategy)

    print(f"Strategy: {strategy_name}")
    print(f"Symbols: {config['symbols']}")
    print(f"Date Range: {config['start_date']} to {config['end_date']}")
    print(f"Initial Capital: ${config['initial_capital']:,.2f}\n")

    # Create backtest engine
    backtest = Backtest(
        symbols=config['symbols'],
        start_date=config['start_date'],
        end_date=config['end_date'],
        initial_capital=config['initial_capital'],
        strategy_class=strategy_class,
        db_connection=db.get_connection(),
        commission=config.get('commission', 0.05)
    )

    # Run backtest
    results = backtest.run(verbose=True)

    # Fetch SPY data for alpha/beta calculation
    spy_data = fetch_spy_data(config['start_date'], config['end_date'])

    # Calculate advanced metrics (alpha, beta, Sortino, Calmar, etc.)
    if 'equity_curve' in results and isinstance(results['equity_curve'], pd.DataFrame):
        max_dd = results.get('max_drawdown', 0.0)
        advanced_metrics = calculate_advanced_metrics(
            results['equity_curve'],
            benchmark_data=spy_data,
            max_drawdown=max_dd
        )

        # Add advanced metrics to results
        results.update(advanced_metrics)

        print(f"\n{'='*60}")
        print("ADVANCED METRICS")
        print(f"{'='*60}")
        if advanced_metrics.get('alpha') is not None:
            print(f"Alpha (vs SPY):        {advanced_metrics['alpha']:.4f}")
            print(f"Beta (vs SPY):         {advanced_metrics['beta']:.4f}")
            print(f"R-Squared:             {advanced_metrics['r_squared']:.4f}")
            print(f"Information Ratio:     {advanced_metrics['information_ratio']:.4f}")
        print(f"Sortino Ratio:         {advanced_metrics['sortino_ratio']:.4f}")
        print(f"Calmar Ratio:          {advanced_metrics['calmar_ratio']:.4f}")
        print(f"{'='*60}\n")

    # Run Strategy Validation (Professional-grade deployment readiness)
    if 'equity_curve' in results and isinstance(results['equity_curve'], pd.DataFrame):
        print(f"\n{'='*60}")
        print("RUNNING STRATEGY VALIDATION")
        print(f"{'='*60}\n")

        # Prepare validation inputs
        equity_curve_df = results['equity_curve'].copy()
        trades_list = []

        # Convert trades DataFrame to list of dicts if available
        if 'trades' in results and isinstance(results['trades'], pd.DataFrame):
            trades_df = results['trades']
            for idx, row in trades_df.iterrows():
                trade = {}
                for col in trades_df.columns:
                    value = row[col]
                    if pd.notna(value):
                        trade[col] = float(value) if isinstance(value, (int, float)) else value
                trades_list.append(trade)

        # Create validator and run validation
        validator = StrategyValidator(
            equity_curve=equity_curve_df,
            trades=trades_list,
            initial_capital=config['initial_capital'],
            benchmark_returns=None  # TODO: Convert SPY data to returns if available
        )

        validation_results = validator.validate_all()

        # Add validation results to backtest results
        results['validation'] = validation_results
        results['deployment_ready'] = validation_results.get('deployment_ready', False)
        results['deployment_readiness_score'] = validation_results.get('deployment_readiness_score', 0.0)

    # Convert equity curve DataFrame to list of dicts for JSON serialization
    if 'equity_curve' in results and isinstance(results['equity_curve'], pd.DataFrame):
        equity_df = results['equity_curve']
        equity_curve = []

        for idx, row in equity_df.iterrows():
            equity_curve.append({
                'timestamp': row['timestamp'].isoformat() if hasattr(row['timestamp'], 'isoformat') else str(row['timestamp']),
                'total_value': float(row['total_value']),
                'settled_cash': float(row.get('settled_cash', 0)),
                'unsettled_cash': float(row.get('unsettled_cash', 0)),
                'num_positions': int(row.get('num_positions', 0))
            })

        results['equity_curve'] = equity_curve

    # Convert trades DataFrame to list of dicts
    if 'trades' in results and isinstance(results['trades'], pd.DataFrame):
        trades_df = results['trades']
        trades_data = []

        for idx, row in trades_df.iterrows():
            trade = {}
            for col in trades_df.columns:
                value = row[col]
                if pd.isna(value):
                    trade[col] = None
                elif hasattr(value, 'isoformat'):
                    trade[col] = value.isoformat()
                elif isinstance(value, (int, float)):
                    trade[col] = float(value)
                else:
                    trade[col] = str(value)
            trades_data.append(trade)

        results['trades_data'] = trades_data
        del results['trades']

    # Remove positions DataFrame (not needed in JSON output)
    if 'positions' in results:
        del results['positions']

    # Convert numpy types to Python native types
    for key, value in results.items():
        if hasattr(value, 'item'):  # numpy scalar
            results[key] = value.item()

    # Output results as JSON
    print(f"\n{'='*60}")
    print("BACKTEST RESULTS (JSON)")
    print(f"{'='*60}\n")

    # Print JSON for parsing by Node.js
    print(json.dumps(results, indent=2))

    return results


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python run_backtest.py <config_file.json>")
        sys.exit(1)

    config_path = sys.argv[1]

    if not os.path.exists(config_path):
        print(f"Error: Config file not found: {config_path}")
        sys.exit(1)

    try:
        # Load configuration
        config = load_config(config_path)

        # Run backtest
        results = run_backtest_from_config(config)

        # Success
        sys.exit(0)

    except Exception as e:
        print(f"\n{'='*60}")
        print(f"ERROR: Backtest failed")
        print(f"{'='*60}")
        print(f"{type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()