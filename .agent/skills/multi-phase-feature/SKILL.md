---
name: multi-phase-feature
description: Implement features using structured multi-phase approach for GAM Forecast Tool. Use when user says 'add feature', 'implement', 'create new', or requests multi-step work spanning frontend and backend.
allowed-tools: Read, Write, Edit, TodoWrite, Bash, Glob, Grep
---

# Multi-Phase Feature Implementation

Structure complex features into manageable phases with clear completion criteria.

## When to Use This Skill

Activate when user requests:
- New UI components or pages
- New API endpoints with frontend integration
- Features requiring database changes
- Anything mentioning "add feature", "implement", "create new"
- Multi-step work (>5 file changes or frontend + backend)
- Features similar to existing ones (need pattern discovery)

## Core Principles

1. **Discovery First**: Study existing patterns before coding
2. **Incremental Progress**: Build and test one phase at a time
3. **Copy Then Adapt**: Copy existing implementations, then modify
4. **Test Each Phase**: Never proceed with broken tests
5. **Document Progress**: Track phases in implementation doc

## The Multi-Phase Process

### Phase 0: Discovery & Planning

**Before writing ANY code**, understand existing patterns:

#### Step 1: Find Similar Features
```bash
# Search for similar functionality
grep -r "similar_feature_name" --include="*.py" src/
grep -r "SimilarComponent" --include="*.tsx" --include="*.ts" frontend/src/
```

#### Step 2: Read Reference Implementations
Read 2-3 similar features to identify patterns:
- API route structure and naming
- Service layer patterns
- Database queries and connection patterns
- Frontend component structure
- State management approach
- Error handling patterns
- Test patterns

#### Step 3: Document Patterns Found
Note in planning doc:
- Routes follow pattern: `/api/v2/category/action`
- Services use dependency injection
- Frontend uses React Query for API calls
- Components are in `frontend/src/pages/` or `frontend/src/components/`
- Styling uses Tailwind classes

#### Step 4: Create Implementation Plan

Create `docs/[FEATURE_NAME]_IMPLEMENTATION.md`:

```markdown
# [Feature Name] Implementation Plan

## Overview
Brief description of what we're building

## Reference Features
- Similar Feature 1: [location and key patterns]
- Similar Feature 2: [location and key patterns]

## Phase Breakdown

### Phase 1: Backend API
**Goal**: Create API endpoint with business logic
**Files**:
- `src/api/v2_[category].py` - Route definition
- `src/services/[feature]_service.py` - Business logic

**Tasks**:
- [ ] Create service with business logic
- [ ] Add API route
- [ ] Test with curl

**Success Criteria**:
- Endpoint returns 200 with correct data structure
- Error handling works (400/500 responses)
- curl test passes

**Status**: Not Started

### Phase 2: Database Integration (if needed)
**Goal**: Add database table/view for feature data
**Files**:
- `src/utils/duckdb_manager.py` - Schema definition
- Database migration script

**Tasks**:
- [ ] Define table schema
- [ ] Create table in database
- [ ] Verify with DESCRIBE command

**Success Criteria**:
- Table exists with correct schema
- Can INSERT and SELECT test data
- No conflicts with existing tables

**Status**: Not Started

### Phase 3: Frontend Component
**Goal**: Create React component for user interface
**Files**:
- `frontend/src/pages/[FeatureName].tsx` - Main page
- `frontend/src/components/[Feature]/` - Subcomponents (if needed)

**Tasks**:
- [ ] Create component structure
- [ ] Copy similar component patterns
- [ ] Add to routing
- [ ] Style with Tailwind

**Success Criteria**:
- Component renders without errors
- Matches design of similar pages
- Navigation works
- Responsive design

**Status**: Not Started

### Phase 4: Frontend-Backend Integration
**Goal**: Connect UI to API with state management
**Files**:
- API client calls
- State management (React Query, useState)
- Error handling UI

**Tasks**:
- [ ] Add API client function
- [ ] Implement data fetching
- [ ] Add loading states
- [ ] Add error handling UI

**Success Criteria**:
- Data loads from API correctly
- Loading spinner shows during fetch
- Error messages display properly
- User can interact with feature end-to-end

**Status**: Not Started

### Phase 5: Testing & Polish
**Goal**: Comprehensive testing and refinement
**Tasks**:
- [ ] Manual end-to-end test
- [ ] Edge case testing
- [ ] Error scenario testing
- [ ] Code cleanup
- [ ] Update CHANGELOG.md

**Success Criteria**:
- All user flows work correctly
- No console errors
- Code follows project conventions
- Documentation updated

**Status**: Not Started
```

