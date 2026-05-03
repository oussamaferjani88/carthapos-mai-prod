/**
 * Unit Tests for FilePatcher
 */

const { describe, it, beforeEach, afterEach, expect, jest } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const { FilePatcher } = require('../../backend/utils/generators/FilePatcher');

describe('FilePatcher', () => {
  let patcher;
  let mockLogger;
  let originalExistsSync;
  let originalReadFileSync;
  let originalWriteFileSync;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Store original fs methods
    originalExistsSync = fs.existsSync;
    originalReadFileSync = fs.readFileSync;
    originalWriteFileSync = fs.writeFileSync;

    patcher = new FilePatcher(mockLogger);
  });

  afterEach(() => {
    // Restore original fs methods
    fs.existsSync = originalExistsSync;
    fs.readFileSync = originalReadFileSync;
    fs.writeFileSync = originalWriteFileSync;
  });

  describe('constructor', () => {
    it('should initialize with logger', () => {
      expect(patcher.logger).toBe(mockLogger);
    });

    it('should create logger if none provided', () => {
      const patcherWithoutLogger = new FilePatcher();
      expect(patcherWithoutLogger.logger).toBeDefined();
    });
  });

  describe('patchFile', () => {
    const testFilePath = '/test/file.js';
    const mockContent = `
import React from 'react';

function App() {
  return <div>Hello World</div>;
}

export default App;
`;

    beforeEach(() => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(mockContent);
      fs.writeFileSync = jest.fn();
    });

    it('should patch file with simple string replacement', () => {
      const patches = [{
        search: 'Hello World',
        replace: 'Hello POS System'
      }];

      patcher.patchFile(testFilePath, patches);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('Hello POS System'),
        'utf8'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Applied 1 patches to ${testFilePath}`
      );
    });

    it('should patch file with regex replacement', () => {
      const patches = [{
        search: /function\s+(\w+)/g,
        replace: 'const $1 = () =>'
      }];

      patcher.patchFile(testFilePath, patches);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('const App = () =>'),
        'utf8'
      );
    });

    it('should apply multiple patches in order', () => {
      const patches = [
        {
          search: 'Hello World',
          replace: 'Hello POS'
        },
        {
          search: 'Hello POS',
          replace: 'Hello Advanced POS'
        }
      ];

      patcher.patchFile(testFilePath, patches);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('Hello Advanced POS'),
        'utf8'
      );
    });

    it('should handle patches with conditions', () => {
      const patches = [{
        search: 'Hello World',
        replace: 'Hello POS',
        condition: (content) => content.includes('React')
      }];

      patcher.patchFile(testFilePath, patches);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('Hello POS'),
        'utf8'
      );
    });

    it('should skip patches when condition is false', () => {
      const patches = [{
        search: 'Hello World',
        replace: 'Hello POS',
        condition: (content) => content.includes('Vue')
      }];

      patcher.patchFile(testFilePath, patches);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        testFilePath,
        expect.stringContaining('Hello World'),
        'utf8'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Applied 0 patches to ${testFilePath}`
      );
    });

    it('should handle file not found error', () => {
      fs.existsSync = jest.fn().mockReturnValue(false);

      expect(() => {
        patcher.patchFile(testFilePath, []);
      }).toThrow(`File not found: ${testFilePath}`);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle read errors gracefully', () => {
      fs.readFileSync = jest.fn(() => {
        throw new Error('Read failed');
      });

      expect(() => {
        patcher.patchFile(testFilePath, []);
      }).toThrow('Failed to patch file /test/file.js: Read failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle write errors gracefully', () => {
      fs.writeFileSync = jest.fn(() => {
        throw new Error('Write failed');
      });

      const patches = [{
        search: 'Hello World',
        replace: 'Hello POS'
      }];

      expect(() => {
        patcher.patchFile(testFilePath, patches);
      }).toThrow('Failed to patch file /test/file.js: Write failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('patchMultipleFiles', () => {
    const filePatchMap = {
      '/test/file1.js': [{
        search: 'Hello',
        replace: 'Hi'
      }],
      '/test/file2.js': [{
        search: 'World',
        replace: 'Universe'
      }]
    };

    beforeEach(() => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn()
        .mockReturnValueOnce('Hello there')
        .mockReturnValueOnce('World peace');
      fs.writeFileSync = jest.fn();
    });

    it('should patch multiple files', () => {
      patcher.patchMultipleFiles(filePatchMap);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).toHaveBeenNthCalledWith(
        1,
        '/test/file1.js',
        'Hi there',
        'utf8'
      );
      expect(fs.writeFileSync).toHaveBeenNthCalledWith(
        2,
        '/test/file2.js',
        'Universe peace',
        'utf8'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully patched 2 files'
      );
    });

    it('should continue patching other files if one fails', () => {
      fs.readFileSync = jest.fn()
        .mockImplementationOnce(() => { throw new Error('Read failed'); })
        .mockReturnValueOnce('World peace');

      patcher.patchMultipleFiles(filePatchMap);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/test/file2.js',
        'Universe peace',
        'utf8'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to patch /test/file1.js',
        expect.any(Error)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully patched 1 files'
      );
    });
  });

  describe('createPatch', () => {
    it('should create simple string patch', () => {
      const patch = patcher.createPatch('old text', 'new text');

      expect(patch).toEqual({
        search: 'old text',
        replace: 'new text'
      });
    });

    it('should create patch with condition', () => {
      const condition = (content) => content.includes('test');
      const patch = patcher.createPatch('old', 'new', condition);

      expect(patch).toEqual({
        search: 'old',
        replace: 'new',
        condition: condition
      });
    });
  });

  describe('createRegexPatch', () => {
    it('should create regex patch', () => {
      const patch = patcher.createRegexPatch(/test\s+(\w+)/g, 'TEST $1');

      expect(patch).toEqual({
        search: /test\s+(\w+)/g,
        replace: 'TEST $1'
      });
    });

    it('should create regex patch with condition', () => {
      const condition = (content) => content.includes('test');
      const patch = patcher.createRegexPatch(/test/g, 'TEST', condition);

      expect(patch).toEqual({
        search: /test/g,
        replace: 'TEST',
        condition: condition
      });
    });
  });

  describe('validatePatch', () => {
    it('should return true for valid patch', () => {
      const validPatch = {
        search: 'old',
        replace: 'new'
      };

      const result = patcher.validatePatch(validPatch);

      expect(result).toBe(true);
    });

    it('should return false for patch missing search', () => {
      const invalidPatch = {
        replace: 'new'
      };

      const result = patcher.validatePatch(invalidPatch);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid patch: missing search property'
      );
    });

    it('should return false for patch missing replace', () => {
      const invalidPatch = {
        search: 'old'
      };

      const result = patcher.validatePatch(invalidPatch);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid patch: missing replace property'
      );
    });

    it('should return false for patch with invalid condition', () => {
      const invalidPatch = {
        search: 'old',
        replace: 'new',
        condition: 'not a function'
      };

      const result = patcher.validatePatch(invalidPatch);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid patch: condition must be a function'
      );
    });
  });

  describe('dryRun', () => {
    const testFilePath = '/test/file.js';
    const mockContent = 'Hello World from React';

    beforeEach(() => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(mockContent);
      fs.writeFileSync = jest.fn();
    });

    it('should perform dry run without writing files', () => {
      const patches = [{
        search: 'Hello World',
        replace: 'Hello POS'
      }];

      const result = patcher.dryRun(testFilePath, patches);

      expect(result.originalContent).toBe(mockContent);
      expect(result.patchedContent).toBe('Hello POS from React');
      expect(result.patchesApplied).toBe(1);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Dry run completed for ${testFilePath}: 1 patches would be applied`
      );
    });

    it('should handle dry run with no applicable patches', () => {
      const patches = [{
        search: 'Vue',
        replace: 'React'
      }];

      const result = patcher.dryRun(testFilePath, patches);

      expect(result.originalContent).toBe(mockContent);
      expect(result.patchedContent).toBe(mockContent);
      expect(result.patchesApplied).toBe(0);
    });
  });
});

module.exports = {};
