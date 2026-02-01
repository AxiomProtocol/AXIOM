# DeNet Operations - Standard Operating Procedure

**Version:** 1.0  
**Updated:** January 31, 2026  
**Classification:** Operations

---

## Purpose

This SOP defines operational procedures for managing DeNet decentralized storage in the Axiom Protocol production environment.

---

## 1. Daily Operations

### 1.1 Health Check

**Frequency:** Every 15 minutes (automated) + Manual review daily

**Procedure:**
1. Access `/api/denet/status`
2. Verify `status: "online"`
3. Check `replicationHealth > 95%`
4. Review `failedUploads24h < 5`

**Escalation:**
- Status offline → Immediate investigation
- Replication < 90% → Alert Engineering
- Failed uploads > 10 → Alert DevOps

### 1.2 Metrics Review

**Frequency:** Daily

**Procedure:**
1. Access `/api/denet/metrics`
2. Document key metrics:
   - Total files count
   - Storage utilization %
   - Verification rate
   - Average latency
3. Compare against baseline
4. Log any anomalies

---

## 2. Upload Operations

### 2.1 Document Upload

**Prerequisites:**
- Valid authentication (Role: admin, risk_committee, attestor, underwriter)
- File size < 100MB
- Supported document type

**Procedure:**
1. Prepare document (PDF, JSON, or supported format)
2. POST to `/api/denet/upload` with:
   ```json
   {
     "data": "<base64 encoded>",
     "filename": "document-name.pdf",
     "documentType": "due_diligence"
   }
   ```
3. Receive CID in response
4. Store CID for workflow reference
5. Verify upload with `/api/denet/verify?cid=<cid>`

### 2.2 Batch Upload

**Procedure:**
1. Prepare all documents
2. Upload sequentially (rate limit: 10/minute)
3. Collect all CIDs
4. Verify batch with POST to `/api/denet/verify`

---

## 3. Verification Operations

### 3.1 Single CID Verification

**Procedure:**
```bash
GET /api/denet/verify?cid=<cid>
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "cid": "bafy...",
    "exists": true,
    "verified": true,
    "replicationCount": 3
  }
}
```

### 3.2 Batch Verification

**Procedure:**
```bash
POST /api/denet/verify
Content-Type: application/json

{
  "cids": ["bafy...", "bafy...", "bafy..."]
}
```

---

## 4. Incident Response

### 4.1 Node Offline

**Detection:**
- `/api/denet/status` returns `status: "offline"`
- Health check failures

**Response:**
1. Check DENET_NODE_KEY secret validity
2. Verify network connectivity
3. Check DeNet network status
4. If persistent, enable fallback mode
5. Notify Engineering

### 4.2 Upload Failures

**Detection:**
- Upload API returns 5xx errors
- `failedUploads24h` increasing

**Response:**
1. Check rate limits (10/minute max)
2. Verify file size < 100MB
3. Check node status
4. Retry with exponential backoff
5. If persistent, escalate to DevOps

### 4.3 Verification Failures

**Detection:**
- `/api/denet/verify` returns `verified: false`

**Response:**
1. Confirm CID format is valid
2. Allow time for replication (up to 5 minutes)
3. Retry verification
4. Check replication health
5. If persistent, flag for manual review

---

## 5. Maintenance Procedures

### 5.1 Storage Cleanup

**Frequency:** Monthly

**Procedure:**
1. Export file list via `/api/denet/files`
2. Identify orphaned documents (no workflow reference)
3. Review with compliance team
4. Archive or flag for retention

### 5.2 Cache Management

**Procedure:**
1. Verification cache auto-expires (5 minutes)
2. Manual clear if needed: restart application

---

## 6. Security Procedures

### 6.1 Credential Rotation

**Frequency:** Quarterly

**Procedure:**
1. Generate new DENET_NODE_KEY
2. Update Replit secret
3. Restart application
4. Verify connectivity
5. Document rotation in audit log

### 6.2 Access Review

**Frequency:** Monthly

**Procedure:**
1. Review upload API access logs
2. Verify role assignments
3. Remove unused access
4. Document review

---

## 7. Backup and Recovery

### 7.1 Backup Strategy

- Primary: DeNet network (3x replication)
- Secondary: Replit Object Storage (automatic fallback)
- Tertiary: IPFS pinning (for critical documents)

### 7.2 Recovery Procedure

**If DeNet unavailable:**
1. Fallback storage activates automatically
2. New uploads go to Replit Object Storage
3. Approvals paused until DeNet available
4. When restored, sync pending uploads

---

## 8. Monitoring Dashboards

### 8.1 Observer Dashboard

**Location:** `/observer` → DeNet Storage Panel

**Metrics Displayed:**
- Node status
- File count
- Storage usage
- Verification rate
- Replication health
- 24h activity

### 8.2 API Health

**Location:** `/api/denet/status`

---

## 9. Escalation Matrix

| Severity | Condition | Response Time | Contact |
|----------|-----------|---------------|---------|
| P1 | Node offline | 15 minutes | On-call + Engineering Lead |
| P2 | Verification failures > 5% | 1 hour | Engineering |
| P3 | Storage > 80% | 24 hours | DevOps |
| P4 | Performance degradation | 48 hours | Engineering |

---

## 10. Appendix

### 10.1 CID Format

Valid CID: `bafy[A-Za-z0-9]{50-60}`

### 10.2 Document Types

- property_research
- due_diligence
- attestation
- underwriting
- legal_document
- appraisal
- title_search
- environmental
- survey
- general

### 10.3 Rate Limits

| Operation | Limit |
|-----------|-------|
| Upload | 10/minute |
| Verify | 100/minute |
| Status | Unlimited |
| Metrics | 60/minute |

---

**Document Owner:** DevOps Team  
**Next Review:** April 30, 2026
