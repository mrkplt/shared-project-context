import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { Node } from 'unist';
import { Heading, Text, Root } from 'mdast';
import { ValidationResponse, ValidationError, PersistenceHelper } from '../../../types.js';

interface TemplateStructure {
  requiredHeaders: string[];
  headerHierarchy: Map<string, number>;
  allowedSubHeaders: Map<string, string[]>;
}

export class MarkdownTemplateValidator {
  private persistenceHelper: PersistenceHelper;
  private projectName: string;

  constructor(persistenceHelper: PersistenceHelper, projectName: string) {
    this.persistenceHelper = persistenceHelper;
    this.projectName = projectName;
  }

  async validateAgainstTemplate(content: string, contextType: string): Promise<ValidationResponse> {
    try {
      // Load the template
      const templateResult = await this.persistenceHelper.getTemplate(this.projectName, contextType);
      if (!templateResult.success || !templateResult.data){
        return {
          isValid: false,
          validationErrors: [{
            type: 'content_error',
            message: `Validation failed: ${templateResult.errors?.[0]}`
          }],
          correctionGuidance: ['Unable to validate content due to internal error'],
          templateUsed: ''
        };
      }

      const template = templateResult.data[0];
      
      // Parse original content and template to extract headers
      const templateStructure = this.parseMarkdownStructure(template);
      const contentStructure = this.parseMarkdownStructure(content);
      
      // Validate structure
      const errors = this.validateStructure(contentStructure, templateStructure);
      
      if (errors.length > 0) {
        return {
          isValid: false,
          validationErrors: errors,
          correctionGuidance: this.generateCorrectionGuidance(errors, templateStructure),
          templateUsed: template
        };
      }
      
      return {
        isValid: true,
        templateUsed: template
      };
      
    } catch (error) {
      return {
        isValid: false,
        validationErrors: [{
          type: 'content_error',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        correctionGuidance: ['Unable to validate content due to internal error'],
        templateUsed: ''
      };
    }
  }

  private normalizeTemplateVariables(content: string): string {
    // Split content into lines for line-by-line processing
    const lines = content.split('\n');
    const normalizedLines = lines.map(line => this.normalizeTemplateLine(line));
    return normalizedLines.join('\n');
  }
  
  private normalizeTemplateLine(line: string): string {
    // Check if line contains template variables
    const hasTemplateVars = /{{\s*[^}]+\s*}}/.test(line);
    
    // Check if line is a placeholder (dash followed by optional content)
    const isPlaceholder = /^-\s*$/.test(line);
    
    if (hasTemplateVars || isPlaceholder) {
      // Convert template line to a regex pattern that matches surrounding content
      // Step 1: Escape special regex characters
      let escaped = line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Step 2: Replace escaped template variables with .* pattern
      let pattern = escaped.replace(/\\{\\{[^}]*\\}\\}/g, '.*');
      
      // Step 3: Handle placeholder lines (- ) to match any bullet point content
      if (isPlaceholder) {
        pattern = '\\-\\s.*';
      }
      
      return `TEMPLATE_PATTERN:${pattern}`;
    } else {
      // No variables - return line as-is for exact matching
      return line;
    }
  }
  
  private linesMatch(templateLine: string, contentLine: string): boolean {
    // Check if template line contains template variables or placeholders
    const hasTemplateVars = /{{\s*[^}]+\s*}}/.test(templateLine);
    const isPlaceholder = /^-\s*$/.test(templateLine);
    
