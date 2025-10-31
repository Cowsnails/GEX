"""
Advanced Performance Metrics Module

Calculates alpha, beta, and other advanced metrics for backtest results
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple


def calculate_returns(equity_curve: pd.DataFrame) -> pd.Series:
    """
    Calculate returns from equity curve

    Args:
        equity_curve: DataFrame with 'total_value' and 'timestamp' columns

    Returns:
        Series of returns
    """
    returns = equity_curve['total_value'].pct_change().fillna(0)
    return returns


def calculate_alpha_beta(
    strategy_returns: pd.Series,
    benchmark_returns: pd.Series,
    risk_free_rate: float = 0.0
) -> Tuple[float, float, float]:
    """
    Calculate alpha and beta relative to a benchmark

    Alpha: Excess return over what would be expected given the risk (beta)
    Beta: Sensitivity to benchmark movements

    Args:
        strategy_returns: Strategy returns series
        benchmark_returns: Benchmark (SPY) returns series
        risk_free_rate: Annual risk-free rate (default 0 for simplicity)

    Returns:
        Tuple of (alpha, beta, r_squared)
    """
    # Align the series
    aligned = pd.DataFrame({
        'strategy': strategy_returns,
        'benchmark': benchmark_returns
    }).dropna()

    if len(aligned) < 2:
        return 0.0, 0.0, 0.0

    # Calculate excess returns (subtract risk-free rate if provided)
    strategy_excess = aligned['strategy'] - risk_free_rate
    benchmark_excess = aligned['benchmark'] - risk_free_rate

    # Calculate beta using covariance
    covariance = np.cov(strategy_excess, benchmark_excess)[0, 1]
    benchmark_variance = np.var(benchmark_excess)

    if benchmark_variance == 0:
        beta = 0.0
    else:
        beta = covariance / benchmark_variance

    # Calculate alpha (Jensen's alpha)
    # Alpha = Strategy_Return - (Risk_Free_Rate + Beta * (Benchmark_Return - Risk_Free_Rate))
    strategy_mean = strategy_excess.mean()
    benchmark_mean = benchmark_excess.mean()
    alpha = strategy_mean - (beta * benchmark_mean)

    # Calculate R-squared (correlation coefficient squared)
    correlation = np.corrcoef(strategy_excess, benchmark_excess)[0, 1]
    r_squared = correlation ** 2 if not np.isnan(correlation) else 0.0

    # Annualize alpha (assuming daily returns)
    alpha_annualized = alpha * 252

    return alpha_annualized, beta, r_squared


def calculate_sortino_ratio(returns: pd.Series, risk_free_rate: float = 0.0) -> float:
    """
    Calculate Sortino ratio (like Sharpe but only considers downside volatility)

    Args:
        returns: Series of returns
        risk_free_rate: Risk-free rate

    Returns:
        Sortino ratio
    """
    excess_returns = returns - risk_free_rate
    mean_excess = excess_returns.mean()

    # Downside deviation (only negative returns)
    downside_returns = excess_returns[excess_returns < 0]

    if len(downside_returns) == 0:
        return float('inf')

    downside_std = downside_returns.std()

    if downside_std == 0:
        return 0.0

    # Annualize
    sortino = (mean_excess / downside_std) * np.sqrt(252)

    return sortino


def calculate_calmar_ratio(returns: pd.Series, max_drawdown: float) -> float:
    """
    Calculate Calmar ratio (annualized return / max drawdown)

    Args:
        returns: Series of returns
        max_drawdown: Maximum drawdown (absolute value)

    Returns:
        Calmar ratio
    """
    if max_drawdown == 0:
        return 0.0

    total_return = (1 + returns).prod() - 1
    num_periods = len(returns)

    # Annualize return
    annualized_return = (1 + total_return) ** (252 / num_periods) - 1

    calmar = annualized_return / abs(max_drawdown)

    return calmar


def calculate_information_ratio(
    strategy_returns: pd.Series,
    benchmark_returns: pd.Series
) -> float:
    """
    Calculate information ratio (active return / tracking error)

    Args:
        strategy_returns: Strategy returns
        benchmark_returns: Benchmark returns

    Returns:
        Information ratio
    """
    # Align series
    aligned = pd.DataFrame({
        'strategy': strategy_returns,
        'benchmark': benchmark_returns
    }).dropna()

    if len(aligned) < 2:
        return 0.0

    # Active returns
    active_returns = aligned['strategy'] - aligned['benchmark']

    # Mean active return
    mean_active = active_returns.mean()

    # Tracking error (std of active returns)
    tracking_error = active_returns.std()

    if tracking_error == 0:
        return 0.0

    # Annualize
    information_ratio = (mean_active / tracking_error) * np.sqrt(252)

    return information_ratio


def calculate_advanced_metrics(
    equity_curve: pd.DataFrame,
    benchmark_data: Optional[pd.DataFrame] = None,
    max_drawdown: float = 0.0
) -> Dict[str, float]:
    """
    Calculate all advanced metrics

    Args:
        equity_curve: Strategy equity curve
        benchmark_data: Benchmark (SPY) price data with 'timestamp' and 'price'
        max_drawdown: Maximum drawdown from basic metrics

    Returns:
        Dictionary of advanced metrics
    """
    metrics = {}

    # Calculate strategy returns
    strategy_returns = calculate_returns(equity_curve)

    # Calculate Sortino ratio
    metrics['sortino_ratio'] = calculate_sortino_ratio(strategy_returns)

    # Calculate Calmar ratio
    metrics['calmar_ratio'] = calculate_calmar_ratio(strategy_returns, max_drawdown)

    # If benchmark data provided, calculate alpha/beta
    if benchmark_data is not None and len(benchmark_data) > 0:
        # Calculate benchmark returns
        benchmark_returns = benchmark_data['price'].pct_change().fillna(0)

        # Align timestamps
        equity_curve = equity_curve.copy()
        equity_curve['date'] = pd.to_datetime(equity_curve['timestamp']).dt.date
        benchmark_data = benchmark_data.copy()
        benchmark_data['date'] = pd.to_datetime(benchmark_data['timestamp']).dt.date

        merged = pd.merge(
            equity_curve[['date', 'total_value']],
            benchmark_data[['date', 'price']],
            on='date',
            how='inner'
        )

        if len(merged) > 1:
            strategy_rets = merged['total_value'].pct_change().fillna(0)
            benchmark_rets = merged['price'].pct_change().fillna(0)

            alpha, beta, r_squared = calculate_alpha_beta(strategy_rets, benchmark_rets)

            metrics['alpha'] = alpha
            metrics['beta'] = beta
            metrics['r_squared'] = r_squared

            # Information ratio
            metrics['information_ratio'] = calculate_information_ratio(strategy_rets, benchmark_rets)
        else:
            metrics['alpha'] = 0.0
            metrics['beta'] = 0.0
            metrics['r_squared'] = 0.0
            metrics['information_ratio'] = 0.0
    else:
        metrics['alpha'] = None
        metrics['beta'] = None
        metrics['r_squared'] = None
        metrics['information_ratio'] = None

    return metrics