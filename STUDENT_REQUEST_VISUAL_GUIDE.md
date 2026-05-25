# Mobile App - Student Inquiry Flow (Visual Guide)

## App Navigation Structure

```
┌─────────────────────────────────────────────┐
│         StudentHomeScreen                   │
│         (Main Hub)                          │
└───────────────┬─────────────────────────────┘
                │
        ┌───────┴────────┬──────────┬──────────┐
        │                │          │          │
        ▼                ▼          ▼          ▼
    ┌────────┐      ┌────────┐ ┌────────┐ ┌──────────┐
    │Overview│      │Payments│ │Inquiries│ │Certificate│
    │  Tab   │      │  Tab   │ │  Tab    │ │   Tab     │
    └────────┘      └────────┘ └────────┘ └──────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │  InquiriesTab.tsx    │
                        │  (This is where      │
                        │   students create    │
                        │   requests!)         │
                        └──────────────────────┘
```

---

## InquiriesTab Component Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      INQUIRIES TAB                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. SELECT DEPARTMENT                                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ◉ LIBRARY   ○ PROCTOR   ○ CAFE   ○ DEPT.HEAD   ○ DEAN    │  │
│  │    ○ FINANCE   ○ REGISTRAR                               │  │
│  └────────────────────────────────────────────────────────────┘  │
│       ▲ Select department to message                             │
│       │ (Cleared departments shown as blocked)                   │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  2. COMPOSE MESSAGE                                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Direct Inquiry                                             │ │
│  │                                                            │ │
│  │ ┌──────────────────────────────────────────────────────┐ │ │
│  │ │ Ask the office what action you still need to       │ │ │
│  │ │ complete                                             │ │ │
│  │ │                                                      │ │ │
│  │ │ [Type message here...]                               │ │ │
│  │ └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │ ┌─────────────────────────────┐                          │ │
│  │ │ [Send Inquiry →]    [Sending...] │  ◄─ Submit button   │ │
│  │ └─────────────────────────────┘                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  3. INQUIRY HISTORY (Chat View)                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Library Office                                             │ │
│  │                                                            │ │
│  │                                                            │ │
│  │                  ┌─────────────────────────────────────┐ │ │
│  │                  │ Do I have any books still checked  │ │ │
│  │                  │ out?                                 │ │ │
│  │                  │                                      │ │ │
│  │                  │         [Student]     Sep 15, 10:30 │ │ │
│  │                  └─────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ Yes, you have 1 copy of "Database Design" that is │ │ │
│  │  │ overdue. Please return it before final submission. │ │ │
│  │  │                                                     │ │ │
│  │  │ Librarian                           Sep 15, 10:45  │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │                  ┌─────────────────────────────────────┐ │ │
│  │                  │ Thank you, I'll return it today    │ │ │
│  │                  │                                      │ │ │
│  │                  │         [Student]     Sep 15, 10:50 │ │ │
│  │                  └─────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │ Perfect, we'll clear your library check once the  │ │ │
│  │  │ book is returned.                                  │ │ │
│  │  │                                                     │ │ │
│  │  │ Librarian                           Sep 15, 11:00  │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Complete User Journey (Timeline)

### Timeline: Student Getting Clearance

