# BMAD Workflow System

This directory contains workflow tracking and management for the BMAD (Business Model and Architecture Development) methodology.

## Directory Structure

- `status/` - Current workflow status tracking
- `history/` - Completed workflow execution records
- `templates/` - Workflow templates and resources

## Using Workflows

### Starting a Workflow

Reference the workflow in Cursor:
```
@bmad/bmm/workflows/{workflow-name}
```

### Checking Status

Use the workflow-status command to check current workflow status:
```
workflow-status
```

### Workflow Types

- **Initialization**: `workflow-init` - Set up workflow system
- **Status**: `workflow-status` - Check workflow status
- **Analysis**: `create-product-brief`, `research`
- **Design**: `create-ux-design`, `create-architecture`
- **Development**: `dev-story`, `code-review`
- **Testing**: `testarch-*` workflows
- **Documentation**: `document-project`

## Workflow Execution Records

Each workflow execution creates a record in `history/` with:
- Workflow ID and type
- Start and completion times
- Steps completed
- Outputs generated
- Next steps

## Status Tracking

The `status/index.md` file tracks:
- Currently active workflows
- Workflow history summary
- Available workflow types

---
*For more information, see the BMAD documentation in `.cursor/rules/bmad/`*
