"""
Portfolio management with proper cash tracking and T+1 settlement.

Handles:
- Position tracking
- Cash settlement (T+1)
- Position sizing
- Risk management
- Converting signals to orders
"""

from queue import Queue
from events import SignalEvent, OrderEvent, FillEvent, EventType, create_order_event
import pandas as pd
from typing import Dict, List, Optional
import uuid


class Portfolio:
    """
    Manages positions and converts signals to orders.

    Implements:
    - T+1 settlement (cash settles next business day)
    - Position tracking
    - Risk management
    - Kelly criterion for position sizing
    """

    def __init__(self, events_queue: Queue, initial_capital: float = 100000):
        """
        Initialize portfolio.

        Args:
            events_queue: Queue for putting order events
            initial_capital: Starting capital
        """
        self.events = events_queue
        self.initial_capital = initial_capital
        self.settled_cash = initial_capital  # Cash available for trading
        self.unsettled_cash = 0  # Cash pending settlement
        self.positions = {}  # {symbol: {quantity, avg_cost, realized_pnl}}
        self.pending_settlements = []  # List of pending cash settlements
        self.all_holdings = []  # Historical holdings
        self.trades = []  # All executed trades

        # Risk parameters
        self.max_position_size = 0.05  # Max 5% of capital per position
        self.max_total_exposure = 0.20  # Max 20% total exposure

    def update_signal(self, signal_event: SignalEvent):
        """
        Convert SignalEvent to OrderEvent based on position sizing.

        Args:
            signal_event: Signal from strategy
        """
        # Calculate position size
        position_size = self.calculate_position_size(signal_event)

        if position_size == 0:
            print(f"Position size is 0 for {signal_event.symbol}, skipping")
            return

        # Check if we have enough capital
        estimated_cost = self.estimate_trade_cost(signal_event, position_size)

        if estimated_cost > self.settled_cash:
            print(f"Insufficient settled cash for {signal_event.symbol}")
            print(f"  Need: ${estimated_cost:,.2f}, Have: ${self.settled_cash:,.2f}")
            return

        # Generate order
        order_id = str(uuid.uuid4())

        order = create_order_event(
            symbol=signal_event.symbol,
            order_type='MARKET',  # Use market orders for now
            quantity=position_size,
            direction='BUY' if signal_event.signal_type == 'LONG' else 'SELL',
            strikes=signal_event.strikes,
            option_types=[signal_event.metadata.get('option_type', 'P')]
                         if signal_event.metadata else ['P'],
            order_id=order_id
        )

        self.events.put(order)

        print(f"Generated {order.direction} order for {position_size} contracts of {order.symbol}")

    def update_fill(self, fill_event: FillEvent):
        """
        Update positions and track settlement (T+1).

        Args:
            fill_event: Fill event from execution
        """
        symbol = fill_event.symbol

        # Update position
        if symbol not in self.positions:
            self.positions[symbol] = {
                'quantity': 0,
                'avg_cost': 0.0,
                'realized_pnl': 0.0,
                'total_cost': 0.0
            }

        position = self.positions[symbol]

        # Calculate cash impact
        # Options are priced per share, multiplied by 100 shares per contract
        if fill_event.direction == 'BUY':
            cash_impact = -(fill_event.fill_price * fill_event.quantity * 100 +
                          fill_event.commission)
            position['quantity'] += fill_event.quantity

            # Update average cost
            new_total_cost = position['total_cost'] + abs(cash_impact)
            position['avg_cost'] = new_total_cost / position['quantity']
            position['total_cost'] = new_total_cost

        else:  # SELL
            cash_impact = (fill_event.fill_price * fill_event.quantity * 100 -
                         fill_event.commission)
            position['quantity'] -= fill_event.quantity

            # Calculate realized P&L for closed portion
            if position['quantity'] >= 0:
                realized_pnl = cash_impact - (fill_event.quantity * position['avg_cost'] * 100)
                position['realized_pnl'] += realized_pnl

        # Track unsettled cash (settles T+1)
        self.unsettled_cash += cash_impact
        settlement_date = fill_event.timestamp + pd.Timedelta(days=1)

        self.pending_settlements.append({
            'amount': cash_impact,
            'settlement_date': settlement_date,
            'fill_event': fill_event
        })

        # Record trade
        self.trades.append({
            'timestamp': fill_event.timestamp,
            'symbol': symbol,
            'direction': fill_event.direction,
            'quantity': fill_event.quantity,
            'fill_price': fill_event.fill_price,
            'commission': fill_event.commission,
            'slippage': fill_event.slippage,
            'cash_impact': cash_impact
        })

        print(f"Position updated: {symbol} {position['quantity']} contracts")
        print(f"  Cash impact: ${cash_impact:,.2f} (settles {settlement_date.date()})")

    def process_settlements(self, current_date: pd.Timestamp):
        """
        Move unsettled cash to settled on T+1.

        Args:
            current_date: Current backtest date
        """
        settlements_processed = 0

        for settlement in self.pending_settlements[:]:
            if settlement['settlement_date'] <= current_date:
                self.settled_cash += settlement['amount']
                self.unsettled_cash -= settlement['amount']
                self.pending_settlements.remove(settlement)
                settlements_processed += 1

        if settlements_processed > 0:
            print(f"Processed {settlements_processed} settlements on {current_date.date()}")
            print(f"  Settled cash: ${self.settled_cash:,.2f}")

    def calculate_position_size(self, signal: SignalEvent) -> int:
        """
        Calculate position size using risk-based sizing.

        For now, uses simple fixed sizing.
        TODO: Implement Kelly criterion.

        Args:
            signal: Signal event

        Returns:
            Number of contracts
        """
        # Simple: 1 contract for now
        # In production, calculate based on:
        # - Kelly criterion
        # - Account size
        # - Risk per trade
        # - Signal strength

        base_size = int(signal.strength)  # Use signal strength

        # Cap at maximum position size
        max_contracts = int(self.settled_cash * self.max_position_size / 1000)

        return min(base_size, max_contracts, 10)  # Cap at 10 contracts for safety

    def estimate_trade_cost(self, signal: SignalEvent, quantity: int) -> float:
        """
        Estimate cost of executing a trade.

        Args:
            signal: Signal event
            quantity: Number of contracts

        Returns:
            Estimated cost
        """
        # Rough estimate: assume $2.00 per contract + commission
        # In production, get actual market price from data
        estimated_premium = 2.00
        commission = 0.05  # Alpaca standard commission

        if signal.signal_type == 'LONG':
            cost = (estimated_premium * quantity * 100) + (commission * quantity)
        else:  # SHORT
            cost = 0  # Selling generates cash

        return cost

    def get_total_value(self, current_prices: Dict[str, float] = None) -> float:
        """
        Calculate total portfolio value.

        Args:
            current_prices: Dict of {symbol: current_price}

        Returns:
            Total portfolio value
        """
        total = self.settled_cash + self.unsettled_cash

        # Add market value of positions
        if current_prices:
            for symbol, position in self.positions.items():
                if position['quantity'] != 0 and symbol in current_prices:
                    market_value = position['quantity'] * current_prices[symbol] * 100
                    total += market_value

        return total

    def get_positions_summary(self) -> pd.DataFrame:
        """
        Get summary of current positions.

        Returns:
            DataFrame with position details
        """
        positions_list = []

        for symbol, pos in self.positions.items():
            if pos['quantity'] != 0:
                positions_list.append({
                    'symbol': symbol,
                    'quantity': pos['quantity'],
                    'avg_cost': pos['avg_cost'],
                    'total_cost': pos['total_cost'],
                    'realized_pnl': pos['realized_pnl']
                })

        if len(positions_list) == 0:
            return pd.DataFrame()

        return pd.DataFrame(positions_list)

    def get_trades_summary(self) -> pd.DataFrame:
        """
        Get summary of all trades.

        Returns:
            DataFrame with trade history
        """
        if len(self.trades) == 0:
            return pd.DataFrame()

        return pd.DataFrame(self.trades)

    def get_current_exposure(self) -> float:
        """
        Calculate current total exposure as % of capital.

        Returns:
            Exposure percentage
        """
        total_exposure = 0

        for symbol, pos in self.positions.items():
            if pos['quantity'] != 0:
                total_exposure += abs(pos['total_cost'])

        return total_exposure / self.initial_capital


if __name__ == "__main__":
    from queue import Queue

    # Example usage
    events = Queue()
    portfolio = Portfolio(events, initial_capital=100000)

    print("Portfolio initialized successfully")
    print(f"Initial capital: ${portfolio.initial_capital:,.2f}")
    print(f"Settled cash: ${portfolio.settled_cash:,.2f}")
    print(f"Max position size: {portfolio.max_position_size * 100}%")