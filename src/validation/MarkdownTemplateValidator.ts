import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { Node } from 'unist';
import { Heading, Text, Root } from 'mdast';
import { ValidationResponse, ValidationError, PersistenceHelper } from '../types.js';

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
      
      // Parse both template and content
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
    
    // Check for missing required headers
    for (const requiredHeader of templateStructure.requiredHeaders) {
      if (!contentStructure.requiredHeaders.includes(requiredHeader)) {
        errors.push({
          type: 'missing_header',
          section: requiredHeader,
          message: `Missing required header: "${requiredHeader}"`
        });
      }
    }
    
    // Check header hierarchy
    for (const [header, expectedDepth] of templateStructure.headerHierarchy) {
      const actualDepth = contentStructure.headerHierarchy.get(header);
      if (actualDepth && actualDepth !== expectedDepth) {
        errors.push({
          type: 'incorrect_structure',
          section: header,
          message: `Header "${header}" should be level ${expectedDepth} but found level ${actualDepth}`
        });
      }
    }
    
    // Check for unexpected headers
    for (const foundHeader of contentStructure.requiredHeaders) {
      if (!templateStructure.requiredHeaders.includes(foundHeader)) {
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