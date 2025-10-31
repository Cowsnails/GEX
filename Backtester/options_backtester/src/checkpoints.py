"""
Checkpoint Manager for Backtest Recovery

Saves backtest state periodically and enables resume after crashes.
"""

import pickle
import os
import json
from typing import Dict, Optional, Any
from datetime import datetime


class CheckpointManager:
    """Manage backtest checkpoints for crash recovery"""

    def __init__(self, backtest_id: str, checkpoint_interval: int = 1000,
                 checkpoint_dir: str = '/tmp/backtest_checkpoints'):
        """
        Initialize checkpoint manager.

        Args:
            backtest_id: Unique backtest identifier
            checkpoint_interval: Save checkpoint every N iterations
            checkpoint_dir: Directory to store checkpoints
        """
        self.backtest_id = backtest_id
        self.checkpoint_interval = checkpoint_interval
        self.checkpoint_dir = checkpoint_dir

        # Create checkpoint directory if it doesn't exist
        os.makedirs(self.checkpoint_dir, exist_ok=True)

        # Checkpoint file paths
        self.checkpoint_file = os.path.join(
            self.checkpoint_dir,
            f"{self.backtest_id}_checkpoint.pkl"
        )
        self.metadata_file = os.path.join(
            self.checkpoint_dir,
            f"{self.backtest_id}_metadata.json"
        )

        # Track last save time
        self.last_checkpoint_time = None
        self.checkpoint_count = 0

    def save_checkpoint(self, state: Dict[str, Any]):
        """
        Save current backtest state.

        Args:
            state: Dict containing backtest state:
                - iteration: Current iteration number
                - current_timestamp: Current timestamp
                - equity_curve: List of equity snapshots
                - positions: Portfolio positions
                - trades: List of completed trades
                - portfolio_cash: Cash balance
                - portfolio_settled: Settled cash
                - portfolio_unsettled: Unsettled cash
        """
        try:
            # Save main checkpoint
            with open(self.checkpoint_file, 'wb') as f:
                pickle.dump(state, f, protocol=pickle.HIGHEST_PROTOCOL)

            # Save metadata (human-readable)
            metadata = {
                'backtest_id': self.backtest_id,
                'checkpoint_time': datetime.now().isoformat(),
                'iteration': state.get('iteration', 0),
                'current_timestamp': str(state.get('current_timestamp', '')),
                'num_trades': len(state.get('trades', [])),
                'portfolio_value': state.get('portfolio_value', 0),
                'checkpoint_count': self.checkpoint_count
            }

            with open(self.metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)

            self.last_checkpoint_time = datetime.now()
            self.checkpoint_count += 1

            print(f"💾 Checkpoint #{self.checkpoint_count} saved at iteration {state.get('iteration', 0)}")

            return True

        except Exception as e:
            print(f"❌ Failed to save checkpoint: {e}")
            return False

    def load_checkpoint(self) -> Optional[Dict[str, Any]]:
        """
        Load last checkpoint if exists.

        Returns:
            Dict with state, or None if no checkpoint exists
        """
        if not os.path.exists(self.checkpoint_file):
            print("ℹ️  No checkpoint found - starting fresh backtest")
            return None

        try:
            # Load main checkpoint
            with open(self.checkpoint_file, 'rb') as f:
                state = pickle.load(f)

            # Load metadata for logging
            if os.path.exists(self.metadata_file):
                with open(self.metadata_file, 'r') as f:
                    metadata = json.load(f)
                    print(f"✅ Checkpoint loaded from {metadata['checkpoint_time']}")
                    print(f"   Resuming from iteration {metadata['iteration']}")
                    print(f"   Trades: {metadata['num_trades']}, Portfolio: ${metadata['portfolio_value']:,.2f}")
            else:
                print(f"✅ Checkpoint loaded from iteration {state.get('iteration', 0)}")

            return state

        except Exception as e:
            print(f"❌ Failed to load checkpoint: {e}")
            print("   Starting fresh backtest instead")
            return None

    def clear_checkpoint(self):
        """Remove checkpoint files after successful completion"""
        try:
            if os.path.exists(self.checkpoint_file):
                os.remove(self.checkpoint_file)
                print("🗑️  Checkpoint cleared")

            if os.path.exists(self.metadata_file):
                os.remove(self.metadata_file)

            return True

        except Exception as e:
            print(f"⚠️  Failed to clear checkpoint: {e}")
            return False

    def should_save_checkpoint(self, iteration: int) -> bool:
        """
        Check if checkpoint should be saved at this iteration.

        Args:
            iteration: Current iteration number

        Returns:
            True if should save checkpoint
        """
        return iteration % self.checkpoint_interval == 0 and iteration > 0

    def get_checkpoint_info(self) -> Optional[Dict[str, Any]]:
        """
        Get information about existing checkpoint without loading it.

        Returns:
            Metadata dict or None
        """
        if not os.path.exists(self.metadata_file):
            return None

        try:
            with open(self.metadata_file, 'r') as f:
                return json.load(f)
        except Exception:
            return None

    def checkpoint_exists(self) -> bool:
        """
        Check if checkpoint exists for this backtest.

        Returns:
            True if checkpoint file exists
        """
        return os.path.exists(self.checkpoint_file)

    def get_checkpoint_age_seconds(self) -> Optional[float]:
        """
        Get age of checkpoint in seconds.

        Returns:
            Seconds since checkpoint was saved, or None
        """
        if not os.path.exists(self.checkpoint_file):
            return None

        try:
            checkpoint_time = os.path.getmtime(self.checkpoint_file)
            current_time = datetime.now().timestamp()
            return current_time - checkpoint_time
        except Exception:
            return None


