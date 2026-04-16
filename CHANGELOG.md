# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.1] - 2026-04-16

### Fixed
- Resolve strict TypeScript errors (`noUncheckedIndexedAccess`) and ESLint violations in new tools
- Fix publish workflow: upgrade Node.js 18 to 22 (vitest 4.x requirement)
- Fix CI workflow: drop Node 18 from test matrix, minimum now Node 20
- Fix server version string (was stuck at 1.6.0)

### Changed
- Extract duplicated `colToLetter`, `gridRangeToA1`, and sheet-not-found logic into shared `range-helpers.ts`
- Reduce bundle size by removing code duplication across tool files
- Add unit tests for all new read/snapshot tools and shared utilities
- Document `sheets_get_basic_filter` and `sheets_get_data_validation` in README
- Update minimum Node.js requirement to 20.0.0

## [1.7.0] - 2026-04-16

### Added
- **9 new read/snapshot tools** (contributed by @marcin-uliasz in #124):
  - `sheets_get_merged_cells` — list all merged cell ranges
  - `sheets_get_sheet_dimensions` — column widths, row heights, frozen rows/cols
  - `sheets_get_sheet_formatting` — raw cell formatting for a range
  - `sheets_get_conditional_formatting` — conditional formatting rules and banded ranges
  - `sheets_get_full_sheet_snapshot` — comprehensive one-shot sheet metadata
  - `sheets_get_sheet_structure` — lightweight structural metadata
  - `sheets_get_formatting_compact` — run-length encoded formatting (90%+ smaller)
  - `sheets_get_basic_filter` — AutoFilter configuration
  - `sheets_get_data_validation` — data validation rules (checkboxes, dropdowns)
- MCP prompts and resources support
- Claude Code plugin configuration
- Input schema validation tests for nested array items

### Fixed
- Nested array `items` missing in tool schemas for `sheets_append_values`, `sheets_update_values`, `sheets_insert_rows`, `sheets_batch_update_values` (#122)

### Changed
- Migrate ESLint to flat config API
- Externalize `dotenv` in build to prevent double-loading
- Bump version to 1.7.0

## [1.5.3] - 2025-01-04

### Added
- **Simplified Private Key Authentication**: Support for direct private key + email authentication
  - New `GOOGLE_PRIVATE_KEY` and `GOOGLE_CLIENT_EMAIL` environment variables for simplified authentication
  - Most user-friendly authentication method requiring only two fields from service account JSON
  - Automatic handling of escaped newlines in private key (`\\n` → `\n`)
  - Comprehensive validation for private key format (BEGIN/END markers) and email format
  - `GOOGLE_PROJECT_ID` is now optional when using this authentication method

### Changed
- Enhanced authentication validation to support three authentication methods (file path, full JSON string, or private key + email)
- Updated error messages to include the new authentication option
- Improved documentation with detailed examples for all three authentication approaches
- Updated `.env.example` to show all three authentication options

## [1.5.0] - 2025-09-22

### Added
- **New Tool: sheets_insert_rows** - Insert new rows at specific position with optional data
  - Support for inserting rows before or after a specified anchor point
  - Optional data population for newly inserted rows
  - Inherit formatting from previous row option
  - Flexible value input options (RAW or USER_ENTERED)

### Changed
- **Enhanced sheets_append_values Description** - Added explicit warning about default OVERWRITE behavior
  - Clarified that default `insertDataOption` is `OVERWRITE`
  - Added note about using `INSERT_ROWS` option to insert new rows instead of overwriting

### Documentation
- Added detailed documentation for sheets_insert_rows tool with examples
- Updated README to highlight the default OVERWRITE behavior in sheets_append_values

## [1.4.0] - 2025-08-11

### Added
- **HYPERLINK Formula Support**: New tools for inserting clickable links and dates with locale-aware formatting
  - `sheets_insert_link` - Insert HYPERLINK formulas with proper separator support (EU/US)
  - `sheets_insert_date` - Insert formatted dates with automatic parsing and locale support
  - Support for EU format (semicolon separator) and US format (comma separator)
  - Default to EU format (`useEUFormat: true`) for better international compatibility
  - Automatic date parsing for various formats (ISO, EU, US) and relative dates (today, tomorrow, yesterday)

### Fixed
- HYPERLINK formula parsing errors in non-US locales
- Date formatting issues for different regional settings

## [1.3.1] - 2025-07-12

### Added
- **Alternative Authentication Method**: Support for service account credentials as JSON string
  - New `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable for JSON string authentication
  - Useful for containerized environments, CI/CD pipelines, and deployment scenarios where file management is difficult
  - Falls back to JSON string authentication when `GOOGLE_APPLICATION_CREDENTIALS` is not provided
  - Automatic project ID extraction from service account credentials
  - Enhanced validation with detailed error messages for invalid JSON format

### Changed
- Updated authentication validation to support both file-based and JSON string methods
- Enhanced documentation with examples for both authentication approaches
- Updated `.env.example` to show both authentication options

## [1.3.0] - 2025-01-29

### Added
- **Chart Legend Support**: Series titles for meaningful legend labels
  - Optional `title` property for chart series to specify custom legend labels
  - Auto-detection of series names from header row above data ranges
  - Smart range expansion to include header rows for proper legend labeling
  - Support for both explicit titles and automatic detection from spreadsheet headers

### Fixed
- **Sheet Name Handling**: Proper support for sheet names containing spaces
  - Fixed extraction of quoted sheet names (e.g., "My Sheet"!A1:B5) 
  - Removed surrounding quotes from sheet names during parsing
  - Enhanced error messages to show available sheets when sheet not found
- **Chart Position API**: Corrected chart position structure for Google Sheets API
  - Removed conflicting root-level `sheetId` from position object
  - Updated to use only `overlayPosition.anchorCell.sheetId` structure
  - Fixed "oneof field 'location' is already set" API errors
- **Type Safety**: Enhanced TypeScript validation and error handling
  - Added proper null/undefined handling for series title detection
  - Improved range parsing with comprehensive error checking
  - Updated validators to support new series title functionality

### Changed
- Updated tool descriptions to explain series naming and sheet name quoting
- Enhanced input schema documentation with examples for proper usage
- Improved chart creation logic to handle both basic and advanced use cases

## [1.1.0] - 2025-01-28

### Added
- Central type definitions in `src/types/common.ts` for shared types across the codebase
- Centralized error messages in `src/utils/error-messages.ts` for consistency
- Generic validation system in `src/utils/validation-helpers.ts` to reduce code duplication
- Response formatting helpers in `src/utils/response-helpers.ts` for consistent API responses
- **Batch operations**:
  - `sheets_batch_delete_sheets` - Delete multiple sheets in a single operation
  - `sheets_batch_format_cells` - Format multiple cell ranges in a single operation
- **Chart management**:
  - `sheets_create_chart` - Create charts (COLUMN, BAR, LINE, AREA, PIE, SCATTER, COMBO, HISTOGRAM, CANDLESTICK, WATERFALL)
  - `sheets_update_chart` - Update existing charts (position, type, title, series, etc.)
  - `sheets_delete_chart` - Delete charts from spreadsheets

### Changed
- Refactored validators to use generic validation system (`createRangeValidator`, `createSheetValidator`)
- Updated all type definitions to use shared types from `common.ts`
- Standardized error messages across all validators
- Improved response formatting consistency using helper functions

### Fixed
- Eliminated type definition redundancies between `types/tools.ts` and `types/sheets.ts`
- Removed duplicate validation logic across validator functions
- Fixed inconsistent error message formatting

## [1.0.0] - 2025-01-27

### Initial Release
- Google Sheets MCP server implementation
- Support for all major Google Sheets operations:
  - Reading and writing values
  - Batch operations
  - Sheet management (create, delete, duplicate)
  - Cell formatting
  - Conditional formatting
  - Merging cells
- Comprehensive test suite
- Full TypeScript support
- Error handling and validation