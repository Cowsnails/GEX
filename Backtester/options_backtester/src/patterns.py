"""
Pattern discovery engine for systematic pattern mining.

Finds profitable patterns in:
1. IV Rank/Percentile
2. Greeks combinations
3. Market regimes
4. Time-based patterns

All patterns must be statistically validated.
"""

import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from typing import Dict, List, Optional


class PatternDiscovery:
    """
    Systematic pattern mining with statistical validation.

    Discovers:
    - IV patterns (mean reversion, expansion)
    - Greeks-based entry points
    - Regime-specific strategies
    - Time/calendar patterns
    """

    def __init__(self, data: pd.DataFrame):
        """
        Initialize pattern discovery.

        Args:
            data: DataFrame with historical options data
        """
        self.data = data
        self.patterns = []

    def mine_iv_patterns(self, lookback: int = 252) -> pd.DataFrame:
        """
        Find high-probability IV Rank/Percentile setups.

        Pattern: High IV → Premium sell → Mean reversion

        Args:
            lookback: Lookback period for IV calculations (default: 252 days)

        Returns:
            DataFrame with high IV opportunities
        """
        print("\n" + "="*60)
        print("IV PATTERN DISCOVERY")
        print("="*60)

        # Calculate IV Rank
        self.data['iv_52w_low'] = self.data.groupby('symbol')['implied_vol'].transform(
            lambda x: x.rolling(lookback, min_periods=1).min()
        )
        self.data['iv_52w_high'] = self.data.groupby('symbol')['implied_vol'].transform(
            lambda x: x.rolling(lookback, min_periods=1).max()
        )

        self.data['iv_rank'] = (
            (self.data['implied_vol'] - self.data['iv_52w_low']) /
            (self.data['iv_52w_high'] - self.data['iv_52w_low']) * 100
        )

        # Calculate IV Percentile (more robust)
        self.data['iv_percentile'] = self.data.groupby('symbol')['implied_vol'].transform(
            lambda x: x.rolling(lookback).apply(
                lambda vals: (vals < vals.iloc[-1]).sum() / len(vals) * 100
                if len(vals) > 0 else 0
            )
        )

        # Test pattern: High IV → Premium sell → Mean reversion
        high_iv_trades = self.data[
            (self.data['iv_rank'] > 75) &
            (self.data['iv_percentile'] > 67)
        ]

        print(f"High IV opportunities: {len(high_iv_trades)}")
        print(f"  Avg IV Rank: {high_iv_trades['iv_rank'].mean():.1f}")
        print(f"  Avg IV Percentile: {high_iv_trades['iv_percentile'].mean():.1f}")

        return high_iv_trades

    def mine_greeks_patterns(self) -> pd.DataFrame:
        """
        Find profitable delta/gamma/theta combinations.

        Common patterns:
        - 0.30 delta premium selling
        - 0.16 delta for lower probability
        - High gamma for scalping

        Returns:
            DataFrame with recommended strikes
        """
        print("\n" + "="*60)
        print("GREEKS PATTERN DISCOVERY")
        print("="*60)

        # Test 0.30 delta premium selling
        delta_30_puts = self.data[
            (self.data['option_type'] == 'P') &
            (self.data['delta'].abs() >= 0.28) &
            (self.data['delta'].abs() <= 0.32)
        ]

        print(f"0.30 Delta Puts: {len(delta_30_puts)}")

        if len(delta_30_puts) > 0:
            print(f"  Avg Delta: {delta_30_puts['delta'].abs().mean():.3f}")
            print(f"  Avg Theta: {delta_30_puts['theta'].mean():.4f}")
            print(f"  Avg IV: {delta_30_puts['implied_vol'].mean():.2%}")

        return delta_30_puts

    def mine_spread_patterns(self) -> List[Dict]:
        """
        Find optimal spread configurations.

        Spreads:
        - Credit spreads (sell high delta, buy low delta)
        - Iron condors
        - Butterflies

        Returns:
            List of spread opportunities
        """
        print("\n" + "="*60)
        print("SPREAD PATTERN DISCOVERY")
        print("="*60)

        spreads = []

        # Group by expiration and symbol
        for (symbol, exp_ts), group in self.data.groupby(['underlying_symbol', 'expiration_timestamp']):
            puts = group[group['option_type'] == 'P'].sort_values('strike')

            if len(puts) < 2:
                continue

            # Find credit spread opportunities (sell 30 delta, buy 16 delta)
            for i in range(len(puts) - 1):
                short_put = puts.iloc[i]
                long_put = puts.iloc[i + 1]

                # Check if deltas are in range
                if (0.28 <= abs(short_put['delta']) <= 0.32 and
                    0.14 <= abs(long_put['delta']) <= 0.18):

                    credit = short_put['mid_price'] - long_put['mid_price']
                    width = short_put['strike'] - long_put['strike']

                    if credit > 0 and width > 0:
                        spreads.append({
                            'symbol': symbol,
                            'expiration_ts': exp_ts,
                            'short_strike': short_put['strike'],
                            'long_strike': long_put['strike'],
                            'short_delta': short_put['delta'],
                            'long_delta': long_put['delta'],
                            'credit': credit,
                            'width': width,
                            'max_profit': credit,
                            'max_loss': width - credit,
                            'pop': abs(short_put['delta'])  # Rough probability of profit
                        })

        print(f"Credit spread opportunities: {len(spreads)}")

        if len(spreads) > 0:
            spreads_df = pd.DataFrame(spreads)
            print(f"  Avg credit: ${spreads_df['credit'].mean():.2f}")
            print(f"  Avg width: ${spreads_df['width'].mean():.0f}")
            print(f"  Avg PoP: {spreads_df['pop'].mean():.1%}")

        return spreads

    def cluster_regimes(self, n_clusters: int = 5) -> pd.DataFrame:
        """
        Identify distinct market regimes using k-means.

        Features:
        - Daily returns
        - Realized volatility
        - VIX level
        - IV Rank

        Args:
            n_clusters: Number of regimes to identify

        Returns:
            DataFrame with regime statistics
        """
        print("\n" + "="*60)
        print("MARKET REGIME CLUSTERING")
        print("="*60)

        # Prepare features
        required_cols = ['underlying_price', 'implied_vol']
        if not all(col in self.data.columns for col in required_cols):
            print("ERROR: Missing required columns for clustering")
            return pd.DataFrame()

        # Calculate daily returns (if not present)
        if 'daily_return' not in self.data.columns:
            self.data['daily_return'] = self.data.groupby('symbol')['underlying_price'].pct_change()

        # Calculate realized volatility (if not present)
        if 'realized_vol' not in self.data.columns:
            self.data['realized_vol'] = self.data.groupby('symbol')['daily_return'].transform(
                lambda x: x.rolling(20).std() * np.sqrt(252)
            )

        # Select features for clustering
        features_df = self.data[['daily_return', 'realized_vol', 'implied_vol']].dropna()

        if len(features_df) == 0:
            print("ERROR: No data available for clustering")
            return pd.DataFrame()

        # Perform k-means clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        features_df['regime'] = kmeans.fit_predict(features_df)

        # Assign regimes back to main data
        self.data.loc[features_df.index, 'regime'] = features_df['regime']

        # Analyze regime characteristics
        regime_stats = features_df.groupby('regime').agg({
            'daily_return': ['mean', 'std'],
            'realized_vol': 'mean',
            'implied_vol': 'mean'
        })

        print(f"\nIdentified {n_clusters} Market Regimes:")
        print(regime_stats)

        return regime_stats

    def find_time_patterns(self) -> Dict[str, pd.DataFrame]:
        """
        Find time-based patterns.

        Patterns:
        - Day of week effects
        - Time of day effects
        - Monthly patterns
        - Earnings-related patterns

        Returns:
            Dictionary of time-based patterns
        """
        print("\n" + "="*60)
        print("TIME PATTERN DISCOVERY")
        print("="*60)

        patterns = {}

        # Add timestamp column if not present
        if 'timestamp' not in self.data.columns and 'timestamp_available' in self.data.columns:
            self.data['timestamp'] = pd.to_datetime(self.data['timestamp_available'], unit='us')

        if 'timestamp' in self.data.columns:
            # Day of week
            self.data['day_of_week'] = self.data['timestamp'].dt.dayofweek
            day_patterns = self.data.groupby('day_of_week').agg({
                'mid_price': 'mean',
                'implied_vol': 'mean',
                'volume': 'mean'
            })
            patterns['day_of_week'] = day_patterns

            print("\nDay of Week Patterns:")
            print(day_patterns)

            # Hour of day (if intraday data)
            self.data['hour'] = self.data['timestamp'].dt.hour
            hour_patterns = self.data.groupby('hour').agg({
                'mid_price': 'mean',
                'implied_vol': 'mean',
                'volume': 'mean'
            })
            patterns['hour_of_day'] = hour_patterns

            print("\nHour of Day Patterns:")
            print(hour_patterns)

        return patterns

    def calculate_pattern_statistics(self, pattern_data: pd.DataFrame,
                                    subsequent_returns: pd.Series) -> Dict:
        """
        Calculate statistics for a discovered pattern.

        Args:
            pattern_data: DataFrame with pattern occurrences
            subsequent_returns: Returns after pattern occurred

        Returns:
            Dictionary with pattern statistics
        """
        if len(subsequent_returns) == 0:
            return {}

        stats = {
            'occurrences': len(pattern_data),
            'avg_return': subsequent_returns.mean(),
            'std_return': subsequent_returns.std(),
            'win_rate': (subsequent_returns > 0).sum() / len(subsequent_returns),
            'sharpe_ratio': (subsequent_returns.mean() / subsequent_returns.std() * np.sqrt(252)
                           if subsequent_returns.std() > 0 else 0),
            'max_return': subsequent_returns.max(),
            'min_return': subsequent_returns.min()
        }

        return stats


if __name__ == "__main__":
    # Example usage
    print("Pattern Discovery module loaded successfully")
    print("\nExample usage:")
    print("""
    # Load your data
    data = pd.read_csv('options_data.csv')

    # Initialize pattern discovery
    discovery = PatternDiscovery(data)

    # Mine IV patterns
    high_iv_setups = discovery.mine_iv_patterns()

    # Mine Greeks patterns
    delta_30_setups = discovery.mine_greeks_patterns()

    # Find spreads
    spreads = discovery.mine_spread_patterns()

    # Cluster regimes
    regimes = discovery.cluster_regimes(n_clusters=5)
    """)