class CheckpointableState:
    """
    Helper class to make backtest components checkpointable.

    Provides methods to serialize and deserialize state.
    """

    def to_checkpoint(self) -> Dict[str, Any]:
        """
        Convert object to checkpoint-compatible dict.

        Override this method in subclasses.

        Returns:
            Serializable dict
        """
        raise NotImplementedError("Subclass must implement to_checkpoint()")

    @classmethod
    def from_checkpoint(cls, state: Dict[str, Any]):
        """
        Restore object from checkpoint state.

        Override this method in subclasses.

        Args:
            state: Checkpoint state dict

        Returns:
            Restored object instance
        """
        raise NotImplementedError("Subclass must implement from_checkpoint()")


if __name__ == "__main__":
    print("Checkpoint Manager Module")
    print("=" * 60)

    # Example usage
    manager = CheckpointManager(
        backtest_id="test_bt_001",
        checkpoint_interval=1000
    )

    print(f"\nCheckpoint directory: {manager.checkpoint_dir}")
    print(f"Checkpoint interval: {manager.checkpoint_interval} iterations")

    # Example state
    example_state = {
        'iteration': 5000,
        'current_timestamp': '2024-01-15 10:30:00',
        'equity_curve': [100000, 101000, 102000],
        'positions': {},
        'trades': [],
        'portfolio_cash': 102000,
        'portfolio_settled': 102000,
        'portfolio_unsettled': 0,
        'portfolio_value': 102000
    }

    print("\nExample: Saving checkpoint...")
    manager.save_checkpoint(example_state)

    print("\nExample: Loading checkpoint...")
    loaded = manager.load_checkpoint()
    if loaded:
        print(f"  Loaded iteration: {loaded['iteration']}")
        print(f"  Portfolio value: ${loaded['portfolio_value']:,.2f}")

    print("\nExample: Clearing checkpoint...")
    manager.clear_checkpoint()

    print("\nUsage in backtest:")
    print("""
    # Initialize checkpoint manager
    checkpoint_mgr = CheckpointManager(
        backtest_id=f"bt_{config_id}_{int(time.time())}",
        checkpoint_interval=1000
    )

    # Try to load checkpoint
    state = checkpoint_mgr.load_checkpoint()
    if state:
        # Resume from checkpoint
        start_iteration = state['iteration']
        portfolio.restore_state(state)
    else:
        start_iteration = 0

    # In main loop
    for i in range(start_iteration, total_iterations):
        # Process...

        # Save checkpoint periodically
        if checkpoint_mgr.should_save_checkpoint(i):
            checkpoint_mgr.save_checkpoint({
                'iteration': i,
                'current_timestamp': current_timestamp,
                'equity_curve': equity_curve,
                'positions': portfolio.positions,
                'trades': portfolio.trades,
                'portfolio_cash': portfolio.cash,
                'portfolio_settled': portfolio.settled_cash,
                'portfolio_unsettled': portfolio.unsettled_cash,
                'portfolio_value': portfolio.total_value
            })

    # Clear checkpoint on success
    checkpoint_mgr.clear_checkpoint()
    """)

    print("\nReady for integration!")