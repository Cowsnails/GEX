"""
Example strategies for options backtesting.

Demonstrates how to create strategies using the framework:
1. SimplePremiumSelling - Sell 0.30 delta puts when IV Rank > 75%
2. IronCondorStrategy - Sell iron condors in neutral markets
3. ZeroDTEScalping - 0DTE intraday scalping strategy
"""

from queue import Queue
from strategy import Strategy
from data_handler import DataHandler
from events import MarketEvent
import pandas as pd
import numpy as np


class SimplePremiumSelling(Strategy):
    """
    Example: Sell 0.30 delta puts when IV Rank > 75%

    Entry:
    - IV Rank > 75%
    - IV Percentile > 67%
    - 0-7 DTE
    - Sell 30 delta put

    Exit:
    - 50% profit target
    - Close at 3:30 PM on 0DTE
    - Stop loss at 200% of credit
    """

    def __init__(self, events_queue: Queue, data_handler: DataHandler,
                 iv_rank_threshold: float = 75.0,
                 target_delta: float = 0.30,
                 profit_target_pct: float = 0.50):
        """
        Initialize strategy.

        Args:
            events_queue: Event queue
            data_handler: Data handler
            iv_rank_threshold: Minimum IV rank for entry (default: 75)
            target_delta: Target delta for sold puts (default: 0.30)
            profit_target_pct: Profit target as % of credit (default: 50%)
        """
        super().__init__(events_queue, data_handler)

        self.iv_rank_threshold = iv_rank_threshold
        self.target_delta = target_delta
        self.profit_target_pct = profit_target_pct

        # Track open positions
        self.positions = {}

    def calculate_signals(self, market_event: MarketEvent):
        """
        Generate trading signals based on IV and delta.

        Args:
            market_event: Market event with current data
        """
        for symbol, data in market_event.data.items():
            if len(data) == 0:
                continue

            # Check if we already have a position
            if symbol in self.positions and self.positions[symbol] is not None:
                self.check_exit_conditions(symbol, data, market_event.timestamp)
                continue

            # Calculate IV Rank (simplified - would need historical data)
            avg_iv = data['implied_vol'].mean()

            # Simplified IV rank calculation
            # In production, calculate from 252-day history
            iv_rank = self.estimate_iv_rank(data)

            if iv_rank < self.iv_rank_threshold:
                continue

            # Find 30 delta put
            target_option = self.find_delta_strike(
                data,
                target_delta=self.target_delta,
                option_type='P',
                tolerance=0.02
            )

            if target_option is None:
                continue

            # Check DTE
            dte = self.get_days_to_expiration(
                target_option['expiration_timestamp'],
                market_event.timestamp
            )

            if dte > 7:
                continue

            # Generate SELL signal
            print(f"\n{symbol}: IV Rank {iv_rank:.1f}% > {self.iv_rank_threshold}%")
            print(f"  Selling {target_option['strike']} put @ ${target_option['mid_price']:.2f}")
            print(f"  Delta: {target_option['delta']:.3f}, DTE: {dte:.1f}")

            signal = self.create_signal(
                symbol=symbol,
                signal_type='SHORT',
                strength=1.0,
                strikes=[target_option['strike']],
                metadata={
                    'option_type': 'P',
                    'delta': target_option['delta'],
                    'entry_price': target_option['mid_price'],
                    'iv_rank': iv_rank,
                    'dte': dte,
                    'expiration_ts': target_option['expiration_timestamp']
                }
            )

            # Track position
            self.positions[symbol] = {
                'entry_price': target_option['mid_price'],
                'strike': target_option['strike'],
                'expiration_ts': target_option['expiration_timestamp']
            }

    def check_exit_conditions(self, symbol: str, data: pd.DataFrame,
                              current_time: pd.Timestamp):
        """
        Check if we should exit the position.

        Exit conditions:
        - 50% profit target
        - 0DTE 3:30 PM close
        - 200% stop loss

        Args:
            symbol: Symbol
            data: Current market data
            current_time: Current timestamp
        """
        if symbol not in self.positions or self.positions[symbol] is None:
            return

        position = self.positions[symbol]

        # Find current price for this option
        current_option = data[
            (data['strike'] == position['strike']) &
            (data['option_type'] == 'P')
        ]

        if len(current_option) == 0:
            return

        current_option = current_option.iloc[0]
        current_price = current_option['mid_price']
        entry_price = position['entry_price']

        # Calculate P&L
        pnl_pct = (entry_price - current_price) / entry_price

        # Exit condition 1: Profit target (50% of credit)
        if pnl_pct >= self.profit_target_pct:
            print(f"\n{symbol}: Profit target hit! P&L: {pnl_pct:.1%}")
            self.exit_position(symbol, current_option, 'PROFIT_TARGET')
            return

        # Exit condition 2: Stop loss (200% of credit)
        if pnl_pct <= -2.0:
            print(f"\n{symbol}: Stop loss hit! P&L: {pnl_pct:.1%}")
            self.exit_position(symbol, current_option, 'STOP_LOSS')
            return

        # Exit condition 3: 0DTE close at 3:30 PM
        hours_to_expiry = (
            pd.Timestamp(current_option['expiration_timestamp'], unit='us') - current_time
        ).total_seconds() / 3600

        if hours_to_expiry < 0.5:  # 30 minutes before expiration
            print(f"\n{symbol}: Closing 0DTE position (30 min to expiry)")
            self.exit_position(symbol, current_option, 'TIME_EXIT')
            return

    def exit_position(self, symbol: str, option_data: pd.Series, reason: str):
        """
        Exit a position by generating EXIT signal.

        Args:
            symbol: Symbol
            option_data: Current option data
            reason: Exit reason
        """
        self.create_signal(
            symbol=symbol,
            signal_type='EXIT',
            strength=1.0,
            strikes=[option_data['strike']],
            metadata={
                'option_type': 'P',
                'exit_price': option_data['mid_price'],
                'reason': reason
            }
        )

        # Clear position
        self.positions[symbol] = None

    def estimate_iv_rank(self, data: pd.DataFrame) -> float:
        """
        Estimate IV rank from current data.

        In production, use 252-day historical IV.

        Args:
            data: Current market data

        Returns:
            Estimated IV rank
        """
        # Simplified: use current data range
        current_iv = data['implied_vol'].mean()
        iv_low = data['implied_vol'].min()
        iv_high = data['implied_vol'].max()

        if iv_high == iv_low:
            return 50.0

        iv_rank = (current_iv - iv_low) / (iv_high - iv_low) * 100

        return iv_rank


