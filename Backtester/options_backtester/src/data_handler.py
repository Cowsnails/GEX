"""
DataHandler provides point-in-time market data to the backtester.

CRITICAL: All data queries must respect point-in-time constraints.
Never allow future data to leak into past decisions.
"""

import pandas as pd
from sqlalchemy import text
from typing import List, Optional
from events import MarketEvent, EventType
from timeframe_aggregator import MultiTimeframeAggregator


class DataHandler:
    """
    Provides point-in-time market data to backtester.

    Ensures that only data available at current_timestamp can be accessed.
    This prevents look-ahead bias.
    """

    def __init__(self, db_connection, start_date: str, end_date: str,
                 symbols: List[str], enable_multi_timeframe: bool = True):
        """
        Initialize data handler.

        Args:
            db_connection: SQLAlchemy connection to database
            start_date: Start date for backtest (YYYY-MM-DD)
            end_date: End date for backtest (YYYY-MM-DD)
            symbols: List of underlying symbols to trade
            enable_multi_timeframe: Enable multi-timeframe bar aggregation
        """
        self.conn = db_connection
        self.start_date = pd.Timestamp(start_date)
        self.end_date = pd.Timestamp(end_date)
        self.symbols = symbols
        self.current_timestamp = None
        self.continue_backtest = True

        # Cache for performance
        self._timestamp_cache = None

        # Multi-timeframe aggregator (for underlying price bars)
        self.multi_timeframe_enabled = enable_multi_timeframe
        if enable_multi_timeframe:
            self.timeframe_aggregators = {symbol: MultiTimeframeAggregator() for symbol in symbols}
        else:
            self.timeframe_aggregators = {}

    def get_latest_bars(self, symbol: str, N: int = 1) -> pd.DataFrame:
        """
        Returns last N bars of data available at current_timestamp.

        CRITICAL: timestamp_available <= current_timestamp (no future data)

        Args:
            symbol: Underlying symbol
            N: Number of bars to retrieve

        Returns:
            DataFrame with options data
        """
        if self.current_timestamp is None:
            return pd.DataFrame()

        query = text("""
            SELECT * FROM options_data_pit
            WHERE underlying_symbol = :symbol
              AND timestamp_available <= :current_ts
              AND expiration_timestamp > :current_ts
              AND is_stale = 0
            ORDER BY timestamp_available DESC
            LIMIT :limit
        """)

        result = pd.read_sql(
            query,
            self.conn,
            params={
                'symbol': symbol,
                'current_ts': self.current_timestamp.value // 1000,
                'limit': N
            }
        )

        return result

    def get_options_chain(self, symbol: str, min_dte: int = 0,
                         max_dte: int = 7) -> pd.DataFrame:
        """
        Get full options chain for a symbol at current timestamp.

        Args:
            symbol: Underlying symbol
            min_dte: Minimum days to expiration
            max_dte: Maximum days to expiration

        Returns:
            DataFrame with all options in DTE range
        """
        if self.current_timestamp is None:
            return pd.DataFrame()

        # Calculate timestamp range for expiration
        min_exp_ts = (self.current_timestamp + pd.Timedelta(days=min_dte)).value // 1000
        max_exp_ts = (self.current_timestamp + pd.Timedelta(days=max_dte)).value // 1000

        query = text("""
            SELECT * FROM options_data_pit
            WHERE underlying_symbol = :symbol
              AND timestamp_available <= :current_ts
              AND expiration_timestamp BETWEEN :min_exp AND :max_exp
              AND is_stale = 0
            ORDER BY strike, option_type
        """)

        result = pd.read_sql(
            query,
            self.conn,
            params={
                'symbol': symbol,
                'current_ts': self.current_timestamp.value // 1000,
                'min_exp': min_exp_ts,
                'max_exp': max_exp_ts
            }
        )

        return result

    def get_specific_option(self, symbol: str, strike: float,
                           option_type: str, expiration_ts: int) -> Optional[pd.Series]:
        """
        Get specific option contract data.

        Args:
            symbol: Underlying symbol
            strike: Strike price
            option_type: 'C' or 'P'
            expiration_ts: Expiration timestamp (microseconds)

        Returns:
            Series with option data or None
        """
        if self.current_timestamp is None:
            return None

        query = text("""
            SELECT * FROM options_data_pit
            WHERE underlying_symbol = :symbol
              AND strike = :strike
              AND option_type = :opt_type
              AND expiration_timestamp = :exp_ts
              AND timestamp_available <= :current_ts
              AND is_stale = 0
            ORDER BY timestamp_available DESC
            LIMIT 1
        """)

        result = pd.read_sql(
            query,
            self.conn,
            params={
                'symbol': symbol,
                'strike': strike,
                'opt_type': option_type,
                'exp_ts': expiration_ts,
                'current_ts': self.current_timestamp.value // 1000
            }
        )

        if len(result) == 0:
            return None

        return result.iloc[0]

    def update_bars(self) -> Optional[MarketEvent]:
        """
        Advances to next timestamp and generates MarketEvent.

        This is the main method that drives the backtest forward in time.

        Returns:
            MarketEvent with new data, or None if backtest is complete
        """
        # Get next timestamp from database
        query = text("""
            SELECT DISTINCT timestamp_available
            FROM options_data_pit
            WHERE timestamp_available > :current_ts
              AND timestamp_available <= :end_ts
            ORDER BY timestamp_available
            LIMIT 1
        """)

        current_ts = self.current_timestamp.value // 1000 if self.current_timestamp else 0
        end_ts = self.end_date.value // 1000

        result = pd.read_sql(
            query,
            self.conn,
            params={
                'current_ts': current_ts,
                'end_ts': end_ts
            }
        )

        if len(result) == 0:
            self.continue_backtest = False
            return None

        # Update current timestamp
        self.current_timestamp = pd.Timestamp(result.iloc[0]['timestamp_available'], unit='us')

        # Get all options data at this timestamp for all symbols
        data = {}
        for symbol in self.symbols:
            data[symbol] = self.get_options_chain(symbol)

        # Update multi-timeframe aggregators
        self._update_timeframe_aggregators()

        return MarketEvent(
            type=EventType.MARKET,
            timestamp=self.current_timestamp,
            data=data
        )

    def get_all_timestamps(self) -> List[pd.Timestamp]:
        """
        Get all unique timestamps in the backtest period.

        Useful for pre-loading timestamp schedule.

        Returns:
            List of timestamps
        """
        if self._timestamp_cache is not None:
            return self._timestamp_cache

        query = text("""
            SELECT DISTINCT timestamp_available
            FROM options_data_pit
            WHERE timestamp_available BETWEEN :start_ts AND :end_ts
            ORDER BY timestamp_available
        """)

        result = pd.read_sql(
            query,
            self.conn,
            params={
                'start_ts': self.start_date.value // 1000,
                'end_ts': self.end_date.value // 1000
            }
        )

        self._timestamp_cache = [
            pd.Timestamp(ts, unit='us') for ts in result['timestamp_available']
        ]

        return self._timestamp_cache

    def get_market_regime(self, date: str) -> Optional[pd.Series]:
        """
        Get market regime data for a specific date.

        Args:
            date: Date string (YYYY-MM-DD)

        Returns:
            Series with regime data or None
        """
        query = text("""
            SELECT * FROM market_regime
            WHERE date = :date
        """)

        result = pd.read_sql(
            query,
            self.conn,
            params={'date': date}
        )

        if len(result) == 0:
            return None

        return result.iloc[0]

    def get_corporate_actions(self, symbol: str, start_date: str,
                             end_date: str) -> pd.DataFrame:
        """
        Get corporate actions for a symbol in date range.

        Args:
            symbol: Stock symbol
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)

        Returns:
            DataFrame with corporate actions
        """
        query = text("""
            SELECT * FROM corporate_actions
            WHERE symbol = :symbol
              AND ex_date BETWEEN :start_date AND :end_date
            ORDER BY ex_date
        """)

        result = pd.read_sql(
            query,
            self.conn,
            params={
                'symbol': symbol,
                'start_date': start_date,
                'end_date': end_date
            }
        )

        return result

    def is_delisted(self, symbol: str, date: str) -> bool:
        """
        Check if a symbol was delisted before a given date.

        Args:
            symbol: Stock symbol
            date: Date to check (YYYY-MM-DD)

        Returns:
            True if delisted before date, False otherwise
        """
        query = text("""
            SELECT * FROM delisted_securities
            WHERE symbol = :symbol
              AND delisting_date <= :date
        """)

        result = pd.read_sql(
            query,
            self.conn,
            params={
                'symbol': symbol,
                'date': date
            }
        )

        return len(result) > 0

    def get_underlying_price(self, symbol: str) -> Optional[float]:
        """
        Get current underlying price at current_timestamp.

        Args:
            symbol: Underlying symbol

        Returns:
            Current price or None
        """
        latest = self.get_latest_bars(symbol, N=1)

        if len(latest) == 0:
            return None

        return latest.iloc[0]['underlying_price']

    def get_timeframe_bar(self, symbol: str, timeframe: int) -> Optional[dict]:
        """
        Get the most recent complete bar for a specific timeframe.

        Args:
            symbol: Underlying symbol
            timeframe: Timeframe in minutes (3, 5, 15, 30, 60, 120, 240)

        Returns:
            Bar dict with OHLCV data or None
        """
        if not self.multi_timeframe_enabled or symbol not in self.timeframe_aggregators:
            return None

        return self.timeframe_aggregators[symbol].get_bar(timeframe)

    def get_timeframe_bars(self, symbol: str, timeframe: int, count: int = None) -> List[dict]:
        """
        Get multiple bars for a specific timeframe.

        Args:
            symbol: Underlying symbol
            timeframe: Timeframe in minutes
            count: Number of bars to return (None = all)

        Returns:
            List of bar dicts
        """
        if not self.multi_timeframe_enabled or symbol not in self.timeframe_aggregators:
            return []

        return self.timeframe_aggregators[symbol].get_bars(timeframe, count)

    def get_timeframe_dataframe(self, symbol: str, timeframe: int) -> pd.DataFrame:
        """
        Get bars as DataFrame for a specific timeframe.

        Args:
            symbol: Underlying symbol
            timeframe: Timeframe in minutes

        Returns:
            DataFrame with OHLCV data
        """
        if not self.multi_timeframe_enabled or symbol not in self.timeframe_aggregators:
            return pd.DataFrame()

        return self.timeframe_aggregators[symbol].get_dataframe(timeframe)

    def _update_timeframe_aggregators(self):
        """
        Update multi-timeframe aggregators with current minute bar.

        Called internally by update_bars() to build multi-timeframe bars.
        """
        if not self.multi_timeframe_enabled:
            return

        # For each symbol, create a minute bar from current underlying price
        for symbol in self.symbols:
            price = self.get_underlying_price(symbol)

            if price is not None:
                # Create 1-minute bar (simplified - using price as OHLC)
                # In production, would query actual OHLC data
                minute_bar = {
                    'timestamp': self.current_timestamp,
                    'open': price,
                    'high': price,
                    'low': price,
                    'close': price,
                    'volume': 0  # Volume not available from options data
                }

                self.timeframe_aggregators[symbol].aggregate_bar(minute_bar)


if __name__ == "__main__":
    # Example usage
    from database import get_database

    # Create database
    db = get_database(db_type='sqlite')

    # Initialize data handler
    data_handler = DataHandler(
        db_connection=db.get_connection(),
        start_date='2024-01-01',
        end_date='2024-01-31',
        symbols=['SPY', 'QQQ']
    )

    print("DataHandler initialized successfully")
    print(f"Symbols: {data_handler.symbols}")
    print(f"Date range: {data_handler.start_date} to {data_handler.end_date}")