# Quick Reference: Student Request Feature

## ✅ TL;DR - YES, Students Can Create Requests to Staff

**In the Mobile App:**
1. Go to "Inquiries" Tab
2. Select department (Library, Finance, etc.)
3. Type your question
4. Tap "Send Inquiry"
5. Staff receives and responds
6. You see response in chat history

---

## Feature Status: FULLY IMPLEMENTED ✅

| Component | Status | Location |
|-----------|--------|----------|
| **Mobile UI** | ✅ Complete | `mobile/src/screens/tabs/InquiriesTab.tsx` |
| **Mobile API Client** | ✅ Complete | `mobile/src/lib/api.ts` |
| **Mobile State Management** | ✅ Complete | `mobile/src/screens/StudentHomeScreen.tsx` |
| **Backend Controller** | ✅ Complete | `backend/.../inquiry/controller/InquiryController.java` |
| **Backend Service** | ✅ Complete | `backend/.../inquiry/service/InquiryService.java` |
| **Database Model** | ✅ Complete | `backend/.../inquiry/model/StatusInquiry.java` |
| **Security/Validation** | ✅ Complete | `backend/.../security/CampusAccessService.java` |
| **Type Definitions** | ✅ Complete | `mobile/src/types.ts` |

---

## Key Files to Review

### Mobile Frontend (React Native)

**Main Screen:**
```
📄 mobile/src/screens/StudentHomeScreen.tsx
   ├─ Loads clearance requests
   ├─ Manages tab navigation
   ├─ Handles inquiry submission
   ├─ Shows error states
   └─ Manages refresh logic
```

**Inquiries UI Component:**
```
📄 mobile/src/screens/tabs/InquiriesTab.tsx (THE MAIN UI)
   ├─ Department selector (horizontal chips)
   ├─ Message compose form
   ├─ Send button with loading state
   ├─ Chat history display
   ├─ Error handling UI
   └─ Staff response display
```

**API Client:**
```
📄 mobile/src/lib/api.ts
   ├─ createStudentInquiry()       ← Posts inquiry to backend
   ├─ listStudentInquiries()       ← Fetches all inquiries
   └─ ... other endpoints
```

**Type Definitions:**
```
📄 mobile/src/types.ts
   ├─ type Inquiry { ... }
   ├─ type ClearanceRequest { ... }
   ├─ type ClearanceStatus { ... }
   └─ type Liability { ... }
```

---

### Backend (Spring Boot/Java)

**Controller (REST Endpoints):**
```
📄 backend/src/main/java/com/uog/clearance/inquiry/controller/InquiryController.java

POST   /students/me/inquiries              (Students create)
GET    /students/me/inquiries              (Students list)
GET    /staff/inquiries                    (Staff view assigned)
PATCH  /staff/inquiries/{id}/respond       (Staff respond)
```

**Service (Business Logic):**
```
📄 backend/src/main/java/com/uog/clearance/inquiry/service/InquiryService.java

createInquiry()           ← Create new inquiry
listStudentInquiries()    ← Get student's inquiries
listStaffInquiries()      ← Get staff's inquiries to answer
respond()                 ← Staff responds
roleToCheckCode()         ← Map role to department
```

**Entity/Model:**
```
📄 backend/src/main/java/com/uog/clearance/inquiry/model/StatusInquiry.java

Fields:
- id: String
- clearanceRequestId: String (links to student request)
- studentId: String
- campusId: String (campus isolation)
- targetCheckCode: String (LIBRARY, PROCTOR, FINANCE, etc.)
- message: String
- response: String (null until staff responds)
- status: InquiryStatus (OPEN, ANSWERED, CLOSED)
- respondedAt: Instant
```

**Repository (Database Access):**
```
📄 backend/src/main/java/com/uog/clearance/inquiry/repository/StatusInquiryRepository.java

- findByStudentId(String)
- findByCampusIdAndTargetCheckCode(String, ClearanceCheckCode)
```

