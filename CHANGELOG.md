# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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