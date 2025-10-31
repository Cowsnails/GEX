/**
 * Backtester Bridge Module
 *
 * Connects Node.js server with Python backtester engine
 * Handles process spawning, data transfer, and result collection
 */

import { spawn } from 'child_process';
import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';

const backtestDb = new Database('backtest.db');

export class BacktesterBridge {
  constructor() {
    this.runningBacktests = new Map(); // Track running backtests
    this.pythonPath = 'python3'; // Default Python path
    this.backtesterPath = path.join(process.cwd(), 'Backtester', 'options_backtester');
  }

  /**
   * Run a backtest configuration
   *
   * @param {string} configId - Backtest configuration ID
   * @param {object} config - Backtest configuration
   * @returns {Promise<object>} - Backtest results
   */
  async runBacktest(configId, config) {
    try {
      console.log(`🧪 Running backtest: ${configId}`);

      // Prepare configuration for Python
      const pythonConfig = {
        config_id: configId,
        symbols: JSON.parse(config.symbols),
        start_date: config.start_date,
        end_date: config.end_date,
        initial_capital: config.initial_capital,
        strategy_name: config.strategy_name,
        strategy_params: JSON.parse(config.strategy_params || '{}'),
        commission: config.commission || 0.05
      };

      // Create temporary config file
      const configPath = path.join('/tmp', `backtest_config_${configId}.json`);
      fs.writeFileSync(configPath, JSON.stringify(pythonConfig, null, 2));

      // Spawn Python process
      const pythonScript = path.join(this.backtesterPath, 'run_backtest.py');
      const pythonProcess = spawn(this.pythonPath, [pythonScript, configPath]);

      this.runningBacktests.set(configId, pythonProcess);

      // Broadcast backtest started
      if (global.broadcastToAllUsers) {
        global.broadcastToAllUsers({
          type: 'backtest_started',
          config_id: configId,
          config_name: config.name,
          symbols: config.symbols,
          start_date: config.start_date,
          end_date: config.end_date
        });
      }

      let stdout = '';
      let stderr = '';

      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`[Backtest ${configId}] ${output}`);

        // Parse progress updates from Python
        const progressMatch = output.match(/PROGRESS: (\d+)\/(\d+) \(([0-9.]+)%\) \| ([0-9.]+) iter\/s \| ETA: ([0-9.]+)s/);

        if (progressMatch && global.broadcastToAllUsers) {
          const currentIter = parseInt(progressMatch[1]);
          const totalIter = parseInt(progressMatch[2]);
          const progressPct = parseFloat(progressMatch[3]);
          const iterPerSec = parseFloat(progressMatch[4]);
          const etaSeconds = parseFloat(progressMatch[5]);

          // Broadcast enhanced progress
          global.broadcastToAllUsers({
            type: 'backtest_progress',
            config_id: configId,
            config_name: config.name,
            current_iteration: currentIter,
            total_iterations: totalIter,
            progress_percent: progressPct,
            iterations_per_second: iterPerSec,
            eta_seconds: etaSeconds,
            eta_formatted: this.formatTime(etaSeconds)
          });
        } else if (global.broadcastToAllUsers) {
          // Broadcast generic progress message
          global.broadcastToAllUsers({
            type: 'backtest_progress',
            config_id: configId,
            config_name: config.name,
            message: output.trim()
          });
        }
      });

      // Collect stderr
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`[Backtest ${configId} ERROR] ${data}`);
      });

      // Wait for process to complete
      const exitCode = await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          resolve(code);
        });

        pythonProcess.on('error', (error) => {
          reject(error);
        });
      });

      // Remove from running backtests
      this.runningBacktests.delete(configId);

      // Clean up config file
      try {
        fs.unlinkSync(configPath);
      } catch (err) {
        console.warn(`Failed to delete config file: ${err.message}`);
      }

      if (exitCode !== 0) {
        throw new Error(`Backtest process exited with code ${exitCode}\nStderr: ${stderr}`);
      }

      // Parse results from output
      const results = this.parseBacktestResults(stdout);

      // Store results in database
      await this.storeResults(configId, config.user_id, results);

      // Update config status
      backtestDb.prepare(`
        UPDATE backtest_configs
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(configId);

      console.log(`✅ Backtest completed: ${configId}`);

      // Broadcast completion
      if (global.broadcastToAllUsers) {
        global.broadcastToAllUsers({
          type: 'backtest_completed',
          config_id: configId,
          results: {
            total_return: results.total_return,
            sharpe_ratio: results.sharpe_ratio,
            max_drawdown: results.max_drawdown,
            total_trades: results.total_trades,
            win_rate: results.win_rate
          }
        });
      }

      return {
        success: true,
        results: results
      };

    } catch (error) {
      console.error(`❌ Backtest failed: ${configId}`, error);

      // Update config status to failed
      backtestDb.prepare(`
        UPDATE backtest_configs
        SET status = 'failed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(configId);

      // Broadcast failure
      if (global.broadcastToAllUsers) {
        global.broadcastToAllUsers({
          type: 'backtest_failed',
          config_id: configId,
          error: error.message
        });
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse backtest results from Python output
   *
   * @param {string} output - Python script output
   * @returns {object} - Parsed results
   */
  parseBacktestResults(output) {
    try {
      // Look for JSON results in output
      const jsonMatch = output.match(/\{[\s\S]*"initial_capital"[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: Parse from text output
      const results = {
        initial_capital: this.extractValue(output, 'Initial Capital:'),
        final_value: this.extractValue(output, 'Final Value:'),
        total_return: this.extractValue(output, 'Total Return:'),
        sharpe_ratio: this.extractValue(output, 'Sharpe Ratio:'),
        max_drawdown: this.extractValue(output, 'Max Drawdown:'),
        total_trades: parseInt(this.extractValue(output, 'Total Trades:') || '0'),
        win_rate: this.extractValue(output, 'Win Rate:'),
        equity_curve: [],
        trades_data: []
      };

      return results;
    } catch (error) {
      console.error('Failed to parse backtest results:', error);
      return {
        initial_capital: 0,
        final_value: 0,
        total_return: 0,
        sharpe_ratio: 0,
        max_drawdown: 0,
        total_trades: 0,
        win_rate: 0,
        equity_curve: [],
        trades_data: []
      };
    }
  }

  /**
   * Extract numeric value from text output
   *
   * @param {string} text - Output text
   * @param {string} label - Label to search for
   * @returns {number} - Extracted value
   */
  extractValue(text, label) {
    const regex = new RegExp(`${label}\\s*[\\$]?([\\d,\\.\\-\\+]+)`);
    const match = text.match(regex);
    if (match) {
      return parseFloat(match[1].replace(/,/g, '').replace(/\+/g, '').replace(/%/g, ''));
    }
    return 0;
  }

  /**
   * Store backtest results in database
   *
   * @param {string} configId - Config ID
   * @param {number} userId - User ID
   * @param {object} results - Backtest results
   */
  async storeResults(configId, userId, results) {
    try {
      backtestDb.prepare(`
        INSERT INTO backtest_results (
          config_id, user_id, initial_capital, final_value, total_return,
          sharpe_ratio, max_drawdown, total_trades, win_rate,
          avg_win, avg_loss, profit_factor, equity_curve, trades_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        configId,
        userId,
        results.initial_capital || 0,
        results.final_value || 0,
        results.total_return || 0,
        results.sharpe_ratio || 0,
        results.max_drawdown || 0,
        results.total_trades || 0,
        results.win_rate || 0,
        results.avg_win || 0,
        results.avg_loss || 0,
        results.profit_factor || 0,
        JSON.stringify(results.equity_curve || []),
        JSON.stringify(results.trades_data || [])
      );

      console.log(`💾 Stored backtest results for ${configId}`);
    } catch (error) {
      console.error('Failed to store backtest results:', error);
      throw error;
    }
  }

  /**
   * Stop a running backtest
   *
   * @param {string} configId - Config ID
   * @returns {boolean} - Success status
   */
  stopBacktest(configId) {
    const process = this.runningBacktests.get(configId);
    if (process) {
      process.kill('SIGTERM');
      this.runningBacktests.delete(configId);

      // Update status
      backtestDb.prepare(`
        UPDATE backtest_configs
        SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(configId);

      console.log(`🛑 Stopped backtest: ${configId}`);
      return true;
    }
    return false;
  }

  /**
   * Get running backtests
   *
   * @returns {Array<string>} - Array of config IDs
   */
  getRunningBacktests() {
    return Array.from(this.runningBacktests.keys());
  }

  /**
   * Check if Python and required packages are available
   *
   * @returns {Promise<object>} - Availability status
   */
  async checkAvailability() {
    try {
      const pythonProcess = spawn(this.pythonPath, ['--version']);

      const output = await new Promise((resolve, reject) => {
        let stdout = '';
        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error('Python not found'));
          }
        });
      });

      return {
        available: true,
        pythonVersion: output.trim()
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Format seconds into human-readable time (e.g., "5m 30s")
   *
   * @param {number} seconds - Seconds to format
   * @returns {string} - Formatted time string
   */
  formatTime(seconds) {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${minutes}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
}

// Export singleton instance
export const backtesterBridge = new BacktesterBridge();