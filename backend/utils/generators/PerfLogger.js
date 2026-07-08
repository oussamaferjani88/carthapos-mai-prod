const fs = require('fs');
const path = require('path');
const { createLogger } = require('../common/logger');

const logger = createLogger('PerfLogger');

class PerfLogger {
  constructor() {
    this.steps = [];
    this.logFilePath = path.join(process.cwd(), 'generation-performance.log');
    this.metricsFilePath = path.join(process.cwd(), 'generation-metrics.json');
    this.generationId = null;
    this.licenseId = null;
    this.clientId = null;
    this.totalStart = null;
    this._logStream = null;
  }

  initGeneration({ generationId, licenseId, clientId }) {
    this.generationId = generationId;
    this.licenseId = licenseId;
    this.clientId = clientId;
    this.steps = [];
    this.totalStart = Date.now();

    const header = `
============================================================
  GENERATION START
  ID:       ${generationId}
  License:  ${licenseId}
  Client:   ${clientId}
  Time:     ${new Date().toISOString()}
============================================================
`;
    this._writeToFile(header);
    logger.info(header.trim());
  }

  _writeToFile(text) {
    try {
      if (!this._logStream) {
        this._logStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
      }
      this._logStream.write(text + '\n');
    } catch (err) {
      // silent - don't let logging break generation
    }
  }

  _formatMs(ms) {
    if (ms >= 60000) {
      const m = Math.floor(ms / 60000);
      const s = Math.round((ms % 60000) / 1000);
      return `${m}m ${s}s`;
    }
    return `${Math.round(ms)} ms`;
  }

  async measure(name, fn) {
    const t0 = performance.now();
    const tsStart = new Date().toISOString();
    try {
      const result = await fn();
      const duration = performance.now() - t0;
      this._record(name, t0, performance.now(), 'OK');
      return result;
    } catch (error) {
      const duration = performance.now() - t0;
      this._record(name, t0, performance.now(), 'FAIL');
      throw error;
    }
  }

  measureSync(name, command, options = {}) {
    const t0 = performance.now();
    const { execSync } = require('child_process');
    const cwd = options.cwd || process.cwd();
    try {
      const stdout = execSync(command, {
        cwd,
        stdio: options.stdio || 'pipe',
        timeout: options.timeout || 600000,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10,
        shell: options.shell || false,
        env: options.env || { ...process.env },
        ...options.execOptions
      });
      this._record(name, t0, performance.now(), 'OK');
      return stdout;
    } catch (error) {
      this._record(name, t0, performance.now(), 'FAIL');
      // Re-throw only if options.throws !== false
      if (options.throws !== false) {
        throw error;
      }
      return '';
    }
  }

  _record(name, t0, t1, status) {
    const durationMs = t1 - t0;
    this.steps.push({
      name,
      durationMs,
      status,
      timestamp: new Date().toISOString()
    });

    const line = `[GENERATION] ${name.padEnd(45)} ${this._formatMs(durationMs).padStart(10)}  ${status}`;
    logger.info(line);
    this._writeToFile(line);
  }

  finishGeneration() {
    const totalMs = Date.now() - this.totalStart;
    const totalLine = `[GENERATION] ${'Total Generation'.padEnd(45)} ${this._formatMs(totalMs).padStart(10)}  OK`;
    logger.info(totalLine);
    this._writeToFile(totalLine);

    // Calculate percentages
    const buildStep = this.steps.find(s => s.name.startsWith('Build'));
    const buildDuration = buildStep ? buildStep.durationMs : 0;

    const footer = `
------------------------------------------------------------
  GENERATION COMPLETE
  ID:       ${this.generationId}
  Total:    ${this._formatMs(totalMs)}
  Steps:    ${this.steps.length}
  Time:     ${new Date().toISOString()}
------------------------------------------------------------
`;
    this._writeToFile(footer);

    // Save generation metrics
    this._saveMetrics(totalMs);

    // Print report
    this._printReport(totalMs);

    // Close log stream
    if (this._logStream) {
      this._logStream.end();
      this._logStream = null;
    }
  }

  _saveMetrics(totalMs) {
    try {
      const metrics = {
        generationId: this.generationId,
        licenseId: this.licenseId,
        clientId: this.clientId,
        startTime: new Date(this.totalStart).toISOString(),
        endTime: new Date().toISOString(),
        totalDurationMs: totalMs,
        totalDurationSec: Math.round(totalMs / 10) / 100,
        steps: this.steps.map(s => ({
          name: s.name,
          durationMs: Math.round(s.durationMs),
          percentage: totalMs > 0 ? Math.round(s.durationMs / totalMs * 10000) / 100 : 0,
          status: s.status
        })),
        timestamp: new Date().toISOString()
      };

      // Append to metrics file
      let allMetrics = [];
      try {
        if (fs.existsSync(this.metricsFilePath)) {
          allMetrics = JSON.parse(fs.readFileSync(this.metricsFilePath, 'utf8'));
        }
      } catch { }
      if (!Array.isArray(allMetrics)) allMetrics = [];
      allMetrics.push(metrics);
      // Keep last 100 entries
      if (allMetrics.length > 100) allMetrics = allMetrics.slice(-100);
      fs.writeFileSync(this.metricsFilePath, JSON.stringify(allMetrics, null, 2));
    } catch (err) {
      logger.warn('Could not save generation metrics:', err.message);
    }
  }