**Security:**
```
📄 backend/src/main/java/com/uog/clearance/security/CampusAccessService.java

Validates:
✓ Student can only access their own requests
✓ Staff can only respond in their campus
✓ Staff role matches inquiry department
```

---

## Complete API Contract

### Create Inquiry (Student)

**Request:**
```
POST /api/v1/students/me/inquiries
Authorization: Bearer {token}
Content-Type: application/json

{
  "clearanceRequestId": "6672f5c8a1b2c3d4e5f6g789",
  "targetCheckCode": "LIBRARY",
  "message": "Do I need to return any books?"
}
```

**Success Response (201 Created):**
```json
{
  "id": "6672f5c8a1b2c3d4e5f6g790",
  "clearanceRequestId": "6672f5c8a1b2c3d4e5f6g789",
  "studentId": "STU-2024-001",
  "campusId": "TEWODROS",
  "targetCheckCode": "LIBRARY",
  "message": "Do I need to return any books?",
  "response": null,
  "status": "OPEN",
  "respondedAt": null
}
```

**Error Response (400 Bad Request):**
```json
{
  "message": "Clearance request not found for this student"
}
```

---

### List Inquiries (Student)

**Request:**
```
GET /api/v1/students/me/inquiries
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
[
  {
    "id": "inq-001",
    "clearanceRequestId": "req-123",
    "studentId": "STU-2024-001",
    "campusId": "TEWODROS",
    "targetCheckCode": "LIBRARY",
    "message": "Do I have overdue books?",
    "response": "Yes, 1 book due by Friday",
    "status": "ANSWERED",
    "respondedAt": "2024-01-15T10:45:00Z"
  },
  {
    "id": "inq-002",
    "clearanceRequestId": "req-123",
    "studentId": "STU-2024-001",
    "campusId": "TEWODROS",
    "targetCheckCode": "FINANCE",
    "message": "How much do I owe?",
    "response": null,
    "status": "OPEN",
    "respondedAt": null
  }
]
```

---

### Respond to Inquiry (Staff)

**Request:**
```
PATCH /api/v1/staff/inquiries/{inquiryId}/respond
Authorization: Bearer {token}
Content-Type: application/json

{
  "response": "Yes, you owe 500 birr for dining hall",
  "status": "ANSWERED"
}
```

**Response (200 OK):**
```json
{
  "id": "inq-002",
  "clearanceRequestId": "req-123",
  "studentId": "STU-2024-001",
  "campusId": "TEWODROS",
  "targetCheckCode": "FINANCE",
  "message": "How much do I owe?",
  "response": "Yes, you owe 500 birr for dining hall",
  "status": "ANSWERED",
  "respondedAt": "2024-01-15T11:00:00Z"
}
```

---

## Department Codes (targetCheckCode)

```
LIBRARY              → Library Staff
PROCTOR             → Proctor/Academic Office
CAFE                → Cafe/Dining Staff
DEPARTMENT_HEAD     → Department Head
STUDENT_DEAN        → Student Dean
FINANCE             → Finance Officer
REGISTRAR           → Registrar
```

---

## Role-Based Access Control

| Role | Can Create Inquiry | Can See Own Inquiries | Can Respond | Can Respond To |
|------|----|----|----|----|
| STUDENT | ✅ | ✅ | ❌ | — |
| LIBRARIAN | ❌ | ❌ | ✅ | LIBRARY inquiries |
| PROCTOR | ❌ | ❌ | ✅ | PROCTOR inquiries |
| CAFE_STAFF | ❌ | ❌ | ✅ | CAFE inquiries |
| DEPARTMENT_HEAD | ❌ | ❌ | ✅ | DEPT_HEAD inquiries |
| STUDENT_DEAN | ❌ | ❌ | ✅ | STUDENT_DEAN inquiries |
| FINANCE_OFFICER | ❌ | ❌ | ✅ | FINANCE inquiries |
| MAIN_REGISTRAR | ❌ | ❌ | ✅ | REGISTRAR inquiries |
| SYSTEM_ADMIN | ❌ | ❌ | ✅ | ALL inquiries |

---

## Security Features Implemented

