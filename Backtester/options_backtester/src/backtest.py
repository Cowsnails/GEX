"""
Main backtesting engine with event-driven architecture.

Event sequence (CRITICAL for preventing look-ahead bias):
1. MarketEvent - New data available
2. Strategy calculates signals
3. Portfolio converts signals to orders
4. Execution simulates fills
5. Portfolio updates positions

This ordering ensures we never use future data in past decisions.
"""

from queue import Queue, Empty
from events import EventType
from data_handler import DataHandler
from strategy import Strategy
from portfolio import Portfolio
from execution import ExecutionHandler
from checkpoints import CheckpointManager
import pandas as pd
import numpy as np
import time
from typing import Type, Dict, Optional
from tqdm import tqdm


class Backtest:
    """
    Main backtesting engine with event-driven architecture.

    Orchestrates the event loop and coordinates all components.
    """

    def __init__(
        self,
        symbols: list,
        start_date: str,
        end_date: str,
        initial_capital: float,
        strategy_class: Type[Strategy],
        db_connection,
        commission: float = 0.05,
        enable_checkpoints: bool = True,
        checkpoint_interval: int = 1000
    ):
        """
        Initialize backtest engine.

        Args:
            symbols: List of underlying symbols to trade
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            initial_capital: Starting capital
            strategy_class: Strategy class to use
            db_connection: Database connection
            commission: Commission per contract
            enable_checkpoints: Enable checkpoint/resume functionality
            checkpoint_interval: Save checkpoint every N iterations
        """
        self.symbols = symbols
        self.start_date = start_date
        self.end_date = end_date
        self.initial_capital = initial_capital
        self.events = Queue()

        # Initialize components
        print("Initializing backtesting components...")

        self.data = DataHandler(db_connection, start_date, end_date, symbols)
        print(f"  ✓ DataHandler: {start_date} to {end_date}, {len(symbols)} symbols")

        self.strategy = strategy_class(self.events, self.data)
        print(f"  ✓ Strategy: {strategy_class.__name__}")

        self.portfolio = Portfolio(self.events, initial_capital)
        print(f"  ✓ Portfolio: ${initial_capital:,.2f}")

        self.execution = ExecutionHandler(self.events, self.data, commission)
        print(f"  ✓ ExecutionHandler: ${commission} commission")

        # Checkpoint manager for crash recovery
        self.enable_checkpoints = enable_checkpoints
        if enable_checkpoints:
            backtest_id = f"bt_{int(time.time())}_{symbols[0] if symbols else 'unknown'}"
            self.checkpoint_mgr = CheckpointManager(backtest_id, checkpoint_interval)
            print(f"  ✓ CheckpointManager: Save every {checkpoint_interval} iterations")
        else:
            self.checkpoint_mgr = None

        # Results tracking
        self.results = []
        self.equity_curve = []

        print("\nBacktest engine ready!")

    def should_auto_close_positions(self, timestamp) -> bool:
        """
        Check if positions should be auto-closed (3:55pm ET to avoid assignment).

        Args:
            timestamp: Current timestamp

        Returns:
            bool: True if should close all positions
        """
        from datetime import time

        # Convert to time object (already in ET based on data)
        current_time = timestamp.time()

        # Define auto-close window: 3:55pm to 4:00pm
        close_start = time(15, 55, 0)  # 3:55pm
        market_close = time(16, 0, 0)   # 4:00pm

        return close_start <= current_time < market_close

    def close_all_positions(self, timestamp, reason="Auto-close before market close"):
        """
        Close all open positions immediately.

        Args:
            timestamp: Current timestamp
            reason: Reason for closing (for logging)
        """
        from events import OrderEvent, OrderType

        open_positions = self.portfolio.get_open_positions()

        if len(open_positions) == 0:
            return

        print(f"\n⏰ {reason} at {timestamp.strftime('%H:%M:%S')}")
        print(f"   Closing {len(open_positions)} positions...")

        # Generate close orders for all positions
        for symbol, position in open_positions.items():
            quantity = abs(position['quantity'])

            if quantity > 0:
                # Create close order (opposite direction)
                order_type = OrderType.SELL if position['quantity'] > 0 else OrderType.BUY

                order = OrderEvent(
                    timestamp=timestamp,
                    symbol=symbol,
                    order_type=order_type,
                    quantity=quantity,
                    reason=reason
                )

                self.events.put(order)

    def run(self, verbose: bool = True) -> dict:
        """
        Main event loop - PROPER SEQUENCING CRITICAL.

        Args:
            verbose: Print progress updates

        Returns:
            Dictionary with backtest results
        """
        print("\n" + "="*60)
        print("STARTING BACKTEST")
        print("="*60)

        # Try to load checkpoint
        start_iteration = 0
        if self.enable_checkpoints and self.checkpoint_mgr:
            checkpoint = self.checkpoint_mgr.load_checkpoint()
            if checkpoint:
                # Resume from checkpoint
                start_iteration = checkpoint.get('iteration', 0)
                self.equity_curve = checkpoint.get('equity_curve', [])
                # Note: Full state restoration would require more complex portfolio/data state management
                print(f"🔄 Resuming from iteration {start_iteration}")

        # Get all timestamps for progress bar
        all_timestamps = self.data.get_all_timestamps()

        if len(all_timestamps) == 0:
            print("ERROR: No data available for backtest period")
            return self.generate_results()

        print(f"\nProcessing {len(all_timestamps)} timestamps...")

        # Track progress and timing
        total_iterations = len(all_timestamps)
        start_time = time.time()

        # Main event loop
        if verbose:
            pbar = tqdm(total=len(all_timestamps), desc="Backtesting", initial=start_iteration)

        iteration = start_iteration

        while self.data.continue_backtest:
            iteration += 1

            # Print progress every 100 iterations for external tracking
            if iteration % 100 == 0:
                elapsed = time.time() - start_time
                iterations_done = iteration - start_iteration
                if iterations_done > 0:
                    iterations_per_sec = iterations_done / elapsed
                    remaining = total_iterations - iteration
                    eta_seconds = remaining / iterations_per_sec if iterations_per_sec > 0 else 0
                    progress_pct = (iteration / total_iterations) * 100

                    # Print in parseable format for Node.js
                    print(f"PROGRESS: {iteration}/{total_iterations} ({progress_pct:.1f}%) | {iterations_per_sec:.1f} iter/s | ETA: {eta_seconds:.0f}s")

            # 1. Update market data (generates MarketEvent)
            market_event = self.data.update_bars()

            if market_event is None:
                break

            self.events.put(market_event)

            # 2. Auto-close positions if 3:55pm or later (avoid assignment)
            if self.should_auto_close_positions(self.data.current_timestamp):
                self.close_all_positions(self.data.current_timestamp)

            # 3. Process settlements (T+1)
            self.portfolio.process_settlements(self.data.current_timestamp)

            # 4. Process all events in FIFO order
            event_count = 0
            max_events = 1000  # Safety limit to prevent infinite loops

            while event_count < max_events:
                try:
                    event = self.events.get(block=False)
                    event_count += 1
                except Empty:
                    break

                if event.type == EventType.MARKET:
                    # Strategy generates signals
                    self.strategy.calculate_signals(event)

                elif event.type == EventType.SIGNAL:
                    # Portfolio converts to orders
                    self.portfolio.update_signal(event)

                elif event.type == EventType.ORDER:
                    # Execution simulates fills
                    self.execution.execute_order(event)

                elif event.type == EventType.FILL:
                    # Portfolio updates positions
                    self.portfolio.update_fill(event)

            # 4. Record current state
            self.record_holdings()

            # 5. Save checkpoint periodically
            if self.enable_checkpoints and self.checkpoint_mgr:
                if self.checkpoint_mgr.should_save_checkpoint(iteration):
                    # Get current prices for total value
                    current_prices = {}
                    for symbol in self.portfolio.positions.keys():
                        price = self.data.get_underlying_price(symbol)
                        if price:
                            current_prices[symbol] = price

                    total_value = self.portfolio.get_total_value(current_prices)

                    checkpoint_state = {
                        'iteration': iteration,
                        'current_timestamp': str(self.data.current_timestamp),
                        'equity_curve': self.equity_curve,
                        'portfolio_value': total_value,
                        'trades': len(self.portfolio.trade_history) if hasattr(self.portfolio, 'trade_history') else 0
                    }
                    self.checkpoint_mgr.save_checkpoint(checkpoint_state)

            if verbose:
                pbar.update(1)

        if verbose:
            pbar.close()

        print("\n" + "="*60)
        print("BACKTEST COMPLETE")
        print("="*60)

        # Clear checkpoint on successful completion
        if self.enable_checkpoints and self.checkpoint_mgr:
            self.checkpoint_mgr.clear_checkpoint()

        # Generate final results
        results = self.generate_results()

        return results

    def record_holdings(self):
        """
        Track portfolio value over time.

        Records:
        - Timestamp
        - Total portfolio value
        - Cash (settled + unsettled)
        - Number of positions
        """
        # Get current prices for open positions
        current_prices = {}
        for symbol in self.portfolio.positions.keys():
            price = self.data.get_underlying_price(symbol)
            if price:
                current_prices[symbol] = price

        total_value = self.portfolio.get_total_value(current_prices)

        self.equity_curve.append({
            'timestamp': self.data.current_timestamp,
            'total_value': total_value,
            'settled_cash': self.portfolio.settled_cash,
            'unsettled_cash': self.portfolio.unsettled_cash,
            'num_positions': len([p for p in self.portfolio.positions.values()
                                if p['quantity'] != 0])
        })

    def generate_results(self) -> dict:
        """
        Calculate performance metrics.

        Returns:
            Dictionary with comprehensive results
        """
        print("\nGenerating performance metrics...")

        if len(self.equity_curve) == 0:
            print("WARNING: No equity curve data available")
            return {
                'total_return': 0,
                'sharpe_ratio': 0,
                'max_drawdown': 0,
                'total_trades': 0
            }

        df = pd.DataFrame(self.equity_curve)
        df['returns'] = df['total_value'].pct_change()

        # Calculate metrics
        final_value = df['total_value'].iloc[-1]
        total_return = (final_value / self.initial_capital - 1) * 100

        # Sharpe ratio (annualized)
        returns_mean = df['returns'].mean()
        returns_std = df['returns'].std()

        if returns_std > 0:
            # Assume ~252 trading days per year
            sharpe_ratio = (returns_mean / returns_std) * np.sqrt(252)
        else:
            sharpe_ratio = 0

        # Maximum drawdown
        max_drawdown = self.calculate_max_drawdown(df['total_value'])

        # Trade statistics
        trades_df = self.portfolio.get_trades_summary()
        total_trades = len(trades_df) if not trades_df.empty else 0

        # Win rate (if we have closed trades)
        win_rate = 0
        if not trades_df.empty and 'cash_impact' in trades_df.columns:
            winning_trades = len(trades_df[trades_df['cash_impact'] > 0])
            win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0

        results = {
            'initial_capital': self.initial_capital,
            'final_value': final_value,
            'total_return': total_return,
            'sharpe_ratio': sharpe_ratio,
            'max_drawdown': max_drawdown,
            'total_trades': total_trades,
            'win_rate': win_rate,
            'equity_curve': df,
            'trades': trades_df,
            'positions': self.portfolio.get_positions_summary()
        }

        # Print summary
        print("\n" + "="*60)
        print("BACKTEST RESULTS")
        print("="*60)
        print(f"Initial Capital:    ${self.initial_capital:,.2f}")
        print(f"Final Value:        ${final_value:,.2f}")
        print(f"Total Return:       {total_return:+.2f}%")
        print(f"Sharpe Ratio:       {sharpe_ratio:.2f}")
        print(f"Max Drawdown:       {max_drawdown:.2f}%")
        print(f"Total Trades:       {total_trades}")
        if total_trades > 0:
            print(f"Win Rate:           {win_rate:.1f}%")
        print("="*60)

        return results

    def calculate_max_drawdown(self, equity_curve: pd.Series) -> float:
        """
        Calculate maximum peak-to-trough drawdown.

        Args:
            equity_curve: Series of portfolio values

        Returns:
            Max drawdown as percentage
        """
        cummax = equity_curve.cummax()
        drawdown = (equity_curve - cummax) / cummax

        return drawdown.min() * 100

    def plot_results(self, results: dict, save_path: Optional[str] = None):
        """
        Plot backtest results.

        Args:
            results: Results dictionary from generate_results()
            save_path: Optional path to save plot
        """
        try:
            import matplotlib.pyplot as plt

            fig, axes = plt.subplots(2, 1, figsize=(12, 8))

            # Equity curve
            df = results['equity_curve']
            axes[0].plot(df['timestamp'], df['total_value'], label='Portfolio Value')
            axes[0].axhline(y=self.initial_capital, color='r', linestyle='--',
                          label='Initial Capital')
            axes[0].set_title('Equity Curve')
            axes[0].set_ylabel('Portfolio Value ($)')
            axes[0].legend()
            axes[0].grid(True)

            # Drawdown
            cummax = df['total_value'].cummax()
            drawdown = (df['total_value'] - cummax) / cummax * 100

            axes[1].fill_between(df['timestamp'], drawdown, 0, alpha=0.3, color='red')
            axes[1].set_title('Drawdown')
            axes[1].set_ylabel('Drawdown (%)')
            axes[1].set_xlabel('Date')
            axes[1].grid(True)

            plt.tight_layout()

            if save_path:
                plt.savefig(save_path)
                print(f"\nPlot saved to: {save_path}")
            else:
                plt.show()

        except ImportError:
            print("Matplotlib not available for plotting")


if __name__ == "__main__":
    from database import get_database
    from strategy import BuyAndHoldStrategy

    # Example usage
    print("Backtest engine module loaded successfully")
    print("\nTo run a backtest:")
    print("""
    db = get_database(db_type='sqlite')

    backtest = Backtest(
        symbols=['SPY'],
        start_date='2024-01-01',
        end_date='2024-01-31',
        initial_capital=100000,
        strategy_class=BuyAndHoldStrategy,
        db_connection=db.get_connection()
    )

    results = backtest.run()
    """)