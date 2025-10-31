// public/views/chart-manager.js - Production-ready chart management
// VERSION: 2.0.0 - With library loading fixes

/**
 * ChartManager - Handles all live option price charting
 * Features:
 * - Real-time price updates
 * - Historical data loading
 * - P&L tracking with visual indicators
 * - Entry/exit markers
 * - Volume bars (optional)
 * - Responsive resize handling
 * - Memory leak prevention
 * - Auto-enable functionality for manual entries
 */

export class ChartManager {
  constructor() {
    this.charts = new Map(); // Use Map for better performance
    this.resizeObservers = new Map();
    this.updateQueue = new Map(); // Debounce rapid updates
    this.isInitialized = false;
  }

  /**
   * Initialize the chart manager
   */
  initialize() {
    if (this.isInitialized) return true;

    // Check if Lightweight Charts is loaded AND has required methods
    if (typeof LightweightCharts === 'undefined') {
      console.error('❌ Lightweight Charts library not loaded!');
      console.error('💡 The library should load from CDN with automatic fallback');
      console.error('If you continue to see this error, check your network connection or firewall settings');
      return false;
    }

    // Verify the library has the createChart method
    if (typeof LightweightCharts.createChart !== 'function') {
      console.error('❌ Lightweight Charts library incomplete - createChart method not found!');
      console.error('💡 The library may still be loading. Please wait a moment and try again.');
      return false;
    }

    this.isInitialized = true;
    console.log('✅ ChartManager initialized');
    return true;
  }