#### Step 5: Create Todo List

Use TodoWrite to create phase todos:
```
- Phase 1: Backend API - Not Started
- Phase 2: Database Integration - Not Started
- Phase 3: Frontend Component - Not Started
- Phase 4: Integration - Not Started
- Phase 5: Testing & Polish - Not Started
```

### Phase Execution Rules

#### Rule 1: One Phase at a Time
- Complete current phase FULLY before moving to next
- Don't start Phase 2 if Phase 1 tests fail
- Each phase must meet success criteria

#### Rule 2: Copy Existing Patterns EXACTLY First

**CRITICAL**: When implementing, follow this sequence:
1. **Copy** similar existing code exactly as-is
2. **Verify** the copied code works in new location
3. **Modify** only what's needed for new feature
4. **Test** after each modification

**Example:**
```typescript
// Step 1: Copy existing component EXACTLY
// Copied from AIAssistant.tsx (keep everything!)

// Step 2: Verify it renders
// Test in browser - should show copied component

// Step 3: Modify for new feature
// Change only necessary parts (title, API endpoint, etc.)

// Step 4: Test modifications
// Verify changes work as expected
```

**Never simplify while copying** - that causes bugs!

#### Rule 3: Test Before Committing

Each phase requires passing tests:

**Backend Phase:**
```bash
# Test API endpoint
curl http://localhost:8000/api/v2/category/action

# Should return 200 with expected JSON
```

**Database Phase:**
```bash
# Verify schema
./py scripts/templates/db_query_template.py
# Query: DESCRIBE table_name
```

**Frontend Phase:**
```bash
# Start dev server (if not running)
cd frontend && npm run dev

# Open browser to http://localhost:3000/feature-path
# Check browser console for errors (should be clean)
```

#### Rule 4: Commit After Each Phase

```bash
git add [modified files]
git commit -m "feat: implement Phase N - [specific achievement]"
```

**Good commit messages:**
- `feat: implement Phase 1 - add forecast analysis API endpoint`
- `feat: implement Phase 2 - add forecast_analysis table`
- `feat: implement Phase 3 - create ForecastAnalysis React component`

#### Rule 5: Update Plan Document

After completing phase:
1. Mark phase status as "Complete"
2. Note any deviations from plan
3. Add discovered issues or follow-ups

### Common Phase Patterns

#### Pattern 1: API Endpoint Phase

**Files to create/modify:**
1. Service file: `src/services/[feature]_service.py`
2. Route file: `src/api/v2_[category].py` or add to existing
3. Import in `src/unified_fastapi_app.py` if new router

**Template:**
```python
# src/services/feature_service.py
from src.utils.async_duckdb import AsyncDuckDB

class FeatureService:
    async def get_data(self, param: str):
        async with AsyncDuckDB(read_only=True) as db:
            query = "SELECT * FROM table WHERE field = ?"
            result = await db.execute(query, [param])
            return result

# src/api/v2_category.py
from fastapi import APIRouter, HTTPException
from src.services.feature_service import FeatureService

router = APIRouter()

@router.get("/api/v2/category/action")
async def get_feature_data(param: str):
    service = FeatureService()
    try:
        data = await service.get_data(param)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### Pattern 2: React Component Phase

**Files to create:**
1. Page: `frontend/src/pages/FeatureName.tsx`
2. Add route in `frontend/src/App.tsx`

**Template:**
```typescript
// frontend/src/pages/FeatureName.tsx
import React, { useState, useEffect } from 'react';

