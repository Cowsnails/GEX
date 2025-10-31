"""
Options Backtesting System for 0-7 DTE Strategies

A bulletproof local options backtesting framework with institutional-grade
point-in-time data architecture.
"""

__version__ = '1.0.0'
__author__ = 'Options Backtesting Team'

# Core imports for easy access
from .database import get_database, DatabaseManager
from .backtest import Backtest
from .strategy import Strategy
from .events import (
    MarketEvent, SignalEvent, OrderEvent, FillEvent,
    create_market_event, create_signal_event, create_order_event, create_fill_event
)

__all__ = [
    'get_database',
    'DatabaseManager',
    'Backtest',
    'Strategy',
    'MarketEvent',
    'SignalEvent',
    'OrderEvent',
    'FillEvent',
    'create_market_event',
    'create_signal_event',
    'create_order_event',
    'create_fill_event',
]
