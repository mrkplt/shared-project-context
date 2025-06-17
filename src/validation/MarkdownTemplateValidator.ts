import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import { Node } from 'unist';
import { Heading, Text, Root } from 'mdast';
import { ValidationResponse, ValidationError, PersistenceHelper } from '../types.js';

interface MarkdownNode extends Node {
  type: string;
  children?: MarkdownNode[];
  depth?: number;
  value?: string;
}

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
      const template = await this.loadTemplate(contextType);
      
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

  private async loadTemplate(contextType: string): Promise<string> {
    try {
      const templateResult = await this.persistenceHelper.getTemplate(this.projectName, contextType);
      
      if (!templateResult.success) {
        throw new Error(templateResult.errors?.join(', ') || 'Failed to load template');
      }
      
      return templateResult.data?.[0] || '';
    } catch (error) {
      throw new Error(`Failed to load template for ${contextType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    let currentParentHeader: string | null = null;
    
    this.visitNode(tree, (node: MarkdownNode) => {
      if (node.type === 'heading' && node.depth && node.children) {
        const headerText = this.extractHeaderText(node);
        if (headerText) {
          headers.push(headerText);
          headerHierarchy.set(headerText, node.depth);
          
          if (node.depth === 2) {
            currentParentHeader = headerText;
            subHeaders.set(headerText, []);
          } else if (node.depth === 3 && currentParentHeader) {
            const currentSubHeaders = subHeaders.get(currentParentHeader) || [];
            currentSubHeaders.push(headerText);
            subHeaders.set(currentParentHeader, currentSubHeaders);
          }
        }
      }
    });
    
    return {
      requiredHeaders: headers,
      headerHierarchy,
      allowedSubHeaders: subHeaders
    };
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

  private visitNode(node: MarkdownNode, visitor: (node: MarkdownNode) => void): void {
    visitor(node);
    if (node.children) {
      node.children.forEach(child => this.visitNode(child, visitor));
    }
  }

  private extractHeaderText(node: MarkdownNode): string | null {
    if (!node.children) return null;
    
    const textNodes = node.children.filter(child => child.type === 'text');
    if (textNodes.length === 0) return null;
    
    return textNodes.map(child => child.value || '').join('').trim();
  }
}