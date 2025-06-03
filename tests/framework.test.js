/**
 * Framework Module Unit Tests
 * Tests for src/framework/ modules to achieve >80% coverage
 */

const ImageRenderer = require('../src/framework/ImageRenderer');
const PluginValidator = require('../src/framework/PluginValidator');
const GamePlugin = require('../src/ports/GamePlugin');
const path = require('path');
const fs = require('fs');

describe('Framework Module Tests', () => {
  describe('ImageRenderer', () => {
    describe('SVG Frame Creation', () => {
      test('should create basic SVG frame with default options', () => {
        const svg = ImageRenderer.createSVGFrame(400, 400);
        
        expect(svg).toContain('<svg');
        expect(svg).toContain('width="400"');
        expect(svg).toContain('height="400"');
        expect(svg).toContain('viewBox="0 0 400 400"');
      });

      test('should create SVG frame with custom options', () => {
        const options = {
          title: 'Test Board',
          backgroundColor: '#ff0000',
          borderColor: '#00ff00',
          borderWidth: 5,
          margin: 20
        };
        
        const svg = ImageRenderer.createSVGFrame(600, 600, options);
        
        expect(svg).toContain('Test Board');
        expect(svg).toContain('#ff0000');
        expect(svg).toContain('#00ff00');
        expect(svg).toContain('stroke-width="5"');
      });

      test('should handle missing options gracefully', () => {
        const svg = ImageRenderer.createSVGFrame(300, 300, {});
        
        expect(svg).toContain('<svg');
        expect(svg).toContain('width="300"');
        expect(svg).toContain('height="300"');
      });
    });

    describe('Coordinate Labels', () => {
      test('should create coordinate labels with default settings', () => {
        const options = {
          files: ['a', 'b', 'c'],
          ranks: ['3', '2', '1'],
          boardSize: 300,
          startX: 50,
          startY: 50,
          fontSize: 16
        };
        
        const labels = ImageRenderer.createCoordinateLabels(options);
        
        expect(labels).toContain('text');
        expect(labels).toContain('a');
        expect(labels).toContain('b');
        expect(labels).toContain('c');
        expect(labels).toContain('1');
        expect(labels).toContain('2');
        expect(labels).toContain('3');
      });

      test('should handle empty files and ranks', () => {
        const options = {
          files: [],
          ranks: [],
          boardSize: 300,
          startX: 50,
          startY: 50,
          fontSize: 16
        };
        
        const labels = ImageRenderer.createCoordinateLabels(options);
        
        expect(labels).toBe('');
      });

      test('should calculate positions correctly', () => {
        const options = {
          files: ['a', 'b'],
          ranks: ['2', '1'],
          boardSize: 200,
          startX: 0,
          startY: 0,
          fontSize: 12
        };
        
        const labels = ImageRenderer.createCoordinateLabels(options);
        
        // Should contain positions based on board size
        expect(labels).toContain('x="50"'); // First file position
        expect(labels).toContain('x="150"'); // Second file position
      });
    });

    describe('Game Info Display', () => {
      test('should create game info elements from array', () => {
        const info = ['Move: 5', 'Turn: White', 'Status: Active'];
        const elements = ImageRenderer.addGameInfo(info, 10, 100);
        
        expect(elements).toContain('Move: 5');
        expect(elements).toContain('Turn: White');
        expect(elements).toContain('Status: Active');
        expect(elements).toContain('y="100"');
        expect(elements).toContain('y="115"');
        expect(elements).toContain('y="130"');
      });

      test('should handle empty info array', () => {
        const elements = ImageRenderer.addGameInfo([], 10, 100);
        
        expect(elements).toBe('');
      });

      test('should handle single info item', () => {
        const info = ['Single Item'];
        const elements = ImageRenderer.addGameInfo(info, 20, 200);
        
        expect(elements).toContain('Single Item');
        expect(elements).toContain('x="20"');
        expect(elements).toContain('y="200"');
      });
    });

    describe('SVG Frame Closing', () => {
      test('should close SVG frame without timestamp', () => {
        const closing = ImageRenderer.closeSVGFrame({
          showTimestamp: false,
          width: 400,
          height: 400
        });
        
        expect(closing).toContain('</svg>');
        expect(closing).not.toContain(new Date().getFullYear().toString());
      });

      test('should close SVG frame with timestamp', () => {
        const closing = ImageRenderer.closeSVGFrame({
          showTimestamp: true,
          width: 800,
          height: 800
        });
        
        expect(closing).toContain('</svg>');
        expect(closing).toContain(new Date().getFullYear().toString());
        expect(closing).toContain('font-size="16"'); // Scaled font
      });

      test('should handle default options', () => {
        const closing = ImageRenderer.closeSVGFrame();
        
        expect(closing).toContain('</svg>');
      });
    });

    describe('PNG Conversion', () => {
      test('should convert simple SVG to PNG', async () => {
        const svg = '<svg width="100" height="100"><rect width="100" height="100" fill="red"/></svg>';
        
        const pngBuffer = await ImageRenderer.svgToPng(svg, {
          width: 100,
          height: 100
        });
        
        expect(Buffer.isBuffer(pngBuffer)).toBe(true);
        expect(pngBuffer.length).toBeGreaterThan(100);
      });

      test('should handle SVG conversion options', async () => {
        const svg = '<svg width="200" height="200"><circle cx="100" cy="100" r="50" fill="blue"/></svg>';
        
        const pngBuffer = await ImageRenderer.svgToPng(svg, {
          width: 200,
          height: 200,
          density: 150
        });
        
        expect(Buffer.isBuffer(pngBuffer)).toBe(true);
        expect(pngBuffer.length).toBeGreaterThan(100);
      });

      test('should handle invalid SVG gracefully', async () => {
        const invalidSvg = 'not valid svg';
        
        await expect(ImageRenderer.svgToPng(invalidSvg, {}))
          .rejects
          .toThrow();
      });
    });

    describe('Error Image Creation', () => {
      test('should create error image with message', async () => {
        const errorBuffer = await ImageRenderer.createErrorImage('Test Error', {
          width: 300,
          height: 300
        });
        
        expect(Buffer.isBuffer(errorBuffer)).toBe(true);
        expect(errorBuffer.length).toBeGreaterThan(100);
      });

      test('should create error image with default options', async () => {
        const errorBuffer = await ImageRenderer.createErrorImage('Default Error');
        
        expect(Buffer.isBuffer(errorBuffer)).toBe(true);
        expect(errorBuffer.length).toBeGreaterThan(100);
      });
    });
  });

  describe('PluginValidator', () => {
    // Create a mock plugin for testing
    class MockValidPlugin extends GamePlugin {
      static getMetadata() {
        return {
          name: 'Mock Game',
          description: 'A mock game for testing',
          minPlayers: 2,
          maxPlayers: 4
        };
      }

      getGameType() { return 'mock'; }
      getDisplayName() { return 'Mock Game'; }
      getDescription() { return 'Mock description'; }
      getMinPlayers() { return 2; }
      getMaxPlayers() { return 4; }
      getInitialBoardState() { return {}; }
      validateMove() { return { valid: true }; }
      applyMove() { return {}; }
      isGameComplete() { return false; }
      getWinner() { return null; }
      getNextPlayer() { return 'player1'; }
      getAvailableColors() { return ['red', 'blue']; }
      assignPlayerColor() { return 'red'; }
      validateBoardState() { return true; }
      getRenderData() { return {}; }
      getGameStats() { return {}; }
    }

    class MockInvalidPlugin {
      // Missing required methods
    }

    describe('Plugin Class Validation', () => {
      test('should validate correct plugin class', () => {
        expect(() => {
          PluginValidator.validatePluginClass(MockValidPlugin, 'mock');
        }).not.toThrow();
      });

      test('should reject plugin not extending GamePlugin', () => {
        expect(() => {
          PluginValidator.validatePluginClass(MockInvalidPlugin, 'invalid');
        }).toThrow('must extend GamePlugin');
      });

      test('should reject plugin missing required methods', () => {
        class IncompletePlugin extends GamePlugin {
          // Missing some required methods
        }

        expect(() => {
          PluginValidator.validatePluginClass(IncompletePlugin, 'incomplete');
        }).toThrow();
      });
    });

    describe('Plugin Metadata Validation', () => {
      test('should validate correct metadata', () => {
        expect(() => {
          PluginValidator.validatePluginMetadata(MockValidPlugin, 'mock');
        }).not.toThrow();
      });

      test('should reject plugin missing getMetadata', () => {
        class NoMetadataPlugin extends GamePlugin {
          // Missing getMetadata static method
        }

        expect(() => {
          PluginValidator.validatePluginMetadata(NoMetadataPlugin, 'nometadata');
        }).toThrow();
      });

      test('should reject plugin with invalid metadata', () => {
        class BadMetadataPlugin extends GamePlugin {
          static getMetadata() {
            return {}; // Missing required fields
          }
        }

        expect(() => {
          PluginValidator.validatePluginMetadata(BadMetadataPlugin, 'badmetadata');
        }).toThrow();
      });
    });

    describe('Full Plugin Validation', () => {
      test('should validate complete valid plugin', () => {
        expect(() => {
          PluginValidator.validatePlugin(MockValidPlugin, 'mock');
        }).not.toThrow();
      });

      test('should reject invalid plugin', () => {
        expect(() => {
          PluginValidator.validatePlugin(MockInvalidPlugin, 'invalid');
        }).toThrow();
      });
    });

    describe('Plugin Directory Validation', () => {
      test('should handle non-existent directory', () => {
        expect(() => {
          PluginValidator.validatePluginDirectory('/non/existent/path', 'test');
        }).toThrow('Plugin directory not found');
      });

      test('should validate existing directory structure', () => {
        // Use the actual checkers plugin directory for testing
        const checkersDir = path.join(__dirname, '../src/plugins/checkers');
        
        if (fs.existsSync(checkersDir)) {
          expect(() => {
            PluginValidator.validatePluginDirectory(checkersDir, 'checkers');
          }).not.toThrow();
        }
      });
    });

    describe('Plugin File Validation', () => {
      test('should handle non-existent plugin file', () => {
        expect(() => {
          PluginValidator.validatePluginFile('/non/existent/plugin.js', 'test');
        }).toThrow('Plugin file not found');
      });

      test('should validate existing plugin file', () => {
        // Use the actual checkers plugin file for testing
        const checkersFile = path.join(__dirname, '../src/plugins/checkers/CheckersPlugin.js');
        
        if (fs.existsSync(checkersFile)) {
          expect(() => {
            PluginValidator.validatePluginFile(checkersFile, 'checkers');
          }).not.toThrow();
        }
      });
    });

    describe('Required Methods Validation', () => {
      test('should identify missing required methods', () => {
        class PartialPlugin extends GamePlugin {
          getGameType() { return 'partial'; }
          // Missing other required methods
        }

        const missingMethods = PluginValidator.validateRequiredMethods(PartialPlugin.prototype);
        
        expect(missingMethods.length).toBeGreaterThan(0);
        expect(missingMethods).toContain('getDisplayName');
        expect(missingMethods).toContain('validateMove');
      });

      test('should return empty array for complete plugin', () => {
        const missingMethods = PluginValidator.validateRequiredMethods(MockValidPlugin.prototype);
        
        expect(missingMethods).toEqual([]);
      });
    });

    describe('Metadata Field Validation', () => {
      test('should validate complete metadata', () => {
        const metadata = {
          name: 'Test Game',
          description: 'Test description',
          minPlayers: 2,
          maxPlayers: 4
        };

        const missingFields = PluginValidator.validateMetadataFields(metadata);
        
        expect(missingFields).toEqual([]);
      });

      test('should identify missing metadata fields', () => {
        const incompleteMetadata = {
          name: 'Test Game'
          // Missing other required fields
        };

        const missingFields = PluginValidator.validateMetadataFields(incompleteMetadata);
        
        expect(missingFields.length).toBeGreaterThan(0);
        expect(missingFields).toContain('description');
        expect(missingFields).toContain('minPlayers');
        expect(missingFields).toContain('maxPlayers');
      });
    });
  });
});