```
STUDENT                              BACKEND                       STAFF
  │                                   │                            │
  ├─ Login ──────────────────────────→│                            │
  │                                   │                            │
  │◄────── Student Dashboard ─────────┤                            │
  │                                   │                            │
  │                                   │← Clearance Request Created │
  │                                   │  (System assigns depts)     │
  │                                   │                            │
  │ Tap "Inquiries" Tab               │                            │
  │ ├─ See departments                │                            │
  │ ├─ Select "Library"               │                            │
  │ └─ Compose: "Do I have         │                            │
  │    overdue books?"                │                            │
  │                                   │                            │
  │ Tap "Send Inquiry" ───────────────→│                           │
  │                                   │                            │
  │                                   ├─ Validate student owns req │
  │                                   ├─ Save inquiry to DB        │
  │                                   ├─ Mark as "OPEN"           │
  │                                   │                            │
  │ [Message appears in             │                            │
  │  Inquiry History]                 │                            │
  │                                   │                            │
  │                                   │  ────→ Staff Dashboard ───→│
  │                                   │        Load inquiries      │
  │                                   │                            │ See: "Do I have
  │                                   │                            │  overdue books?"
  │                                   │                            │ By: StudentName
  │                                   │                            │
  │                                   │                            │ Staff types:
  │                                   │                            │ "Yes, please
  │                                   │                            │  check the system"
  │                                   │                            │
  │                                   │←─ POST /staff/inquiries/   │
  │                                   │    {id}/respond             │
  │                                   │                            │
  │                                   ├─ Validate staff role       │
  │                                   ├─ Validate correct dept     │
  │                                   ├─ Save response             │
  │                                   ├─ Mark as "ANSWERED"       │
  │                                   │                            │
  │ Refresh app (or automatic)        │                            │
  │ ◄─────────────────────────────────┤                            │
  │                                   │                            │
  │ See in Inquiry History:           │                            │
  │ [Student]: "Do I have overdue    │                            │
  │           books?"                 │                            │
  │           10:30 AM                │                            │
  │                                   │                            │
  │ [Librarian]: "Yes, please        │                            │
  │             check the system"     │                            │
  │             10:35 AM              │                            │
  │                                   │                            │
  │ Type follow-up: "How much        │                            │
  │ time do I have?"                  │                            │
  │ Send ──────────────────────────────→│                          │
  │                                   │                            │
  │                                   ├─ Save inquiry             │
  │                                   │                            │
  │                                   │  ────→ Staff sees it      │
  │                                   │        Responds: "By      │
  │                                   │         Friday"           │
  │                                   │                            │
  │ See response ◄─────────────────────────────────────────────────│
  │                                   │                            │
  │ [Student]: "How much time do      │                            │
  │           I have?"                │                            │
  │           10:40 AM                │                            │
  │                                   │                            │
  │ [Librarian]: "By Friday"          │                            │
  │             10:42 AM              │                            │
  │                                   │                            │
  │ Return book to Library            │                            │
  │                                   │  Staff marks clearance    │
  │                                   │  as "CLEARED" in system   │
  │                                   │                            │
  │ Next refresh: Library check       │                            │
  │ shows green checkmark (CLEARED)   │                            │
  │                                   │                            │
  │ Continue with other departments   │                            │
  └                                   └                            └
```

---

## Data Flow: Creating & Responding to Inquiry

### Request: Student Creates Inquiry

```
MOBILE APP                          API                          DATABASE
    │                               │                              │
    │ User composes message:        │                              │
    │ "Do I have any fines?"       │                              │
    │                               │                              │
    │ User taps "Send"              │                              │
    │      │                         │                              │
    │      └─────────────────────→ POST /students/me/inquiries     │
    │        {                      │                              │
    │          clearanceRequestId: "req-123"                       │
    │          targetCheckCode: "FINANCE"                          │
    │          message: "Do I have any fines?"                     │
    │        }                      │                              │
    │                               │                              │
    │                         Validate:                            │
    │                         ✓ Student owns request               │
    │                         ✓ Department exists                  │
    │                         ✓ Message valid                      │
    │                               │                              │
    │                               ├─→ Create InquiryID: "inq-456"
    │                               │                              │
    │                               │  Save to statusInquiry      │
    │                               │  {                           │
    │                               │    id: "inq-456"            │
    │                               │    clearanceRequestId: "req" │
    │                               │    studentId: "stu-123"     │
    │                               │    campusId: "TEWODROS"     │
    │                               │    targetCheckCode: "FINANCE"
    │                               │    message: "Do I have...?" │
    │                               │    response: null           │
    │                               │    status: "OPEN"           │
    │                               │  }                           │
    │                               │                              │
    │◄─────────────────────────────┤←─ Success                    │
    │  {                            │                              │
    │    id: "inq-456"              │                              │
    │    message: "Do I have...?"   │                              │
    │    status: "OPEN"             │                              │
    │    response: null             │                              │
    │  }                            │                              │
    │                               │                              │
    │ Show in UI:                   │                              │
    │ [Student]: "Do I have...?"    │                              │
    │            10:15 AM           │                              │
    │                               │                              │
    └                               └                              └
```

### Response: Staff Responds to Inquiry

