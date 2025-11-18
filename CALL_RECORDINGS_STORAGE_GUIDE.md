# Call Recordings Storage Setup Guide

This guide explains how to store call recording files in Supabase Storage instead of just saving Twilio links.

## Current State

- **Storage Bucket**: `recordings` bucket already exists (private, accepts `audio/*` files)
- **Database**: `post_call_reports` table has `recording_url` field (currently stores Twilio URLs)
- **Workflow**: n8n downloads and transcribes recordings after each call

## Overview

You'll need to:
1. **Modify the database** to add a field for the Supabase Storage path
2. **Set up Storage RLS policies** to control access to recordings
3. **Update n8n workflow** to upload recordings to Supabase Storage
4. **Update frontend** to use Supabase Storage URLs instead of Twilio links

---

## Step 1: Database Schema Changes

### Option A: Add New Column (Recommended)
Add a new column to store the Supabase Storage path while keeping the Twilio URL for reference:

```sql
-- Add column for Supabase Storage path
ALTER TABLE post_call_reports 
ADD COLUMN recording_storage_path TEXT;

-- Add index for faster lookups
CREATE INDEX idx_post_call_reports_recording_storage_path 
ON post_call_reports(recording_storage_path) 
WHERE recording_storage_path IS NOT NULL;

-- Optional: Add comment
COMMENT ON COLUMN post_call_reports.recording_storage_path IS 
'Path to recording file in Supabase Storage (e.g., recordings/call-execution-id/recording.mp3)';
```

### Option B: Replace Existing Column
If you want to completely replace `recording_url` with Storage paths:

```sql
-- Rename existing column for backup
ALTER TABLE post_call_reports 
RENAME COLUMN recording_url TO recording_url_twilio;

-- Add new column for Supabase Storage
ALTER TABLE post_call_reports 
ADD COLUMN recording_url TEXT;

-- Migrate existing data (optional - only if you want to migrate old recordings)
-- This would require downloading from Twilio and uploading to Supabase
```

**Recommendation**: Use Option A to maintain backward compatibility and have both URLs available during migration.

---

## Step 2: Supabase Storage Setup

### 2.1 Verify Bucket Configuration

The `recordings` bucket already exists. Verify it's configured correctly:

```sql
-- Check bucket settings
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE name = 'recordings';
```

Expected:
- `public`: `false` (private bucket)
- `allowed_mime_types`: `["audio/*"]`
- `file_size_limit`: `null` (or set a reasonable limit like 50MB)

### 2.2 Create Storage RLS Policies

You need policies that allow:
- **Upload**: Service role or authenticated users uploading recordings
- **Download**: Users who have access to the related `post_call_report` (same org/elder)

```sql
-- Policy: Allow authenticated users to upload recordings
-- This will be used by n8n with service role key
CREATE POLICY "Service role can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recordings'
);

-- Policy: Users can download recordings for their organization's elders
CREATE POLICY "Users can download recordings for their organization elders"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'recordings' AND
  -- Extract execution_id or report_id from path and check access
  -- Path format: recordings/{execution_id}/{filename}
  (storage.foldername(name))[1] IN (
    SELECT ce.id::text
    FROM call_executions ce
    JOIN elders e ON ce.elder_id = e.id
    JOIN user_organizations uo ON e.org_id = uo.org_id
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND uo.active = true
  )
);

-- Policy: B2C users can download recordings for their own elders
CREATE POLICY "B2C users can download recordings for own elders"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'recordings' AND
  (storage.foldername(name))[1] IN (
    SELECT ce.id::text
    FROM call_executions ce
    JOIN elders e ON ce.elder_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

-- Policy: Allow service role to delete recordings (for cleanup)
CREATE POLICY "Service role can delete recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'recordings');
```

**Note**: The RLS policies use `storage.foldername(name)` to extract the folder structure. Adjust the path extraction logic based on your actual file path structure.

### 2.3 Alternative: Simpler Path-Based Policy

If the above folder-based policy is too complex, you can use a simpler approach by storing the full path in the database and checking it:

