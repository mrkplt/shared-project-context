import { jest, describe, test, expect } from '@jest/globals';

/**
 * Tests for template variable normalization logic
 * This tests the core functionality without dependencies on markdown parsing libraries
 */

describe('Template Variable Logic', () => {
  // Extract the core template variable logic for testing
  function normalizeTemplateLine(line: string): string {
    const hasTemplateVars = /{{\s*[^}]+\s*}}/.test(line);
    
    if (hasTemplateVars) {
      // Step 1: Escape special regex characters
      let escaped = line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Step 2: Replace escaped template variables with .* pattern
      let pattern = escaped.replace(/\\{\\{[^}]*\\}\\}/g, '.*');
      
      return `TEMPLATE_PATTERN:${pattern}`;
    } else {
      return line;
    }
  }

  function linesMatch(templateLine: string, contentLine: string): boolean {
    if (templateLine.startsWith('TEMPLATE_PATTERN:')) {
      const pattern = templateLine.replace('TEMPLATE_PATTERN:', '');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(contentLine);
    } else {
      return templateLine === contentLine;
    }
  }

  describe('Single Variable Patterns', () => {
    test('should match basic template variable', () => {
      const template = '# Project: {{PROJECT_NAME}}';
      const content = '# Project: My Awesome App';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(normalizedTemplate).toBe('TEMPLATE_PATTERN:# Project: .*');
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });

    test('should match date variable with any format', () => {
      const template = '# Last Updated: {{DATE}}';
      
      const testCases = [
        '# Last Updated: 2024-01-15',
        '# Last Updated: January 15, 2024',
        '# Last Updated: 15/01/2024',
        '# Last Updated: March 3rd, 2023',
        '# Last Updated: Q1 2024',
        '# Last Updated: Last Tuesday'
      ];

      const normalizedTemplate = normalizeTemplateLine(template);
      
      testCases.forEach(content => {
        expect(linesMatch(normalizedTemplate, content)).toBe(true);
      });
    });

    test('should handle variable with spaces', () => {
      const template = '# Title: {{ SPACED_VARIABLE }}';
      const content = '# Title: Some Content Here';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });
  });

  describe('Multiple Variable Patterns', () => {
    test('should handle adjacent variables', () => {
      const template = '# {{FIRST_NAME}}{{LAST_NAME}}';
      const content = '# JohnSmith';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(normalizedTemplate).toBe('TEMPLATE_PATTERN:# .*.*');
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });

    test('should handle variables with separators', () => {
      const template = '# {{PROJECT}} - Version {{VERSION}} by {{AUTHOR}}';
      const content = '# My App - Version 2.1.0 by Jane Doe';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(normalizedTemplate).toBe('TEMPLATE_PATTERN:# .* - Version .* by .*');
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });

    test('should handle complex punctuation', () => {
      const template = '## {{FEATURE}}: {{DESCRIPTION}} ({{STATUS}}, {{PRIORITY}})';
      const content = '## Authentication: User login system (Complete, High)';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(normalizedTemplate).toBe('TEMPLATE_PATTERN:## .*: .* \\(.*, .*\\)');
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });

    test('should handle variables at start and end', () => {
      const template = '{{START_TOKEN}} middle text {{END_TOKEN}}';
      const content = 'BEGIN middle text FINISH';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(normalizedTemplate).toBe('TEMPLATE_PATTERN:.* middle text .*');
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });

    test('should handle many variables', () => {
      const template = '### {{COMPONENT}} v{{VERSION}} ({{BUILD_DATE}}) - {{MAINTAINER}}';
      const content = '### User Auth v2.1.0 (2024-01-15) - Security Team';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(normalizedTemplate).toBe('TEMPLATE_PATTERN:### .* v.* \\(.*\\) - .*');
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });

    test('should handle multiple variables with different spacing', () => {
      const template = '## {{VAR1}} and {{  VAR2  }} plus {{VAR3}}';
      const content = '## First Value and Second Value plus Third Value';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });
  });

  describe('Real-world Examples', () => {
    test('should handle project header patterns', () => {
      const testCases = [
        {
          template: '# Project: {{PROJECT_NAME}}',
          content: '# Project: E-commerce Platform'
        },
        {
          template: '## Team Lead: {{TEAM_LEAD}}',
          content: '## Team Lead: Sarah Johnson'
        },
        {
          template: '### Budget: {{TOTAL_BUDGET}}',
          content: '### Budget: $150,000 USD'
        },
        {
          template: '#### Timeline: {{START_DATE}} to {{END_DATE}}',
          content: '#### Timeline: Q1 2024 to Q4 2024'
        }
      ];

      testCases.forEach(({ template, content }) => {
        const normalizedTemplate = normalizeTemplateLine(template);
        expect(linesMatch(normalizedTemplate, content)).toBe(true);
      });
    });

    test('should handle feature documentation patterns', () => {
      const testCases = [
        {
          template: '## Feature: {{FEATURE_ID}} {{FEATURE_NAME}}',
          content: '## Feature: AUTH-001 User Authentication'
        },
        {
          template: '- **Status**: {{STATUS}}',
          content: '- **Status**: Active'
        },
        {
          template: '- **Last Verified**: {{VERIFICATION_DATE}}',
          content: '- **Last Verified**: 2024-01-15'
        },
        {
          template: '- **Components**: {{COMPONENT_LIST}}',
          content: '- **Components**: LoginForm, AuthService, TokenManager'
        }
      ];

      testCases.forEach(({ template, content }) => {
        const normalizedTemplate = normalizeTemplateLine(template);
        expect(linesMatch(normalizedTemplate, content)).toBe(true);
      });
    });

    test('should handle technical specifications', () => {
      const testCases = [
        {
          template: '#### Runtime: {{RUNTIME_VERSION}}',
          content: '#### Runtime: Node.js 18.0'
        },
        {
          template: '#### Database: {{DATABASE_TYPE}}',
          content: '#### Database: PostgreSQL 14.2'
        },
        {
          template: '#### API: {{API_FRAMEWORK}} {{API_VERSION}}',
          content: '#### API: Express.js 4.18.0'
        }
      ];

      testCases.forEach(({ template, content }) => {
        const normalizedTemplate = normalizeTemplateLine(template);
        expect(linesMatch(normalizedTemplate, content)).toBe(true);
      });
    });
  });

  describe('Exact Matching (No Variables)', () => {
    test('should match exact content when no variables present', () => {
      const template = '# Static Header';
      const content = '# Static Header';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(normalizedTemplate).toBe('# Static Header');
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });

    test('should not match different content when no variables', () => {
      const template = '# Static Header';
      const content = '# Different Header';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(linesMatch(normalizedTemplate, content)).toBe(false);
    });

    test('should handle mixed static and variable content', () => {
      const staticTemplate = '## Fixed Section';
      const variableTemplate = '## Dynamic: {{VALUE}}';
      const staticContent = '## Fixed Section';
      const variableContent = '## Dynamic: Some Value';
      
      expect(linesMatch(normalizeTemplateLine(staticTemplate), staticContent)).toBe(true);
      expect(linesMatch(normalizeTemplateLine(variableTemplate), variableContent)).toBe(true);
      expect(linesMatch(normalizeTemplateLine(staticTemplate), variableContent)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle special regex characters in content', () => {
      const template = '# Project: {{PROJECT_NAME}}';
      const content = '# Project: My.App*Version(2.0)[Final]';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });

    test('should handle malformed braces (not template variables)', () => {
      const template = '# Project: {INVALID}';
      const content = '# Project: {INVALID}';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(normalizedTemplate).toBe('# Project: {INVALID}'); // No TEMPLATE_PATTERN prefix
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });

    test('should treat empty braces as literal text (not variables)', () => {
      const template = '# Project: {{}}';
      const content = '# Project: {{}}'; // Must match exactly since it's not a template variable
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(normalizedTemplate).toBe('# Project: {{}}'); // No TEMPLATE_PATTERN prefix
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
      
      // Should not match different content since it's literal
      expect(linesMatch(normalizedTemplate, '# Project: Test')).toBe(false);
    });

    test('should handle variables with special characters in names', () => {
      const template = '# {{PROJECT_NAME_V2}}';
      const content = '# My Project Version 2';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });

    test('should not match when structure is wrong', () => {
      const template = '## Status: {{STATUS}} | Priority: {{PRIORITY}}';
      const content = '## Status: Active - Priority: High'; // Wrong separator
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(linesMatch(normalizedTemplate, content)).toBe(false);
    });
  });

  describe('Complex Business Logic Examples', () => {
    test('should handle business model descriptions', () => {
      const template = '### Revenue Model: {{BUSINESS_MODEL}}';
      const content = '### Revenue Model: Subscription-based SaaS with tiered pricing';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });

    test('should handle contact information', () => {
      const template = '##### Contact: {{EMAIL_ADDRESS}}';
      const content = '##### Contact: project-lead@company.com';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });

    test('should handle long descriptions', () => {
      const template = '#### Description: {{LONG_DESCRIPTION}}';
      const content = '#### Description: This is a comprehensive enterprise solution designed to streamline business operations across multiple departments while maintaining security compliance.';
      
      const normalizedTemplate = normalizeTemplateLine(template);
      expect(linesMatch(normalizedTemplate, content)).toBe(true);
    });
  });
});