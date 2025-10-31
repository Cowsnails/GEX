"""
Database schema and connection utilities for options backtesting system.

Supports both PostgreSQL (for production) and SQLite (for development/testing).
Implements point-in-time data architecture to prevent look-ahead bias.
"""

import sqlite3
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
import os


class DatabaseManager:
    """
    Manages database connections and schema creation.

    Supports both PostgreSQL and SQLite for flexibility.
    """

    def __init__(self, db_type='sqlite', db_path=None, postgres_url=None):
        """
        Initialize database connection.

        Args:
            db_type: 'sqlite' or 'postgresql'
            db_path: Path to SQLite database file (if using SQLite)
            postgres_url: PostgreSQL connection string (if using PostgreSQL)
        """
        self.db_type = db_type

        if db_type == 'sqlite':
            if db_path is None:
                db_path = os.path.join(
                    os.path.dirname(os.path.dirname(__file__)),
                    'data', 'sqlite', 'options_backtest.db'
                )
            self.db_path = db_path

            # Create directory structure if it doesn't exist
            db_dir = os.path.dirname(db_path)
            if db_dir:
                os.makedirs(db_dir, exist_ok=True)

            self.engine = create_engine(f'sqlite:///{db_path}', poolclass=NullPool)
        elif db_type == 'postgresql':
            if postgres_url is None:
                raise ValueError("PostgreSQL URL required for PostgreSQL database")
            self.engine = create_engine(postgres_url)
        else:
            raise ValueError(f"Unsupported database type: {db_type}")

    def get_connection(self):
        """Get database connection."""
        return self.engine.connect()

    def create_schema(self):
        """
        Create all database tables with proper indexes.

        Implements the point-in-time architecture from PHASE 1.
        """
        # SQL schemas adapted for both SQLite and PostgreSQL
        if self.db_type == 'sqlite':
            self._create_sqlite_schema()
        else:
            self._create_postgresql_schema()

    def _create_postgresql_schema(self):
        """Create schema for PostgreSQL."""
        with self.engine.begin() as conn:
            # 1. Point-in-Time Options Data
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS options_data_pit (
                    id BIGSERIAL PRIMARY KEY,

                    -- Critical timestamps for point-in-time
                    timestamp_available BIGINT NOT NULL,
                    timestamp_recorded BIGINT,

                    -- Option identifiers
                    symbol VARCHAR(50) NOT NULL,
                    underlying_symbol VARCHAR(10) NOT NULL,
                    option_type CHAR(1) NOT NULL,
                    strike DECIMAL(10,2) NOT NULL,
                    expiration_timestamp BIGINT NOT NULL,

                    -- Pricing data
                    underlying_price DECIMAL(10,4),
                    bid_price DECIMAL(10,4),
                    ask_price DECIMAL(10,4),
                    mid_price DECIMAL(10,4),
                    last_price DECIMAL(10,4),

                    -- Greeks (MUST use implied volatility)
                    delta DECIMAL(8,6),
                    gamma DECIMAL(8,6),
                    theta DECIMAL(8,6),
                    vega DECIMAL(8,6),
                    rho DECIMAL(8,6),
                    implied_vol DECIMAL(8,6),

                    -- Volume/Interest
                    volume INT,
                    open_interest INT,

                    -- Quality flags
                    bid_ask_spread DECIMAL(10,4),
                    is_stale BOOLEAN DEFAULT FALSE,
                    quote_age_seconds INT
                )
            """))

            # Create indexes for fast querying
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_symbol_timestamp
                ON options_data_pit(underlying_symbol, timestamp_available)
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_expiration
                ON options_data_pit(expiration_timestamp)
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_pit_query
                ON options_data_pit(underlying_symbol, timestamp_available, expiration_timestamp)
            """))

            # 2. Delisted Securities (Survivorship Bias Prevention)
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS delisted_securities (
                    symbol VARCHAR(10) PRIMARY KEY,
                    listing_date DATE,
                    delisting_date DATE,
                    delisting_reason VARCHAR(50),
                    final_price DECIMAL(10,4),
                    successor_ticker VARCHAR(10)
                )
            """))

            # 3. Corporate Actions
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS corporate_actions (
                    id SERIAL PRIMARY KEY,
                    symbol VARCHAR(10) NOT NULL,
                    action_type VARCHAR(20) NOT NULL,
                    declaration_date DATE,
                    ex_date DATE NOT NULL,
                    record_date DATE,
                    payment_date DATE,
                    split_factor DECIMAL(10,6),
                    dividend_amount DECIMAL(10,4),
                    adjustment_factor DECIMAL(10,6)
                )
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_symbol_exdate
                ON corporate_actions(symbol, ex_date)
            """))

            # 4. Index Constituents
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS index_constituents (
                    id SERIAL PRIMARY KEY,
                    index_name VARCHAR(20) NOT NULL,
                    symbol VARCHAR(10) NOT NULL,
                    date_added DATE NOT NULL,
                    date_removed DATE
                )
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_pit_constituents
                ON index_constituents(index_name, date_added, date_removed)
            """))

            # 5. Market Regime Data
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS market_regime (
                    date DATE PRIMARY KEY,
                    vix_close DECIMAL(6,2),
                    spx_close DECIMAL(10,2),
                    spx_daily_return DECIMAL(8,6),
                    realized_vol_20d DECIMAL(6,4),
                    regime VARCHAR(20)
                )
            """))

            print("PostgreSQL schema created successfully")

    def _create_sqlite_schema(self):
        """Create schema for SQLite (with appropriate type adaptations)."""
        with self.engine.begin() as conn:
            # 1. Point-in-Time Options Data
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS options_data_pit (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,

                    -- Critical timestamps for point-in-time
                    timestamp_available INTEGER NOT NULL,
                    timestamp_recorded INTEGER,

                    -- Option identifiers
                    symbol TEXT NOT NULL,
                    underlying_symbol TEXT NOT NULL,
                    option_type TEXT NOT NULL,
                    strike REAL NOT NULL,
                    expiration_timestamp INTEGER NOT NULL,

                    -- Pricing data
                    underlying_price REAL,
                    bid_price REAL,
                    ask_price REAL,
                    mid_price REAL,
                    last_price REAL,

                    -- Greeks (MUST use implied volatility)
                    delta REAL,
                    gamma REAL,
                    theta REAL,
                    vega REAL,
                    rho REAL,
                    implied_vol REAL,

                    -- Volume/Interest
                    volume INTEGER,
                    open_interest INTEGER,

                    -- Quality flags
                    bid_ask_spread REAL,
                    is_stale INTEGER DEFAULT 0,
                    quote_age_seconds INTEGER
                )
            """))

            # Create indexes
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_symbol_timestamp
                ON options_data_pit(underlying_symbol, timestamp_available)
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_expiration
                ON options_data_pit(expiration_timestamp)
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_pit_query
                ON options_data_pit(underlying_symbol, timestamp_available, expiration_timestamp)
            """))

            # 2. Delisted Securities
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS delisted_securities (
                    symbol TEXT PRIMARY KEY,
                    listing_date TEXT,
                    delisting_date TEXT,
                    delisting_reason TEXT,
                    final_price REAL,
                    successor_ticker TEXT
                )
            """))

            # 3. Corporate Actions
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS corporate_actions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    symbol TEXT NOT NULL,
                    action_type TEXT NOT NULL,
                    declaration_date TEXT,
                    ex_date TEXT NOT NULL,
                    record_date TEXT,
                    payment_date TEXT,
                    split_factor REAL,
                    dividend_amount REAL,
                    adjustment_factor REAL
                )
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_symbol_exdate
                ON corporate_actions(symbol, ex_date)
            """))

            # 4. Index Constituents
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS index_constituents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    index_name TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    date_added TEXT NOT NULL,
                    date_removed TEXT
                )
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_pit_constituents
                ON index_constituents(index_name, date_added, date_removed)
            """))

            # 5. Market Regime Data
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS market_regime (
                    date TEXT PRIMARY KEY,
                    vix_close REAL,
                    spx_close REAL,
                    spx_daily_return REAL,
                    realized_vol_20d REAL,
                    regime TEXT
                )
            """))

            print("SQLite schema created successfully")

    def drop_all_tables(self):
        """Drop all tables (use with caution!)."""
        tables = [
            'options_data_pit',
            'delisted_securities',
            'corporate_actions',
            'index_constituents',
            'market_regime'
        ]

        with self.engine.begin() as conn:
            for table in tables:
                conn.execute(text(f"DROP TABLE IF EXISTS {table}"))

        print("All tables dropped")


def get_database(db_type='sqlite', **kwargs):
    """
    Factory function to get database manager.

    Args:
        db_type: 'sqlite' or 'postgresql'
        **kwargs: Additional arguments passed to DatabaseManager

    Returns:
        DatabaseManager instance
    """
    return DatabaseManager(db_type=db_type, **kwargs)


if __name__ == "__main__":
    # Example usage
    print("Creating SQLite database for development...")
    db = get_database(db_type='sqlite')
    db.create_schema()

    print("\nDatabase created at:", db.db_path)
    print("\nTo use PostgreSQL instead, call:")
    print("db = get_database(db_type='postgresql', postgres_url='postgresql://user:pass@localhost/dbname')")