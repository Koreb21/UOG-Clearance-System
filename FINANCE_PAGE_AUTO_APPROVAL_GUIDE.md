# Finance Page - Auto-Approval & Payment Methods Guide

## Overview

The Finance Office module in the Clearance System handles payment verification and automatic approval of students who have no issues from other staff departments.

---

## 1. Auto-Approval Feature

### What is Auto-Approval?

When a student has **no flags** (pending issues) from other staff departments (Library, Proctor, Cafe, Department Head, Student Dean) AND the Finance check is **CLEARED**, the system automatically moves the student to **IN_REVIEW** status - meaning they are approved and can proceed to the Registrar.

### How It Works

1. **Student receives NO flags** from other departments (all checks are either CLEARED or IN_REVIEW)
2. **Finance officer verifies payment** (either online via Chapa or manual bank slip)
3. **System auto-approves** if all liabilities are paid and no flags exist from other staff
4. **Student sees**: "Auto-approved: No flags from other staff" message on the Finance page

### Auto-Approval Conditions

✅ **All of these must be true:**
- Finance check status = **CLEARED**
- All pending finance liabilities = **PAID**
- No FLAGGED checks from other departments
- Payment successfully verified

❌ **Auto-approval will NOT happen if:**
- Student has pending liabilities from Finance
- Student has FLAGGED checks from other departments (Library, Proctor, etc.)
- Payment is not yet verified

### Student Journey

```
Student submits clearance → All departments review → 
Finance payment required → 
  [Payment verified] → 
    [No flags from other staff?] → 
      ✓ Auto-approved → Ready for Registrar
    [Flags exist?] → 
      Flagged check must be resolved first
```

---

## 2. Payment Methods

### Method 1: Online Payment (Chapa)

**Best for:** Remote students, preferred online payment

**How it works:**
1. Student initiates Chapa payment from **Student Mobile/Web App**
2. Student completes payment through Chapa gateway
3. Chapa sends confirmation to system
4. Finance Officer verifies the payment on Finance Dashboard
5. Payment marked as **VERIFIED**
6. Liabilities marked as **PAID**

**Status in System:**
- `PENDING_VERIFY` → Payment waiting for verification
- `SUCCESS` → Payment successful and verified
- `FAILED` → Payment failed

**Note:** If Chapa API is not functional:
- Use Method 2 (Manual Bank Slip) as alternative
- Student pays at designated bank and provides receipt

---

### Method 2: Manual Bank Slip / Cash Payment

**Best for:** Students who cannot pay online, direct campus payments

**How it works:**
1. Student pays at **designated bank** or **campus finance counter**
2. Student provides **receipt/slip number** to Finance Officer
3. Finance Officer records manual payment on Finance Dashboard:
   - Receipt number (required)
   - Payment date / additional notes (optional)
4. System marks payment as **SUCCESS**
5. Liabilities marked as **PAID**

**Status in System:**
- `SUCCESS` → Manual payment recorded and verified immediately
- `VERIFIED` → Finance officer confirmed the slip

---

## 3. Finance Office Dashboard - How to Use

### Step 1: Select Student from Finance Queue

1. Open Finance Dashboard
2. Search for student by:
   - Name
   - Student ID
   - Request number
3. Select from dropdown

### Step 2: Review Student Status

- **Finance check status**: PENDING, IN_REVIEW, CLEARED, or FLAGGED
- **Pending liabilities**: Items student must pay
- **Payment records**: History of all payments

### Step 3: Verify Payments

#### For Chapa Payments:

1. Look for payment with `provider: CHAPA` and `status: PENDING_VERIFY`
2. Click **Verify** button
3. System updates status to **SUCCESS**
4. Auto-approval triggers if conditions met

#### For Manual Bank Slip Payments:

1. Scroll to **Payment Methods** section
2. Enter:
   - **Bank slip / Receipt number** (required)
   - **Payment date / Note** (optional)
3. Click **Record manual payment**
4. System marks as **SUCCESS**
5. Auto-approval triggers if conditions met

### Step 4: Approve Finance Check (if needed)

- If auto-approval did NOT trigger (because flags exist from other staff):
  - Click **Approve Finance Check** button (only enabled after payment verified)
  - Add comment (optional)
  - Click **Approve**

### Step 5: Handle Pending Issues

If student has **FLAGGED** checks from other departments:
- Finance check remains **CLEARED** (payment is done)
- But student cannot proceed to Registrar until **flags are resolved**
- Other staff must clear their respective checks
- Then auto-approval will trigger

