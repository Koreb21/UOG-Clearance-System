# Payment Methods Implementation Guide

## Overview

The Clearance System supports **2 payment methods** for students to clear finance liabilities. When one method is unavailable, the system seamlessly switches to the alternative.

---

## Payment Method 1: Chapa Online Payment

### About Chapa

**What it is**: Ethiopian digital payment gateway  
**Use case**: Students paying online without visiting campus  
**Status in system**: Implemented (may be non-functional if API unavailable)

### How Chapa Works in the System

#### From Student Perspective

```
Student Mobile/Web App
    ↓
    [Initiate Payment Button]
    ↓
    Redirected to Chapa Checkout
    ↓
    Student enters card/payment details
    ↓
    Chapa processes payment
    ↓
    Redirected back to app
    ↓
    Payment confirmation shown
```

#### From Finance Office Perspective

```
Finance Dashboard
    ↓
    [Payments Tab]
    ↓
    Look for: Status = "PENDING_VERIFY"
    Provider = "CHAPA"
    ↓
    [Verify Button]
    ↓
    Payment marked as SUCCESS
    ↓
    Liabilities marked as PAID
    ↓
    Auto-approval checks triggered
```

### Chapa Configuration

**Config File**: `backend/application.yml`

```yaml
chapa:
  enabled: true  # Set to false if Chapa API is down
  secret-key: ${CHAPA_SECRET_KEY}
  base-url: https://api.chapa.co
  initialize-url: ${chapa.base-url}/v1/transaction/initialize
  checkout-base-url: https://checkout.chapa.co
  callback-url: https://your-domain.com/api/v1/payments/chapa/callback
  return-url: https://your-domain.com/payments/success
  callback-token: ${CHAPA_CALLBACK_TOKEN}
```

### What to Check if Chapa is Not Working

1. **API Credentials**
   - Verify `CHAPA_SECRET_KEY` environment variable is set
   - Check API key is valid with Chapa support

2. **Network/Connectivity**
   - Test connection to Chapa API endpoint
   - Check if Chapa service is operational

3. **Fallback Action**
   - Direct students to use Method 2 (Manual Bank Slip)
   - Inform Finance team to use manual recording

---

## Payment Method 2: Manual Bank Slip / Cash Payment

### About This Method

**What it is**: Direct bank transfer or cash payment with receipt documentation  
**Use case**: 
- When Chapa is unavailable
- Students without online banking access
- International students
- Direct campus counter payments

**Status in system**: ✓ Fully implemented and tested

### How Manual Payment Works

#### From Student Perspective

```
Student decides to pay manually
    ↓
    [Go to designated bank/counter]
    ↓
    [Pay the specified amount]
    ↓
    [Receive receipt/slip with reference number]
    ↓
    [Provide receipt number to Finance office]
```

#### From Finance Office Perspective

```
Finance Dashboard
    ↓
    [Select Student]
    ↓
    [Scroll to "Payment Methods" section]
    ↓
    [Enter Receipt/Slip Number] *required
    ↓
    [Enter Payment Date/Note] (optional)
    ↓
    [Click "Record manual payment"]
    ↓
    System marks payment as SUCCESS
    ↓
    Liabilities marked as PAID
    ↓
    Auto-approval checks triggered
```

### Manual Payment Form Fields

| Field | Required | Example | Purpose |
|-------|----------|---------|---------|
| Receipt/Slip Number | YES | `RECEIPT-2024-001` | Unique identifier for audit |
| Payment Date / Note | NO | `2024-05-23 / Paid at Dashen Bank` | Additional context |

### Manual Payment in Code

**Backend endpoint**: `POST /api/v1/finance/payments/manual`

```java
ManualPaymentRequest {
    clearanceRequestId: "req-123",
    studentId: "STU-001",
    liabilityIds: ["liab-1", "liab-2"],
    providerReference: "RECEIPT-2024-001",    // Bank slip number
    note: "Paid at Dashen Bank"
}
```

### Manual Payment Status