```sql
-- Simpler policy: Check if path matches any accessible execution_id
CREATE POLICY "Users can download accessible recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'recordings' AND
  EXISTS (
    SELECT 1
    FROM post_call_reports pcr
    JOIN elders e ON pcr.elder_id = e.id
    LEFT JOIN user_organizations uo ON e.org_id = uo.org_id
    LEFT JOIN users u ON uo.user_id = u.id
    WHERE 
      pcr.recording_storage_path = storage.objects.name
      AND (
        -- B2B: User is in same org
        (uo.active = true AND u.auth_user_id = auth.uid())
        OR
        -- B2C: User owns the elder
        (e.user_id = u.id AND u.auth_user_id = auth.uid())
      )
  )
);
```

---

## Step 3: n8n Workflow Updates

### 3.1 Add Supabase Storage Upload Step

After downloading the recording from Twilio, add these steps in n8n:

1. **Download Recording from Twilio** (existing step)
   - Download the audio file from Twilio URL

2. **Upload to Supabase Storage** (NEW step)
   - **Node Type**: Supabase (or HTTP Request)
   - **Operation**: Upload file to Storage
   - **Bucket**: `recordings`
   - **Path**: `{{ $json.execution_id }}/recording.{{ $json.file_extension }}`
     - Example: `550e8400-e29b-41d4-a716-446655440000/recording.mp3`
   - **File**: Binary data from Twilio download
   - **Content Type**: `audio/mpeg` (or detect from file)

3. **Get Public URL** (NEW step)
   - After upload, get the public URL or create a signed URL
   - For private buckets, you'll need to create signed URLs

4. **Update Database** (NEW step)
   - Update `post_call_reports` table
   - Set `recording_storage_path` to the Storage path
   - Keep `recording_url` as Twilio URL (or update to Supabase URL)

### 3.2 n8n Supabase Storage Upload Example

**Using Supabase Node** (if available):
```
- Node: Supabase
- Operation: Upload File
- Bucket: recordings
- Path: {{ $json.execution_id }}/recording.mp3
- File: {{ $binary.data }} (from Twilio download)
```