class IronCondorStrategy(Strategy):
    """
    Iron Condor strategy for neutral markets.

    Sell:
    - 30 delta put
    - 30 delta call
    Buy:
    - 16 delta put (protection)
    - 16 delta call (protection)
    """

    def __init__(self, events_queue: Queue, data_handler: DataHandler):
        super().__init__(events_queue, data_handler)
        self.positions = {}

    def calculate_signals(self, market_event: MarketEvent):
        """Generate iron condor signals."""
        # Implementation similar to SimplePremiumSelling
        # but with 4 legs instead of 1
        pass


class ZeroDTEScalping(Strategy):
    """
    0DTE intraday scalping strategy.

    Entry:
    - 0DTE only
    - High gamma for quick profits
    - Tight stops

    Exit:
    - Quick 10-20% profits
    - Close all positions by 3:30 PM
    """

    def __init__(self, events_queue: Queue, data_handler: DataHandler):
        super().__init__(events_queue, data_handler)
        self.positions = {}

    def calculate_signals(self, market_event: MarketEvent):
        """Generate 0DTE scalping signals."""
        for symbol, data in market_event.data.items():
            if len(data) == 0:
                continue

            # Only trade 0DTE
            for _, option in data.iterrows():
                dte = self.get_days_to_expiration(
                    option['expiration_timestamp'],
                    market_event.timestamp
                )

                if dte > 1:  # Skip if not 0DTE
                    continue

                # Look for high gamma setups
                # Implementation details...
                pass


if __name__ == "__main__":
    print("Example strategies loaded successfully")
    print("\nAvailable strategies:")
    print("1. SimplePremiumSelling - Sell 30 delta puts when IV > 75%")
    print("2. IronCondorStrategy - Neutral strategy with defined risk")
    print("3. ZeroDTEScalping - Intraday 0DTE scalping")
    print("\nTo use:")
    print("""
    from example_strategy import SimplePremiumSelling
    from backtest import Backtest

    backtest = Backtest(
        symbols=['SPY'],
        start_date='2024-01-01',
        end_date='2024-12-31',
        initial_capital=100000,
        strategy_class=SimplePremiumSelling,
        db_connection=db.get_connection()
    )

    results = backtest.run()
    """)
