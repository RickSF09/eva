# n8n Workflow: Upload Call Recordings to Supabase Storage

This guide provides step-by-step instructions for updating your n8n workflow to upload call recordings to Supabase Storage.

## Prerequisites

1. **Supabase Credentials** (already configured):
   - Project URL: `https://oufwwkusbvevlseltrme.supabase.co`
   - Service Role Key: (use your existing SUPABASE_SERVICE_ROLE_KEY)
   - Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Znd3a3VzYnZldmxzZWx0cm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyODI5NDYsImV4cCI6MjA2Njg1ODk0Nn0.PaBu9UewO83bqe7-jW3xCAIBaAJHuUx-V2qOxAXUdnw`

2. **Storage Bucket**: `recordings` (already exists)

3. **Database Column**: `recording_storage_path` (already added to `post_call_reports`)

---

## Workflow Overview

Your existing workflow likely has these steps:
1. Download recording from Twilio
2. Transcribe recording
3. (Other processing...)

**Add these NEW steps after downloading from Twilio:**
- Upload to Supabase Storage
- Create signed URL
- Update database with storage path

---

## Node-by-Node Configuration

### Node 1: Download Recording from Twilio (EXISTING)

**Node Type**: HTTP Request

**Configuration**:
- **Method**: GET
- **URL**: `{{ $json.recording_url }}` (or wherever your Twilio URL is stored)
- **Authentication**: Basic Auth (if needed)
  - Username: Your Twilio Account SID
  - Password: Your Twilio Auth Token
- **Response Format**: File
- **Options**:
  - **Response**: File
  - **Binary Property**: `data`

**Output**: Binary file data in `$binary.data`

---

### Node 2: Extract File Extension (NEW)

**Node Type**: Code

**Purpose**: Determine file extension from Twilio URL or content type

**Mode**: Run Once for All Items

**JavaScript Code**:
```javascript
// Get the recording URL from previous node
const recordingUrl = $input.item.json.recording_url || $input.item.json.twilio_recording_url;

// Extract file extension from URL
let fileExtension = 'mp3'; // default

if (recordingUrl) {
  // Try to extract from URL (e.g., .mp3, .wav)
  const urlMatch = recordingUrl.match(/\.([a-z0-9]+)(?:\?|$)/i);
  if (urlMatch) {
    fileExtension = urlMatch[1].toLowerCase();
  }
}

// If no extension found, check content type from Twilio response
// You might need to check headers from previous HTTP request
const contentType = $input.item.json.contentType || '';
if (contentType.includes('wav')) {
  fileExtension = 'wav';
} else if (contentType.includes('mp3') || contentType.includes('mpeg')) {
  fileExtension = 'mp3';
}