**Using HTTP Request** (if Supabase node doesn't support Storage):
```
- Method: POST
- URL: https://{{ SUPABASE_PROJECT_ID }}.supabase.co/storage/v1/object/recordings/{{ $json.execution_id }}/recording.mp3
- Headers:
  - Authorization: Bearer {{ SUPABASE_SERVICE_ROLE_KEY }}
  - apikey: {{ SUPABASE_SERVICE_ROLE_KEY }}
  - Content-Type: audio/mpeg
- Body: Binary (from Twilio download)
```

### 3.3 Create Signed URL (for private bucket)

After uploading, create a signed URL that expires after a reasonable time:

```
- Method: POST
- URL: https://{{ SUPABASE_PROJECT_ID }}.supabase.co/storage/v1/object/sign/recordings/{{ $json.execution_id }}/recording.mp3
- Headers:
  - Authorization: Bearer {{ SUPABASE_SERVICE_ROLE_KEY }}
  - apikey: {{ SUPABASE_SERVICE_ROLE_KEY }}
- Body (JSON):
  {
    "expiresIn": 31536000  // 1 year in seconds
  }
```

Store the signed URL in `recording_url` field, or store the path and generate signed URLs on-demand in your frontend.

---

## Step 4: Frontend Updates

### 4.1 Update TypeScript Types

Update `src/types/database.ts` to include the new field:

```typescript
post_call_reports: {
  Row: {
    // ... existing fields ...
    recording_url: string | null
    recording_storage_path: string | null  // NEW
  }
  // ... Insert and Update types ...
}
```

### 4.2 Create Helper Function for Recording URLs

Create a utility function to get recording URLs:

```typescript
// src/lib/storage.ts
import { supabase } from './supabase'

export async function getRecordingUrl(
  storagePath: string | null,
  twilioUrl: string | null
): Promise<string | null> {
  // Prefer Supabase Storage if available
  if (storagePath) {
    // For private bucket, create signed URL
    const { data } = await supabase.storage
      .from('recordings')
      .createSignedUrl(storagePath, 3600) // 1 hour expiry
    
    if (data?.signedUrl) {
      return data.signedUrl
    }
  }
  
  // Fallback to Twilio URL
  return twilioUrl
}
```

### 4.3 Update CallReportModal Component

Update `src/components/calls/CallReportModal.tsx`:

```typescript
// Add state for recording URL
const [recordingUrl, setRecordingUrl] = useState<string | null>(null)

// Fetch recording URL when component mounts
useEffect(() => {
  async function loadRecordingUrl() {
    const url = await getRecordingUrl(
      report.recording_storage_path,
      report.recording_url
    )
    setRecordingUrl(url)
  }
  
  if (report.recording_storage_path || report.recording_url) {
    loadRecordingUrl()
  }
}, [report.recording_storage_path, report.recording_url])

// Update the recording section
{recordingUrl && (
  <section>
    <h3 className="text-sm font-semibold text-gray-900 mb-2">Recording</h3>
    <audio controls src={recordingUrl} className="w-full">
      Your browser does not support the audio element.
    </audio>
    <a 
      href={recordingUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-blue-600 hover:underline text-sm mt-2 block"
    >
      Open call recording in new tab
    </a>
  </section>
)}
```

---

## Step 5: File Path Structure

Recommended path structure for recordings:

```
recordings/
  {execution_id}/
    recording.mp3          # Main recording file
    recording.json        # Optional: metadata, transcription, etc.
```

Benefits:
- Organized by execution (one folder per call)
- Easy to find related files
- Can store additional files (transcriptions, metadata) in same folder
- RLS policies can check execution_id easily

Alternative structure:
```
recordings/
  {elder_id}/
    {execution_id}.mp3
```

---

## Step 6: Migration Strategy

### For Existing Recordings

If you want to migrate existing recordings from Twilio to Supabase:

1. **Create migration script** (run in n8n or as a one-time job):
   - Query all `post_call_reports` with `recording_url` but no `recording_storage_path`
   - Download from Twilio
   - Upload to Supabase Storage
   - Update database

2. **Migration SQL**:
```sql
-- Find records to migrate
SELECT 
  id,
  execution_id,
  recording_url,
  elder_id
FROM post_call_reports
WHERE recording_url IS NOT NULL 
  AND recording_storage_path IS NULL
ORDER BY created_at DESC;
```

3. **Run migration gradually**:
   - Process in batches (e.g., 100 at a time)
   - Monitor storage usage
   - Keep Twilio URLs as backup

---

## Step 7: Storage Costs & Limits

### Considerations

- **Storage Size**: Audio files are typically 1-5 MB per minute
  - 10-minute call ≈ 10-50 MB
  - 1000 calls/month ≈ 10-50 GB/month

- **Supabase Storage Limits**:
  - Free tier: 1 GB
  - Pro tier: 100 GB included
  - Additional storage: $0.021/GB/month

- **Best Practices**:
  - Set file size limits on bucket (e.g., 50 MB)
  - Consider compression (MP3 vs WAV)
  - Implement retention policy (delete old recordings after X days)
  - Archive to cold storage for long-term retention

### Retention Policy Example

```sql
-- Function to delete old recordings (run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_recordings()
RETURNS void AS $$
DECLARE
  cutoff_date TIMESTAMP := NOW() - INTERVAL '90 days';
  record_path TEXT;
BEGIN
  -- Find old recordings
  FOR record_path IN
    SELECT recording_storage_path
    FROM post_call_reports
    WHERE recording_storage_path IS NOT NULL
      AND created_at < cutoff_date
  LOOP
    -- Delete from storage (requires service role)
    -- This would be done via API call or Edge Function
    -- DELETE FROM storage.objects WHERE name = record_path;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## Step 8: Testing Checklist

- [ ] Upload test recording via n8n
- [ ] Verify file appears in Supabase Storage dashboard
- [ ] Test RLS policies (try accessing as different users)
- [ ] Verify signed URLs work in frontend
- [ ] Test audio playback in browser
- [ ] Check file size limits
- [ ] Verify database updates correctly
- [ ] Test error handling (failed uploads, missing files)

---

## Summary

**Database Changes**:
- Add `recording_storage_path` column to `post_call_reports`
- Keep `recording_url` for backward compatibility

**Storage Setup**:
- Use existing `recordings` bucket
- Create RLS policies for access control
- Set appropriate file size limits

**n8n Workflow**:
- Download from Twilio (existing)
- Upload to Supabase Storage (new)
- Update database with storage path (new)
- Create signed URL (new)

**Frontend**:
- Add helper function to get recording URLs
- Update components to use Supabase Storage URLs
- Add audio player component

**Migration**:
- Optionally migrate existing recordings
- Keep Twilio URLs as fallback

---

## Next Steps

1. Review and approve this plan
2. Run database migration (Step 1)
3. Set up Storage RLS policies (Step 2)
4. Update n8n workflow (Step 3)
5. Update frontend code (Step 4)
6. Test end-to-end
7. Deploy and monitor

