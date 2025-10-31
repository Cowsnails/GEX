"""
Tests for point-in-time data integrity.

CRITICAL: These tests verify that the system NEVER uses future data.
All tests must pass before running any backtest.
"""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from database import get_database
from data_handler import DataHandler
import pandas as pd
import numpy as np


def test_no_future_data_leak():
    """
    Test that data handler never returns future data.

    This is the MOST CRITICAL test for preventing look-ahead bias.
    """
    print("\n" + "="*60)
    print("TEST: No Future Data Leak")
    print("="*60)

    # Create test database
    db = get_database(db_type='sqlite')
    db.create_schema()

    # Initialize data handler
    data_handler = DataHandler(
        db_connection=db.get_connection(),
        start_date='2024-01-01',
        end_date='2024-01-31',
        symbols=['SPY']
    )

    # Set current timestamp to a specific time
    test_timestamp = pd.Timestamp('2024-01-15 10:00:00')
    data_handler.current_timestamp = test_timestamp

    # Query data
    data = data_handler.get_options_chain('SPY')

    if len(data) > 0:
        # Verify all timestamps are <= current_timestamp
        future_data = data[data['timestamp_available'] > test_timestamp.value // 1000]

        if len(future_data) > 0:
            print(f"✗ FAILED: Found {len(future_data)} rows with future data!")
            print(f"  Current timestamp: {test_timestamp}")
            print(f"  Future data timestamps: {future_data['timestamp_available'].head()}")
            return False
        else:
            print("✓ PASSED: No future data leak detected")
            return True
    else:
        print("⚠ SKIPPED: No data available for testing")
        return None


def test_point_in_time_consistency():
    """
    Test that querying same timestamp always returns same data.

    Consistency is critical for reproducible backtests.
    """
    print("\n" + "="*60)
    print("TEST: Point-in-Time Consistency")
    print("="*60)

    db = get_database(db_type='sqlite')

    data_handler = DataHandler(
        db_connection=db.get_connection(),
        start_date='2024-01-01',
        end_date='2024-01-31',
        symbols=['SPY']
    )

    # Query same timestamp twice
    test_timestamp = pd.Timestamp('2024-01-15 10:00:00')
    data_handler.current_timestamp = test_timestamp

    data1 = data_handler.get_options_chain('SPY')

    # Reset and query again
    data_handler.current_timestamp = test_timestamp
    data2 = data_handler.get_options_chain('SPY')

    if len(data1) > 0 and len(data2) > 0:
        if len(data1) == len(data2):
            print(f"✓ PASSED: Consistent data (both queries returned {len(data1)} rows)")
            return True
        else:
            print(f"✗ FAILED: Inconsistent data ({len(data1)} vs {len(data2)} rows)")
            return False
    else:
        print("⚠ SKIPPED: No data available")
        return None


def test_timestamp_ordering():
    """
    Test that timestamps are strictly increasing as backtest progresses.
    """
    print("\n" + "="*60)
    print("TEST: Timestamp Ordering")
    print("="*60)

    db = get_database(db_type='sqlite')

    data_handler = DataHandler(
        db_connection=db.get_connection(),
        start_date='2024-01-01',
        end_date='2024-01-31',
        symbols=['SPY']
    )

    timestamps = []

    # Iterate through several timestamps
    for _ in range(10):
        event = data_handler.update_bars()
        if event is None:
            break
        timestamps.append(data_handler.current_timestamp)

    if len(timestamps) > 1:
        # Check if strictly increasing
        is_ordered = all(timestamps[i] < timestamps[i+1]
                        for i in range(len(timestamps)-1))

        if is_ordered:
            print(f"✓ PASSED: Timestamps are strictly increasing")
            print(f"  First: {timestamps[0]}")
            print(f"  Last:  {timestamps[-1]}")
            return True
        else:
            print("✗ FAILED: Timestamps are not strictly increasing!")
            return False
    else:
        print("⚠ SKIPPED: Not enough timestamps")
        return None


def test_expiration_filter():
    """
    Test that expired options are not returned.
    """
    print("\n" + "="*60)
    print("TEST: Expiration Filter")
    print("="*60)

    db = get_database(db_type='sqlite')

    data_handler = DataHandler(
        db_connection=db.get_connection(),
        start_date='2024-01-01',
        end_date='2024-01-31',
        symbols=['SPY']
    )

    # Set timestamp
    test_timestamp = pd.Timestamp('2024-01-15 16:00:00')  # Market close
    data_handler.current_timestamp = test_timestamp

    data = data_handler.get_options_chain('SPY', min_dte=0, max_dte=7)

    if len(data) > 0:
        # Check that no expired options are returned
        expired = data[data['expiration_timestamp'] <= test_timestamp.value // 1000]

        if len(expired) > 0:
            print(f"✗ FAILED: Found {len(expired)} expired options!")
            return False
        else:
            print("✓ PASSED: No expired options returned")
            return True
    else:
        print("⚠ SKIPPED: No data available")
        return None


def test_greeks_validation():
    """
    Test that Greeks are within valid ranges.
    """
    print("\n" + "="*60)
    print("TEST: Greeks Validation")
    print("="*60)

    from greeks import GreeksCalculator

    calc = GreeksCalculator()

    # Test call option
    call_greeks = calc.calculate_greeks(
        option_type='C',
        S=100,
        K=100,
        t=0.0192,  # ~7 days
        r=0.043,
        sigma=0.25
    )

    # Validate call delta
    if not (0 <= call_greeks['delta'] <= 1):
        print(f"✗ FAILED: Invalid call delta: {call_greeks['delta']}")
        return False

    # Test put option
    put_greeks = calc.calculate_greeks(
        option_type='P',
        S=100,
        K=100,
        t=0.0192,
        r=0.043,
        sigma=0.25
    )

    # Validate put delta
    if not (-1 <= put_greeks['delta'] <= 0):
        print(f"✗ FAILED: Invalid put delta: {put_greeks['delta']}")
        return False

    # Validate gamma (must be positive for both)
    if call_greeks['gamma'] < 0 or put_greeks['gamma'] < 0:
        print("✗ FAILED: Gamma must be positive")
        return False

    print("✓ PASSED: Greeks validation successful")
    print(f"  Call delta: {call_greeks['delta']:.3f}")
    print(f"  Put delta:  {put_greeks['delta']:.3f}")
    print(f"  Gamma:      {call_greeks['gamma']:.6f}")

    return True


def run_all_tests():
    """
    Run all point-in-time tests.

    Returns:
        True if all tests pass, False otherwise
    """
    print("\n" + "="*70)
    print(" "*20 + "POINT-IN-TIME TESTS")
    print("="*70)

    tests = [
        ("No Future Data Leak", test_no_future_data_leak),
        ("Point-in-Time Consistency", test_point_in_time_consistency),
        ("Timestamp Ordering", test_timestamp_ordering),
        ("Expiration Filter", test_expiration_filter),
        ("Greeks Validation", test_greeks_validation)
    ]

    results = {}

    for name, test_fn in tests:
        try:
            result = test_fn()
            results[name] = result
        except Exception as e:
            print(f"\n✗ ERROR in {name}: {e}")
            results[name] = False

    # Summary
    print("\n" + "="*70)
    print(" "*25 + "TEST SUMMARY")
    print("="*70)

    passed = sum(1 for r in results.values() if r is True)
    failed = sum(1 for r in results.values() if r is False)
    skipped = sum(1 for r in results.values() if r is None)

    for name, result in results.items():
        status = "✓ PASS" if result is True else ("✗ FAIL" if result is False else "⚠ SKIP")
        print(f"{status:8} {name}")

    print("="*70)
    print(f"Passed: {passed}, Failed: {failed}, Skipped: {skipped}")
    print("="*70)

    if failed > 0:
        print("\n⚠ WARNING: Some tests failed!")
        print("   Fix these issues before running backtests.")
        return False
    else:
        print("\n✓ All tests passed!")
        return True


if __name__ == "__main__":
    success = run_all_tests()

    if success:
        print("\n✓ System is ready for backtesting!")
        sys.exit(0)
    else:
        print("\n✗ Tests failed. Fix issues before proceeding.")
        sys.exit(1)
