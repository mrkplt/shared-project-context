# Local MCP Context Manager Implementation Plan

## 1. MCP Server Foundation (TypeScript Recommended)

**Why TypeScript:**
- Better MCP SDK support and examples
- JSON Schema integration is smoother
- Agent tooling ecosystem is more mature
- Easier debugging during development

**Core MCP Server Structure:**
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

class ContextMCPServer {
  private server: Server;
  private projectRoot: string;
  
  constructor() {
    this.server = new Server({
      name: "context-manager",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    this.setupTools();
  }
  
  private setupTools() {
    // Tool registration happens here
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_context",
          description: "Get context file with current content",
          inputSchema: {
            type: "object",
            properties: {
              project_id: { type: "string" },
              file_type: { type: "string", enum: ["mental_model", "session_summary", "bugs", "features"] }
            },
            required: ["project_id", "file_type"]
          }
        },
        {
          name: "update_context",
          description: "Update context file with validation and correction guidance",
          inputSchema: {
            type: "object", 
            properties: {
              project_id: { type: "string" },
              file_type: { type: "string", enum: ["mental_model", "session_summary", "bugs", "features"] },
              content: { type: "string" }
            },
            required: ["project_id", "file_type", "content"]
          }
        }
      ]
    }));
    
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Tool execution logic
    });
  }
}
```

**Key MCP Concepts:**
- **Tools** are functions the agent can call
- **Schemas** define the input/output structure
- **Request handlers** process agent calls
- **Transport** handles communication (stdio for local)

## 2. File System & Project Management

**Project Structure:**
```typescript
interface ProjectStructure {
  root: string; // ~/.cxms/
  projects: Map<string, ProjectConfig>;
}

interface ProjectConfig {
  id: string;
  name: string;
  path: string; // actual project directory
  contextPath: string; // ~/.cxms/projects/{id}/
  templates: TemplateSet;
}

class ProjectManager {
  private projects: Map<string, ProjectConfig> = new Map();
  
  async initProject(projectPath: string): Promise<string> {
    const projectId = generateProjectId(projectPath);
    const contextPath = path.join(this.getContextRoot(), 'projects', projectId);
    
    await fs.ensureDir(contextPath);
    
    const config: ProjectConfig = {
      id: projectId,
      name: path.basename(projectPath),
      path: projectPath,
      contextPath,
      templates: await this.loadTemplates()
    };
    
    this.projects.set(projectId, config);
    return projectId;
  }
  
  getContextFilePath(projectId: string, fileType: string): string {
    const project = this.projects.get(projectId);
    return path.join(project.contextPath, `${fileType}.md`);
  }
}
```

## 3. Template System & Validation Engine

**Template Definition:**
```typescript
interface ContextTemplate {
  name: string;
  description: string;
  schema: {
    required_sections: string[];
    section_schemas: Record<string, SectionSchema>;
    format_rules: FormatRule[];
  };
  correction_prompts: Record<string, string>;
  examples: string[];
}

interface SectionSchema {
  name: string;
  required: boolean;
  format: 'markdown_list' | 'markdown_table' | 'freeform' | 'structured';
  min_length?: number;
  pattern?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  confidence: number;
}

