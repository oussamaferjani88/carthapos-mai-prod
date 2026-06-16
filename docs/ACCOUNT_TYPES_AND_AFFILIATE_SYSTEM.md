# Multi-Account Type & Affiliate System Implementation

## Overview
This system supports three types of user accounts with verification workflows and an affiliate/referral program.

## Account Types

### 1. Normal User
- **Registration**: Immediate access
- **Features**: Create and manage own POS systems
- **Verification**: Not required
- **Affiliate**: Can become affiliate after first POS purchase

### 2. Business Owner
- **Registration**: Requires admin verification
- **Features**: Professional business POS management
- **Required Documents**: Business license (patente), tax ID
- **Information**: Business name, type, address, phone, tax ID
- **Use Cases**: Cafés, restaurants, retail stores, supermarkets, pharmacies

### 3. Reseller
- **Registration**: Requires admin verification
- **Features**: Sell POS systems to other businesses, higher commission rates
- **Required Documents**: Company registration, tax certificate
- **Information**: Company name, registration number, tax ID, business address

## Database Schema

### User Model Extensions

```prisma
model User {
  // ... existing fields
  
  // Account type and verification
  accountType        AccountType       @default(NORMAL)
  verificationStatus VerificationStatus @default(PENDING)
  verifiedAt         DateTime?
  rejectionReason    String?
  
  // Business/Reseller information (JSON)
  businessInfo       Json?
  
  // Documents (array of file paths/URLs)
  documents          String[]          @default([])
  
  // Affiliate system
  affiliateCode      String?           @unique
  referredBy         String?           // Affiliate code of referrer
  totalReferrals     Int               @default(0)
  totalCommissions   Float             @default(0)
  pendingCommissions Float             @default(0)
  
  referrals          Referral[]        @relation("UserReferrals")
  affiliateOwner     Referral[]        @relation("AffiliateOwner")
}

enum AccountType {
  NORMAL
  BUSINESS
  RESELLER
}

enum VerificationStatus {
  PENDING   // Initial state for business/reseller
  APPROVED  // Admin approved
  REJECTED  // Admin rejected
}

model Referral {
  id              String   @id @default(cuid())
  affiliateUserId String   // User who owns the affiliate code
  referredUserId  String   // User who used the code
  purchaseAmount  Float
  commissionRate  Float    // Percentage (e.g., 10.0 for 10%)
  commissionAmount Float   // Calculated commission
  status          ReferralStatus @default(PENDING)
  paidAt          DateTime?
  createdAt       DateTime @default(now())
  
  affiliateUser   User     @relation("AffiliateOwner", fields: [affiliateUserId], references: [id])
  referredUser    User     @relation("UserReferrals", fields: [referredUserId], references: [id])
}

enum ReferralStatus {
  PENDING   // Not yet paid
  APPROVED  // Ready to be paid
  PAID      // Commission paid
  CANCELLED // Refund or cancellation
}
```

## Registration Flow

### Frontend (Register.tsx)
1. User selects account type (radio buttons)
2. Conditional form fields appear based on selection
3. File upload for business/reseller documents
4. Optional referral code input
5. Form validation and submission
6. Routing:
   - Normal → `/dashboard`
   - Business/Reseller → `/verification-pending`

### Backend API Endpoint

```typescript
POST /api/auth/register

Request Body (multipart/form-data):
{
  fullName: string,
  email: string,
  password: string,
  accountType: "normal" | "business" | "reseller",
  referralCode?: string,
  
  // Business Owner
  businessInfo?: {
    name: string,
    type: "cafe" | "restaurant" | "retail" | "supermarket" | "pharmacy" | "bakery" | "other",
    address: string,
    phone: string,
    taxId: string
  },
  
  // Reseller
  resellerInfo?: {
    companyName: string,
    registrationNumber: string,
    taxId: string,
    address: string,
    phone: string
  },
  
  // Files
  documents?: File[]
}

Response:
{
  success: true,
  user: {
    id: string,
    email: string,
    accountType: string,
    verificationStatus: string,
    requiresVerification: boolean
  },
  message: string
}
```

### Backend Implementation Steps

1. **File Upload Handling**
   ```typescript
   // Use multer or similar for file uploads
   const storage = multer.diskStorage({
     destination: './uploads/verification-documents/',
     filename: (req, file, cb) => {
       const uniqueName = `${Date.now()}-${file.originalname}`;
       cb(null, uniqueName);
     }
   });
   ```

2. **User Creation Logic**
   ```typescript
   // Hash password
   const hashedPassword = await bcrypt.hash(password, 10);
   
   // Set verification status
   const verificationStatus = accountType === 'normal' 
     ? 'APPROVED' 
     : 'PENDING';
   
   // Create user
   const user = await prisma.user.create({
     data: {
       email,
       password: hashedPassword,
       fullName,
       accountType: accountType.toUpperCase(),
       verificationStatus,
       businessInfo: businessInfo || resellerInfo,
       documents: uploadedFilePaths,
       referredBy: referralCode,
       affiliateCode: accountType === 'normal' ? generateAffiliateCode() : null
     }
   });
   
   // Update referrer's stats if referral code provided
   if (referralCode) {
     await updateReferrerStats(referralCode);
   }
   ```

3. **Affiliate Code Generation**
   ```typescript
   function generateAffiliateCode(): string {
     // Generate unique 8-character code
     return nanoid(8).toUpperCase();
   }
   ```

## Login Flow with Verification Check

