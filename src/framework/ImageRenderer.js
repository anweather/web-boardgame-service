/**
 * Common Image Rendering Framework
 * Provides shared utilities for game plugins to render board images
 */
class ImageRenderer {
  /**
   * Create a basic SVG frame with common styling
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {Object} options - Styling options
   * @returns {string} - SVG opening tags with frame
   */
  static createSVGFrame(width = 400, height = 400, options = {}) {
    const {
      backgroundColor = '#f4f4f4',
      borderColor = '#333333',
      borderWidth = 2,
      title = 'Game Board',
      margin = 10
    } = options;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <title>${title}</title>
  <defs>
    <style>
      .board-frame {
        fill: ${backgroundColor};
        stroke: ${borderColor};
        stroke-width: ${borderWidth};
      }
      .board-text {
        font-family: Arial, sans-serif;
        fill: #333;
      }
      .board-title {
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: bold;
        fill: #333;
        text-anchor: middle;
      }
    </style>
  </defs>
  
  <!-- Background frame -->
  <rect x="0" y="0" width="${width}" height="${height}" class="board-frame"/>
  
  <!-- Content area (plugins render within this) -->
  <g transform="translate(${margin}, ${margin + 20})">`;
  }

  /**
   * Close SVG frame
   * @param {Object} options - Additional options
   * @returns {string} - SVG closing tags
   */
  static closeSVGFrame(options = {}) {
    const { showTimestamp = false, width = 400, height = 400 } = options;
    
    let timestampElement = '';
    if (showTimestamp) {
      const timestamp = new Date().toISOString().split('T')[0]; // Just show date, not full timestamp
      const fontSize = Math.max(8, width * 0.02); // Scale font size with image
      const x = width - 5; // Right-aligned, 5px from edge
      const y = fontSize + 5; // Top of image, below border
      
      timestampElement = `
  <!-- Timestamp -->
  <text x="${x}" y="${y}" class="board-text" text-anchor="end" font-size="${fontSize}" opacity="0.5">${timestamp}</text>`;
    }

    return `  </g>${timestampElement}
</svg>`;
  }

  /**
   * Create a complete SVG document
   * @param {string} content - SVG content to wrap
   * @param {Object} options - Frame options
   * @returns {string} - Complete SVG document
   */
  static wrapSVGContent(content, options = {}) {
    const frame = ImageRenderer.createSVGFrame(
      options.width, 
      options.height, 
      options
    );
    const closing = ImageRenderer.closeSVGFrame(options);
    
    return frame + content + closing;
  }

  /**
   * Add title to SVG
   * @param {string} title - Title text
   * @param {number} x - X position
   * @param {number} y - Y position (default: 15)
   * @returns {string} - SVG title element
   */
  static addTitle(title, x = 200, y = 15) {
    return `<text x="${x}" y="${y}" class="board-title">${title}</text>`;
  }

  /**
   * Add game info text (player names, status, etc.)
   * @param {Array<string>} lines - Array of text lines
   * @param {number} startX - Starting X position
   * @param {number} startY - Starting Y position
   * @returns {string} - SVG text elements
   */
  static addGameInfo(lines = [], startX = 5, startY = 380) {
    return lines.map((line, index) => 
      `<text x="${startX}" y="${startY + (index * 15)}" class="board-text">${line}</text>`
    ).join('\n  ');
  }

  /**
   * Create coordinate labels for board
   * @param {Object} options - Label options
   * @returns {string} - SVG elements for coordinates
   */
  static createCoordinateLabels(options = {}) {
    const {
      files = [], // No default - must be provided by game plugin
      ranks = [], // No default - must be provided by game plugin
      boardSize = 320,
      startX = 40,
      startY = 40,
      fontSize = 10
    } = options;

    // Return empty string if no coordinates provided (game-agnostic)
    if (!files.length || !ranks.length) {
      return '';
    }

    const squareSize = boardSize / Math.max(files.length, ranks.length);
    let labels = '';

    // File labels (bottom)
    files.forEach((file, index) => {
      const x = startX + (index * squareSize) + (squareSize / 2);
      const y = startY + boardSize + 15;
      labels += `<text x="${x}" y="${y}" class="board-text" text-anchor="middle" font-size="${fontSize}">${file}</text>\n  `;
    });

    // Rank labels (left side)
    ranks.forEach((rank, index) => {
      const x = startX - 15;
      const y = startY + (index * squareSize) + (squareSize / 2) + 4;
      labels += `<text x="${x}" y="${y}" class="board-text" text-anchor="middle" font-size="${fontSize}">${rank}</text>\n  `;
    });

    return labels;
  }

  /**
   * Convert SVG to PNG buffer using Sharp
   * @param {string} svgContent - SVG content
   * @param {Object} options - Conversion options
   * @returns {Promise<Buffer>} - PNG buffer
   */
  static async svgToPng(svgContent, options = {}) {
    const sharp = require('sharp');
    
    const {
      width = 400,
      height = 400,
      density = 150
    } = options;

    try {
      const buffer = await sharp(Buffer.from(svgContent), { density })
        .png()
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: false
        })
        .toBuffer();
      
      return buffer;
    } catch (error) {
      throw new Error(`Failed to convert SVG to PNG: ${error.message}`);
    }
  }

  /**
   * Create a simple error image when rendering fails
   * @param {string} errorMessage - Error message to display
   * @param {Object} options - Image options
   * @returns {Promise<Buffer>} - PNG buffer of error image
   */
  static async createErrorImage(errorMessage = 'Rendering Error', options = {}) {
    const {
      width = 400,
      height = 400,
      backgroundColor = '#ffebee',
      textColor = '#c62828'
    } = options;

    const errorSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
  <text x="${width/2}" y="${height/2}" text-anchor="middle" dominant-baseline="middle" 
        font-family="Arial, sans-serif" font-size="16" fill="${textColor}">
    ${errorMessage}
  </text>
  <text x="${width/2}" y="${height/2 + 25}" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, sans-serif" font-size="12" fill="${textColor}" opacity="0.7">
    Unable to render game board
  </text>
</svg>`;

    return this.svgToPng(errorSvg, { width, height });
  }
}

module.exports = ImageRenderer;