// api/historicalDataImporter.js - ThetaData Historical Options Data Importer
import { Database } from 'bun:sqlite';

const THETA_TERMINAL = "http://127.0.0.1:25510";
const backtestDb = new Database('backtest.db');

// Helper: Calculate trading days between two dates (excludes weekends)
function getTradingDays(startDate, endDate) {
  const days = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Exclude weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}

// Helper: Format date as YYYYMMDD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Helper: Get missing dates for a ticker
export function getMissingDates(ticker, startDate, endDate) {
  const allTradingDays = getTradingDays(startDate, endDate);

  // Get dates we already have
  const importedDates = backtestDb.prepare(`
    SELECT trading_date FROM ticker_import_dates
    WHERE ticker = ?
  `).all(ticker).map(row => row.trading_date);

  const importedSet = new Set(importedDates);

  // Find missing dates
  const missing = allTradingDays
    .map(date => formatDate(date))
    .filter(dateStr => !importedSet.has(dateStr));

  return missing;
}

// Helper: Update ticker import status
function updateTickerStatus(ticker) {
  const stats = backtestDb.prepare(`
    SELECT
      COUNT(DISTINCT trading_date) as imported_days,
      MIN(trading_date) as first_date,
      MAX(trading_date) as last_date
    FROM ticker_import_dates
    WHERE ticker = ?
  `).get(ticker);

  const status = backtestDb.prepare(`
    SELECT total_days_expected FROM ticker_import_status WHERE ticker = ?
  `).get(ticker);

  if (!status) return;

  const importedDays = stats.imported_days || 0;
  const expectedDays = status.total_days_expected;
  const missingDays = expectedDays - importedDays;
  const statusText = missingDays === 0 ? 'complete' : importedDays > 0 ? 'partial' : 'pending';

  backtestDb.prepare(`
    UPDATE ticker_import_status
    SET
      total_days_imported = ?,
      missing_days = ?,
      first_date = ?,
      last_date = ?,
      status = ?,
      last_updated = CURRENT_TIMESTAMP
    WHERE ticker = ?
  `).run(importedDays, missingDays, stats.first_date, stats.last_date, statusText, ticker);
}

// Fetch historical options data for a specific ticker and date
export async function fetchHistoricalOptionsData(ticker, date, retries = 3) {
  const dateStr = typeof date === 'string' ? date : formatDate(date);

  console.log(`📥 Fetching ${ticker} options data for ${dateStr}...`);

  try {
    // ThetaData bulk historical endpoint for options with greeks
    // Format: /v2/bulk_hist/option/all_trade_greeks?root=AAPL&exp=0&start_date=20231110&end_date=20231110&ivl=900000
    // exp=0 means all expirations, ivl=900000 is 15-minute bars
    const url = `${THETA_TERMINAL}/v2/bulk_hist/option/all_trade_greeks?root=${ticker}&exp=0&start_date=${dateStr}&end_date=${dateStr}&ivl=900000`;

    console.log(`🔗 Fetching from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.response || data.response.length === 0) {
      console.log(`⚠️ No data available for ${ticker} on ${dateStr}`);
      return { success: false, records: 0, reason: 'no_data' };
    }

    console.log(`✅ Fetched ${data.response.length} contracts for ${ticker} ${dateStr}`);

    return {
      success: true,
      records: data.response.length,
      data: data.response,
      date: dateStr
    };

  } catch (error) {
    console.error(`❌ Error fetching ${ticker} ${dateStr}:`, error.message);

    if (retries > 0) {
      console.log(`🔄 Retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      return fetchHistoricalOptionsData(ticker, date, retries - 1);
    }

    return {
      success: false,
      records: 0,
      error: error.message
    };
  }
}

// Store historical data in backtester database
export async function storeHistoricalData(ticker, date, optionsData) {
  // TODO: This needs to integrate with the Python backtester's SQLite database
  // For now, just track that we fetched it

  const dateStr = typeof date === 'string' ? date : formatDate(date);

  try {
    backtestDb.prepare(`
      INSERT OR REPLACE INTO ticker_import_dates (ticker, trading_date, records_imported)
      VALUES (?, ?, ?)
    `).run(ticker, dateStr, optionsData.length);

    updateTickerStatus(ticker);

    return { success: true };
  } catch (error) {
    console.error(`❌ Error storing data for ${ticker} ${dateStr}:`, error);
    return { success: false, error: error.message };
  }
}

