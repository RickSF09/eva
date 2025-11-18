# ✅ Call Recordings Storage Setup - Complete

## What Was Done

### ✅ Database Changes (COMPLETED)

1. **Added Column**: `recording_storage_path` to `post_call_reports` table
   - Type: `TEXT`
   - Nullable: `YES`
   - Indexed for performance

2. **Migration Applied**: `add_recording_storage_path`
   - Status: ✅ Success

### ✅ Storage RLS Policies (COMPLETED)

Created 4 policies for the `recordings` bucket:

1. **"Service role can upload recordings"** (INSERT)
   - Allows authenticated users/service role to upload files

2. **"Users can download recordings for their organization elders"** (SELECT)
   - B2B users can access recordings for elders in their organization

3. **"B2C users can download recordings for own elders"** (SELECT)
   - B2C users can access recordings for their own elders

4. **"Service role can delete recordings"** (DELETE)
   - Allows cleanup of old recordings

**Migration Applied**: `create_recording_storage_policies_v2`
- Status: ✅ Success

### ✅ Storage Bucket

- **Bucket Name**: `recordings`
- **Type**: Private
- **Allowed MIME Types**: `audio/*`
- **Status**: Ready to use

---

## What You Need to Do Next

### 1. Update n8n Workflow

Follow the detailed guide in: **`N8N_RECORDING_STORAGE_WORKFLOW.md`**

**Quick Summary**:
- Add node to extract file extension
- Add node to upload to Supabase Storage
- Add node to update database with storage path
- (Optional) Add node to create signed URL

**Key Configuration**:
- **Upload URL**: `https://oufwwkusbvevlseltrme.supabase.co/storage/v1/object/recordings/{execution_id}/recording.{ext}`
- **Service Role Key**: Use your existing `SUPABASE_SERVICE_ROLE_KEY`
- **Path Format**: `{execution_id}/recording.mp3`

### 2. Update Frontend (Optional - for better UX)

Create helper function to get signed URLs:

```typescript
// src/lib/storage.ts
import { supabase } from './supabase'

export async function getRecordingUrl(
  storagePath: string | null,
  twilioUrl: string | null
): Promise<string | null> {
  if (storagePath) {
    const { data } = await supabase.storage
      .from('recordings')
      .createSignedUrl(storagePath, 3600) // 1 hour expiry
    
    if (data?.signedUrl) {
      return data.signedUrl
    }
  }
  
  return twilioUrl
}
```

Update `CallReportModal.tsx` to use this function (see `CALL_RECORDINGS_STORAGE_GUIDE.md` for details).

---

## Database Schema

### `post_call_reports` Table

**New Column**:
```sql
recording_storage_path TEXT NULL
```

**Example Values**:
- `550e8400-e29b-41d4-a716-446655440000/recording.mp3`
- `123e4567-e89b-12d3-a456-426614174000/recording.wav`

**Storage Path Format**:
```
{execution_id}/recording.{extension}
```

---

## Storage Structure

```
recordings/
  ├── {execution_id_1}/
  │   └── recording.mp3
  ├── {execution_id_2}/
  │   └── recording.mp3
  └── ...
```

---

## Testing Checklist

- [ ] Test n8n workflow with one recording
- [ ] Verify file appears in Supabase Storage dashboard
- [ ] Check database: `SELECT recording_storage_path FROM post_call_reports WHERE execution_id = '...'`
- [ ] Test signed URL generation (if implemented)
- [ ] Verify RLS policies work (try accessing as different users)
- [ ] Test audio playback in frontend
- [ ] Monitor for errors in production

---

## Important URLs

- **Supabase Project**: `https://oufwwkusbvevlseltrme.supabase.co`
- **Storage API**: `https://oufwwkusbvevlseltrme.supabase.co/storage/v1`
- **Upload Endpoint**: `POST /storage/v1/object/recordings/{path}`
- **Signed URL Endpoint**: `POST /storage/v1/object/sign/recordings/{path}`

---

## Files Created

1. **`CALL_RECORDINGS_STORAGE_GUIDE.md`** - Complete setup guide
2. **`N8N_RECORDING_STORAGE_WORKFLOW.md`** - Detailed n8n node-by-node guide
3. **`SETUP_COMPLETE_SUMMARY.md`** - This file

---

## Next Steps

1. ✅ **Database**: Done
2. ✅ **Storage Policies**: Done
3. ⏳ **n8n Workflow**: Follow `N8N_RECORDING_STORAGE_WORKFLOW.md`
4. ⏳ **Frontend Updates**: Optional (see guide)
5. ⏳ **Testing**: Test with real recordings
6. ⏳ **Production**: Enable for all calls

---

## Support

If you encounter issues:

1. Check n8n workflow logs
2. Verify Supabase Storage dashboard
3. Test RLS policies with SQL:
   ```sql
   SELECT * FROM storage.objects WHERE bucket_id = 'recordings';
   ```
4. Check database updates:
   ```sql
   SELECT execution_id, recording_storage_path, recording_url 
   FROM post_call_reports 
   WHERE recording_storage_path IS NOT NULL 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

---

## Migration Status

- ✅ Database column added
- ✅ Storage policies created
- ✅ Bucket verified
- ⏳ n8n workflow pending
- ⏳ Frontend updates pending
- ⏳ Production testing pending

**You're ready to configure n8n!** 🚀