Once recorded:
- **Provider**: `BANK_SLIP`
- **Status**: `SUCCESS` (immediate confirmation)
- **Verified At**: Current timestamp
- **Verified By**: Finance officer's user ID

---

## Switching Between Payment Methods

### When to Use Method 1 (Chapa)

✓ Chapa API is operational  
✓ Student has card/online banking  
✓ Student prefers online payment  
✓ Student is not at campus  

### When to Use Method 2 (Manual)

✓ Chapa API is down  
✓ Student cannot access online payment  
✓ Student prefers direct transfer  
✓ Student paying from campus counter  
✓ Multiple students paying together  

### How to Check Chapa Status

**In Finance Dashboard**:
1. Try to look for a Chapa payment
2. If recent Chapa payments show **PENDING_VERIFY** but can't verify
3. Try verifying with a test transaction
4. If fails consistently → Chapa is down
5. **Action**: Direct students to Method 2

**In Logs**:
```
Check backend logs for: "Unable to initialize Chapa payment"
If seen repeatedly → Chapa API issue
```

---

## Implementation Details

### How Manual Payment is Recorded

**File**: `PaymentService.java`

```java
public PaymentResponse recordManualPayment(UserPrincipal principal, ManualPaymentRequest request) {
    // Validate access and amount
    // Mark all liabilities as PAID
    // Create payment record with provider=BANK_SLIP
    // Status = SUCCESS (no pending verification)
    // Trigger refreshFinanceState() → Auto-approval checks run
    // Return payment response
}
```

### Payment Flow in System

```
Payment Initiated
    ↓
    ├─→ [Chapa Method]
    │       ├─ Status: PENDING_VERIFY
    │       ├─ Waiting for callback
    │       ├─ Finance officer clicks Verify
    │       └─ Status: SUCCESS
    │
    └─→ [Manual Method]
            ├─ Status: SUCCESS
            ├─ Immediate confirmation
            └─ Ready for auto-approval
            ↓
        Mark Liabilities as PAID
            ↓
        Check for unresolved count
            ↓
        If count = 0 AND no flags
            ↓
        CLEARED + AUTO-APPROVED
```

---

## Database Schema

### Payment Record

```
PaymentRecord {
    id: String
    clearanceRequestId: String
    studentId: String
    liabilityIds: List<String>
    
    // Payment details
    provider: "CHAPA" | "BANK_SLIP"        // Method used
    txRef: String                          // Transaction reference
    providerReference: String              // External ref (receipt #)
    amount: BigDecimal
    currency: "ETB"
    
    // Status
    status: "PENDING_VERIFY" | "SUCCESS" | "FAILED" | "CANCELLED"
    
    // Verification (Chapa)
    verifiedAt: Instant
    verifiedBy: String
    verificationPayload: Map
    
    // Receipt (Manual)
    receiptNumber: String
    receiptSignature: String
    receiptIssuedAt: Instant
}
```

### Liability Status After Payment

```
Liability {
    id: String
    status: "PENDING" → "PAID" | "CLEARED" | "WAIVED"
    paymentRequired: boolean
}
```

---

## Troubleshooting

### Scenario 1: Chapa Payment Fails

**Symptom**: Student completed Chapa payment but system shows `PENDING_VERIFY`

**Solution**:
1. Check if Chapa sent callback
2. If not, ask student for transaction reference
3. Manually search Chapa account for transaction
4. If found: Manually verify payment
5. If not found: Instruct student to use Method 2 (Manual)

**Action**:
```
Finance Dashboard
  ├─ Find the PENDING_VERIFY Chapa payment
  ├─ Click [Verify]
  ├─ Confirm the transaction with student details
  └─ Mark as SUCCESS
```

---

### Scenario 2: Chapa API is Completely Down

**Symptom**: Multiple students report Chapa not working

**Solution**:
1. Check status page: https://status.chapa.co
2. Contact Chapa support
3. **Immediate workaround**: Use Method 2
4. **Communicate to students**:
   - "Chapa is temporarily unavailable"
   - "Please use the manual bank slip method instead"
   - "Provide receipt number to Finance office"