  _printReport(totalMs) {
    if (this.steps.length === 0) return;

    const sorted = [...this.steps].sort((a, b) => b.durationMs - a.durationMs);
    const build80Pct = this._findEightyPercent(sorted, totalMs);
    const buildConsuming = this.steps.filter(s => {
      const pct = totalMs > 0 ? s.durationMs / totalMs : 0;
      return pct > 0.80;
    });

    const report = [];
    report.push('');
    report.push('='.repeat(70));
    report.push('  BUILD PERFORMANCE REPORT');
    report.push('  Generation ID: ' + this.generationId);
    report.push('='.repeat(70));
    report.push('');
    report.push(`  Total Duration: ${this._formatMs(totalMs)} (${Math.round(totalMs / 10) / 100}s)`);
    report.push('');

    // Timing table
    report.push('  --- Full Timing Table ---');
    report.push(`  ${'Step'.padEnd(45)} ${'Duration'.padStart(10)} ${'%'.padStart(7)} ${'Status'}`);
    report.push(`  ${''.padEnd(45)} ${''.padStart(10)} ${''.padStart(7)} ${''.padStart(4)}`);
    for (const st of this.steps) {
      const pct = totalMs > 0 ? (st.durationMs / totalMs * 100).toFixed(1) : '0.0';
      report.push(`  ${st.name.padEnd(45)} ${this._formatMs(st.durationMs).padStart(10)} ${pct.padStart(6)}%  ${st.status}`);
    }
    report.push(`  ${'Total Generation'.padEnd(45)} ${this._formatMs(totalMs).padStart(10)} ${'100.0'.padStart(6)}%  OK`);
    report.push('');

    // Phase percentage breakdown
    report.push('  --- Phase Breakdown (Percentage of Total) ---');
    const phases = this._groupByPhase();
    for (const phase of phases) {
      const bar = '█'.repeat(Math.min(Math.round(phase.percentage / 2), 50));
      report.push(`  ${phase.name.padEnd(25)} ${phase.percentage.toFixed(1).padStart(6)}%  ${bar}`);
    }
    report.push('');

    // Top 10 slowest
    report.push('  --- Top 10 Slowest Operations ---');
    sorted.slice(0, 10).forEach((st, i) => {
      const pct = totalMs > 0 ? (st.durationMs / totalMs * 100).toFixed(1) : '0.0';
      report.push(`  ${(i + 1) + '.'} ${st.name.padEnd(42)} ${this._formatMs(st.durationMs).padStart(10)} (${pct}%)`);
    });
    report.push('');

    // >80% analysis
    report.push('  --- 80% Threshold Analysis ---');
    report.push(`  Steps consuming >80% of total time:`);
    if (buildConsuming.length > 0) {
      for (const st of buildConsuming) {
        const pct = totalMs > 0 ? (st.durationMs / totalMs * 100).toFixed(1) : '0.0';
        report.push(`    🔴 ${st.name} - ${pct}% of total (${this._formatMs(st.durationMs)})`);
      }
    } else {
      // Find cumulative
      let cumulative = 0;
      let count = 0;
      for (const st of sorted) {
        cumulative += st.durationMs;
        count++;
        const pct = totalMs > 0 ? (cumulative / totalMs * 100) : 0;
        if (cumulative >= totalMs * 0.8) {
          report.push(`    Top ${count} steps together consume >80% of total time:`);
          sorted.slice(0, count).forEach(s => {
            const p = totalMs > 0 ? (s.durationMs / totalMs * 100).toFixed(1) : '0.0';
            report.push(`      - ${s.name} (${p}%)`);
          });
          break;
        }
      }
    }
    report.push('');

    // Skippable and repeated operations
    report.push('  --- Skippable Operations Analysis ---');
    const skippablePatterns = [
      'ensurePreloadFile', 'ensureEssentialFiles', 'ensureUIComponents',
      'ensurePostCSSConfig', 'ensureTailwindConfig', 'ensureCSSFiles',
      'ensureElectronStructure', 'fixElectronFiles', 'fixViteConfig',
      'removeUnnecessaryFiles', 'updateAssetReferences',
      'patchDashboardComponent', 'updateHeaderStyles',
      'updateSidebarStyles', 'updateButtonStyles'
    ];
    for (const st of this.steps) {
      const isSkippable = skippablePatterns.some(p => st.name.includes(p));
      if (isSkippable) {
        report.push(`  ⚪ ${st.name} - could be skipped (${this._formatMs(st.durationMs)})`);
      }
    }
    report.push('');

    // Unnecessary repeat detection
    report.push('  --- Repeated Operations ---');
    const nameCounts = {};
    for (const st of this.steps) {
      // Get base name (first part before specifics)
      const base = st.name.split(' - ')[0].split(':')[0].trim();
      nameCounts[base] = (nameCounts[base] || 0) + 1;
    }
    for (const [name, count] of Object.entries(nameCounts)) {
      if (count > 1) {
        report.push(`  🔄 ${name} appears ${count} times`);
      }
    }
    report.push('');

    report.push('='.repeat(70));
    report.push('');

    const reportText = report.join('\n');
    logger.info('\n' + reportText);
    this._writeToFile(reportText);
  }

  _groupByPhase() {
    const phases = {};
    for (const st of this.steps) {
      // Extract phase prefix (everything before first space or colon)
      const phase = st.name.split(/[:\-]/)[0].trim();
      phases[phase] = (phases[phase] || 0) + st.durationMs;
    }
    const total = Object.values(phases).reduce((s, v) => s + v, 0);
    return Object.entries(phases)
      .map(([name, duration]) => ({ name, duration, percentage: total > 0 ? (duration / total * 100) : 0 }))
      .sort((a, b) => b.duration - a.duration);
  }

  _findEightyPercent(sorted, totalMs) {
    const threshold = totalMs * 0.8;
    let cumulative = 0;
    const steps = [];
    for (const st of sorted) {
      cumulative += st.durationMs;
      steps.push(st);
      if (cumulative >= threshold) break;
    }
    return steps;
  }
}

module.exports = new PerfLogger();
