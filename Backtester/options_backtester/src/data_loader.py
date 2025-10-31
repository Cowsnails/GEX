"""
Point-in-time data loading with rigorous validation.

CRITICAL: Implements dual-timestamp system to prevent look-ahead bias:
- timestamp_available: When data became available in the market
- timestamp_recorded: When we captured/loaded the data

All validation must pass before data enters the database.
"""

import pandas as pd
import numpy as np
from typing import Optional
import warnings


class PointInTimeDataLoader:
    """
    Loads historical options data ensuring point-in-time integrity.

    Performs comprehensive validation:
    - Greeks validation (delta ranges, gamma positive)
    - Pricing validation (bid <= ask, reasonable spreads)
    - Stale quote detection
    - Put-call parity checks
    """

    def __init__(self, db_connection):
        """
        Initialize data loader.

        Args:
            db_connection: SQLAlchemy connection to database
        """
        self.conn = db_connection

    def load_options_data(self, csv_path: str, symbol: str, date: str,
                         validate: bool = True):
        """
        Load options chain data with dual timestamps.

        Args:
            csv_path: Path to CSV file with options data
            symbol: Underlying symbol
            date: Trading date
            validate: Whether to run validation (recommended: True)

        Critical: timestamp_available = quote timestamp from data
                  timestamp_recorded = when we're loading this (now)
        """
        df = pd.read_csv(csv_path)

        print(f"Loading {len(df)} rows for {symbol} on {date}")

        if validate:
            # Validate BEFORE inserting
            self.validate_greeks(df)
            self.validate_pricing(df)

            # Detect stale quotes (if quote_time column exists)
            if 'quote_time' in df.columns:
                current_time = pd.Timestamp(date)
                self.detect_stale_quotes(df, current_time)

        # Add point-in-time timestamps
        if 'quote_time' in df.columns:
            df['timestamp_available'] = pd.to_datetime(df['quote_time']).astype('int64') // 1000
        else:
            # If no quote_time, use date + assumed market time
            df['timestamp_available'] = pd.to_datetime(date).value // 1000

        df['timestamp_recorded'] = pd.Timestamp.now().value // 1000

        # Insert into database
        df.to_sql('options_data_pit', self.conn, if_exists='append', index=False)

        print(f"Successfully loaded {len(df)} rows into database")

        return df

    def validate_greeks(self, df: pd.DataFrame):
        """
        CRITICAL validation - bad Greeks = bad backtest.

        Checks:
        - Call delta: 0 to 1
        - Put delta: -1 to 0
        - Gamma: always positive
        - Implied volatility: reasonable range
        """
        print("Validating Greeks...")

        # Delta ranges
        if 'delta' in df.columns and 'option_type' in df.columns:
            call_mask = df['option_type'] == 'C'
            put_mask = df['option_type'] == 'P'

            # Check call deltas
            invalid_call_delta = df[call_mask & ((df['delta'] < 0) | (df['delta'] > 1))]
            if len(invalid_call_delta) > 0:
                raise ValueError(
                    f"Delta validation failed: {len(invalid_call_delta)} calls with delta outside [0, 1]"
                )

            # Check put deltas
            invalid_put_delta = df[put_mask & ((df['delta'] < -1) | (df['delta'] > 0))]
            if len(invalid_put_delta) > 0:
                raise ValueError(
                    f"Delta validation failed: {len(invalid_put_delta)} puts with delta outside [-1, 0]"
                )

        # Gamma must be positive
        if 'gamma' in df.columns:
            invalid_gamma = df[df['gamma'] < 0]
            if len(invalid_gamma) > 0:
                raise ValueError(
                    f"Gamma must be positive: {len(invalid_gamma)} rows with negative gamma"
                )

        # IV valid range (0.01 to 3.0)
        if 'implied_vol' in df.columns:
            invalid_iv = df[(df['implied_vol'] < 0.01) | (df['implied_vol'] > 3.0)]
            if len(invalid_iv) > 0:
                warnings.warn(
                    f"WARNING: {len(invalid_iv)} rows with IV outside [0.01, 3.0]"
                )
                # Flag but don't reject
                df.loc[(df['implied_vol'] < 0.01) | (df['implied_vol'] > 3.0), 'is_stale'] = True

        print("✓ Greeks validation passed")

    def validate_pricing(self, df: pd.DataFrame):
        """
        Ensure bid <= ask and reasonable spreads.

        Checks:
        - Bid must be <= Ask
        - Spreads not excessively wide (>100% is very suspicious)
        - Mid price calculation
        """
        print("Validating pricing...")

        if 'bid_price' not in df.columns or 'ask_price' not in df.columns:
            warnings.warn("Missing bid/ask columns, skipping pricing validation")
            return

        # Bid must be <= Ask
        violations = df[df['bid_price'] > df['ask_price']]
        if len(violations) > 0:
            raise ValueError(
                f"Bid > Ask violations: {len(violations)} rows\n"
                f"Sample violations:\n{violations[['symbol', 'strike', 'bid_price', 'ask_price']].head()}"
            )

        # Calculate mid price if not present
        if 'mid_price' not in df.columns:
            df['mid_price'] = (df['bid_price'] + df['ask_price']) / 2

        # Calculate spread
        df['bid_ask_spread'] = df['ask_price'] - df['bid_price']

        # Calculate spread percentage
        df['spread_pct'] = np.where(
            df['mid_price'] > 0,
            (df['bid_ask_spread'] / df['mid_price']) * 100,
            0
        )

        # Flag wide spreads (>50% is suspicious, >100% is very suspicious)
        wide_spreads = df[df['spread_pct'] > 50]
        if len(wide_spreads) > 0:
            warnings.warn(
                f"WARNING: {len(wide_spreads)} quotes with >50% spread\n"
                f"Marking these as potentially stale"
            )
            df.loc[df['spread_pct'] > 50, 'is_stale'] = True

        very_wide_spreads = df[df['spread_pct'] > 100]
        if len(very_wide_spreads) > 0:
            warnings.warn(
                f"WARNING: {len(very_wide_spreads)} quotes with >100% spread (very suspicious)"
            )

        print("✓ Pricing validation passed")

    def detect_stale_quotes(self, df: pd.DataFrame, current_time: pd.Timestamp):
        """
        For 0DTE in final hour: quotes older than 15-30 sec are stale.
        Otherwise: 1-2 minutes.

        Args:
            df: DataFrame with quote_time column
            current_time: Current timestamp for comparison
        """
        print("Detecting stale quotes...")

        if 'quote_time' not in df.columns:
            warnings.warn("No quote_time column, skipping stale detection")
            return

        # Convert to datetime
        df['quote_time'] = pd.to_datetime(df['quote_time'])

        # Calculate quote age
        df['quote_age_seconds'] = (current_time - df['quote_time']).dt.total_seconds()

        # Calculate time to expiration
        if 'expiration_timestamp' in df.columns:
            df['expiration_time'] = pd.to_datetime(df['expiration_timestamp'], unit='us')
            df['hours_to_expiry'] = (df['expiration_time'] - current_time).dt.total_seconds() / 3600
        else:
            df['hours_to_expiry'] = 999  # Default to non-0DTE

        # Dynamic stale thresholds
        df['stale_threshold'] = np.where(
            df['hours_to_expiry'] < 1,  # Final hour
            30,   # 30 seconds for 0DTE final hour
            120   # 2 minutes otherwise
        )

        # Mark stale quotes
        if 'is_stale' not in df.columns:
            df['is_stale'] = False

        df.loc[df['quote_age_seconds'] > df['stale_threshold'], 'is_stale'] = True

        stale_count = df['is_stale'].sum()
        if stale_count > 0:
            warnings.warn(f"Flagged {stale_count} stale quotes ({stale_count/len(df)*100:.1f}%)")

        print("✓ Stale quote detection complete")

    def validate_put_call_parity(self, df: pd.DataFrame, spot_price: float,
                                 rate: float = 0.043) -> list:
        """
        Cross-validation using put-call parity.

        Put-Call Parity: C + PV(K) = P + S
        Where:
            C = Call price
            P = Put price
            K = Strike price
            S = Spot price
            PV(K) = Present value of strike

        Clean data should have <3% violations.

        Args:
            df: DataFrame with options data
            spot_price: Current underlying price
            rate: Risk-free rate (default: 4.3%)

        Returns:
            List of violations
        """
        print("Validating put-call parity...")

        if 'option_type' not in df.columns:
            warnings.warn("No option_type column, skipping parity check")
            return []

        calls_df = df[df['option_type'] == 'C'].copy()
        puts_df = df[df['option_type'] == 'P'].copy()

        violations = []

        for _, call in calls_df.iterrows():
            # Find matching put (same strike and expiration)
            matching_puts = puts_df[
                (puts_df['strike'] == call['strike']) &
                (puts_df['expiration_timestamp'] == call['expiration_timestamp'])
            ]

            if len(matching_puts) == 0:
                continue

            put = matching_puts.iloc[0]

            # Calculate time to expiry in years
            time_to_expiry = (call['expiration_timestamp'] - call['timestamp_available']) / (365 * 24 * 3600 * 1e6)

            # Calculate present value of strike
            pv_strike = call['strike'] * np.exp(-rate * time_to_expiry)

            # Put-call parity
            lhs = call['mid_price'] + pv_strike
            rhs = put['mid_price'] + spot_price

            deviation_pct = abs(lhs - rhs) / spot_price

            if deviation_pct > 0.05:  # 5% threshold
                violations.append({
                    'strike': call['strike'],
                    'deviation_pct': deviation_pct,
                    'call_mid': call['mid_price'],
                    'put_mid': put['mid_price'],
                    'lhs': lhs,
                    'rhs': rhs
                })

        violation_rate = len(violations) / max(len(calls_df), 1)

        if violation_rate > 0.03:
            warnings.warn(
                f"WARNING: {violation_rate:.1%} put-call parity violations (>3% threshold)\n"
                f"This may indicate data quality issues"
            )
        else:
            print(f"✓ Put-call parity check passed ({violation_rate:.1%} violations)")

        return violations

    def load_delisted_securities(self, csv_path: str):
        """
        Load delisted securities to prevent survivorship bias.

        CSV should have columns:
        - symbol, listing_date, delisting_date, delisting_reason, final_price, successor_ticker
        """
        df = pd.read_csv(csv_path)
        df.to_sql('delisted_securities', self.conn, if_exists='append', index=False)
        print(f"Loaded {len(df)} delisted securities")

    def load_corporate_actions(self, csv_path: str):
        """
        Load corporate actions (splits, dividends).

        CSV should have columns:
        - symbol, action_type, declaration_date, ex_date, record_date,
          payment_date, split_factor, dividend_amount, adjustment_factor
        """
        df = pd.read_csv(csv_path)
        df.to_sql('corporate_actions', self.conn, if_exists='append', index=False)
        print(f"Loaded {len(df)} corporate actions")

    def load_market_regime_data(self, csv_path: str):
        """
        Load VIX, SPX, and regime data.

        CSV should have columns:
        - date, vix_close, spx_close, spx_daily_return, realized_vol_20d, regime
        """
        df = pd.read_csv(csv_path)
        df.to_sql('market_regime', self.conn, if_exists='append', index=False)
        print(f"Loaded {len(df)} regime data rows")


if __name__ == "__main__":
    # Example usage
    from database import get_database

    # Create database
    db = get_database(db_type='sqlite')
    db.create_schema()

    # Initialize loader
    loader = PointInTimeDataLoader(db.get_connection())

    print("\nData loader initialized successfully")
    print("\nTo load data:")
    print("loader.load_options_data('path/to/data.csv', 'SPY', '2024-01-15')")
