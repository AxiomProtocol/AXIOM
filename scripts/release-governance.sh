#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_environment() {
    log_info "Checking environment..."
    
    if [[ "${AXIOM_ENV:-}" == "production" ]]; then
        log_error "Cannot run release governance in production environment"
        exit 1
    fi
    
    if [[ "${AI_AGENT_MODE:-off}" != "off" ]]; then
        log_warn "AI Agent mode is enabled: ${AI_AGENT_MODE}"
    fi
    
    log_info "Environment: ${AXIOM_ENV:-local}"
}

check_git_status() {
    log_info "Checking git status..."
    
    if [[ -n "$(git status --porcelain)" ]]; then
        log_warn "Working directory has uncommitted changes"
        git status --short
        read -p "Continue anyway? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    log_info "Current branch: $CURRENT_BRANCH"
}

run_linting() {
    log_info "Running linting checks..."
    
    if command -v npm &> /dev/null; then
        npm run lint --if-present || log_warn "Linting had warnings"
    fi
}

run_type_check() {
    log_info "Running TypeScript type check..."
    
    if [[ -f "$PROJECT_ROOT/tsconfig.json" ]]; then
        npx tsc --noEmit || {
            log_error "TypeScript type check failed"
            exit 1
        }
    fi
}

run_tests() {
    log_info "Running tests..."
    
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        npm test --if-present || {
            log_warn "Tests had failures or no tests configured"
        }
    fi
}

check_security() {
    log_info "Running security checks..."
    
    if grep -r "DEPLOYER_PK\|API_KEY\|SECRET" --include="*.ts" --include="*.js" "$PROJECT_ROOT/pages" 2>/dev/null | grep -v ".env" | grep -v "process.env" | grep -v "// " | head -5; then
        log_warn "Potential hardcoded secrets found - please review"
    fi
    
    if command -v npm &> /dev/null; then
        npm audit --audit-level=high 2>/dev/null || log_warn "npm audit found issues"
    fi
}

check_admin_system() {
    log_info "Checking admin RBAC system..."
    
    if [[ ! -f "$PROJECT_ROOT/lib/server/adminAuth.ts" ]]; then
        log_error "Admin auth module not found"
        exit 1
    fi
    
    if [[ ! -f "$PROJECT_ROOT/lib/server/adminPolicy.ts" ]]; then
        log_error "Admin policy module not found"
        exit 1
    fi
    
    if [[ ! -f "$PROJECT_ROOT/lib/server/proposals/executor.ts" ]]; then
        log_error "Proposal executor module not found"
        exit 1
    fi
    
    log_info "Admin RBAC modules present"
}

generate_changelog() {
    log_info "Generating changelog..."
    
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    
    if [[ -n "$LAST_TAG" ]]; then
        echo "## Changes since $LAST_TAG"
        git log --oneline "$LAST_TAG..HEAD" | head -20
    else
        echo "## Recent commits"
        git log --oneline -20
    fi
}

create_release_notes() {
    local VERSION="$1"
    local NOTES_FILE="$PROJECT_ROOT/releases/v${VERSION}.md"
    
    mkdir -p "$PROJECT_ROOT/releases"
    
    cat > "$NOTES_FILE" << EOF
# Release v${VERSION}

**Release Date:** $(date +%Y-%m-%d)
**Environment:** ${AXIOM_ENV:-local}

## Pre-Release Checklist

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Admin RBAC verified
- [ ] Two-step approval tested
- [ ] Database migrations reviewed
- [ ] Environment variables documented

## Changes

$(generate_changelog)

## Database Migrations

Check \`migrations/\` folder for new SQL files.

## Breaking Changes

None documented.

## Deployment Notes

1. Apply database migrations
2. Verify environment variables
3. Test admin endpoints
4. Verify two-step approval workflow

EOF
    
    log_info "Release notes created: $NOTES_FILE"
}

main() {
    log_info "=== Axiom Release Governance ==="
    
    check_environment
    check_git_status
    run_linting
    run_type_check
    run_tests
    check_security
    check_admin_system
    
    log_info "=== Pre-Release Checks Complete ==="
    
    read -p "Create release notes? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter version number (e.g., 1.0.0): " VERSION
        create_release_notes "$VERSION"
    fi
    
    log_info "Release governance complete"
}

main "$@"
