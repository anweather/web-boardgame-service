#!/usr/bin/env node

/**
 * Plugin Validation Script
 * Validates all plugins follow architectural constraints
 */

const fs = require('fs');
const path = require('path');

// Add src to require path
const srcPath = path.join(__dirname, '../src');
require.main.paths.unshift(srcPath);

const PluginValidator = require('../src/framework/PluginValidator');

async function validateAllPlugins() {
  const pluginsDir = path.join(__dirname, '../src/plugins');
  
  if (!fs.existsSync(pluginsDir)) {
    console.log('❌ No plugins directory found');
    process.exit(1);
  }

  console.log('🔍 Validating plugin architecture...\n');

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  let totalPlugins = 0;
  let validPlugins = 0;
  let errors = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const gameType = entry.name.toLowerCase();
      const pluginDir = path.join(pluginsDir, entry.name);
      const pluginClassName = entry.name.charAt(0).toUpperCase() + entry.name.slice(1) + 'Plugin';
      const pluginPath = path.join(pluginDir, `${pluginClassName}.js`);
      
      totalPlugins++;
      console.log(`📦 Validating ${gameType} plugin...`);

      try {
        // Validate directory structure
        PluginValidator.validatePluginDirectory(pluginDir, gameType);
        console.log(`  ✓ Directory structure valid`);

        // Validate plugin file
        if (fs.existsSync(pluginPath)) {
          PluginValidator.validatePluginFile(pluginPath, gameType);
          console.log(`  ✓ File structure valid`);

          // Load and validate plugin class
          const PluginClass = require(pluginPath);
          PluginValidator.validatePlugin(PluginClass, gameType);
          console.log(`  ✓ Plugin class valid`);

          validPlugins++;
          console.log(`✅ ${gameType} plugin is valid\n`);
        } else {
          throw new Error(`Plugin file not found: ${pluginPath}`);
        }

      } catch (error) {
        errors.push({ plugin: gameType, error: error.message });
        console.log(`❌ ${gameType} plugin failed validation: ${error.message}\n`);
      }
    }
  }

  // Summary
  console.log('📊 Validation Summary:');
  console.log(`  Total plugins: ${totalPlugins}`);
  console.log(`  Valid plugins: ${validPlugins}`);
  console.log(`  Failed plugins: ${totalPlugins - validPlugins}`);

  if (errors.length > 0) {
    console.log('\n🚨 Validation Errors:');
    errors.forEach(({ plugin, error }) => {
      console.log(`  • ${plugin}: ${error}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All plugins passed validation!');
    process.exit(0);
  }
}

// Run validation
validateAllPlugins().catch(error => {
  console.error('💥 Validation script failed:', error);
  process.exit(1);
});