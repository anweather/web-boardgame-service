#!/usr/bin/env node

/**
 * Coverage Enforcement Script
 * Validates that test coverage meets minimum thresholds for TDD approach
 */

const fs = require('fs');
const path = require('path');

// Coverage thresholds - these enforce our TDD requirements
const COVERAGE_THRESHOLDS = {
  global: { lines: 70, functions: 70, branches: 70, statements: 70 },
  framework: { lines: 80, functions: 85, branches: 80, statements: 85 },
  domain: { lines: 80, functions: 80, branches: 80, statements: 80 },
  plugins: { lines: 80, functions: 85, branches: 80, statements: 85 }
};

async function checkCoverage() {
  const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');
  
  if (!fs.existsSync(coveragePath)) {
    console.error('❌ Coverage file not found. Run `npm run test:coverage` first.');
    process.exit(1);
  }

  const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  let failures = [];

  console.log('🔍 Checking test coverage against TDD requirements...\n');

  // Check global coverage
  const globalCoverage = coverage.total;
  console.log('📊 Global Coverage:');
  printCoverageSection(globalCoverage, COVERAGE_THRESHOLDS.global, failures, 'global');

  // Check framework coverage
  const frameworkFiles = Object.keys(coverage).filter(file => 
    file.includes('src/framework/') && file !== 'total'
  );
  
  if (frameworkFiles.length > 0) {
    const frameworkCoverage = aggregateCoverage(coverage, frameworkFiles);
    console.log('\n🔧 Framework Coverage:');
    printCoverageSection(frameworkCoverage, COVERAGE_THRESHOLDS.framework, failures, 'framework');
  }

  // Check domain coverage
  const domainFiles = Object.keys(coverage).filter(file => 
    file.includes('src/domain/') && file !== 'total'
  );
  
  if (domainFiles.length > 0) {
    const domainCoverage = aggregateCoverage(coverage, domainFiles);
    console.log('\n🏗️  Domain Coverage:');
    printCoverageSection(domainCoverage, COVERAGE_THRESHOLDS.domain, failures, 'domain');
  }

  // Check plugin coverage
  const pluginFiles = Object.keys(coverage).filter(file => 
    file.includes('src/plugins/') && file.endsWith('Plugin.js') && file !== 'total'
  );
  
  if (pluginFiles.length > 0) {
    const pluginCoverage = aggregateCoverage(coverage, pluginFiles);
    console.log('\n🔌 Plugin Coverage:');
    printCoverageSection(pluginCoverage, COVERAGE_THRESHOLDS.plugins, failures, 'plugins');
  }

  // Summary
  if (failures.length > 0) {
    console.log('\n❌ Coverage enforcement failed:');
    failures.forEach(failure => console.log(`   ${failure}`));
    console.log('\n💡 TDD Tip: Write tests first, then implement features to improve coverage!');
    process.exit(1);
  } else {
    console.log('\n✅ All coverage thresholds met! TDD approach is working well.');
    process.exit(0);
  }
}

function printCoverageSection(coverage, thresholds, failures, section) {
  const metrics = ['lines', 'functions', 'branches', 'statements'];
  
  metrics.forEach(metric => {
    const actual = coverage[metric].pct;
    const required = thresholds[metric];
    const status = actual >= required ? '✅' : '❌';
    
    console.log(`   ${status} ${metric}: ${actual}% (required: ${required}%)`);
    
    if (actual < required) {
      failures.push(`${section} ${metric} coverage is ${actual}%, needs ${required}%`);
    }
  });
}

function aggregateCoverage(coverage, files) {
  const totals = {
    lines: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    statements: { covered: 0, total: 0 }
  };

  files.forEach(file => {
    const fileCoverage = coverage[file];
    Object.keys(totals).forEach(metric => {
      totals[metric].covered += fileCoverage[metric].covered;
      totals[metric].total += fileCoverage[metric].total;
    });
  });

  const result = {};
  Object.keys(totals).forEach(metric => {
    result[metric] = {
      covered: totals[metric].covered,
      total: totals[metric].total,
      pct: totals[metric].total > 0 ? Math.round((totals[metric].covered / totals[metric].total) * 100) : 0
    };
  });

  return result;
}

if (require.main === module) {
  checkCoverage().catch(error => {
    console.error('❌ Coverage check failed:', error.message);
    process.exit(1);
  });
}

module.exports = { checkCoverage, COVERAGE_THRESHOLDS };