export default function FeatureName() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Will connect to API in Phase 4
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Feature Name</h1>
      {/* Content here */}
    </div>
  );
}
```

#### Pattern 3: Database Schema Phase

Use database script template:
```bash
cp scripts/templates/db_migration_template.py scripts/add_feature_table.py
```

Modify migration:
```python
async def migrate():
    async with ProductionDuckDBManager() as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS feature_data (
                id INTEGER PRIMARY KEY,
                feature_field VARCHAR,
                created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
```

#### Pattern 4: Frontend-Backend Integration Phase

**Add API client:**
```typescript
// In component
const fetchData = async () => {
  setLoading(true);
  try {
    const response = await fetch('/api/v2/category/action?param=value');
    const result = await response.json();
    setData(result.data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchData();
}, []);
```

### Phase Completion Checklist

Before marking phase complete:

- [ ] All code compiles/runs without errors
- [ ] Tests pass (curl for API, browser for UI)
- [ ] No console errors or warnings
- [ ] Code follows project conventions (check similar files)
- [ ] Changes committed with clear message
- [ ] Implementation doc updated with status
- [ ] TodoWrite updated (mark current phase complete, next in_progress)

### After All Phases Complete

#### Step 1: Integration Testing
Test complete user flow end-to-end:
- User opens page → sees UI
- User interacts → calls API
- API queries database → returns data
- UI displays data → user satisfied

#### Step 2: Update Documentation
```markdown
# Add to CHANGELOG.md
## [Version] - Date
### Added
- Feature Name: Brief description of what it does
```

#### Step 3: Clean Up
```bash
# Remove implementation plan (workspace hygiene)
rm docs/[FEATURE_NAME]_IMPLEMENTATION.md

# Remove any temporary test scripts
rm scripts/test_*.py
```

#### Step 4: Final Commit
```bash
git add .
git commit -m "feat: complete [feature name] implementation

- Phase 1: Backend API endpoint
- Phase 2: Database integration
- Phase 3: Frontend component
- Phase 4: Integration and state management
- Phase 5: Testing and polish
"
```

## Real-World Examples

### Example 1: Chat Panel Feature

**User request:** "Add a chat panel for AI conversations"

**Discovery:**
- Found similar: Agent conversation page has chat UI
- Pattern: WebSocket for real-time, messages stored in `chat_messages` table
- Components: ChatPanel.tsx, ChatMessage.tsx

**Phases:**
1. Backend: WebSocket endpoint `/ws/chat/{client_id}`
2. Database: `chat_messages` table with `conversation_id`
3. Frontend: ChatPanel component copied from AgentConversation
4. Integration: WebSocket connection, message sending/receiving
5. Testing: Multi-turn conversation flow

### Example 2: Template Versioning

**User request:** "Add ability to create new template versions"

**Discovery:**
- Found: Template Manager already exists
- Pattern: Never edit existing templates, always create new version
- Service: `ai_prompt_templates` table has version field

**Phases:**
1. Backend: `POST /api/v2/ai/prompt-templates/version` endpoint
2. Database: No changes (table supports versioning)
3. Frontend: "Create New Version" button in Template Manager
4. Integration: Modal form, version increment logic
5. Testing: Create v1.2 from v1.1, verify both exist

## When NOT to Use This Skill

- Single file changes → Use normal edit workflow
- Simple bug fixes → Use direct debugging
- Documentation updates → Just edit the docs
- Configuration changes → Edit config files directly
- Trivial changes (<3 files) → No need for phases

## Success Criteria

✓ Implementation plan created with clear phases
✓ Each phase has specific success criteria
✓ TodoWrite used to track progress
✓ Existing patterns discovered and followed
✓ Code copied exactly before modification
✓ Each phase tested before moving to next
✓ All phases completed successfully
✓ Final integration tested end-to-end
✓ Documentation updated
✓ Implementation doc removed (clean workspace)
