#!/usr/bin/env node
/**
 * Coverage Merge Script
 *
 * Merges coverage reports from multiple test shards into a single unified report.
 * This is used in parallel CI/CD execution to combine coverage from all shards.
 *
 * Usage:
 *   node scripts/merge-coverage.js
 *
 * Environment Variables:
 *   COVERAGE_DIR - Base coverage directory (default: ./coverage/The-Garrison-System)
 *   SHARD_PATTERN - Pattern to match shard directories (default: shard-*)
 *   OUTPUT_DIR - Output directory for merged coverage (default: ./coverage/merged)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const COVERAGE_DIR = process.env.COVERAGE_DIR || './coverage/The-Garrison-System';
const SHARD_PATTERN = process.env.SHARD_PATTERN || 'shard-*';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './coverage/merged';
const FINAL_DIR = process.env.FINAL_DIR || './coverage/final';

console.log('📊 Coverage Merge Script');
console.log('========================\n');

/**
 * Check if a directory exists
 */
function directoryExists(dir) {
  try {
    return fs.statSync(dir).isDirectory();
  } catch (e) {
    return false;
  }
}

/**
 * Find all shard directories
 */
function findShardDirectories() {
  console.log(`🔍 Searching for shard directories in: ${COVERAGE_DIR}`);

  if (!directoryExists(COVERAGE_DIR)) {
    console.error(`❌ Coverage directory not found: ${COVERAGE_DIR}`);
    console.error(`   Tried: ${path.resolve(COVERAGE_DIR)}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(COVERAGE_DIR);
  const shardDirs = entries
    .filter(entry => entry.startsWith('shard-'))
    .map(entry => path.join(COVERAGE_DIR, entry))
    .filter(dir => directoryExists(dir));

  console.log(`✅ Found ${shardDirs.length} shard directories:`);
  shardDirs.forEach(dir => console.log(`   - ${path.basename(dir)}`));
  console.log('');

  return shardDirs;
}

/**
 * Check for required coverage files in shard directories
 */
function validateShardCoverage(shardDirs) {
  console.log('🔍 Validating shard coverage files...');

  const validShards = [];

  for (const shardDir of shardDirs) {
    const coverageFile = path.join(shardDir, 'coverage-final.json');

    if (fs.existsSync(coverageFile)) {
      console.log(`   ✅ ${path.basename(shardDir)}: coverage-final.json found`);
      validShards.push(shardDir);
    } else {
      console.log(`   ⚠️  ${path.basename(shardDir)}: coverage-final.json NOT found`);
    }
  }

  console.log('');
  return validShards;
}

/**
 * Create output directory
 */
function createOutputDirectory() {
  console.log(`📁 Creating output directory: ${OUTPUT_DIR}`);

  if (!directoryExists(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('   ✅ Directory created\n');
  } else {
    console.log('   ℹ️  Directory already exists\n');
  }
}

/**
 * Merge coverage files using nyc
 */
function mergeCoverageFiles(shardDirs) {
  console.log('🔄 Merging coverage files...');

  // Ensure nyc is installed
  try {
    execSync('npm list -g nyc', { stdio: 'ignore' });
  } catch (e) {
    console.log('   📦 Installing nyc globally...');
    try {
      execSync('npm install -g nyc', { stdio: 'inherit' });
    } catch (installError) {
      console.error('   ❌ Failed to install nyc');
      console.error('   Please run: npm install -g nyc');
      process.exit(1);
    }
  }

  // Copy all coverage-final.json files to output directory
  console.log('   📋 Copying coverage files...');
  shardDirs.forEach((shardDir, index) => {
    const sourceFile = path.join(shardDir, 'coverage-final.json');
    const destFile = path.join(OUTPUT_DIR, `coverage-shard-${index + 1}.json`);

    fs.copyFileSync(sourceFile, destFile);
    console.log(`      - Copied ${path.basename(shardDir)}/coverage-final.json`);
  });

  console.log('\n   🔄 Merging coverage data...');

  try {
    // Merge all coverage files
    const mergeCommand = `nyc merge ${OUTPUT_DIR} ${OUTPUT_DIR}/coverage.json`;
    execSync(mergeCommand, { stdio: 'inherit' });
    console.log('   ✅ Coverage files merged successfully\n');
  } catch (error) {
    console.error('   ❌ Failed to merge coverage files');
    throw error;
  }
}

/**
 * Generate merged coverage reports
 */
function generateReports() {
  console.log('📈 Generating coverage reports...');

  // Create final directory
  if (!directoryExists(FINAL_DIR)) {
    fs.mkdirSync(FINAL_DIR, { recursive: true });
  }

  try {
    const reportCommand = `nyc report --reporter=lcov --reporter=text --reporter=html --reporter=json --temp-dir=${OUTPUT_DIR} --report-dir=${FINAL_DIR}`;
    execSync(reportCommand, { stdio: 'inherit' });
    console.log('\n   ✅ Coverage reports generated successfully\n');
  } catch (error) {
    console.error('   ❌ Failed to generate coverage reports');
    throw error;
  }
}

/**
 * Display coverage summary
 */
function displaySummary() {
  console.log('📊 Coverage Summary');
  console.log('==================\n');

  const lcovFile = path.join(FINAL_DIR, 'lcov.info');

  if (fs.existsSync(lcovFile)) {
    console.log(`✅ Merged coverage report available at:`);
    console.log(`   - HTML: ${FINAL_DIR}/index.html`);
    console.log(`   - LCOV: ${FINAL_DIR}/lcov.info`);
    console.log(`   - JSON: ${FINAL_DIR}/coverage-final.json\n`);
  } else {
    console.log('⚠️  Coverage files generated but lcov.info not found\n');
  }
}

/**
 * Main execution
 */
function main() {
  try {
    const shardDirs = findShardDirectories();

    if (shardDirs.length === 0) {
      console.log('⚠️  No shard directories found. Nothing to merge.');
      console.log('   This is normal if tests ran without sharding.\n');
      process.exit(0);
    }

    const validShards = validateShardCoverage(shardDirs);

    if (validShards.length === 0) {
      console.error('❌ No valid coverage files found in shard directories');
      process.exit(1);
    }

    createOutputDirectory();
    mergeCoverageFiles(validShards);
    generateReports();
    displaySummary();

    console.log('✨ Coverage merge completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Coverage merge failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