interface ValidationError {
  type: 'missing_section' | 'format_error' | 'content_quality' | 'schema_violation';
  section?: string;
  message: string;
  severity: 'error' | 'warning';
  correction_prompt: string;
  template_example: string;
}
```

**Validation Engine:**
```typescript
class ValidationEngine {
  validateContent(content: string, template: ContextTemplate): ValidationResult {
    const errors: ValidationError[] = [];
    
    // 1. Parse markdown structure
    const parsed = this.parseMarkdown(content);
    
    // 2. Check required sections
    for (const requiredSection of template.schema.required_sections) {
      if (!parsed.sections.has(requiredSection)) {
        errors.push({
          type: 'missing_section',
          section: requiredSection,
          message: `Missing required section: ${requiredSection}`,
          severity: 'error',
          correction_prompt: template.correction_prompts[`missing_${requiredSection}`],
          template_example: this.getSectionExample(requiredSection, template)
        });
      }
    }
    
    // 3. Validate section content
    for (const [sectionName, sectionContent] of parsed.sections) {
      const sectionSchema = template.schema.section_schemas[sectionName];
      if (sectionSchema) {
        const sectionErrors = this.validateSection(sectionContent, sectionSchema);
        errors.push(...sectionErrors);
      }
    }
    
    // 4. Format validation
    const formatErrors = this.validateFormat(content, template.schema.format_rules);
    errors.push(...formatErrors);
    
    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      confidence: this.calculateConfidence(errors, content.length)
    };
  }
  
  private parseMarkdown(content: string): { sections: Map<string, string> } {
    // Parse markdown into sections based on headers
    const sections = new Map<string, string>();
    const lines = content.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('# ') || line.startsWith('## ')) {
        if (currentSection) {
          sections.set(currentSection, currentContent.join('\n').trim());
        }
        currentSection = line.replace(/^#+\s+/, '').toLowerCase().replace(/\s+/g, '_');
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    
    if (currentSection) {
      sections.set(currentSection, currentContent.join('\n').trim());
    }
    
    return { sections };
  }
}
```

## 4. Sequential Reasoning Implementation

**This is the core innovation - how to guide the agent through corrections:**

```typescript
interface CorrectionResponse {
  status: 'correction_needed' | 'success' | 'max_attempts_reached';
  validation_result?: ValidationResult;
  correction_guidance?: {
    primary_issue: string;
    step_by_step_fix: string[];
    template_to_follow: string;
    example_fix: string;
    retry_instructions: string;
  };
  attempt_count: number;
}

class SequentialReasoningEngine {
  async processUpdate(
    projectId: string, 
    fileType: string, 
    content: string, 
    attemptCount: number = 0
  ): Promise<CorrectionResponse> {
    
    const maxAttempts = 3;
    const template = await this.getTemplate(fileType);
    const validation = this.validationEngine.validateContent(content, template);
    
    if (validation.valid) {
      await this.writeFile(projectId, fileType, content);
      return { status: 'success', attempt_count: attemptCount };
    }
    
    if (attemptCount >= maxAttempts) {
      return { 
        status: 'max_attempts_reached', 
        validation_result: validation,
        attempt_count: attemptCount 
      };
    }
    
    // Generate correction guidance
    const guidance = this.generateCorrectionGuidance(validation, template, content);
    
    return {
      status: 'correction_needed',
      validation_result: validation,
      correction_guidance: guidance,
      attempt_count: attemptCount
    };
  }
  
  private generateCorrectionGuidance(
    validation: ValidationResult, 
    template: ContextTemplate,
    originalContent: string
  ): CorrectionGuidance {
    
    // Find the most critical error
    const criticalError = validation.errors
      .filter(e => e.severity === 'error')
      .sort((a, b) => this.getErrorPriority(a.type) - this.getErrorPriority(b.type))[0];
    
    if (!criticalError) {
      // Handle warnings
      return this.generateWarningGuidance(validation.errors);
    }
    
    // Generate step-by-step correction based on error type
    const stepByStepFix = this.generateStepByStepFix(criticalError, template);
    const templateToFollow = this.generateTemplateFragment(criticalError, template);
    const exampleFix = this.generateExampleFix(criticalError, originalContent);
    
    return {
      primary_issue: criticalError.message,
      step_by_step_fix: stepByStepFix,
      template_to_follow: templateToFollow,
      example_fix: exampleFix,
      retry_instructions: this.generateRetryInstructions(criticalError, template)
    };
  }
  