// Import historical data for a ticker (full date range)
export async function importTickerData(ticker, startDate, endDate, jobId, onProgress) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 STARTING IMPORT: ${ticker}`);
  console.log(`📅 Date Range: ${startDate} to ${endDate}`);
  console.log(`${'='.repeat(60)}\n`);

  const missingDates = getMissingDates(ticker, startDate, endDate);

  if (missingDates.length === 0) {
    console.log(`✅ ${ticker} already has all data!`);
    return { success: true, datesImported: 0, message: 'All data already present' };
  }

  console.log(`📊 Found ${missingDates.length} missing dates for ${ticker}`);

  let imported = 0;
  let failed = 0;
  let totalRecords = 0;

  for (let i = 0; i < missingDates.length; i++) {
    const date = missingDates[i];
    const progress = ((i + 1) / missingDates.length) * 100;

    // Update job progress
    backtestDb.prepare(`
      UPDATE import_jobs
      SET progress = ?, records_fetched = ?
      WHERE id = ?
    `).run(progress, totalRecords, jobId);

    // Call progress callback
    if (onProgress) {
      onProgress({
        ticker,
        date,
        progress,
        imported,
        failed,
        totalRecords,
        current: i + 1,
        total: missingDates.length
      });
    }

    // Fetch data for this date
    const result = await fetchHistoricalOptionsData(ticker, date);

    if (result.success && result.data) {
      // Store the data
      const storeResult = await storeHistoricalData(ticker, date, result.data);

      if (storeResult.success) {
        imported++;
        totalRecords += result.records;
        console.log(`✅ [${i + 1}/${missingDates.length}] ${ticker} ${date}: ${result.records} records`);
      } else {
        failed++;
        console.error(`❌ [${i + 1}/${missingDates.length}] ${ticker} ${date}: Storage failed`);
      }
    } else {
      if (result.reason === 'no_data') {
        // No data available for this date (holiday, etc.) - mark as imported anyway
        await storeHistoricalData(ticker, date, []);
        console.log(`⚠️ [${i + 1}/${missingDates.length}] ${ticker} ${date}: No data (holiday?)`);
      } else {
        failed++;
        console.error(`❌ [${i + 1}/${missingDates.length}] ${ticker} ${date}: Fetch failed`);
      }
    }

    // Rate limiting: Wait 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ IMPORT COMPLETE: ${ticker}`);
  console.log(`📊 Imported: ${imported} dates`);
  console.log(`❌ Failed: ${failed} dates`);
  console.log(`📈 Total Records: ${totalRecords}`);
  console.log(`${'='.repeat(60)}\n`);

  // Update job status
  backtestDb.prepare(`
    UPDATE import_jobs
    SET
      status = 'completed',
      progress = 100,
      records_fetched = ?,
      records_stored = ?,
      completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(totalRecords, totalRecords, jobId);

  return {
    success: true,
    datesImported: imported,
    datesFailed: failed,
    totalRecords
  };
}

// Get import status for all tickers
export function getAllTickerStatus() {
  // 🔥 FIX: Calculate missing_days on the fly in case DB values are stale
  const tickers = backtestDb.prepare(`
    SELECT
      ticker,
      total_days_expected,
      total_days_imported,
      (total_days_expected - total_days_imported) as missing_days,
      first_date,
      last_date,
      CASE
        WHEN (total_days_expected - total_days_imported) = 0 THEN 'complete'
        WHEN total_days_imported > 0 THEN 'partial'
        ELSE 'pending'
      END as status,
      last_updated,
      last_import_attempt,
      import_error
    FROM ticker_import_status
    ORDER BY ticker ASC
  `).all();

  return tickers;
}

// Get import status for a specific ticker
export function getTickerStatus(ticker) {
  const status = backtestDb.prepare(`
    SELECT * FROM ticker_import_status WHERE ticker = ?
  `).get(ticker);

  return status;
}

// Get active import jobs
export function getActiveJobs() {
  const jobs = backtestDb.prepare(`
    SELECT * FROM import_jobs
    WHERE status IN ('pending', 'running')
    ORDER BY started_at DESC
  `).all();

  return jobs;
}

// Get completed import jobs
export function getCompletedJobs(limit = 10) {
  const jobs = backtestDb.prepare(`
    SELECT * FROM import_jobs
    WHERE status = 'completed'
    ORDER BY completed_at DESC
    LIMIT ?
  `).all(limit);

  return jobs;
}

// Create import job
export function createImportJob(ticker, startDate, endDate, userId) {
  const jobId = `import_${ticker}_${Date.now()}`;

  backtestDb.prepare(`
    INSERT INTO import_jobs (id, ticker, start_date, end_date, status, initiated_by)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(jobId, ticker, startDate, endDate, userId);

  return jobId;
}

// Update all missing tickers (finds tickers with missing data and imports)
export async function updateAllMissingTickers(userId, onProgress) {
  const tickers = backtestDb.prepare(`
    SELECT ticker, missing_days FROM ticker_import_status
    WHERE missing_days > 0
    ORDER BY ticker ASC
  `).all();

  console.log(`🔄 Found ${tickers.length} tickers with missing data`);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 3); // 3 years back

  const results = [];

  for (const ticker of tickers) {
    const jobId = createImportJob(ticker.ticker, formatDate(startDate), formatDate(endDate), userId);

    backtestDb.prepare(`
      UPDATE import_jobs SET status = 'running' WHERE id = ?
    `).run(jobId);

    const result = await importTickerData(
      ticker.ticker,
      startDate,
      endDate,
      jobId,
      onProgress
    );

    results.push({
      ticker: ticker.ticker,
      ...result
    });
  }

  return results;
}

export default {
  fetchHistoricalOptionsData,
  storeHistoricalData,
  importTickerData,
  getAllTickerStatus,
  getTickerStatus,
  getMissingDates,
  createImportJob,
  getActiveJobs,
  getCompletedJobs,
  updateAllMissingTickers
};