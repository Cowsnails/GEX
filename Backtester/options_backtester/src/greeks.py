"""
Greeks calculation and recalculation engine.

CRITICAL: Must use implied volatility (not historical) for Greeks.

For 0DTE: Greeks change rapidly in final hours and must be updated frequently.
"""

import numpy as np
import pandas as pd
from typing import Dict, Optional
import warnings

try:
    from py_vollib.black_scholes import black_scholes as bs
    from py_vollib.black_scholes.greeks.analytical import delta, gamma, theta, vega, rho
    VOLLIB_AVAILABLE = True
except ImportError:
    VOLLIB_AVAILABLE = False
    warnings.warn("py_vollib not available. Greeks calculation will be limited.")


class GreeksCalculator:
    """
    Calculate and update Greeks with proper frequency for 0DTE.

    For 0DTE final hour: recalculate every 1-5 seconds (in live trading)
    For backtesting: recalculate when conditions change significantly
    """

    def __init__(self, risk_free_rate: float = 0.043):
        """
        Initialize Greeks calculator.

        Args:
            risk_free_rate: Risk-free rate (default: 4.3% / SOFR)
        """
        self.risk_free_rate = risk_free_rate
        self.last_update_time = {}
        self.last_price = {}
        self.last_iv = {}

    def should_update_greeks(
        self,
        symbol: str,
        current_price: float,
        current_iv: float,
        time_to_expiry_hours: float,
        current_time: pd.Timestamp
    ) -> bool:
        """
        Determine if Greeks need recalculation.

        Update triggers:
        - 0.1% price change
        - 5 minutes elapsed
        - 1% IV change
        - Less than 1 hour to expiration

        Args:
            symbol: Option symbol
            current_price: Current underlying price
            current_iv: Current implied volatility
            time_to_expiry_hours: Hours to expiration
            current_time: Current timestamp

        Returns:
            True if Greeks should be updated
        """
        if symbol not in self.last_update_time:
            return True

        time_elapsed = (current_time - self.last_update_time[symbol]).seconds / 60

        price_change_pct = abs(current_price - self.last_price.get(symbol, current_price)) / current_price
        iv_change_pct = abs(current_iv - self.last_iv.get(symbol, current_iv)) / current_iv

        # Update triggers
        if price_change_pct > 0.001:  # 0.1% price change
            return True
        if time_elapsed > 5:  # 5 minutes
            return True
        if iv_change_pct > 0.01:  # 1% IV change
            return True
        if time_to_expiry_hours < 1:  # Less than 1 hour
            return True

        return False

    def calculate_greeks(
        self,
        option_type: str,
        S: float,
        K: float,
        t: float,
        r: float,
        sigma: float
    ) -> Dict[str, float]:
        """
        Calculate all Greeks using Black-Scholes.

        CRITICAL: Must use implied volatility (sigma), not historical.

        Args:
            option_type: 'C' or 'P'
            S: Underlying price
            K: Strike price
            t: Time to expiration (years)
            r: Risk-free rate
            sigma: Implied volatility

        Returns:
            Dictionary with Greeks
        """
        flag = 'c' if option_type == 'C' else 'p'

        # Handle edge cases
        if t <= 0:
            # At expiration
            return self._calculate_greeks_at_expiration(option_type, S, K)

        if sigma <= 0:
            warnings.warn(f"Invalid IV: {sigma}, using minimum 0.01")
            sigma = 0.01

        if not VOLLIB_AVAILABLE:
            return self._calculate_greeks_simple(option_type, S, K, t, r, sigma)

        # Calculate Greeks using py_vollib
        try:
            greeks = {
                'price': bs(flag, S, K, t, r, sigma),
                'delta': delta(flag, S, K, t, r, sigma),
                'gamma': gamma(flag, S, K, t, r, sigma),
                'theta': theta(flag, S, K, t, r, sigma),
                'vega': vega(flag, S, K, t, r, sigma),
                'rho': rho(flag, S, K, t, r, sigma)
            }

            # Validate Greeks
            self._validate_greeks(option_type, greeks)

            return greeks

        except Exception as e:
            warnings.warn(f"Greeks calculation error: {e}")
            return self._calculate_greeks_simple(option_type, S, K, t, r, sigma)

    def _calculate_greeks_at_expiration(self, option_type: str, S: float, K: float) -> Dict[str, float]:
        """
        Calculate Greeks at expiration (t=0).

        At expiration:
        - Delta = 1.0 (ITM call), 0.0 (OTM call), -1.0 (ITM put), 0.0 (OTM put)
        - All other Greeks = 0

        Args:
            option_type: 'C' or 'P'
            S: Underlying price
            K: Strike price

        Returns:
            Dictionary with Greeks
        """
        if option_type == 'C':
            value = max(0, S - K)
            delta_val = 1.0 if S > K else 0.0
        else:  # Put
            value = max(0, K - S)
            delta_val = -1.0 if S < K else 0.0

        return {
            'price': value,
            'delta': delta_val,
            'gamma': 0,
            'theta': 0,
            'vega': 0,
            'rho': 0
        }

    def _calculate_greeks_simple(
        self,
        option_type: str,
        S: float,
        K: float,
        t: float,
        r: float,
        sigma: float
    ) -> Dict[str, float]:
        """
        Simple Black-Scholes calculation (fallback if py_vollib not available).

        Args:
            option_type: 'C' or 'P'
            S: Underlying price
            K: Strike price
            t: Time to expiration (years)
            r: Risk-free rate
            sigma: Implied volatility

        Returns:
            Dictionary with Greeks
        """
        from scipy.stats import norm

        # Black-Scholes formula
        d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * t) / (sigma * np.sqrt(t))
        d2 = d1 - sigma * np.sqrt(t)

        if option_type == 'C':
            price = S * norm.cdf(d1) - K * np.exp(-r * t) * norm.cdf(d2)
            delta_val = norm.cdf(d1)
        else:  # Put
            price = K * np.exp(-r * t) * norm.cdf(-d2) - S * norm.cdf(-d1)
            delta_val = -norm.cdf(-d1)

        # Gamma (same for calls and puts)
        gamma_val = norm.pdf(d1) / (S * sigma * np.sqrt(t))

        # Vega (same for calls and puts)
        vega_val = S * norm.pdf(d1) * np.sqrt(t) / 100  # Per 1% change

        # Theta
        if option_type == 'C':
            theta_val = (
                -S * norm.pdf(d1) * sigma / (2 * np.sqrt(t))
                - r * K * np.exp(-r * t) * norm.cdf(d2)
            ) / 365  # Per day
        else:
            theta_val = (
                -S * norm.pdf(d1) * sigma / (2 * np.sqrt(t))
                + r * K * np.exp(-r * t) * norm.cdf(-d2)
            ) / 365  # Per day

        # Rho
        if option_type == 'C':
            rho_val = K * t * np.exp(-r * t) * norm.cdf(d2) / 100
        else:
            rho_val = -K * t * np.exp(-r * t) * norm.cdf(-d2) / 100

        return {
            'price': price,
            'delta': delta_val,
            'gamma': gamma_val,
            'theta': theta_val,
            'vega': vega_val,
            'rho': rho_val
        }

    def _validate_greeks(self, option_type: str, greeks: Dict[str, float]):
        """
        Validate calculated Greeks.

        Args:
            option_type: 'C' or 'P'
            greeks: Dictionary of Greeks

        Raises:
            ValueError if validation fails
        """
        # Delta ranges
        if option_type == 'C':
            if not (0 <= greeks['delta'] <= 1):
                raise ValueError(f"Invalid call delta: {greeks['delta']}")
        else:
            if not (-1 <= greeks['delta'] <= 0):
                raise ValueError(f"Invalid put delta: {greeks['delta']}")

        # Gamma must be positive
        if greeks['gamma'] < 0:
            raise ValueError(f"Gamma must be positive: {greeks['gamma']}")

    def vectorized_greeks(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Fast vectorized Greeks calculation for entire chain.

        Args:
            df: DataFrame with columns:
                - option_type, underlying_price, strike, time_to_expiry_years, implied_vol

        Returns:
            DataFrame with added Greek columns
        """
        if not VOLLIB_AVAILABLE:
            warnings.warn("Vectorized Greeks requires py_vollib_vectorized")
            return df

        try:
            from py_vollib_vectorized import vectorized_black_scholes as vbs
            from py_vollib_vectorized import vectorized_delta, vectorized_gamma
            from py_vollib_vectorized import vectorized_theta, vectorized_vega

            # Prepare arrays
            flags = ['c' if ot == 'C' else 'p' for ot in df['option_type']]
            S = df['underlying_price'].values
            K = df['strike'].values
            t = df['time_to_expiry_years'].values
            r = np.full(len(df), self.risk_free_rate)
            sigma = df['implied_vol'].values

            # Vectorized calculation (much faster)
            df['price_calc'] = vbs(flags, S, K, t, r, sigma)
            df['delta_calc'] = vectorized_delta(flags, S, K, t, r, sigma)
            df['gamma_calc'] = vectorized_gamma(flags, S, K, t, r, sigma)
            df['theta_calc'] = vectorized_theta(flags, S, K, t, r, sigma)
            df['vega_calc'] = vectorized_vega(flags, S, K, t, r, sigma)

            return df

        except ImportError:
            warnings.warn("py_vollib_vectorized not available")
            return df


if __name__ == "__main__":
    # Example usage
    calc = GreeksCalculator(risk_free_rate=0.043)

    # Calculate Greeks for a specific option
    greeks = calc.calculate_greeks(
        option_type='P',
        S=450.0,  # Underlying price
        K=445.0,  # Strike
        t=0.0192,  # ~7 days in years
        r=0.043,
        sigma=0.25  # 25% IV
    )

    print("Greeks Calculator Example:")
    print(f"  Price:  ${greeks['price']:.2f}")
    print(f"  Delta:  {greeks['delta']:.4f}")
    print(f"  Gamma:  {greeks['gamma']:.6f}")
    print(f"  Theta:  {greeks['theta']:.4f}")
    print(f"  Vega:   {greeks['vega']:.4f}")
    print(f"  Rho:    {greeks['rho']:.4f}")