✅ **Campus Isolation**
- Students can only create inquiries for their own clearance requests
- Staff can only respond to inquiries in their campus
- All requests verified against `CampusAccessService`

✅ **Role-Based Validation**
- Staff role must match the inquiry's target department
- Librarian can only respond to LIBRARY inquiries
- Finance officer can only respond to FINANCE inquiries

✅ **Data Validation**
- Message content must be non-empty
- Clearance request must exist
- Department code must be valid
- All fields sanitized before storage

✅ **Audit Ready**
- All timestamps recorded (createdAt, respondedAt, updatedAt)
- User IDs tracked (studentId, respondedBy)
- Action logging ready for integration

---

## Testing Checklist

### Test as Student:
- [ ] Login to mobile app
- [ ] Navigate to Inquiries tab
- [ ] See all departments listed
- [ ] Select a department
- [ ] Type a message
- [ ] Click "Send Inquiry"
- [ ] Message appears immediately in chat history
- [ ] Message marked as "OPEN" (no response yet)
- [ ] Try sending empty message (should be disabled)
- [ ] Try sending without loading request (should show warning)

### Test as Staff:
- [ ] Login to web dashboard
- [ ] Go to Inquiries section
- [ ] See student's question
- [ ] Click "Respond" button
- [ ] Type response
- [ ] Submit response
- [ ] Status changes to "ANSWERED"

### Test Roundtrip:
- [ ] Student sends inquiry
- [ ] Staff responds (simulated with API call)
- [ ] Student refreshes mobile app
- [ ] Response appears in chat history with timestamp

---

## How to Run End-to-End Test

### 1. Start Backend
```bash
cd backend
mvn spring-boot:run
```

### 2. Start Mobile App
```bash
cd mobile
npx expo start
```

### 3. Test Flow
```
Student Login
    ↓
Go to Inquiries Tab
    ↓
Select "Library"
    ↓
Type: "Do I have overdue books?"
    ↓
Send Inquiry (check mobile console)
    ↓
Backend received POST to /students/me/inquiries
    ↓
Response appears in history
    ↓
Simulate staff response via API:
curl -X PATCH \
  http://localhost:8080/api/v1/staff/inquiries/{inquiryId}/respond \
  -H "Authorization: Bearer {staffToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "response": "Yes, check with librarian",
    "status": "ANSWERED"
  }'
    ↓
Refresh mobile app (pull down)
    ↓
Response appears in chat history
    ↓
✅ Success!
```

---

## Dependencies & Versions

### Frontend
- React Native (Expo)
- TypeScript
- React Hooks for state management
- Fetch API for HTTP requests

### Backend
- Spring Boot 3.x
- Spring Security with JWT
- MongoDB with Spring Data
- Jakarta Validation
- Lombok for boilerplate reduction

### Database
- MongoDB
- Collection: `status_inquiries`
- Indexes on: studentId, campusId, targetCheckCode

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Message won't send | Check token is valid, clearance request loaded, message not empty |
| "Clearance request not found" | Student must create/have an active clearance request first |
| Staff doesn't see inquiry | Check staff role matches inquiry department, same campus |
| Response doesn't appear | Refresh app (pull-to-refresh), check network connection |
| "Access denied" error | Verify user role and campus permissions |
| Inquiry history empty | Check filters (selected department might have no inquiries) |

---

## Next Steps / Enhancements

Possible future improvements:

- [ ] Real-time updates using WebSockets
- [ ] File attachment support (PDF receipts, etc.)
- [ ] Email notifications when staff responds
- [ ] Inquiry priority/category tags
- [ ] Auto-response templates for common questions
- [ ] Inquiry transfer between departments
- [ ] Escalation workflow for unanswered inquiries
- [ ] Search/filter inquiries by date, department, status

---

## Support & Documentation

See also:
- `STUDENT_REQUEST_ANALYSIS.md` - Detailed feature analysis
- `STUDENT_REQUEST_VISUAL_GUIDE.md` - UI/UX flow diagrams
- `docs/api-design.md` - API design specifications
- `docs/data-model.md` - Database schema details

---

