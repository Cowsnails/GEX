"""
Base Strategy class for options trading strategies.

Strategies generate SignalEvents from MarketEvents.
All strategies must use ONLY point-in-time data from MarketEvent.
"""

from queue import Queue
from events import SignalEvent, MarketEvent, EventType
from data_handler import DataHandler
import pandas as pd
import numpy as np
from typing import Optional


class Strategy:
    """
    Base class for trading strategies.

    Generates SignalEvents from MarketEvents.
    Override calculate_signals() with your strategy logic.
    """

    def __init__(self, events_queue: Queue, data_handler: DataHandler):
        """
        Initialize strategy.

        Args:
            events_queue: Queue for putting generated signals
            data_handler: DataHandler for accessing market data
        """
        self.events = events_queue
        self.data = data_handler
        self.strategy_id = self.__class__.__name__

    def calculate_signals(self, market_event: MarketEvent):
        """
        Override this method with your strategy logic.

        MUST use only data from market_event (point-in-time).
        NEVER access future data.

        Args:
            market_event: MarketEvent containing current market data
        """
        raise NotImplementedError("Must implement calculate_signals()")

    def calculate_iv_rank(self, df: pd.DataFrame, lookback: int = 252) -> float:
        """
        Calculate IV Rank for current IV.

        IV Rank = (Current IV - 52w Low) / (52w High - 52w Low) * 100

        Args:
            df: DataFrame with implied_vol column
            lookback: Lookback period in days (default: 252 for 1 year)

        Returns:
            IV Rank (0-100)
        """
        if len(df) == 0 or 'implied_vol' not in df.columns:
            return 0.0

        current_iv = df['implied_vol'].iloc[-1]
        iv_high = df['implied_vol'].max()
        iv_low = df['implied_vol'].min()

        if iv_high == iv_low:
            return 50.0  # Neutral if no variation

        iv_rank = (current_iv - iv_low) / (iv_high - iv_low) * 100

        return iv_rank

    def calculate_iv_percentile(self, df: pd.DataFrame, lookback: int = 252) -> float:
        """
        Calculate IV Percentile (more robust than IV Rank).

        IV Percentile = % of days current IV is higher than historical IV

        Args:
            df: DataFrame with implied_vol column
            lookback: Lookback period in days

        Returns:
            IV Percentile (0-100)
        """
        if len(df) == 0 or 'implied_vol' not in df.columns:
            return 0.0

        current_iv = df['implied_vol'].iloc[-1]
        iv_values = df['implied_vol'].values

        percentile = (iv_values < current_iv).sum() / len(iv_values) * 100

        return percentile

    def find_delta_strike(self, options_df: pd.DataFrame, target_delta: float,
                         option_type: str = 'P', tolerance: float = 0.02) -> Optional[pd.Series]:
        """
        Find option strike closest to target delta.

        Args:
            options_df: DataFrame with options data
            target_delta: Target delta (e.g., 0.30 for 30 delta)
            option_type: 'C' or 'P'
            tolerance: Acceptable delta range (e.g., 0.02 for ±2 delta)

        Returns:
            Series with option data or None
        """
        # Filter by option type
        filtered = options_df[options_df['option_type'] == option_type].copy()

        if len(filtered) == 0:
            return None

        # For puts, delta is negative, so use absolute value
        if option_type == 'P':
            filtered['abs_delta'] = filtered['delta'].abs()
            target_delta_abs = abs(target_delta)
        else:
            filtered['abs_delta'] = filtered['delta']
            target_delta_abs = target_delta

        # Find closest to target
        filtered['delta_diff'] = abs(filtered['abs_delta'] - target_delta_abs)

        # Filter by tolerance
        within_tolerance = filtered[filtered['delta_diff'] <= tolerance]

        if len(within_tolerance) == 0:
            return None

        # Return closest match
        closest = within_tolerance.sort_values('delta_diff').iloc[0]

        return closest

    def get_days_to_expiration(self, expiration_ts: int, current_ts: pd.Timestamp) -> float:
        """
        Calculate days to expiration.

        Args:
            expiration_ts: Expiration timestamp (microseconds)
            current_ts: Current timestamp

        Returns:
            Days to expiration (float)
        """
        expiration = pd.Timestamp(expiration_ts, unit='us')
        dte = (expiration - current_ts).total_seconds() / (24 * 3600)

        return dte

    def is_near_expiration(self, expiration_ts: int, current_ts: pd.Timestamp,
                          hours_threshold: float = 1.0) -> bool:
        """
        Check if option is near expiration.

        For 0DTE risk management: close positions in final hour.

        Args:
            expiration_ts: Expiration timestamp (microseconds)
            current_ts: Current timestamp
            hours_threshold: Hours threshold (default: 1 hour)

        Returns:
            True if near expiration
        """
        expiration = pd.Timestamp(expiration_ts, unit='us')
        hours_to_expiry = (expiration - current_ts).total_seconds() / 3600

        return hours_to_expiry < hours_threshold

    def create_signal(self, symbol: str, signal_type: str, strength: float = 1.0,
                     strikes: list = None, metadata: dict = None) -> SignalEvent:
        """
        Helper method to create and queue a signal event.

        Args:
            symbol: Underlying symbol
            signal_type: 'LONG', 'SHORT', or 'EXIT'
            strength: Signal strength (0.0 to 1.0)
            strikes: List of strike prices
            metadata: Additional signal metadata

        Returns:
            SignalEvent
        """
        signal = SignalEvent(
            type=EventType.SIGNAL,
            symbol=symbol,
            signal_type=signal_type,
            strength=strength,
            strikes=strikes if strikes else [],
            strategy_id=self.strategy_id,
            metadata=metadata if metadata else {}
        )

        self.events.put(signal)

        return signal


# Example strategy implementation

class BuyAndHoldStrategy(Strategy):
    """
    Simple buy-and-hold strategy for testing.

    Buys on first bar, holds until end.
    """

    def __init__(self, events_queue: Queue, data_handler: DataHandler):
        super().__init__(events_queue, data_handler)
        self.invested = False

    def calculate_signals(self, market_event: MarketEvent):
        """Generate buy signal on first bar."""
        if self.invested:
            return

        # Get first symbol's data
        symbol = list(market_event.data.keys())[0]
        data = market_event.data[symbol]

        if len(data) > 0:
            # Simple: just buy first available option
            option = data.iloc[0]

            self.create_signal(
                symbol=symbol,
                signal_type='LONG',
                strength=1.0,
                strikes=[option['strike']],
                metadata={
                    'option_type': option['option_type'],
                    'delta': option['delta']
                }
            )

            self.invested = True


if __name__ == "__main__":
    print("Strategy base class created successfully")
    print("\nTo create your own strategy:")
    print("1. Inherit from Strategy class")
    print("2. Override calculate_signals() method")
    print("3. Use only data from market_event (point-in-time)")
    print("4. Generate signals using self.create_signal()")