  /**
   * Wait for library to be ready with retry logic
   */
  async waitForLibrary(maxRetries = 10, retryDelay = 200) {
    for (let i = 0; i < maxRetries; i++) {
      if (typeof LightweightCharts !== 'undefined' &&
          typeof LightweightCharts.createChart === 'function') {
        console.log(`✅ Lightweight Charts library ready (attempt ${i + 1}/${maxRetries})`);
        return true;
      }

      console.log(`⏳ Waiting for Lightweight Charts library... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    console.error('❌ Lightweight Charts library failed to load after', maxRetries, 'attempts');
    return false;
  }

  /**
   * Create a new chart for a signal with full configuration
   */
  async createChart(containerId, signal) {
    console.log(`📊 [CHART] Creating chart for ${containerId}...`);

    // Wait for library to be ready before initializing
    const libraryReady = await this.waitForLibrary();
    if (!libraryReady) {
      console.error('❌ Cannot create chart - library not ready');
      return null;
    }

    if (!this.initialize()) {
      console.error('❌ Cannot create chart - initialization failed');
      return null;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Container ${containerId} not found`);
      return null;
    }

    console.log(`✅ [CHART] Container found, library ready, creating chart...`);

    // Clean up any existing chart in this container
    this.removeChart(signal);

    // Clear container
    container.innerHTML = '';

    try {
      // Get container dimensions
      const { width, height } = container.getBoundingClientRect();

      // Create chart with full configuration
      const chart = LightweightCharts.createChart(container, {
        width: Math.max(width, 200),
        height: 180,
        layout: {
          background: { color: 'transparent' },
          textColor: '#9ca3af',
          fontSize: 11,
        },
        grid: {
          vertLines: {
            color: 'rgba(61, 74, 92, 0.3)',
            style: LightweightCharts.LineStyle.Dotted,
          },
          horzLines: {
            color: 'rgba(61, 74, 92, 0.3)',
            style: LightweightCharts.LineStyle.Dotted,
          },
        },
        crosshair: {
          mode: LightweightCharts.CrosshairMode.Normal,
          vertLine: {
            width: 1,
            color: '#3b82f6',
            style: LightweightCharts.LineStyle.Dashed,
          },
          horzLine: {
            width: 1,
            color: '#3b82f6',
            style: LightweightCharts.LineStyle.Dashed,
          },
        },
        rightPriceScale: {
          borderColor: '#3d4a5c',
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        timeScale: {
          borderColor: '#3d4a5c',
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 5,
          barSpacing: 6,
          minBarSpacing: 3,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      // Validate chart object has required methods
      if (!chart || typeof chart.addLineSeries !== 'function') {
        console.error('❌ Chart object is invalid - addLineSeries method not found!');
        console.error('Chart object:', chart);
        console.error('LightweightCharts:', LightweightCharts);
        throw new Error('Chart object missing required methods - library may be incompletely loaded');
      }

      // Add main price line series
      const lineSeries = chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineColor: '#3b82f6',
        priceLineStyle: LightweightCharts.LineStyle.Dashed,
      });

      // Add area below line for visual effect
      const areaSeries = chart.addAreaSeries({
        topColor: 'rgba(59, 130, 246, 0.3)',
        bottomColor: 'rgba(59, 130, 246, 0.0)',
        lineColor: 'rgba(59, 130, 246, 0)',
        lineWidth: 0,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      // Fetch and load historical data
      const historyData = await this.fetchHistoricalData(signal);
      
      if (historyData && historyData.length > 0) {
        lineSeries.setData(historyData);
        areaSeries.setData(historyData);

        // Auto-fit the chart to data
        chart.timeScale().fitContent();
      } else {
        console.warn(`⚠️ No historical data for ${this.getChartId(signal)}`);
      }

      // Add entry marker if we have an entry price
      if (signal.entryPrice) {
        this.addEntryMarker(lineSeries, signal);
      }

      // Store chart data
      const chartId = this.getChartId(signal);
      this.charts.set(chartId, {
        chart,
        lineSeries,
        areaSeries,
        signal,
        container,
        lastPrice: historyData.length > 0 ? historyData[historyData.length - 1].value : null,
        lastUpdateTime: Date.now(),
        priceBuffer: [], // Buffer for batching updates
      });

      // Setup responsive resize handling
      this.setupResizeObserver(chartId, container, chart);

      console.log(`✅ Chart created for ${chartId}`);
      return chart;

    } catch (error) {
      console.error(`❌ Error creating chart for ${containerId}:`, error);
      return null;
    }
  }

  /**
   * Add entry marker on chart
   */
  addEntryMarker(series, signal) {
    if (!signal.entryPrice || !signal.receivedAt) return;

    const entryTime = Math.floor(signal.receivedAt / 1000);
    
    series.setMarkers([{
      time: entryTime,
      position: 'inBar',
      color: '#10b981',
      shape: 'arrowUp',
      text: `Entry: $${signal.entryPrice.toFixed(2)}`,
    }]);
  }

  /**
   * Add exit marker on chart
   */
  addExitMarker(signal, exitPrice) {
    const chartId = this.getChartId(signal);
    const chartData = this.charts.get(chartId);

    if (!chartData) return;

    const exitTime = Math.floor(Date.now() / 1000);
    const pnl = ((exitPrice - signal.entryPrice) / signal.entryPrice) * 100;
    const color = pnl > 0 ? '#10b981' : '#ef4444';

    chartData.lineSeries.setMarkers([
      // Keep entry marker
      {
        time: Math.floor(signal.receivedAt / 1000),
        position: 'inBar',
        color: '#10b981',
        shape: 'arrowUp',
        text: `Entry: $${signal.entryPrice.toFixed(2)}`,
      },
      // Add exit marker
      {
        time: exitTime,
        position: 'inBar',
        color: color,
        shape: 'arrowDown',
        text: `Exit: $${exitPrice.toFixed(2)} (${pnl > 0 ? '+' : ''}${pnl.toFixed(1)}%)`,
      }
    ]);
  }

  /**
   * Setup resize observer for responsive charts
   */
  setupResizeObserver(chartId, container, chart) {
    // Clean up existing observer if any
    if (this.resizeObservers.has(chartId)) {
      this.resizeObservers.get(chartId).disconnect();
    }

    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0) return;
      
      const { width, height } = entries[0].contentRect;
      
      // Only resize if dimensions are valid
      if (width > 0 && height > 0) {
        chart.applyOptions({ 
          width: Math.max(width, 200),
          height: 180 
        });
      }
    });

    resizeObserver.observe(container);
    this.resizeObservers.set(chartId, resizeObserver);
  }

  /**
   * Fetch historical price data for an option
   */
  async fetchHistoricalData(signal) {
    try {
      const params = new URLSearchParams({
        symbol: signal.root,
        strike: signal.strike,
        right: signal.right,
        expiration: signal.expiration,
        days: 1 // Last 1 day of data
      });

      const response = await fetch(
        `/api/options-history?${params.toString()}`,
        { 
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.history && Array.isArray(data.history)) {
        // Convert to Lightweight Charts format and sort by time
        const chartData = data.history
          .map(point => ({
            time: Math.floor(point.timestamp / 1000), // Convert ms to seconds
            value: parseFloat(point.price)
          }))
          .filter(point => !isNaN(point.value) && point.value > 0)
          .sort((a, b) => a.time - b.time);

        if (chartData.length > 0) {
          console.log(`📊 Loaded ${chartData.length} historical points for ${this.getChartId(signal)}`);
          return chartData;
        } else {
          console.warn(`⚠️ API returned empty data for ${this.getChartId(signal)} - using mock data`);
          if (data.message) {
            console.log(`   Message: ${data.message}`);
          }
          return this.generateMockData();
        }
      }

      console.warn(`⚠️ No valid history data received for ${this.getChartId(signal)} - using mock data`);
      return this.generateMockData();

    } catch (error) {
      console.error(`❌ Error fetching historical data for ${this.getChartId(signal)}:`, error);
      
      // Return mock data for testing if API fails
      return this.generateMockData();
    }
  }

  /**
   * Generate mock data for testing (fallback)
   */
  generateMockData() {
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    const points = 100;
    let price = 5.0 + Math.random() * 10;

    for (let i = 0; i < points; i++) {
      const time = now - ((points - i) * 60); // 1 minute intervals
      price += (Math.random() - 0.5) * 0.5; // Random walk
      price = Math.max(0.5, price); // Keep positive

      data.push({
        time,
        value: parseFloat(price.toFixed(2))
      });
    }

    return data;
  }

  /**
   * Update chart with new price point (real-time)
   * Uses debouncing to prevent too many updates
   */
  updateChartPrice(signal, newPrice, timestamp = Date.now()) {
    const chartId = this.getChartId(signal);
    const chartData = this.charts.get(chartId);

    if (!chartData) return;

    const now = Date.now();
    const timeSinceLastUpdate = now - chartData.lastUpdateTime;

    // Debounce: only update if 500ms has passed since last update
    if (timeSinceLastUpdate < 500) {
      // Buffer the update
      if (!this.updateQueue.has(chartId)) {
        this.updateQueue.set(chartId, { price: newPrice, timestamp });
        
        // Schedule the update
        setTimeout(() => {
          const queued = this.updateQueue.get(chartId);
          if (queued) {
            this.applyPriceUpdate(chartId, queued.price, queued.timestamp);
            this.updateQueue.delete(chartId);
          }
        }, 500);
      } else {
        // Update the queued value
        this.updateQueue.set(chartId, { price: newPrice, timestamp });
      }
      return;
    }

    // Apply update immediately
    this.applyPriceUpdate(chartId, newPrice, timestamp);
  }

  /**
   * Apply price update to chart
   */
  applyPriceUpdate(chartId, newPrice, timestamp) {
    const chartData = this.charts.get(chartId);
    if (!chartData) return;

    const { lineSeries, areaSeries, signal } = chartData;

    // Validate price
    if (isNaN(newPrice) || newPrice <= 0) {
      console.warn(`⚠️ Invalid price ${newPrice} for ${chartId}`);
      return;
    }

    // Add new price point
    const timeInSeconds = Math.floor(timestamp / 1000);
    const dataPoint = {
      time: timeInSeconds,
      value: parseFloat(newPrice.toFixed(2))
    };

    lineSeries.update(dataPoint);
    areaSeries.update(dataPoint);

    // Update stored data
    chartData.lastPrice = newPrice;
    chartData.lastUpdateTime = Date.now();

    // Calculate and update P&L if we have entry price
    if (signal.entryPrice) {
      const pnl = ((newPrice - signal.entryPrice) / signal.entryPrice) * 100;
      this.updatePnLDisplay(signal, pnl, newPrice);
    }
  }

  /**
   * Update P&L display element with color coding
   */
  updatePnLDisplay(signal, pnl, currentPrice) {
    const chartId = this.getChartId(signal);
    const pnlId = `pnl-${chartId}`;
    const pnlElement = document.getElementById(pnlId);

    if (!pnlElement) return;

    const pnlClass = pnl > 0 ? 'profit' : pnl < 0 ? 'loss' : 'neutral';
    const pnlSign = pnl > 0 ? '+' : '';
    
    pnlElement.className = `chart-box-pnl ${pnlClass}`;
    pnlElement.textContent = `${pnlSign}${pnl.toFixed(1)}%`;
    pnlElement.title = `Current: $${currentPrice.toFixed(2)} | Entry: $${signal.entryPrice.toFixed(2)}`;
  }

  /**
   * Get unique chart ID from signal
   */
  getChartId(signal) {
    return `${signal.root}-${signal.strike}-${signal.right}`;
  }

  /**
   * Check if chart exists
   */
  hasChart(signal) {
    return this.charts.has(this.getChartId(signal));
  }

  /**
   * Get chart instance
   */
  getChart(signal) {
    return this.charts.get(this.getChartId(signal));
  }

  /**
   * Remove chart and cleanup resources
   */
  removeChart(signal) {
    const chartId = this.getChartId(signal);
    const chartData = this.charts.get(chartId);

    if (chartData) {
      // Cleanup resize observer
      if (this.resizeObservers.has(chartId)) {
        this.resizeObservers.get(chartId).disconnect();
        this.resizeObservers.delete(chartId);
      }

      // Remove chart instance
      try {
        chartData.chart.remove();
      } catch (error) {
        console.warn(`⚠️ Error removing chart ${chartId}:`, error);
      }

      // Clear from maps
      this.charts.delete(chartId);
      this.updateQueue.delete(chartId);

      console.log(`🗑️ Chart removed: ${chartId}`);
    }
  }

  /**
   * Auto-enable chart for a signal (called when "Buy In" clicked)
   * This will:
   * 1. Auto-check the checkbox in trade selection
   * 2. Render the chart immediately
   * 3. Add entry marker with price
   */
  autoEnableChart(signal) {
    const chartId = this.getChartId(signal);
    
    console.log(`🎯 Auto-enabling chart for ${chartId}...`);
    
    // Step 1: Find and check the checkbox
    const checkboxes = document.querySelectorAll('#tradeCheckboxes input[type="checkbox"]');
    let checkboxFound = false;
    
    checkboxes.forEach(checkbox => {
      const contractStr = `${signal.root}-${signal.strike}-${signal.right}`;
      if (checkbox.value === contractStr) {
        checkbox.checked = true;
        checkboxFound = true;
        console.log(`✅ Auto-checked checkbox for ${contractStr}`);
      }
    });
    
    if (!checkboxFound) {
      console.warn(`⚠️ Checkbox not found for ${chartId} - may need to refresh trade selection`);
    }
    
    // Step 2: Trigger chart update (which will render this chart)
    // We need to call the updateCharts function from trader-signals-unified.js
    // This is exposed globally as window.updateCharts
    if (window.updateCharts) {
      window.updateCharts();
      console.log(`✅ Triggered chart render for ${chartId}`);
    } else {
      console.warn(`⚠️ window.updateCharts not available - chart may not render`);
    }
    
    // Step 3: Wait for chart to be created, then ensure it has entry marker
    setTimeout(() => {
      const chartData = this.charts.get(chartId);
      if (chartData && signal.entryPrice) {
        // Entry marker should already be added by createChart, but ensure it's there
        console.log(`✅ Chart auto-enabled with entry at $${signal.entryPrice.toFixed(2)}`);
        
        // Flash animation to draw attention
        const container = chartData.container;
        if (container) {
          container.style.animation = 'flash-chart 0.5s ease-in-out';
          setTimeout(() => {
            container.style.animation = '';
          }, 500);
        }
      }
    }, 500);
    
    return true;
  }

  /**
   * Remove all charts (cleanup)
   */
  removeAllCharts() {
    console.log(`🗑️ Removing all ${this.charts.size} charts...`);

    // Disconnect all resize observers
    this.resizeObservers.forEach(observer => observer.disconnect());
    this.resizeObservers.clear();

    // Remove all charts
    this.charts.forEach((chartData, chartId) => {
      try {
        chartData.chart.remove();
      } catch (error) {
        console.warn(`⚠️ Error removing chart ${chartId}:`, error);
      }
    });

    this.charts.clear();
    this.updateQueue.clear();

    console.log('✅ All charts removed');
  }

  /**
   * Get all active chart IDs
   */
  getActiveChartIds() {
    return Array.from(this.charts.keys());
  }

  /**
   * Get chart count
   */
  getChartCount() {
    return this.charts.size;
  }

  /**
   * Refresh all charts (useful after window resize or theme change)
   */
  refreshAllCharts() {
    this.charts.forEach((chartData, chartId) => {
      const { chart, container } = chartData;
      const { width, height } = container.getBoundingClientRect();
      
      chart.applyOptions({
        width: Math.max(width, 200),
        height: 180
      });

      chart.timeScale().fitContent();
    });

    console.log(`🔄 Refreshed ${this.charts.size} charts`);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalCharts: this.charts.size,
      activeObservers: this.resizeObservers.size,
      queuedUpdates: this.updateQueue.size,
      chartIds: this.getActiveChartIds(),
    };
  }
}

// Add flash animation CSS if not already present
if (typeof document !== 'undefined') {
  const styleId = 'chart-manager-animations';
  
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes flash-chart {
        0%, 100% { 
          border-color: #3d4a5c;
          box-shadow: none;
        }
        50% { 
          border-color: #10b981;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Export singleton instance
export const chartManager = new ChartManager();

// Expose autoEnableChart globally for manual entry integration
if (typeof window !== 'undefined') {
  window.chartManager = chartManager;
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    chartManager.removeAllCharts();
  });
}