    if (hasTemplateVars || isPlaceholder) {
      // Apply template pattern matching
      const normalizedTemplate = this.normalizeTemplateLine(templateLine);
      const pattern = normalizedTemplate.replace('TEMPLATE_PATTERN:', '');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(contentLine);
    } else if (templateLine.startsWith('TEMPLATE_PATTERN:')) {
      // Already normalized template pattern
      const pattern = templateLine.replace('TEMPLATE_PATTERN:', '');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(contentLine);
    } else {
      // Exact match for non-template lines
      return templateLine === contentLine;
    }
  }

  private parseMarkdownStructure(markdown: string): TemplateStructure {
    const processor = unified()
      .use(remarkParse)
      .use(remarkFrontmatter);
    
    const tree = processor.parse(markdown) as Root;
    
    const headers: string[] = [];
    const headerHierarchy = new Map<string, number>();
    const subHeaders = new Map<string, string[]>();
    
    const parentStack: Array<{ text: string; depth: number }> = [];
    
    this.visitNode(tree, (node: Node) => {
      if (node.type === 'heading') {
        const heading = node as Heading;
        const headerText = this.extractHeaderText(heading);
        if (!headerText) return;
  
        headers.push(headerText);
        headerHierarchy.set(headerText, heading.depth);
  
        // Pop headers at same or deeper level
        while (parentStack.length > 0 && 
               parentStack[parentStack.length - 1].depth >= heading.depth) {
          parentStack.pop();
        }
  
        // Track parent-child relationship
        if (parentStack.length > 0) {
          const parent = parentStack[parentStack.length - 1];
          const children = subHeaders.get(parent.text) || [];
          children.push(headerText);
          subHeaders.set(parent.text, children);
        }
  
        // Initialize children array for potential future children
        if (!subHeaders.has(headerText)) {
          subHeaders.set(headerText, []);
        }
  
        parentStack.push({ text: headerText, depth: heading.depth });
      }
    });
    
    return { requiredHeaders: headers, headerHierarchy, allowedSubHeaders: subHeaders };
  }

  private validateStructure(contentStructure: TemplateStructure, templateStructure: TemplateStructure): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check for missing required headers using flexible matching
    for (const requiredHeader of templateStructure.requiredHeaders) {
      const hasMatch = contentStructure.requiredHeaders.some(contentHeader => 
        this.linesMatch(requiredHeader, contentHeader)
      );
      
      if (!hasMatch) {
        errors.push({
          type: 'missing_header',
          section: requiredHeader,
          message: `Missing required header: "${requiredHeader}"`
        });
      }
    }
    
    // Check header hierarchy with flexible matching
    for (const [templateHeader, expectedDepth] of templateStructure.headerHierarchy) {
      // Find matching content header using flexible matching
      let matchingContentHeader: string | undefined;
      let actualDepth: number | undefined;
      
      for (const [contentHeader, depth] of contentStructure.headerHierarchy) {
        if (this.linesMatch(templateHeader, contentHeader)) {
          matchingContentHeader = contentHeader;
          actualDepth = depth;
          break;
        }
      }
      
      if (matchingContentHeader && actualDepth !== expectedDepth) {
        errors.push({
          type: 'incorrect_structure',
          section: matchingContentHeader,
          message: `Header "${matchingContentHeader}" should be level ${expectedDepth} but found level ${actualDepth}`
        });
      }
    }
    
    // Check for unexpected headers (only flag headers that don't match any template pattern)
    for (const foundHeader of contentStructure.requiredHeaders) {
      const hasTemplateMatch = templateStructure.requiredHeaders.some(templateHeader =>
        this.linesMatch(templateHeader, foundHeader)
      );
      
      if (!hasTemplateMatch) {
        errors.push({
          type: 'invalid_format',
          section: foundHeader,
          message: `Unexpected header found: "${foundHeader}". This header is not in the template.`
        });
      }
    }
    
    return errors;
  }

  private generateCorrectionGuidance(errors: ValidationError[], templateStructure: TemplateStructure): string[] {
    const guidance: string[] = [];
    
    const missingHeaders = errors.filter(e => e.type === 'missing_header');
    const structureErrors = errors.filter(e => e.type === 'incorrect_structure');
    const formatErrors = errors.filter(e => e.type === 'invalid_format');
    
    if (missingHeaders.length > 0) {
      guidance.push('Missing required headers:');
      missingHeaders.forEach(error => {
        const depth = templateStructure.headerHierarchy.get(error.section || '');
        const headerPrefix = '#'.repeat(depth || 2);
        guidance.push(`  - Add: ${headerPrefix} ${error.section}`);
      });
    }
    
    if (structureErrors.length > 0) {
      guidance.push('Incorrect header levels:');
      structureErrors.forEach(error => {
        guidance.push(`  - ${error.message}`);
      });
    }
    
    if (formatErrors.length > 0) {
      guidance.push('Remove unexpected headers:');
      formatErrors.forEach(error => {
        guidance.push(`  - Remove: "${error.section}"`);
      });
    }
    
    guidance.push('Ensure your content follows the template structure exactly.');
    
    return guidance;
  }

  private visitNode(node: Node, visitor: (node: Node) => void): void {
    visitor(node);
    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach(child => this.visitNode(child, visitor));
    }
  }

  private extractHeaderText(heading: Heading): string | null {
    if (!heading.children || heading.children.length === 0) return null;
    
    const textNodes = heading.children.filter((child): child is Text => child.type === 'text');
    if (textNodes.length === 0) return null;
    
    return textNodes.map(text => text.value).join('').trim();
  }
}