**Instruction to students**:
```
We're experiencing issues with Chapa payment gateway.

ALTERNATIVE METHOD:
1. Pay at any of these banks:
   - Dashen Bank
   - Commercial Bank of Ethiopia
   - Abysinia Bank

2. Use account: [University Account Number]
3. Reference: [Your Student ID]

4. Once paid, provide receipt number to Finance office

5. Finance will confirm your payment same day
```

---

### Scenario 3: Manual Payment Receipt Mismatch

**Symptom**: Student provided receipt number, but bank doesn't show transaction

**Solution**:
1. Ask student for receipt image/copy
2. Verify receipt number matches bank slip
3. Contact the bank to confirm
4. Do NOT mark as paid until confirmed
5. Ask student to re-verify or provide new receipt

---

## API Endpoints

### For Chapa Payments

**Initiate Chapa**:
```
POST /api/v1/payments/chapa/initiate
Headers: Authorization: Bearer {token}
Body: {
    clearanceRequestId: "req-123",
    liabilityIds: ["liab-1"]
}
Response: {
    payment: PaymentRecord,
    checkoutUrl: "https://checkout.chapa.co/...",
    callbackUrl: "...",
    returnUrl: "..."
}
```

**Verify Chapa**:
```
PATCH /api/v1/payments/chapa/verify/{txRef}
Headers: Authorization: Bearer {token}
Body: {
    status: "SUCCESS",
    message: "Payment verified"
}
```

### For Manual Payments

**Record Manual Payment**:
```
POST /api/v1/finance/payments/manual
Headers: Authorization: Bearer {token}
Body: {
    clearanceRequestId: "req-123",
    studentId: "STU-001",
    liabilityIds: ["liab-1"],
    providerReference: "RECEIPT-2024-001",
    note: "Paid at Dashen Bank"
}
Response: {
    payment: PaymentRecord,
    status: "SUCCESS"
}
```

---

## Testing Payment Methods

### Test Case: Manual Payment

**Setup**:
- Create a student with pending liabilities
- Amount: 500 ETB

**Steps**:
1. Go to Finance Dashboard
2. Select the student
3. Scroll to "Payment Methods" section
4. Enter: Receipt Number = `TEST-RECEIPT-001`
5. Enter: Note = `Testing manual payment`
6. Click: "Record manual payment"

**Expected**:
- Payment shows with status `SUCCESS`
- Liabilities show with status `PAID`
- Finance check auto-clears (if no other flags)
- Success message appears

---

### Test Case: Switch from Chapa to Manual

**Setup**:
- Create a student with Chapa payment initiated
- Chapa callback simulated as failed

**Steps**:
1. Payment shows as `PENDING_VERIFY`
2. Realize Chapa is down
3. Instruct student to pay manually
4. Student pays and gets receipt number
5. Go to Finance Dashboard
6. Record manual payment for same liabilities
7. Two payments now exist for student

**Expected**:
- Manual payment marked `SUCCESS`
- Liabilities marked `PAID` (only once)
- Finance check clears
- Student auto-approved

---

## Summary Table

| Aspect | Chapa | Manual Bank Slip |
|--------|-------|------------------|
| **Setup Cost** | API integration required | No additional setup |
| **Student Convenience** | Online, instant | Need to visit bank |
| **Finance Processing** | Manual verify required | Automatic confirmation |
| **Backup Method** | Primary | Fallback |
| **When to Use** | Normal operations | Chapa down or alt request |
| **Processing Time** | Real-time callback | Immediate |
| **Audit Trail** | Transaction ID | Receipt number |
| **Failure Rate** | Higher (network) | Lower (direct payment) |

---

## Recommended Process

1. **Primary Method**: Try Chapa first
2. **Fallback**: If Chapa fails or API down → Switch to manual
3. **Documentation**: Always record which method was used
4. **Audit**: Keep receipt/transaction reference for compliance
5. **Communication**: Inform students of available methods

---

## Contact & Support

For issues with:
- **Chapa integration**: Contact Chapa support + dev team
- **Manual payment process**: Finance office procedures
- **Payment verification**: Finance officer + system admin
- **System errors**: Backend support team

---

