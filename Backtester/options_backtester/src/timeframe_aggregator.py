"""
Multi-Timeframe Bar Aggregation

Aggregates 1-minute bars into multiple timeframes for technical analysis.
Supports: 3m, 5m, 15m, 30m, 1h, 2h, 4h
"""

import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime, timedelta


class MultiTimeframeAggregator:
    """Aggregate 1-minute bars into multiple timeframes"""

    def __init__(self, timeframes: List[int] = None):
        """
        Initialize aggregator.

        Args:
            timeframes: List of timeframes in minutes (default: [3, 5, 15, 30, 60, 120, 240])
        """
        if timeframes is None:
            timeframes = [3, 5, 15, 30, 60, 120, 240]

        self.timeframes = timeframes
        self.bars = {tf: [] for tf in timeframes}
        self.current_bars = {tf: None for tf in timeframes}

    def aggregate_bar(self, minute_bar: dict):
        """
        Aggregate 1-minute bar into all timeframes.

        Args:
            minute_bar: Dict with timestamp, open, high, low, close, volume
        """
        timestamp = minute_bar['timestamp']

        for tf in self.timeframes:
            # Determine bar boundary
            bar_start = self._get_bar_start(timestamp, tf)

            # Check if we need to create a new bar
            if self.current_bars[tf] is None or self.current_bars[tf]['timestamp'] != bar_start:
                # Save the completed bar if exists
                if self.current_bars[tf] is not None:
                    self.bars[tf].append(self.current_bars[tf].copy())

                # Create new bar
                self.current_bars[tf] = {
                    'timestamp': bar_start,
                    'open': minute_bar['open'],
                    'high': minute_bar['high'],
                    'low': minute_bar['low'],
                    'close': minute_bar['close'],
                    'volume': minute_bar['volume']
                }
            else:
                # Update existing bar
                self.current_bars[tf]['high'] = max(self.current_bars[tf]['high'], minute_bar['high'])
                self.current_bars[tf]['low'] = min(self.current_bars[tf]['low'], minute_bar['low'])
                self.current_bars[tf]['close'] = minute_bar['close']
                self.current_bars[tf]['volume'] += minute_bar['volume']

    def _get_bar_start(self, timestamp: pd.Timestamp, timeframe_minutes: int) -> pd.Timestamp:
        """
        Get the start time of the bar this timestamp belongs to.

        Args:
            timestamp: Current timestamp
            timeframe_minutes: Timeframe in minutes

        Returns:
            Start timestamp of the bar
        """
        # Market opens at 9:30 AM ET
        market_open_hour = 9
        market_open_minute = 30

        # Calculate minutes since market open
        current_minutes = (timestamp.hour - market_open_hour) * 60 + (timestamp.minute - market_open_minute)

        # Find which bar this belongs to
        bar_number = current_minutes // timeframe_minutes

        # Calculate bar start time
        bar_start_minutes = bar_number * timeframe_minutes
        bar_hour = market_open_hour + (market_open_minute + bar_start_minutes) // 60
        bar_minute = (market_open_minute + bar_start_minutes) % 60

        return timestamp.replace(
            hour=bar_hour,
            minute=bar_minute,
            second=0,
            microsecond=0
        )

    def get_bar(self, timeframe: int, timestamp: pd.Timestamp = None) -> Optional[dict]:
        """
        Get the most recent complete bar for a timeframe.

        Args:
            timeframe: Timeframe in minutes
            timestamp: Optional timestamp to get bar up to (default: latest)

        Returns:
            Bar dict or None if no bars available
        """
        if timeframe not in self.bars:
            return None

        bars = self.bars[timeframe]

        if len(bars) == 0:
            return None

        if timestamp is None:
            return bars[-1]

        # Find most recent bar before timestamp
        for bar in reversed(bars):
            if bar['timestamp'] <= timestamp:
                return bar

        return None

    def get_bars(self, timeframe: int, count: int = None) -> List[dict]:
        """
        Get multiple bars for a timeframe.

        Args:
            timeframe: Timeframe in minutes
            count: Number of bars to return (None = all)

        Returns:
            List of bar dicts
        """
        if timeframe not in self.bars:
            return []

        bars = self.bars[timeframe]

        if count is None:
            return bars.copy()

        return bars[-count:] if len(bars) > count else bars.copy()

    def get_dataframe(self, timeframe: int) -> pd.DataFrame:
        """
        Get bars as DataFrame for a timeframe.

        Args:
            timeframe: Timeframe in minutes

        Returns:
            DataFrame with OHLCV data
        """
        if timeframe not in self.bars or len(self.bars[timeframe]) == 0:
            return pd.DataFrame()

        df = pd.DataFrame(self.bars[timeframe])
        df.set_index('timestamp', inplace=True)
        return df

    def clear(self):
        """Clear all bars (useful for new backtest)"""
        self.bars = {tf: [] for tf in self.timeframes}
        self.current_bars = {tf: None for tf in self.timeframes}


# Example Strategy Integration
class MultiTimeframeStrategy:
    """
    Example strategy using multiple timeframes.

    This demonstrates how to use the aggregator in a strategy.
    """

    def __init__(self):
        self.aggregator = MultiTimeframeAggregator()

    def on_bar(self, bar: dict):
        """
        Called on each 1-minute bar.

        Args:
            bar: 1-minute bar dict
        """
        # Aggregate the bar
        self.aggregator.aggregate_bar(bar)

        # Get 15-minute bar
        bar_15m = self.aggregator.get_bar(15)

        # Get 1-hour bar
        bar_1h = self.aggregator.get_bar(60)

        # Strategy logic using multiple timeframes
        if bar_15m and bar_1h:
            # Example: Trend following across timeframes
            if bar_15m['close'] > bar_1h['close']:
                # Bullish signal - 15min above 1h
                pass
            elif bar_15m['close'] < bar_1h['close']:
                # Bearish signal - 15min below 1h
                pass

    def calculate_sma(self, timeframe: int, period: int) -> Optional[float]:
        """
        Calculate Simple Moving Average for a timeframe.

        Args:
            timeframe: Timeframe in minutes
            period: Number of bars for SMA

        Returns:
            SMA value or None
        """
        bars = self.aggregator.get_bars(timeframe, period)

        if len(bars) < period:
            return None

        closes = [bar['close'] for bar in bars]
        return sum(closes) / len(closes)


if __name__ == "__main__":
    print("Multi-Timeframe Aggregator Module")
    print("=" * 60)

    # Example usage
    aggregator = MultiTimeframeAggregator()

    print("\nSupported timeframes:")
    for tf in aggregator.timeframes:
        if tf < 60:
            print(f"  - {tf} minutes")
        else:
            print(f"  - {tf // 60} hour(s)")

    print("\nUsage in strategy:")
    print("""
    # Create aggregator
    aggregator = MultiTimeframeAggregator()

    # On each 1-minute bar
    aggregator.aggregate_bar({
        'timestamp': timestamp,
        'open': open_price,
        'high': high_price,
        'low': low_price,
        'close': close_price,
        'volume': volume
    })

    # Get 15-minute bar
    bar_15m = aggregator.get_bar(15)

    # Get last 20 hourly bars
    bars_1h = aggregator.get_bars(60, count=20)

    # Get as DataFrame for technical indicators
    df_4h = aggregator.get_dataframe(240)
    """)

    print("\nReady for integration!")