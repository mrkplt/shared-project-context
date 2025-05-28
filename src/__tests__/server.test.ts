import { MCPServer } from '../server';
import { ContextUpdate } from '../types';

describe('MCP Context Server', () => {
  let server: MCPServer;
  const testProjectId = 'test-project';

  beforeEach(() => {
    server = new MCPServer();
  });

  afterEach(async () => {
    // Clean up test data
    await server.resetTestData?.();
  });

  describe('getContext', () => {
    it('should return template for new project', async () => {
      const result = await server.getContext(testProjectId, 'mental_model');
      expect(result.content).toMatch(/^# Project Mental Model/);
      expect(result.lastModified).toBeInstanceOf(Date);
    });

    it('should return existing context for known project', async () => {
      // First set some context
      await server.updateContext({
        projectId: testProjectId,
        fileType: 'mental_model',
        content: '# Test Content\n\n## Section\nTest section content'
      });

      const result = await server.getContext(testProjectId, 'mental_model');
      expect(result.content).toContain('# Test Content');
      expect(result.lastModified).toBeInstanceOf(Date);
    });
  });

  describe('updateContext', () => {
    it('should update valid context', async () => {
      const update: ContextUpdate = {
        projectId: testProjectId,
        fileType: 'mental_model',
        content: '# Updated Content\n\n## Overview\nTest content'
      };

      const result = await server.updateContext(update);
      expect(result.success).toBe(true);
      
      // Verify the update
      const context = await server.getContext(testProjectId, 'mental_model');
      expect(context.content).toContain('# Updated Content');
    });

    it('should reject invalid context', async () => {
      const update: ContextUpdate = {
        projectId: testProjectId,
        fileType: 'mental_model',
        content: 'Invalid content without sections'
      };

      const result = await server.updateContext(update);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should provide correction guidance for invalid updates', async () => {
      const update: ContextUpdate = {
        projectId: testProjectId,
        fileType: 'mental_model',
        content: 'Missing title and sections'
      };

      const result = await server.updateContext(update);
      expect(result.success).toBe(false);
      expect(result.correctionGuidance).toBeDefined();
      expect(result.correctionGuidance?.requiredSections).toBeDefined();
      expect(result.correctionGuidance?.retryInstructions).toBeDefined();
    });
  });

  describe('MCP Protocol Integration', () => {
    it('should list available tools', async () => {
      const tools = await server.listTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toContainEqual(
        expect.objectContaining({
          name: 'get_context',
          description: expect.any(String)
        })
      );
      expect(tools).toContainEqual(
        expect.objectContaining({
          name: 'update_context',
          description: expect.any(String)
        })
      );
    });

    it('should execute get_context tool', async () => {
      const result = await server.executeTool('get_context', {
        project_id: testProjectId,
        file_type: 'mental_model'
      });
      
      expect(result.content).toMatch(/^# Project Mental Model/);
    });

    it('should execute update_context tool with validation', async () => {
      const result = await server.executeTool('update_context', {
        project_id: testProjectId,
        file_type: 'mental_model',
        content: '# Test Content\n\n## Overview\nTest section'
      });
      
      expect(result.success).toBe(true);
    });

    it('should handle tool execution errors', async () => {
      // Test with invalid tool
      const result = await server.executeTool('invalid_tool', {});
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown tool');
    });
  });
});
