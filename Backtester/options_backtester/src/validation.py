"""
Walk-forward optimization and statistical validation.

Prevents overfitting through:
1. Walk-forward analysis (temporal cross-validation)
2. Monte Carlo permutation tests
3. Deflated Sharpe Ratio
4. Drawdown analysis

CRITICAL: Never test on same out-of-sample data multiple times!
"""

import numpy as np
import pandas as pd
from scipy.stats import norm
from sklearn.model_selection import TimeSeriesSplit
from typing import Dict, List, Callable, Any
from itertools import product


class WalkForwardOptimizer:
    """
    Walk-forward analysis prevents curve-fitting.

    Process:
    1. Train on 12 months → Test on 1 month
    2. Roll forward
    3. Repeat

    Walk-Forward Efficiency = avg(OOS returns) / avg(IS returns)
    - > 0.7 = excellent
    - 0.4-0.7 = acceptable
    - < 0.4 = severe overfitting
    """

    def __init__(self, backtest_fn: Callable, param_grid: Dict[str, List[Any]],
                 n_splits: int = 10):
        """
        Initialize walk-forward optimizer.

        Args:
            backtest_fn: Function that runs backtest with params
            param_grid: Dictionary of parameter names and values to test
            n_splits: Number of walk-forward splits
        """
        self.backtest_fn = backtest_fn
        self.param_grid = param_grid
        self.n_splits = n_splits
        self.results = []

    def optimize(self, data_dates: List[pd.Timestamp],
                test_size_pct: float = 0.2) -> tuple:
        """
        Rolling window optimization.

        Train on 12 months → Test on 1 month → Roll forward

        Args:
            data_dates: List of available dates
            test_size_pct: Percentage of data for testing (default: 20%)

        Returns:
            (results_list, walk_forward_efficiency)
        """
        print("\n" + "="*60)
        print("WALK-FORWARD OPTIMIZATION")
        print("="*60)

        tscv = TimeSeriesSplit(
            n_splits=self.n_splits,
            test_size=int(len(data_dates) * test_size_pct)
        )

        split_num = 0

        for train_idx, test_idx in tscv.split(data_dates):
            split_num += 1

            train_dates = [data_dates[i] for i in train_idx]
            test_dates = [data_dates[i] for i in test_idx]

            train_start = train_dates[0]
            train_end = train_dates[-1]
            test_start = test_dates[0]
            test_end = test_dates[-1]

            print(f"\nSplit {split_num}/{self.n_splits}")
            print(f"  Train: {train_start.date()} to {train_end.date()}")
            print(f"  Test:  {test_start.date()} to {test_end.date()}")

            # Optimize parameters on training data
            best_params = self.grid_search(train_start, train_end)

            print(f"  Best params: {best_params}")

            # Test on out-of-sample data
            oos_results = self.backtest_fn(test_start, test_end, best_params)
            is_results = self.backtest_fn(train_start, train_end, best_params)

            self.results.append({
                'split': split_num,
                'train_period': (train_start, train_end),
                'test_period': (test_start, test_end),
                'best_params': best_params,
                'is_sharpe': is_results.get('sharpe_ratio', 0),
                'oos_sharpe': oos_results.get('sharpe_ratio', 0),
                'is_return': is_results.get('total_return', 0),
                'oos_return': oos_results.get('total_return', 0)
            })

            print(f"  IS Return:  {is_results.get('total_return', 0):.2f}%")
            print(f"  OOS Return: {oos_results.get('total_return', 0):.2f}%")

        # Calculate Walk-Forward Efficiency
        wfe = self.calculate_wfe()

        return self.results, wfe

    def grid_search(self, start_date: pd.Timestamp, end_date: pd.Timestamp) -> Dict[str, Any]:
        """
        Test all parameter combinations on training data.

        Args:
            start_date: Training start date
            end_date: Training end date

        Returns:
            Best parameters
        """
        best_sharpe = -999
        best_params = None

        param_combinations = self.generate_param_combinations()

        print(f"    Testing {len(param_combinations)} parameter combinations...")

        for params in param_combinations:
            results = self.backtest_fn(start_date, end_date, params)

            sharpe = results.get('sharpe_ratio', -999)

            if sharpe > best_sharpe:
                best_sharpe = sharpe
                best_params = params

        return best_params

    def generate_param_combinations(self) -> List[Dict[str, Any]]:
        """
        Generate all parameter combinations from grid.

        Returns:
            List of parameter dictionaries
        """
        keys = self.param_grid.keys()
        values = self.param_grid.values()

        combinations = []
        for combo in product(*values):
            param_dict = dict(zip(keys, combo))
            combinations.append(param_dict)

        return combinations

    def calculate_wfe(self) -> float:
        """
        Walk-Forward Efficiency = avg(OOS returns) / avg(IS returns)

        > 0.7 = excellent
        0.4-0.7 = acceptable
        < 0.4 = severe overfitting

        Returns:
            Walk-forward efficiency
        """
        if len(self.results) == 0:
            return 0.0

        avg_oos = np.mean([r['oos_return'] for r in self.results])
        avg_is = np.mean([r['is_return'] for r in self.results])

        wfe = avg_oos / avg_is if avg_is != 0 else 0

        print("\n" + "="*60)
        print(f"Walk-Forward Efficiency: {wfe:.3f}")

        if wfe > 0.7:
            print("✓ Excellent robustness")
        elif wfe > 0.4:
            print("⚠ Acceptable with some overfitting")
        else:
            print("✗ SEVERE OVERFITTING - reject strategy")

        print("="*60)

        return wfe