---

## 4. Troubleshooting

### Issue: "Approve Finance Check" button is disabled

**Reason:** No verified payments

**Solution:**
- Verify a Chapa payment with the **Verify** button, OR
- Record a manual bank slip payment

---

### Issue: Student not auto-approved even after payment verified

**Reason:** Student has FLAGGED checks from other departments

**Solution:**
- Check the "Checks" section in student status
- Identify which department flagged the student
- Contact that department to clear the flag
- Once all flags resolved, auto-approval will trigger automatically

---

### Issue: Chapa API not working

**Reason:** External API down or configuration issue

**Solution:**
- **Use Method 2**: Record manual bank slip payment
- Student pays at designated bank location
- Finance officer records the receipt number
- Payment verified and liabilities marked as paid

---

### Issue: "Cannot approve - other flags exist"

**Reason:** Auto-approval blocked because other departments flagged student

**Solution:**
- Go to the flagged department's queue
- Contact that staff member to resolve the flag
- Once resolved, Finance page will show auto-approval applied

---

## 5. Payment Status Reference

| Status | Meaning | Action |
|--------|---------|--------|
| `PENDING_VERIFY` | Chapa payment received, waiting for verification | Click **Verify** |
| `SUCCESS` | Payment verified, liabilities marked as paid | ✓ No action needed |
| `VERIFIED` | Manual payment confirmed | ✓ No action needed |
| `FAILED` | Payment failed or was cancelled | Discuss with student |
| `CANCELLED` | Payment was cancelled by student | Discuss with student |

---

## 6. Clearance Check Status Reference

| Status | Meaning | What Happens Next |
|--------|---------|------------------|
| `PENDING` | No action taken yet | Staff must review |
| `IN_REVIEW` | Under review, waiting for decision | Awaiting approval/flag |
| `CLEARED` | ✓ Approved, no issues | Can proceed if all checks cleared |
| `FLAGGED` | ✗ Issues found | Student must resolve |
| `FAILED` | ✗ Failed review | Requires staff decision |
| `AWAITING_FINANCE` | Waiting for Finance verification | Finance must verify payment |
| `PAID_PENDING_DEPARTMENT_APPROVAL` | Payment verified, awaiting department approval | Department staff must review |

---

## 7. Quick Reference: Finance Workflow

```
1. STUDENT SUBMITS CLEARANCE
   ↓
2. ALL DEPARTMENTS REVIEW (Library, Proctor, etc.)
   ↓
3. FINANCE PAYMENT REQUIRED
   ├─ Chapa online payment → Student initiates → Finance verifies
   └─ Manual bank slip → Student pays → Finance records receipt
   ↓
4. FINANCE VERIFICATION
   └─ Payment marked as SUCCESS/VERIFIED
   ↓
5. AUTO-APPROVAL CHECK
   ├─ No flags from other staff? → ✓ AUTO-APPROVED → Ready for Registrar
   └─ Flags exist? → Finance check CLEARED, but flags block progress
   ↓
6. IF FLAGS EXIST FROM OTHER STAFF
   └─ Other department must clear flag
   └─ Then auto-approval triggers
   ↓
7. STUDENT READY FOR REGISTRAR
   └─ Can generate QR certificate
```

---

## 8. Finance Officer Best Practices

1. ✓ Always verify payment details before clicking **Verify**
2. ✓ For manual payments, ensure receipt number is clearly documented
3. ✓ Check if other department flags exist before approving
4. ✓ Add comments when recording manual payments for audit trail
5. ✓ Use **Record manual payment** when Chapa is unavailable
6. ✓ Communicate with other departments about student flags

---

## 9. FAQ

**Q: Why didn't the student auto-approve?**
A: Check if they have FLAGGED checks from other departments. Auto-approval only works when NO other flags exist.

**Q: Can Chapa be replaced with another payment system?**
A: Yes. The manual bank slip method is available as an alternative when Chapa is down.

**Q: What if student paid but receipt is delayed?**
A: Use manual payment recording with a note. The system will still mark liabilities as paid.

**Q: Can Finance officer manually approve instead of auto-approval?**
A: Yes, the manual **Approve Finance Check** button is available if auto-approval doesn't trigger.

---

## 10. Related Documentation

- **Student Payment Guide**: See Student app for how to initiate Chapa payment
- **Department Staff Guide**: See Staff Dashboard guide for approving checks
- **Registrar Guide**: See Registrar workflow for final clearance signing
- **System Architecture**: See [architecture.md](docs/architecture.md)

