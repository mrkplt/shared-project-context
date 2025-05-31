# TODO

## **COMPLETED (High Confidence)**

**Core Infrastructure:**
- ✅ TypeScript project structure with proper dependencies
- ✅ Basic MCP server implementation with stdio transport  
- ✅ Project management system with isolated contexts
- ✅ File system abstraction layer
- ✅ Test suite for server components
- ✅ Build system with TypeScript compilation
- ✅ Error handling with structured error types

**Context Management:**
- ✅ Four proven context types: bugs, features, session_summary, mental_model
- ✅ File-based context storage in `~/.cxms/projects/{id}/`
- ✅ Project isolation and configuration management

**Bug Fixes:**
- ✅ Fixed import path in validation.test.ts (BUG-001)
- ✅ Fixed TypeScript type mismatch in ContextMCPServer mkdir (BUG-002)

## **TODO: KEY PRIORITY: Tool Extension**

**Core Context Operations:**
- ❌ `get_context` - Retrieve existing context content
- ❌ `update_context` - Replace entire context file (restricted to defined types)
- ❌ `append_context` - Add content to existing context file (restricted to defined types)

**Project Discovery & Management:**
- ❌ `list_projects` - Show available project IDs
- ❌ `list_file_types` - Show valid file types for a project

**Template System:**
- ❌ `project_templates` - List available templates for project initialization
- ❌ `define_file_type` - Create new context file type with template/schema
- ❌ `get_file_type_schema` - Retrieve validation rules for a specific type

## **TODO SECONDARY PRIORITIES**

- ❌ Simple Hosting
- ❌ Shared Storage
- ❌ Local MCP communicates with Remote Storage API
- ❌ Remote MCP to move all logic into service

**Template & Validation System:**
- ❌ JSON schema template definitions for context types
- ❌ Template-based validation with section schemas
- ❌ Support for arbitrary JSON and CSV file types

**Sequential Reasoning Engine:**
- ❌ Multi-attempt correction workflow through MCP conversation
- ❌ Step-by-step correction guidance generation
- ❌ Structured feedback responses with validation errors

**Advanced Features:**
- ❌ Authentication system
- ❌ File system sandboxing and security measures

### **CURRENT FOCUS**
Implementing the 8 core MCP tools to enable full context management workflow with explicit file type definitions and template support. All other features depend on having this complete tool set available.

### **Next Steps**
1. Implement core context operations (get, update, append)
2. Add project discovery tools (list_projects, list_file_types)
3. Build template system tools (project_templates, define_file_type, get_file_type_schema)
4. Restore validation system with template integration
5. Implement sequential reasoning engine for guided corrections

### **Architecture Notes**
- File type definitions are explicit and append-only (no deletion)
- All context operations restricted to defined file types only
- Template system drives both validation and project initialization
- Sequential reasoning happens through MCP conversation, not internal AI processing