  private generateStepByStepFix(error: ValidationError, template: ContextTemplate): string[] {
    switch (error.type) {
      case 'missing_section':
        return [
          `1. Add a new section header: ## ${error.section?.replace(/_/g, ' ')}`,
          `2. Include the following content structure: ${template.schema.section_schemas[error.section!]?.format}`,
          `3. Fill in relevant information based on your current knowledge`,
          `4. Ensure the section follows the template format exactly`
        ];
        
      case 'format_error':
        return [
          `1. Review the format requirements for section: ${error.section}`,
          `2. Compare your content with the template example`,
          `3. Restructure the content to match the expected format`,
          `4. Verify all required elements are present`
        ];
        
      case 'content_quality':
        return [
          `1. Expand the content in section: ${error.section}`,
          `2. Add more specific details and context`,
          `3. Ensure the content is actionable and clear`,
          `4. Remove any placeholder text`
        ];
        
      default:
        return [`1. Address the error: ${error.message}`, `2. Follow the template guidance`];
    }
  }
  
  private generateTemplateFragment(error: ValidationError, template: ContextTemplate): string {
    if (error.type === 'missing_section' && error.section) {
      const sectionSchema = template.schema.section_schemas[error.section];
      return this.generateSectionTemplate(error.section, sectionSchema);
    }
    
    // Return relevant template portion
    return template.examples[0] || "Follow the template structure";
  }
  
  private generateRetryInstructions(error: ValidationError, template: ContextTemplate): string {
    return `Take your original content and ${error.correction_prompt}. 
    
Make sure to:
- Keep all existing valid content
- Only modify the problematic section
- Follow the exact template format shown above
- Do not remove other sections that are working correctly

Then call update_context again with your corrected content.`;
  }
}
```

**Sequential Reasoning Flow:**
1. **Agent calls update_context** with content
2. **Validation fails** with specific errors
3. **System returns correction guidance** with step-by-step instructions
4. **Agent processes guidance** and generates corrected content
5. **Agent calls update_context again** with corrections
6. **Repeat until valid** or max attempts reached

## 5. Tool Implementation

**Core Tools:**
```typescript
async handleUpdateContext(args: any): Promise<any> {
  const { project_id, file_type, content } = args;
  
  const result = await this.sequentialReasoning.processUpdate(
    project_id, 
    file_type, 
    content
  );
  
  if (result.status === 'correction_needed') {
    return {
      content: {
        success: false,
        message: "Content needs correction",
        validation_errors: result.validation_result?.errors,
        correction_guidance: result.correction_guidance,
        // This is what tells the agent how to fix it
        next_steps: `Your content has validation issues. ${result.correction_guidance?.retry_instructions}`
      }
    };
  }
  
  return {
    content: {
      success: true,
      message: "Context updated successfully"
    }
  };
}
```

**The key insight:** Sequential reasoning happens through the **conversation between agent and MCP tool**. The tool doesn't do the reasoning - it provides structured guidance that enables the agent to reason through the correction process.

## 6. Agent Integration Pattern

**How agents should use this:**
```typescript
// Agent pseudocode
async function updateMyContext(content: string) {
  let attempts = 0;
  let currentContent = content;
  
  while (attempts < 3) {
    const result = await mcp.call('update_context', {
      project_id: 'current',
      file_type: 'mental_model', 
      content: currentContent
    });
    
    if (result.success) {
      return "Context updated successfully";
    }
    
    // Process correction guidance
    const guidance = result.correction_guidance;
    currentContent = await this.applyCorrections(currentContent, guidance);
    attempts++;
  }
  
  return "Failed to update after multiple attempts";
}
```

This approach makes the agent **learn** how to write better context through guided correction, rather than trying to get it perfect on the first try.

## Implementation Steps

1. **Set up TypeScript project** with MCP SDK dependencies
2. **Build basic MCP server** with tool registration
3. **Implement project management** and file system operations
4. **Create template system** with validation schemas
5. **Build validation engine** with markdown parsing
6. **Implement sequential reasoning** with correction guidance generation
7. **Connect all components** and test with agent integration
8. **Create example templates** based on proven context patterns
9. **Add configuration management** for projects and settings
10. **Test end-to-end workflow** with real agent scenarios