// utils/positionResolver.js - Unified Position ID Resolution
import { UserManager } from '../auth/userManager.js';
import TradeHistoryManager from './tradeHistoryManager.js';
import { InternalPaperBroker } from '../api/internalPaperBroker.js';

/**
 * Unified position resolver that handles ALL position ID formats:
 * - PAPER-xxx (paper broker positions)
 * - manual-xxx (manual entry signals)
 * - Signal IDs (trader signals)
 * - Direct position IDs (Alpaca positions)
 */
export class PositionResolver {

  /**
   * Resolve any position ID to actual position data and determine type
   * @param {number} userId - User ID
   * @param {string} positionId - Any format of position identifier
   * @returns {Object} { position, type, signal, positionId }
   */
  static resolvePosition(userId, positionId) {
    console.log(`🔍 [PositionResolver] Resolving position ID: ${positionId}`);

    // Try 1: Check if it's a paper position (PAPER-xxx format)
    if (typeof positionId === 'string' && positionId.startsWith('PAPER-')) {
      console.log(`📄 [PositionResolver] Detected PAPER position`);

      const paperPositions = InternalPaperBroker.getPositions(userId);
      if (paperPositions.success && paperPositions.positions) {
        const position = paperPositions.positions.find(p => p.positionId === positionId);
        if (position) {
          console.log(`✅ [PositionResolver] Found paper position`);
          return {
            position,
            type: 'paper',
            signal: null,
            positionId: positionId
          };
        }
      }
    }

    // Try 2: Check if it's a signal ID OR positionId in trade_signals table
    const signalsResult = TradeHistoryManager.getActiveSignals(userId);
    if (signalsResult.success && signalsResult.signals) {
      // 🔥 FIX: Check BOTH signal.id AND signal.positionId to match the position
      const signal = signalsResult.signals.find(s =>
        s.id === positionId ||
        s.positionId === positionId ||
        String(s.positionId) === String(positionId) // Handle numeric vs string comparison
      );

      if (signal) {
        console.log(`📊 [PositionResolver] Found signal in database`);

        // Check if signal has a linked position ID
        if (signal.positionId) {
          console.log(`🔗 [PositionResolver] Signal has linked positionId: ${signal.positionId}`);

          // Check if it's a paper position
          if (signal.positionId.startsWith('PAPER-')) {
            const paperPositions = InternalPaperBroker.getPositions(userId);
            if (paperPositions.success && paperPositions.positions) {
              const position = paperPositions.positions.find(p => p.positionId === signal.positionId);
              if (position) {
                console.log(`✅ [PositionResolver] Found linked paper position`);
                return {
                  position,
                  type: 'paper',
                  signal,
                  positionId: signal.positionId
                };
              }
            }
          } else {
            // Try to find Alpaca position in OPEN positions first
            const alpacaPositions = UserManager.getOpenPositions(userId);
            console.log(`🔍 [PositionResolver] Looking for position ID: ${signal.positionId}`);
            console.log(`🔍 [PositionResolver] Found ${alpacaPositions.positions?.length || 0} open positions`);
            if (alpacaPositions.positions?.length > 0) {
              console.log(`🔍 [PositionResolver] Position IDs: ${alpacaPositions.positions.map(p => p.id).join(', ')}`);
            }

            if (alpacaPositions.success && alpacaPositions.positions) {
              const position = alpacaPositions.positions.find(p => p.id === signal.positionId);
              if (position) {
                console.log(`✅ [PositionResolver] Found linked Alpaca position (OPEN)`);
                return {
                  position,
                  type: 'alpaca',
                  signal,
                  positionId: signal.positionId
                };
              }
            }

            // 🔥 FALLBACK: Check if position exists with ANY status (not just OPEN)
            console.log(`🔍 [PositionResolver] Position not in OPEN list, checking by ID (any status)...`);
            const positionById = UserManager.getPositionById(userId, signal.positionId);
            if (positionById.success && positionById.position) {
              console.log(`✅ [PositionResolver] Found position ${signal.positionId} with status: ${positionById.position.status}`);
              return {
                position: positionById.position,
                type: 'alpaca',
                signal,
                positionId: signal.positionId
              };
            } else {
              console.log(`⚠️ [PositionResolver] Position ${signal.positionId} does NOT exist in database`);
            }
          }

          // 🔥 FIX: Position not found but signal exists - return signal with position=null
          // This happens when position was closed or doesn't exist in positions table
          console.log(`⚠️ [PositionResolver] Signal found but position ${signal.positionId} not accessible - treating as orphaned signal`);
          return {
            position: null,
            type: 'orphaned',  // Signal has positionId but position not found
            signal,
            positionId: signal.positionId
          };
        } else {
          // Signal exists but has no position ID - it's a manual signal without broker position
          console.log(`📝 [PositionResolver] Signal is manual entry without broker position`);
          return {
            position: null,
            type: 'manual',
            signal,
            positionId: null
          };
        }
      }
    }

    // Try 3: Direct lookup in Alpaca positions
    console.log(`🔍 [PositionResolver] Try 3: Direct lookup for position: ${positionId}`);
    const alpacaPositions = UserManager.getOpenPositions(userId);
    console.log(`🔍 [PositionResolver] Found ${alpacaPositions.positions?.length || 0} open positions for direct lookup`);
    if (alpacaPositions.positions?.length > 0) {
      console.log(`🔍 [PositionResolver] Position IDs: ${alpacaPositions.positions.map(p => p.id).join(', ')}`);
    }

    if (alpacaPositions.success && alpacaPositions.positions) {
      const position = alpacaPositions.positions.find(p => p.id === positionId);
      if (position) {
        console.log(`✅ [PositionResolver] Found Alpaca position via direct lookup`);
        return {
          position,
          type: 'alpaca',
          signal: null,
          positionId: positionId
        };
      } else {
        console.log(`❌ [PositionResolver] Position ${positionId} not found in open positions (direct lookup)`);
      }
    }

    // Not found
    console.error(`❌ [PositionResolver] Position not found: ${positionId}`);
    return {
      position: null,
      type: null,
      signal: null,
      positionId: null
    };
  }

  /**
   * Get signal data for a position (if exists)
   * @param {number} userId
   * @param {string} positionId
   * @returns {Object|null} signal or null
   */
  static getSignalForPosition(userId, positionId) {
    const signalsResult = TradeHistoryManager.getActiveSignals(userId);
    if (signalsResult.success && signalsResult.signals) {
      // 🔥 FIX: Try to find by signal ID or position ID (handle type conversion)
      return signalsResult.signals.find(s =>
        s.id === positionId ||
        s.positionId === positionId ||
        String(s.positionId) === String(positionId)
      ) || null;
    }
    return null;
  }
}

export default PositionResolver;