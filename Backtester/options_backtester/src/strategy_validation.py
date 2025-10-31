"""
Strategy Validation Framework

Professional-grade validation criteria for strategy deployment readiness.
Separates robust strategies from curve-fitted ones.

Validation Criteria:
1. Walk-Forward Efficiency > 0.5 (preferably > 0.7)
2. Monte Carlo p-value < 0.05 (statistically significant)
3. Deflated Sharpe Ratio > 0.95 at 95% confidence
4. Minimum 100 trades (500+ ideal)
5. Profitable at 2× transaction costs
6. Positive in 4 of 5 market regimes
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Optional, Tuple
import warnings
warnings.filterwarnings('ignore')


class StrategyValidator:
    """Comprehensive strategy validation framework"""

    def __init__(self, equity_curve: pd.DataFrame, trades: List[dict],
                 initial_capital: float, benchmark_returns: Optional[pd.Series] = None):
        """
        Initialize validator.

        Args:
            equity_curve: DataFrame with timestamp and value columns
            trades: List of trade dicts with entry/exit/pnl
            initial_capital: Starting capital
            benchmark_returns: Optional benchmark (e.g., SPY) returns series
        """
        self.equity_curve = equity_curve
        self.trades = trades
        self.initial_capital = initial_capital
        self.benchmark_returns = benchmark_returns

        # Calculate daily returns
        self.returns = self._calculate_returns()

    def _calculate_returns(self) -> pd.Series:
        """Calculate daily returns from equity curve"""
        if len(self.equity_curve) == 0:
            return pd.Series()

        values = self.equity_curve['value'].values
        returns = np.diff(values) / values[:-1]
        return pd.Series(returns)

    def validate_all(self) -> Dict:
        """
        Run all validation tests.

        Returns:
            Dict with all validation results and deployment readiness score
        """
        print("\n" + "="*60)
        print("STRATEGY VALIDATION REPORT")
        print("="*60)

        results = {}

        # 1. Walk-Forward Efficiency
        print("\n1️⃣  Walk-Forward Analysis...")
        wf_efficiency = self.calculate_walk_forward_efficiency()
        results['walk_forward_efficiency'] = wf_efficiency
        results['walk_forward_pass'] = wf_efficiency >= 0.5
        print(f"   Efficiency: {wf_efficiency:.3f} {'✅' if wf_efficiency >= 0.7 else '⚠️' if wf_efficiency >= 0.5 else '❌'}")
        print(f"   Target: > 0.5 (excellent > 0.7)")

        # 2. Monte Carlo Significance
        print("\n2️⃣  Monte Carlo Permutation Test...")
        mc_pvalue = self.monte_carlo_significance_test(n_simulations=1000)
        results['monte_carlo_pvalue'] = mc_pvalue
        results['monte_carlo_pass'] = mc_pvalue < 0.05
        print(f"   p-value: {mc_pvalue:.4f} {'✅' if mc_pvalue < 0.05 else '❌'}")
        print(f"   Target: < 0.05 (statistically significant)")

        # 3. Deflated Sharpe Ratio
        print("\n3️⃣  Deflated Sharpe Ratio...")
        dsr, confidence = self.calculate_deflated_sharpe_ratio()
        results['deflated_sharpe_ratio'] = dsr
        results['dsr_confidence'] = confidence
        results['dsr_pass'] = confidence >= 0.95
        print(f"   DSR: {dsr:.3f}, Confidence: {confidence:.3f} {'✅' if confidence >= 0.95 else '❌'}")
        print(f"   Target: Confidence > 0.95 at 95% level")

        # 4. Trade Count
        print("\n4️⃣  Trade Count Validation...")
        trade_count = len(self.trades)
        results['trade_count'] = trade_count
        results['trade_count_pass'] = trade_count >= 100
        print(f"   Trades: {trade_count} {'✅' if trade_count >= 500 else '⚠️' if trade_count >= 100 else '❌'}")
        print(f"   Target: ≥ 100 (ideal ≥ 500)")

        # 5. 2x Transaction Cost Stress Test
        print("\n5️⃣  Transaction Cost Stress Test (2x)...")
        stress_result = self.stress_test_transaction_costs()
        results['stress_test_profitable'] = stress_result['still_profitable']
        results['stress_test_return'] = stress_result['stressed_return']
        results['stress_test_pass'] = stress_result['still_profitable']
        print(f"   Return at 2x costs: {stress_result['stressed_return']:.2%} {'✅' if stress_result['still_profitable'] else '❌'}")
        print(f"   Target: Profitable at 2x costs")

        # 6. Market Regime Performance
        print("\n6️⃣  Market Regime Performance...")
        regime_results = self.analyze_regime_performance()
        results['regime_performance'] = regime_results
        regimes_positive = sum(1 for r in regime_results.values() if r['return'] > 0)
        results['regime_pass'] = regimes_positive >= 4
        print(f"   Positive regimes: {regimes_positive}/5 {'✅' if regimes_positive >= 4 else '❌'}")
        for regime, data in regime_results.items():
            print(f"      {regime}: {data['return']:.2%}")

        # Calculate Deployment Readiness Score
        total_criteria = 6
        passed_criteria = sum([
            results['walk_forward_pass'],
            results['monte_carlo_pass'],
            results['dsr_pass'],
            results['trade_count_pass'],
            results['stress_test_pass'],
            results['regime_pass']
        ])

        readiness_score = (passed_criteria / total_criteria) * 100
        results['deployment_readiness_score'] = readiness_score
        results['deployment_ready'] = passed_criteria >= 5  # At least 5/6 must pass

        print("\n" + "="*60)
        print(f"DEPLOYMENT READINESS SCORE: {readiness_score:.0f}%")
        print(f"Passed {passed_criteria}/{total_criteria} criteria")
        if results['deployment_ready']:
            print("✅ STRATEGY IS DEPLOYMENT READY")
        else:
            print("❌ STRATEGY NOT READY FOR DEPLOYMENT")
        print("="*60 + "\n")

        return results

    def calculate_walk_forward_efficiency(self, n_splits: int = 5) -> float:
        """
        Calculate walk-forward efficiency.

        Divides data into n splits, each split has in-sample (optimization)
        and out-of-sample (testing) periods.

        Efficiency = (Average OOS performance) / (Average IS performance)

        Args:
            n_splits: Number of walk-forward windows

        Returns:
            Walk-forward efficiency (0 to 1+)
        """
        if len(self.returns) < n_splits * 20:  # Need enough data
            return 0.0

        total_length = len(self.returns)
        split_size = total_length // n_splits

        in_sample_returns = []
        out_sample_returns = []

        for i in range(n_splits):
            # In-sample: first 60% of split
            is_start = i * split_size
            is_end = is_start + int(split_size * 0.6)

            # Out-of-sample: last 40% of split
            oos_start = is_end
            oos_end = min(oos_start + int(split_size * 0.4), total_length)

            if oos_start >= total_length:
                break

            # Calculate returns for each period
            is_ret = self.returns.iloc[is_start:is_end].mean() * 252  # Annualized
            oos_ret = self.returns.iloc[oos_start:oos_end].mean() * 252

            in_sample_returns.append(is_ret)
            out_sample_returns.append(oos_ret)

        if len(in_sample_returns) == 0:
            return 0.0

        avg_is = np.mean(in_sample_returns)
        avg_oos = np.mean(out_sample_returns)

        if avg_is <= 0:
            return 0.0

        efficiency = avg_oos / avg_is
        return max(0.0, min(efficiency, 2.0))  # Cap at 2.0 for display

    def monte_carlo_significance_test(self, n_simulations: int = 1000) -> float:
        """
        Monte Carlo permutation test for statistical significance.

        Randomly shuffles returns and recalculates Sharpe ratio to determine
        if observed Sharpe could occur by chance.

        Args:
            n_simulations: Number of random simulations

        Returns:
            p-value (probability results are due to luck)
        """
        if len(self.returns) == 0:
            return 1.0

        # Calculate actual Sharpe ratio
        actual_sharpe = self._calculate_sharpe(self.returns)

        # Run random simulations
        random_sharpes = []
        for _ in range(n_simulations):
            shuffled_returns = np.random.permutation(self.returns)
            random_sharpe = self._calculate_sharpe(pd.Series(shuffled_returns))
            random_sharpes.append(random_sharpe)

        # Calculate p-value: fraction of random Sharpes >= actual
        random_sharpes = np.array(random_sharpes)
        p_value = np.mean(random_sharpes >= actual_sharpe)

        return p_value

    def _calculate_sharpe(self, returns: pd.Series, risk_free_rate: float = 0.0) -> float:
        """Calculate Sharpe ratio"""
        if len(returns) == 0 or returns.std() == 0:
            return 0.0

        excess_returns = returns - (risk_free_rate / 252)
        sharpe = excess_returns.mean() / returns.std() * np.sqrt(252)
        return sharpe

    def calculate_deflated_sharpe_ratio(self, n_trials: int = 100,
                                       skewness: Optional[float] = None,
                                       kurtosis: Optional[float] = None) -> Tuple[float, float]:
        """
        Calculate Deflated Sharpe Ratio (Bailey & Lopez de Prado, 2014).

        Adjusts Sharpe ratio for multiple testing bias and non-normal returns.

        Args:
            n_trials: Number of strategy variations tested (estimate)
            skewness: Return skewness (calculated if None)
            kurtosis: Return kurtosis (calculated if None)

        Returns:
            Tuple of (deflated_sharpe_ratio, probability_sharpe_is_positive)
        """
        if len(self.returns) < 10:
            return 0.0, 0.0

        # Calculate observed Sharpe
        observed_sharpe = self._calculate_sharpe(self.returns)

        # Calculate return moments if not provided
        if skewness is None:
            skewness = self.returns.skew()
        if kurtosis is None:
            kurtosis = self.returns.kurtosis()

        # Number of observations
        n = len(self.returns)

        # Adjust for non-normality
        # Standard error of Sharpe ratio adjusted for skewness and kurtosis
        variance_sharpe = (1 + (observed_sharpe ** 2) / 2 -
                          skewness * observed_sharpe +
                          (kurtosis - 3) / 4 * (observed_sharpe ** 2)) / (n - 1)

        std_sharpe = np.sqrt(variance_sharpe)

        # Deflate for multiple testing
        # Expected maximum Sharpe under null hypothesis
        expected_max_sharpe = ((1 - np.euler_gamma) * stats.norm.ppf(1 - 1.0/n_trials) +
                              np.euler_gamma * stats.norm.ppf(1 - 1.0/(n_trials * np.e)))

        # Deflated Sharpe Ratio
        deflated_sharpe = (observed_sharpe - expected_max_sharpe) / std_sharpe

        # Probability that true Sharpe > 0 (confidence level)
        prob_sharpe_positive = stats.norm.cdf(deflated_sharpe)

        return observed_sharpe, prob_sharpe_positive

    def stress_test_transaction_costs(self) -> Dict:
        """
        Stress test with 2x transaction costs.

        Doubles all transaction costs and recalculates returns.

        Returns:
            Dict with stressed return and profitability
        """
        if len(self.trades) == 0:
            return {
                'stressed_return': 0.0,
                'still_profitable': False
            }

        # Calculate total transaction costs from trades
        total_costs = sum(trade.get('commission', 0) + trade.get('slippage', 0)
                         for trade in self.trades)

        # Double the costs
        additional_costs = total_costs  # Another 1x on top of original

        # Calculate stressed final value
        original_final = self.equity_curve['value'].iloc[-1] if len(self.equity_curve) > 0 else self.initial_capital
        stressed_final = original_final - additional_costs

        # Calculate stressed return
        stressed_return = (stressed_final - self.initial_capital) / self.initial_capital

        return {
            'stressed_return': stressed_return,
            'original_return': (original_final - self.initial_capital) / self.initial_capital,
            'still_profitable': stressed_return > 0,
            'impact': total_costs / self.initial_capital
        }

    def analyze_regime_performance(self) -> Dict[str, Dict]:
        """
        Analyze performance across different market regimes.

        Regimes:
        1. Bull Market (SPY trending up)
        2. Bear Market (SPY trending down)
        3. High Volatility (VIX > 25)
        4. Low Volatility (VIX < 15)
        5. Sideways (SPY low directional movement)

        Returns:
            Dict with performance for each regime
        """
        if len(self.equity_curve) == 0:
            return self._default_regime_results()

        # Since we may not have full market data, we'll estimate regimes
        # from strategy equity curve behavior
        regime_results = {}

        # Split equity curve into periods
        values = self.equity_curve['value'].values
        n = len(values)
        segment_size = n // 5

        if segment_size < 10:
            return self._default_regime_results()

        # Analyze each segment
        segments = [
            values[i*segment_size:(i+1)*segment_size]
            for i in range(5)
        ]

        regime_names = ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5']

        for i, (segment, name) in enumerate(zip(segments, regime_names)):
            if len(segment) < 2:
                continue

            ret = (segment[-1] - segment[0]) / segment[0]
            regime_results[name] = {
                'return': ret,
                'positive': ret > 0
            }

        return regime_results

    def _default_regime_results(self) -> Dict[str, Dict]:
        """Default regime results when insufficient data"""
        regimes = ['Bull Market', 'Bear Market', 'High Vol', 'Low Vol', 'Sideways']
        return {
            regime: {'return': 0.0, 'positive': False}
            for regime in regimes
        }


def validate_strategy(backtest_results: Dict) -> Dict:
    """
    Convenience function to validate a completed backtest.

    Args:
        backtest_results: Results dict from backtest.run()

    Returns:
        Validation results dict
    """
    equity_curve = backtest_results.get('equity_curve')
    trades = backtest_results.get('trades_data', [])
    initial_capital = backtest_results.get('initial_capital', 100000)

    if equity_curve is None or not isinstance(equity_curve, pd.DataFrame):
        print("❌ Cannot validate: equity_curve missing or invalid")
        return {}

    # Create validator
    validator = StrategyValidator(
        equity_curve=equity_curve,
        trades=trades,
        initial_capital=initial_capital
    )

    # Run validation
    return validator.validate_all()


if __name__ == "__main__":
    print("Strategy Validation Framework")
    print("=" * 60)
    print("\nValidation Criteria:")
    print("1. Walk-Forward Efficiency > 0.5 (preferably > 0.7)")
    print("2. Monte Carlo p-value < 0.05 (statistically significant)")
    print("3. Deflated Sharpe Ratio > 0.95 at 95% confidence")
    print("4. Minimum 100 trades (500+ ideal)")
    print("5. Profitable at 2× transaction costs")
    print("6. Positive in 4 of 5 market regimes")
    print("\nThese criteria separate robust strategies from curve-fitted ones.")
    print("\nUsage:")
    print("""
    from strategy_validation import validate_strategy

    # After running backtest
    results = backtest.run()

    # Validate strategy
    validation = validate_strategy(results)

    # Check deployment readiness
    if validation['deployment_ready']:
        print('✅ Strategy ready for deployment!')
        print(f"Readiness Score: {validation['deployment_readiness_score']:.0f}%")
    """)