class StatisticalValidator:
    """
    Rigorous statistical tests for strategy validation.

    Tests:
    1. Monte Carlo permutation test
    2. Deflated Sharpe Ratio
    3. Drawdown analysis
    """

    def monte_carlo_permutation_test(self, returns: pd.Series,
                                    n_simulations: int = 1000) -> Dict[str, Any]:
        """
        Test if returns are statistically significant vs random.

        p-value < 0.05 required to confirm edge.

        Args:
            returns: Series of returns
            n_simulations: Number of simulations (default: 1000)

        Returns:
            Dictionary with test results
        """
        print("\n" + "="*60)
        print("MONTE CARLO PERMUTATION TEST")
        print("="*60)

        # Calculate original Sharpe ratio
        original_sharpe = returns.mean() / returns.std() * np.sqrt(252)

        print(f"Original Sharpe Ratio: {original_sharpe:.2f}")

        # Randomly permute returns
        permuted_sharpes = []
        for _ in range(n_simulations):
            permuted = returns.sample(frac=1.0).reset_index(drop=True)
            permuted_sharpe = permuted.mean() / permuted.std() * np.sqrt(252)
            permuted_sharpes.append(permuted_sharpe)

        # Calculate p-value
        percentile_rank = np.sum(np.array(permuted_sharpes) >= original_sharpe) / n_simulations
        p_value = 1 - percentile_rank

        result = {
            'original_sharpe': original_sharpe,
            'p_value': p_value,
            'significant': p_value < 0.05,
            'permuted_distribution': permuted_sharpes
        }

        if p_value < 0.05:
            print(f"✓ Statistically significant edge (p={p_value:.4f})")
        else:
            print(f"✗ No significant edge detected (p={p_value:.4f})")

        print("="*60)

        return result

    def deflated_sharpe_ratio(self, observed_sr: float, n_trials: int,
                             skewness: float, kurtosis: float,
                             n_observations: int) -> Dict[str, Any]:
        """
        Adjust Sharpe ratio for multiple testing bias.

        After 100 trials, expected max SR = 2.5 even with zero true edge.

        Args:
            observed_sr: Observed Sharpe ratio
            n_trials: Number of trials tested
            skewness: Skewness of returns
            kurtosis: Kurtosis of returns
            n_observations: Number of observations

        Returns:
            Dictionary with results
        """
        print("\n" + "="*60)
        print("DEFLATED SHARPE RATIO")
        print("="*60)

        # Variance of Sharpe ratio
        var_sr = ((1 + (1 - skewness * observed_sr +
                       (kurtosis - 1) / 4 * observed_sr**2)) /
                 (n_observations - 1))

        # Expected maximum SR under null hypothesis
        expected_max_sr = norm.ppf(1 - 1/n_trials) * np.sqrt(var_sr)

        # Deflated SR
        deflated_sr = (observed_sr - expected_max_sr) / np.sqrt(var_sr)

        # P-value
        p_value = norm.cdf(deflated_sr)

        result = {
            'observed_sr': observed_sr,
            'deflated_sr': deflated_sr,
            'p_value': p_value,
            'significant': p_value > 0.95,
            'expected_max_sr': expected_max_sr
        }

        print(f"Observed SR: {observed_sr:.2f}")
        print(f"Deflated SR: {deflated_sr:.2f}")
        print(f"After {n_trials} trials, expected max random SR: {expected_max_sr:.2f}")

        if p_value > 0.95:
            print("✓ Significant edge after adjusting for multiple testing")
        else:
            print("✗ Not significant after multiple testing adjustment")

        print("="*60)

        return result

    def monte_carlo_drawdown_simulation(self, trade_returns: np.array,
                                       n_simulations: int = 1000) -> tuple:
        """
        Estimate realistic worst-case drawdown.

        95th percentile should guide capital requirements.

        Args:
            trade_returns: Array of trade returns
            n_simulations: Number of simulations

        Returns:
            (percentiles_dict, max_drawdowns_list)
        """
        print("\n" + "="*60)
        print("MONTE CARLO DRAWDOWN ANALYSIS")
        print("="*60)

        max_drawdowns = []

        for _ in range(n_simulations):
            # Resample with replacement
            sampled_returns = np.random.choice(trade_returns, size=len(trade_returns),
                                             replace=True)

            # Calculate equity curve
            equity = (1 + sampled_returns).cumprod()

            # Calculate drawdown
            cummax = np.maximum.accumulate(equity)
            drawdown = (equity - cummax) / cummax
            max_drawdowns.append(drawdown.min())

        percentiles = {
            '50th': np.percentile(max_drawdowns, 50),
            '75th': np.percentile(max_drawdowns, 75),
            '95th': np.percentile(max_drawdowns, 95),
            '99th': np.percentile(max_drawdowns, 99)
        }

        print(f"  50th percentile: {percentiles['50th']:.2%}")
        print(f"  75th percentile: {percentiles['75th']:.2%}")
        print(f"  95th percentile: {percentiles['95th']:.2%}")
        print(f"  99th percentile: {percentiles['99th']:.2%}")

        # Capital requirements
        account_size_needed = 100000  # Example
        recommended_capital = account_size_needed / (1 + percentiles['95th'])

        print(f"\nRecommended capital for $100k strategy: ${recommended_capital:,.0f}")
        print(f"  (Accounts for 95th percentile drawdown)")

        print("="*60)

        return percentiles, max_drawdowns


if __name__ == "__main__":
    # Example usage
    print("Validation module loaded successfully")
    print("\nExample: Monte Carlo Permutation Test")

    # Simulated returns
    np.random.seed(42)
    returns = pd.Series(np.random.normal(0.001, 0.02, 252))

    validator = StatisticalValidator()
    result = validator.monte_carlo_permutation_test(returns)

    print(f"\nResult: {'Significant' if result['significant'] else 'Not significant'}")
