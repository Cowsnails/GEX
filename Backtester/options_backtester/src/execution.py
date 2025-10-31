"""
Execution handler with realistic slippage modeling.

Models realistic order execution including:
- Bid-ask spreads
- Time-to-expiration impact on slippage
- Volatility-based slippage
- 0DTE specific challenges
"""

from queue import Queue
from events import OrderEvent, FillEvent, EventType, create_fill_event
from data_handler import DataHandler
import pandas as pd
import numpy as np
from typing import Optional


class ExecutionHandler:
    """
    Simulates realistic order execution with slippage.

    Critical for 0-7 DTE:
    - Slippage increases exponentially as expiration approaches
    - Wide spreads in final hour
    - High IV increases slippage
    """

    def __init__(self, events_queue: Queue, data_handler: DataHandler,
                 commission: float = 0.05):
        """
        Initialize execution handler.

        Args:
            events_queue: Queue for putting fill events
            data_handler: DataHandler for market data
            commission: Commission per contract (default: $0.05 - Alpaca standard)
        """
        self.events = events_queue
        self.data = data_handler
        self.commission = commission

        # Slippage model parameters
        self.base_slippage_pct = 0.10  # 10% of spread as base slippage
        self.dte_slippage_factor = 2.0  # Multiplier for near-expiration
        self.iv_slippage_threshold = 0.30  # High IV threshold

    def execute_order(self, order_event: OrderEvent):
        """
        Simulate order execution with realistic fills.

        Args:
            order_event: Order to execute
        """
        if order_event.order_type == 'MARKET':
            fill = self.execute_market_order(order_event)
            if fill:
                self.events.put(fill)
        elif order_event.order_type == 'LIMIT':
            fill = self.execute_limit_order(order_event)
            if fill:
                self.events.put(fill)

    def execute_market_order(self, order: OrderEvent) -> Optional[FillEvent]:
        """
        Execute market order with realistic slippage.

        Args:
            order: Market order to execute

        Returns:
            FillEvent or None if execution fails
        """
        # Get current market data for the specific option
        if not order.strikes or len(order.strikes) == 0:
            print(f"No strikes specified in order {order.order_id}")
            return None

        strike = order.strikes[0]
        option_type = order.option_types[0] if order.option_types else 'P'

        # Get options chain
        chain = self.data.get_options_chain(order.symbol, min_dte=0, max_dte=7)

        if len(chain) == 0:
            print(f"No data available for {order.symbol}")
            return None

        # Find specific option
        option_data = chain[
            (chain['strike'] == strike) &
            (chain['option_type'] == option_type)
        ]

        if len(option_data) == 0:
            print(f"Option not found: {order.symbol} {strike} {option_type}")
            return None

        option_data = option_data.iloc[0]

        # Calculate time to expiration
        current_timestamp = self.data.current_timestamp
        expiration = pd.Timestamp(option_data['expiration_timestamp'], unit='us')
        hours_to_expiry = (expiration - current_timestamp).total_seconds() / 3600

        # Calculate fill price with slippage
        fill_price, slippage, execution_quality = self.model_slippage(
            option_data,
            order.direction,
            hours_to_expiry,
            order.quantity
        )

        # Create fill event
        fill = create_fill_event(
            symbol=order.symbol,
            quantity=order.quantity,
            direction=order.direction,
            fill_price=fill_price,
            commission=self.commission * order.quantity,
            timestamp=current_timestamp,
            slippage=slippage,
            order_id=order.order_id,
            strikes=order.strikes,
            option_types=order.option_types,
            execution_quality=execution_quality
        )

        print(f"Executed {order.direction} {order.quantity} @ ${fill_price:.2f}")
        print(f"  Slippage: ${slippage:.4f}, Quality: {execution_quality}")

        return fill

    def execute_limit_order(self, order: OrderEvent) -> Optional[FillEvent]:
        """
        Execute limit order (simplified).

        Args:
            order: Limit order to execute

        Returns:
            FillEvent or None if not filled
        """
        # Simplified: assume limit orders fill at limit price if within bid-ask
        # In reality, would need to model fill probability

        strike = order.strikes[0] if order.strikes else None
        option_type = order.option_types[0] if order.option_types else 'P'

        if not strike:
            return None

        # Get option data
        option_data = self.data.get_specific_option(
            order.symbol,
            strike,
            option_type,
            0  # Simplified
        )

        if option_data is None:
            return None

        # Check if limit price is within bid-ask
        if order.direction == 'BUY':
            # Buy limit must be >= ask to fill immediately
            if order.limit_price >= option_data['ask_price']:
                fill_price = option_data['ask_price']
            else:
                return None  # Order not filled
        else:
            # Sell limit must be <= bid to fill immediately
            if order.limit_price <= option_data['bid_price']:
                fill_price = option_data['bid_price']
            else:
                return None  # Order not filled

        fill = create_fill_event(
            symbol=order.symbol,
            quantity=order.quantity,
            direction=order.direction,
            fill_price=fill_price,
            commission=self.commission * order.quantity,
            timestamp=self.data.current_timestamp,
            slippage=0,  # No slippage on limit orders
            order_id=order.order_id,
            strikes=order.strikes,
            option_types=order.option_types,
            execution_quality='GOOD'
        )

        return fill

    def model_slippage(self, market_data: pd.Series, side: str,
                      time_to_expiry_hours: float, quantity: int = 1) -> tuple:
        """
        Realistic slippage model for 0-7 DTE options.

        Slippage components:
        1. Base slippage: Pay half the spread
        2. DTE slippage: Exponential increase in final hours
        3. IV slippage: Higher slippage in high IV environment
        4. Wide spread penalty: Extra slippage for illiquid options
        5. Order size penalty: Larger orders get worse fills

        Args:
            market_data: Option data (bid, ask, mid, IV, etc.)
            side: 'BUY' or 'SELL'
            time_to_expiry_hours: Hours until expiration
            quantity: Number of contracts (affects slippage)

        Returns:
            (fill_price, slippage, execution_quality)
        """
        mid_price = market_data['mid_price']
        bid_price = market_data['bid_price']
        ask_price = market_data['ask_price']
        spread = ask_price - bid_price

        # Base fill at bid/ask
        if side == 'BUY':
            base_fill = ask_price
        else:
            base_fill = bid_price

        # Component 1: Base slippage (beyond bid-ask)
        base_slippage = spread * self.base_slippage_pct

        # Component 2: DTE-based slippage (exponential in final hour)
        dte_slippage = 0
        if time_to_expiry_hours < 1:
            # Exponential slippage in final hour for 0DTE
            time_factor = np.exp((1 - time_to_expiry_hours))
            dte_slippage = spread * 0.5 * time_factor
        elif time_to_expiry_hours < 4:
            # Moderate slippage in final 4 hours
            dte_slippage = spread * 0.2

        # Component 3: IV-based slippage
        iv_slippage = 0
        if market_data['implied_vol'] > self.iv_slippage_threshold:
            # High IV increases slippage
            iv_factor = market_data['implied_vol'] / self.iv_slippage_threshold
            iv_slippage = 0.01 * mid_price * (iv_factor - 1)

        # Component 4: Wide spread penalty
        spread_pct = (spread / mid_price) if mid_price > 0 else 0
        wide_spread_slippage = 0
        if spread_pct > 0.20:  # 20% spread
            wide_spread_slippage = spread * 0.1

        # Component 5: Order size penalty (larger orders get worse fills)
        size_slippage = 0
        if quantity <= 10:
            size_multiplier = 0.25  # 25% of spread
        elif quantity <= 50:
            size_multiplier = 0.40  # 40% of spread
        elif quantity <= 100:
            size_multiplier = 0.60  # 60% of spread
        else:
            size_multiplier = 0.80  # 80% of spread for large orders

        size_slippage = spread * size_multiplier * 0.15  # Scale to reasonable impact

        # Total slippage
        total_slippage = base_slippage + dte_slippage + iv_slippage + wide_spread_slippage + size_slippage

        # Apply slippage to fill price
        if side == 'BUY':
            fill_price = base_fill + total_slippage
        else:
            fill_price = base_fill - total_slippage

        # Ensure fill price is non-negative
        fill_price = max(fill_price, 0.01)

        # Determine execution quality
        slippage_pct = (total_slippage / mid_price) if mid_price > 0 else 0

        if slippage_pct < 0.05:
            quality = 'GOOD'
        elif slippage_pct < 0.15:
            quality = 'FAIR'
        else:
            quality = 'POOR'

        return fill_price, total_slippage, quality

    def get_execution_stats(self) -> dict:
        """
        Get execution statistics (for analysis).

        Returns:
            Dictionary with execution stats
        """
        # TODO: Track execution stats over time
        return {
            'total_orders': 0,
            'avg_slippage': 0,
            'good_fills': 0,
            'fair_fills': 0,
            'poor_fills': 0
        }


if __name__ == "__main__":
    from queue import Queue
    from database import get_database

    # Example usage
    events = Queue()
    db = get_database(db_type='sqlite')
    data_handler = DataHandler(
        db_connection=db.get_connection(),
        start_date='2024-01-01',
        end_date='2024-01-31',
        symbols=['SPY']
    )

    execution = ExecutionHandler(events, data_handler, commission=0.65)

    print("ExecutionHandler initialized successfully")
    print(f"Commission per contract: ${execution.commission}")
    print(f"Base slippage: {execution.base_slippage_pct * 100}% of spread")