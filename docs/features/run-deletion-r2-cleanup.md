# Feature Requirement Document - Run Deletion R2 Cleanup Upgrade

- **Feature Name**: Run Deletion R2 Cleanup Upgrade

- **Goal**: Upgrade the Run deletion feature to not only delete run data from the database, but also clean up all associated files stored in Cloudflare R2 (scene images) to prevent orphaned storage and reduce costs.

- **User Story**: As a player, when I delete a run, I want all associated files (scene images) to be automatically deleted from storage, so that I don't accumulate unused files that consume storage space and incur unnecessary costs.

- **Functional Requirements**:

  ## 1. R2 File Cleanup on Run Deletion

  - **Current Behavior**: 
    - `deleteRun()` in `src/app/actions/run.ts` only deletes the run record from the database
    - Scene records are automatically deleted via database cascade (`onDelete: "cascade"` in schema)
    - R2 files (scene images) remain orphaned in storage

  - **Upgraded Behavior**:
    - Before deleting the run from the database, delete all associated R2 files
    - Use `deleteFolder()` utility from `src/lib/storage/r2.ts` to delete the entire run folder
    - R2 folder structure: `${userId}/runs/${runId}/scenes/${sceneId}.webp`
    - Delete folder prefix: `${userId}/runs/${runId}/`
    - Handle R2 deletion errors gracefully (log but don't fail the database deletion)

  ## 2. Implementation Pattern

  - **Reference Implementation**: Follow the same pattern used in `deleteCampaign()` in `src/app/actions/campaign.ts`:
    - Verify ownership and authorization
    - Delete associated R2 files/folders before database deletion
    - Use `deleteFolder()` for bulk deletion
    - Continue with database deletion even if R2 deletion fails (log errors)

  ## 3. Error Handling

  - **R2 Deletion Failures**:
    - Log errors but don't throw exceptions
    - Continue with database deletion even if R2 cleanup fails
    - Return success if database deletion succeeds (R2 cleanup is best-effort)
    - Log detailed error information for debugging

  - **Edge Cases**:
    - Run has no associated scenes (no R2 files) - skip R2 deletion gracefully
    - R2 folder doesn't exist - `deleteFolder()` handles this (returns without error)
    - R2 service unavailable - log error, continue with database deletion
    - Partial R2 deletion (some files deleted, others fail) - log errors, continue

- **Data Requirements**:

  - **R2 Storage Structure**:
    - Scene images stored at: `${userId}/runs/${runId}/scenes/${sceneId}.webp`
    - Folder prefix for deletion: `${userId}/runs/${runId}/`
    - All files under this prefix should be deleted

  - **Database Schema**:
    - `runs` table: stores run metadata
    - `scenes` table: linked to runs via `runId` with `onDelete: "cascade"`
    - `scenes.imageUrl`: stores R2 key (not full URL) for scene images
    - When run is deleted, scenes cascade delete automatically

- **User Flow**:

  1. **Player initiates deletion** → Clicks delete button on run card
  2. **Authorization check** → Verify user owns the run
  3. **R2 cleanup** → Delete all files in `${userId}/runs/${runId}/` folder
  4. **Database deletion** → Delete run record (scenes cascade automatically)
  5. **Success response** → Return success, UI updates to remove run from list

- **Acceptance Criteria**:

  - When a run is deleted, all associated R2 files are deleted from storage
  - R2 folder deletion uses the correct prefix pattern (`${userId}/runs/${runId}/`)
  - Database deletion succeeds even if R2 deletion fails (graceful degradation)
  - Errors during R2 deletion are logged but don't block database deletion
  - No orphaned scene images remain in R2 after run deletion
  - Existing authorization and ownership checks remain intact
  - Implementation follows the same pattern as campaign deletion
  - No breaking changes to existing `deleteRun()` API (same return signature)

- **Edge Cases**:

  - **Run with no scenes**: R2 folder may not exist - `deleteFolder()` handles gracefully
  - **R2 service unavailable**: Log error, continue with database deletion
  - **Partial deletion**: Some files deleted, others fail - log errors, continue
  - **Concurrent deletion**: Multiple delete requests - database constraints prevent issues
  - **Invalid R2 configuration**: Missing env vars - `deleteFolder()` handles gracefully
  - **Large number of scene files**: `deleteFolder()` handles bulk deletion efficiently

- **Technical Implementation Details**:

  - **File Modified**: `src/app/actions/run.ts`
    - Updated `deleteRun()` function to include R2 cleanup
    - Imported `deleteFolder` from `@/lib/storage/r2`
    - Added R2 folder deletion before database deletion
    - Added error handling for R2 operations

  - **Implementation Steps**:
    1. Import `deleteFolder` from `@/lib/storage/r2`
    2. After ownership verification, before database deletion:
       - Construct folder prefix: `${userProfile.id}/runs/${runId}/`
       - Call `deleteFolder(folderPrefix)` with error handling
    3. Log errors but don't throw (allow database deletion to proceed)
    4. Continue with existing database deletion logic

  - **Code Pattern** (following campaign deletion):
    ```typescript
    // Delete entire run folder from R2
    const runFolderPrefix = `${userProfile.id}/runs/${runId}/`;
    try {
      await deleteFolder(runFolderPrefix);
    } catch (error) {
      // Log error but don't fail deletion
      console.error("Error deleting run folder from R2:", error);
    }
    
    // Delete run from database (scenes cascade automatically)
    await db.delete(runs).where(eq(runs.id, runId));
    ```

- **Dependencies**:

  - Existing R2 storage integration (`src/lib/storage/r2.ts`)
  - `deleteFolder()` utility function (already implemented)
  - Database schema with cascade delete for scenes
  - User profile system for user ID retrieval

- **Files Modified**:

  - `src/app/actions/run.ts` - Updated `deleteRun()` function to include R2 cleanup

- **Testing Requirements**:

  - Test run deletion with associated scene images (verify R2 files are deleted)
  - Test run deletion with no scenes (verify graceful handling)
  - Test run deletion when R2 service is unavailable (verify database deletion still succeeds)
  - Test authorization checks remain intact
  - Test error logging when R2 deletion fails
  - Test concurrent deletion attempts
  - Verify no orphaned files remain in R2 after deletion

- **Non-Functional Requirements**:

  - **Performance**: R2 deletion should not significantly slow down run deletion (< 2 seconds for typical number of scenes)
  - **Reliability**: Database deletion should succeed even if R2 deletion fails
  - **Cost**: Prevents accumulation of orphaned files, reducing storage costs
  - **Maintainability**: Follows existing pattern from campaign deletion for consistency