return {
  json: {
    fileExtension: fileExtension,
    executionId: $input.item.json.execution_id,
    recordingUrl: recordingUrl,
    // Pass through all other data
    ...$input.item.json
  },
  binary: $input.item.binary
};
```

**Output**: 
- `$json.fileExtension`: `"mp3"` or `"wav"`
- `$json.executionId`: Execution ID for path
- `$binary.data`: Binary file data

---

### Node 3: Upload to Supabase Storage (NEW)

**Node Type**: HTTP Request

**Purpose**: Upload the recording file to Supabase Storage

**Configuration**:
- **Method**: POST
- **URL**: `https://oufwwkusbvevlseltrme.supabase.co/storage/v1/object/recordings/{{ $json.executionId }}/recording.{{ $json.fileExtension }}`
- **Authentication**: Header Auth
  - **Name**: `Authorization`
  - **Value**: `Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
- **Additional Headers**:
  - **Name**: `apikey`
  - **Value**: `{{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
  - **Name**: `Content-Type`
  - **Value**: `audio/mpeg` (or `audio/wav` if wav file)
  - **Name**: `x-upsert`
  - **Value**: `true` (allows overwriting if file exists)
- **Body Content Type**: Binary Data
- **Binary Property**: `data`
- **Response Format**: JSON

**Example URL**:
```
https://oufwwkusbvevlseltrme.supabase.co/storage/v1/object/recordings/550e8400-e29b-41d4-a716-446655440000/recording.mp3
```

**Expected Response**:
```json
{
  "Key": "550e8400-e29b-41d4-a716-446655440000/recording.mp3",
  "id": "550e8400-e29b-41d4-a716-446655440000/recording.mp3"
}
```

**Error Handling**:
- If upload fails, log error but continue workflow
- Check response status code (should be 200)

---

### Node 4: Prepare Storage Path (NEW)

**Node Type**: Set

**Purpose**: Prepare the storage path for database update

**Configuration**:
- **Keep Only Set Fields**: `false` (keep all existing data)
- **Values to Set**:
  - **Name**: `storagePath`
  - **Value**: `{{ $json.executionId }}/recording.{{ $json.fileExtension }}`
  - **Name**: `fullStoragePath`
  - **Value**: `recordings/{{ $json.executionId }}/recording.{{ $json.fileExtension }}`

**Output**:
- `$json.storagePath`: `"550e8400-e29b-41d4-a716-446655440000/recording.mp3"`
- `$json.fullStoragePath`: `"recordings/550e8400-e29b-41d4-a716-446655440000/recording.mp3"`

---

### Node 5: Create Signed URL (NEW - Optional but Recommended)

**Node Type**: HTTP Request

**Purpose**: Create a signed URL for accessing the private recording

**Configuration**:
- **Method**: POST
- **URL**: `https://oufwwkusbvevlseltrme.supabase.co/storage/v1/object/sign/recordings/{{ $json.storagePath }}`
- **Authentication**: Header Auth
  - **Name**: `Authorization`
  - **Value**: `Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
- **Additional Headers**:
  - **Name**: `apikey`
  - **Value**: `{{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
  - **Name**: `Content-Type`
  - **Value**: `application/json`
- **Body Content Type**: JSON
- **Body Parameters**:
  - **expiresIn**: `31536000` (1 year in seconds, adjust as needed)

**Expected Response**:
```json
{
  "signedURL": "https://oufwwkusbvevlseltrme.supabase.co/storage/v1/object/sign/recordings/550e8400-e29b-41d4-a716-446655440000/recording.mp3?token=..."
}
```

**Note**: You can skip this step if you want to generate signed URLs on-demand in your frontend instead.

---

### Node 6: Update Database with Storage Path (NEW)

**Node Type**: Supabase (or HTTP Request)

**Option A: Using Supabase Node** (if available):

**Configuration**:
- **Operation**: Update
- **Table**: `post_call_reports`
- **Update Key**: `execution_id`
- **Update Key Value**: `{{ $json.executionId }}`
- **Fields to Update**:
  - **recording_storage_path**: `{{ $json.storagePath }}`
  - **recording_url**: `{{ $json.signedURL || $json.recordingUrl }}` (use signed URL if created, else keep Twilio URL)

**Option B: Using HTTP Request**:

**Configuration**:
- **Method**: PATCH
- **URL**: `https://oufwwkusbvevlseltrme.supabase.co/rest/v1/post_call_reports?execution_id=eq.{{ $json.executionId }}`
- **Authentication**: Header Auth
  - **Name**: `Authorization`
  - **Value**: `Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
- **Additional Headers**:
  - **Name**: `apikey`
  - **Value**: `{{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
  - **Name**: `Content-Type`
  - **Value**: `application/json`
  - **Name**: `Prefer`
  - **Value**: `return=minimal`
- **Body Content Type**: JSON
- **Body Parameters**:
  ```json
  {
    "recording_storage_path": "{{ $json.storagePath }}",
    "recording_url": "{{ $json.signedURL || $json.recordingUrl }}"
  }
  ```

**Expected Response**: Empty or minimal response (status 204 or 200)

---

## Complete Workflow Structure

```
[Trigger/Webhook]
    ↓
[Download from Twilio] (EXISTING)
    ↓
[Extract File Extension] (NEW)
    ↓
[Upload to Supabase Storage] (NEW)
    ↓
[Prepare Storage Path] (NEW)
    ↓
[Create Signed URL] (NEW - Optional)
    ↓
[Update Database] (NEW)
    ↓
[Continue with transcription/other steps] (EXISTING)
```

---

## Environment Variables Needed in n8n

Make sure these are set in your n8n environment:

- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for admin operations)
- `SUPABASE_URL`: `https://oufwwkusbvevlseltrme.supabase.co` (optional, can hardcode)

---

## Error Handling

### Add Error Handling Node

**Node Type**: Error Trigger

**Placement**: After each critical step (Upload, Update Database)

**Configuration**:
- **Continue On Fail**: `true` (for non-critical steps)
- **Error Workflow**: (optional) Create separate error handling workflow

**Error Handling Strategy**:
1. **Upload Fails**: Log error, continue with Twilio URL only
2. **Database Update Fails**: Retry once, then log error
3. **Signed URL Fails**: Continue without signed URL (frontend can generate on-demand)

---

## Testing the Workflow

### Test Data

Use this test payload:
```json
{
  "execution_id": "test-execution-id-123",
  "recording_url": "https://api.twilio.com/2010-04-01/Accounts/ACxxx/Recordings/RExxx.mp3"
}
```

### Test Steps

1. **Test Upload**: Verify file appears in Supabase Storage dashboard
   - Go to: Storage → recordings bucket
   - Should see: `test-execution-id-123/recording.mp3`

2. **Test Database Update**: Check `post_call_reports` table
   ```sql
   SELECT execution_id, recording_storage_path, recording_url 
   FROM post_call_reports 
   WHERE execution_id = 'test-execution-id-123';
   ```

3. **Test Signed URL**: Verify URL works and is accessible
   - Copy signed URL from database
   - Open in browser or use curl
   - Should download/play audio file

4. **Test RLS Policies**: Verify access control works
   - Try accessing as different users
   - Should only work for users in same org/own elder

---

## Alternative: Simplified Workflow (Without Signed URLs)

If you prefer to generate signed URLs on-demand in your frontend, you can skip Node 5 and use this simpler flow:

```
[Download from Twilio]
    ↓
[Extract File Extension]
    ↓
[Upload to Supabase Storage]
    ↓
[Update Database with storage_path only]
    ↓
[Continue workflow]
```

Then generate signed URLs in your frontend when needed (see frontend guide).

---

## Troubleshooting

### Issue: Upload fails with 401 Unauthorized

**Solution**: 
- Check that `SUPABASE_SERVICE_ROLE_KEY` is correct
- Verify Authorization header format: `Bearer <key>`
- Ensure apikey header is also set

### Issue: Upload fails with 400 Bad Request

**Solution**:
- Check file size (bucket might have limits)
- Verify content-type matches file type
- Ensure path format is correct: `{execution_id}/recording.{ext}`

### Issue: RLS Policy blocks download

**Solution**:
- Verify execution_id exists in `call_executions` table
- Check user has access to elder (same org or owns elder)
- Test with service role key first to isolate RLS issue

### Issue: Database update fails

**Solution**:
- Verify `execution_id` exists in `post_call_reports`
- Check column name: `recording_storage_path` (not `recording_storage_url`)
- Ensure service role key has update permissions

---

## Next Steps

After setting up the n8n workflow:

1. ✅ Test with a single recording
2. ✅ Verify file appears in Storage dashboard
3. ✅ Check database was updated correctly
4. ✅ Test signed URL access
5. ✅ Update frontend to use Supabase Storage URLs (see frontend guide)
6. ✅ Monitor for errors in production

---

## Example: Complete n8n JSON Export

If you want to import a complete workflow, here's the structure (you'll need to fill in your specific node IDs and credentials):

```json
{
  "name": "Upload Recording to Supabase",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "GET",
        "url": "={{ $json.recording_url }}",
        "options": {
          "response": {
            "response": {
              "responseFormat": "file"
            }
          }
        }
      },
      "name": "Download from Twilio",
      "type": "n8n-nodes-base.httpRequest"
    },
    {
      "parameters": {
        "jsCode": "// Extract file extension code here"
      },
      "name": "Extract File Extension",
      "type": "n8n-nodes-base.code"
    },
    {
      "parameters": {
        "httpMethod": "POST",
        "url": "=https://oufwwkusbvevlseltrme.supabase.co/storage/v1/object/recordings/{{ $json.executionId }}/recording.{{ $json.fileExtension }}",
        "authentication": "headerAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}"
            },
            {
              "name": "apikey",
              "value": "={{ $env.SUPABASE_SERVICE_ROLE_KEY }}"
            }
          ]
        },
        "options": {
          "bodyContentType": "binaryData"
        }
      },
      "name": "Upload to Supabase",
      "type": "n8n-nodes-base.httpRequest"
    }
  ],
  "connections": {
    "Download from Twilio": {
      "main": [[{"node": "Extract File Extension"}]]
    },
    "Extract File Extension": {
      "main": [[{"node": "Upload to Supabase"}]]
    }
  }
}
```

---

## Summary

**New Nodes Added**:
1. Extract File Extension (Code node)
2. Upload to Supabase Storage (HTTP Request)
3. Prepare Storage Path (Set node)
4. Create Signed URL (HTTP Request - optional)
5. Update Database (Supabase/HTTP Request)

**Key Configuration**:
- Use service role key for uploads
- Path format: `{execution_id}/recording.{ext}`
- Store path in `recording_storage_path` column
- Generate signed URLs for private bucket access

**Testing**: Always test with a single recording first before enabling for all calls!