```typescript
POST /api/auth/login

Request:
{
  email: string,
  password: string
}

Response (Success - Approved):
{
  success: true,
  token: string,
  user: {
    id: string,
    email: string,
    accountType: string,
    verificationStatus: "APPROVED"
  }
}

Response (Pending Verification):
{
  success: false,
  error: "VERIFICATION_PENDING",
  message: "Your account is pending verification. Please check your email."
}

Response (Rejected):
{
  success: false,
  error: "VERIFICATION_REJECTED",
  message: "Your account verification was rejected.",
  reason: string
}
```

## Admin Verification Dashboard

### Features Needed
1. **Pending Accounts List**
   - Show all users with `verificationStatus: PENDING`
   - Display account type, submission date, business info
   
2. **Document Viewer**
   - Display uploaded documents (PDF viewer, image gallery)
   - Download option for each document
   
3. **Approval Actions**
   - Approve button → Set `verificationStatus: APPROVED`, set `verifiedAt`
   - Reject button → Set `verificationStatus: REJECTED`, enter rejection reason
   - Send email notifications
   
4. **Email Templates**
   - Approval: "Your account has been verified! You can now log in."
   - Rejection: "Your account verification was rejected. Reason: ..."

### API Endpoints

```typescript
// Get pending accounts
GET /api/admin/verification/pending
Response: User[] (with businessInfo and documents)

// Approve account
POST /api/admin/verification/approve/:userId
Request: { userId: string }
Response: { success: true, user: User }

// Reject account
POST /api/admin/verification/reject/:userId
Request: { userId: string, reason: string }
Response: { success: true, user: User }

// Get document
GET /api/admin/verification/documents/:filename
Response: File download
```

## Affiliate System

### How It Works

1. **User Purchases POS**
   - Normal users automatically get an affiliate code
   - Business/Reseller get affiliate code after first purchase (optional)

2. **Sharing Referral Link/Code**
   - Link: `https://carthapos.com/register?ref=ABC123XY`
   - Code: `ABC123XY`

3. **New User Registers with Referral**
   - Referral code saved in `user.referredBy`
   - When referred user makes first purchase:
     - Create Referral record
     - Calculate commission based on account type:
       - Normal: 10% commission
       - Business: 12% commission
       - Reseller: 15% commission
     - Update affiliate's `pendingCommissions`

4. **Commission Payout**
   - Admin reviews and approves referrals
   - Mark referral as `PAID`
   - Update affiliate's `totalCommissions`
   - Send payout notification

### Frontend Affiliate Dashboard

Create at `/dashboard/affiliate`:

```tsx
- Unique affiliate link and code
- Copy to clipboard buttons
- Social media share buttons
- Statistics:
  - Total referrals
  - Active referrals
  - Pending commissions
  - Paid commissions
  - Conversion rate
- Referral history table
- Payout history
```

### API Endpoints

```typescript
// Get affiliate stats
GET /api/affiliate/stats
Response: {
  affiliateCode: string,
  totalReferrals: number,
  activeReferrals: number,
  pendingCommissions: number,
  paidCommissions: number,
  conversionRate: number
}

// Get referral history
GET /api/affiliate/referrals
Response: Referral[]

// Track referral purchase
POST /api/purchases
Request: {
  userId: string,
  amount: number,
  // ... purchase details
}
// Automatically creates Referral if user.referredBy exists
```

## Migration Commands

```bash
# Create migration
npx prisma migrate dev --name add_account_types_and_affiliate

# Generate Prisma Client
npx prisma generate

# Push to database
npx prisma db push
```

## Environment Variables

```env
# File upload
UPLOAD_DIR=./uploads/verification-documents
MAX_FILE_SIZE=5242880  # 5MB

# Affiliate
DEFAULT_COMMISSION_RATE=10  # 10%
BUSINESS_COMMISSION_RATE=12 # 12%
RESELLER_COMMISSION_RATE=15 # 15%

# Email service
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@carthapos.com
EMAIL_PASS=your_password
```

## Next Steps (TODO)

### Backend Implementation
- [ ] Update registration endpoint to handle account types
- [ ] Implement file upload for documents
- [ ] Create email notification service
- [ ] Build admin verification API endpoints
- [ ] Implement affiliate tracking system
- [ ] Create commission calculation logic
- [ ] Add authentication middleware to check verification status

### Admin Dashboard (admin folder)
- [ ] Create verification dashboard page
- [ ] Build document viewer component
- [ ] Add approve/reject actions
- [ ] Implement email notifications
- [ ] Create affiliate management interface

### User Dashboard (frontend folder)
- [ ] Create affiliate dashboard page
- [ ] Add referral link sharing component
- [ ] Build commission statistics display
- [ ] Create referral history table
- [ ] Add payout request functionality

### Testing
- [ ] Test normal user registration flow
- [ ] Test business owner verification flow
- [ ] Test reseller verification flow
- [ ] Test affiliate code generation
- [ ] Test referral tracking
- [ ] Test commission calculation
- [ ] Test email notifications

## Security Considerations

1. **Document Storage**
   - Store documents outside public directory
   - Validate file types and sizes
   - Scan for malware
   - Use signed URLs for access

2. **Verification Process**
   - Log all verification actions
   - Require admin authentication
   - Send notifications to users
   - Keep audit trail

3. **Affiliate System**
   - Prevent self-referral
   - Detect fraud patterns
   - Rate limit affiliate code generation
   - Validate referral code before use

## Support & Contact

For questions about implementation:
- Email: dev@carthapos.com
- Documentation: /docs/account-types