```
WEB DASHBOARD (STAFF)              API                          DATABASE
    │                               │                              │
    │ Staff views inquiry           │                              │
    │ From: John Doe                │                              │
    │ "Do I have any fines?"        │                              │
    │                               │                              │
    │ Staff types response:         │                              │
    │ "Yes, you owe 500 birr for..." │                              │
    │                               │                              │
    │ Clicks "Respond"              │                              │
    │      │                         │                              │
    │      └──→ PATCH /staff/inquiries/inq-456/respond            │
    │         {                     │                              │
    │           response: "Yes, you owe 500 birr..."              │
    │           status: "ANSWERED"  │                              │
    │         }                     │                              │
    │                               │                              │
    │                         Validate:                            │
    │                         ✓ Staff role matches dept           │
    │                         ✓ Inquiry exists                     │
    │                         ✓ Campus access verified             │
    │                               │                              │
    │                               ├─→ Update Inquiry:           │
    │                               │   {                          │
    │                               │     response: "Yes, you..."  │
    │                               │     status: "ANSWERED"       │
    │                               │     respondedAt: now         │
    │                               │   }                          │
    │                               │                              │
    │◄─────────────────────────────┤←─ Success                    │
    │ Response saved               │                              │
    │ Can close this inquiry       │                              │
    │                               │                              │
    └                               └                              └

MOBILE APP (Next Refresh)
    │
    │ User refreshes or automatic sync
    │      │
    │      └─→ GET /students/me/inquiries
    │                                   │
    │                          Returns all student inquiries including:
    │                          { response: "Yes, you owe...", ...}
    │                               │
    │◄────────────────────────────────┤
    │
    │ Show in UI:
    │ [Student]: "Do I have any fines?"
    │            10:15 AM
    │
    │ [Finance Officer]: "Yes, you owe 500 birr for..."
    │                    10:22 AM
    │
    └
```

---

## Component Props & State

### InquiriesTab Component Props

```typescript
type Props = {
  status: ClearanceStatus | null;           // Current request status
  inquiries: Inquiry[];                      // All student inquiries
  targetCheckCode: string;                   // Selected dept (e.g., "LIBRARY")
  message: string;                           // Typed message text
  setTargetCheckCode: (v: string) => void;   // Change selected dept
  setMessage: (v: string) => void;           // Update message text
  onSubmit: () => void;                      // Send inquiry handler
  submitting: boolean;                       // Loading state
  error?: string | null;                     // Error message
};
```

### StudentHomeScreen State Management

```typescript
const [inquiries, setInquiries] = useState<Inquiry[]>([]);
const [submittingInquiry, setSubmittingInquiry] = useState(false);
const [inquiryError, setInquiryError] = useState<string | null>(null);
const [inquiryTargetCode, setInquiryTargetCode] = useState("LIBRARY");
const [inquiryMessage, setInquiryMessage] = useState("");

// Filter inquiries for selected department
const currentInquiries = useMemo(
  () => inquiries.filter((q) => q.targetCheckCode === targetCheckCode),
  [inquiries, selectedRequestId]
);
```

---

## Error Handling

```
User Action              │  Possible Error              │  UI Response
──────────────────────────┼──────────────────────────────┼─────────────────
Send empty message        │  Message is empty            │  Button disabled
                          │                              │  (Grayed out)
──────────────────────────┼──────────────────────────────┼─────────────────
Send without clearance    │  No clearance request loaded │  Info banner:
request                   │                              │  "Load request first"
──────────────────────────┼──────────────────────────────┼─────────────────
Network error             │  Fetch fails                 │  Red error banner:
                          │                              │  "Failed to send. Try again"
──────────────────────────┼──────────────────────────────┼─────────────────
Server validates and      │  Student doesn't own request │  Error message from
rejects                   │  Invalid department code     │  backend displayed
                          │                              │  in error banner
──────────────────────────┼──────────────────────────────┼─────────────────
```

---

## Summary: What Happens When Student Sends Inquiry

1. **UI State**: Message text entered, "Send" button tapped
2. **Validation**: 
   - ✓ Message not empty
   - ✓ Clearance request loaded
   - ✓ Department selected
3. **API Call**: POST to `/students/me/inquiries`
4. **Backend Validation**:
   - ✓ Student token valid
   - ✓ Request belongs to student
   - ✓ Department code valid
   - ✓ Campus isolation verified
5. **Database**: New inquiry created with status "OPEN"
6. **Response**: Inquiry object returned to mobile
7. **UI Update**:
   - Message appears in chat history
   - Text input cleared
   - "Sending..." state removed
8. **Persistence**: Inquiry saved in app cache

---

