# Swaminarayan Dental Clinic – Spring Boot Backend

Java 17+ · Spring Boot 3.3 · Maven · Spring Data JPA / Hibernate · MySQL (XAMPP) · JWT + BCrypt

Backend for the existing React frontend (`AJT-project-frontend`). The frontend was **not modified**: every endpoint,
payload and response shape below was taken from its Axios calls.

---

## ⚠️ Verification status (read this first)

The code was written against the frontend's real API calls and syntax-checked with `javac`, **but it could not be
compiled or run where it was written** (that environment could not reach Maven Central to download Spring Boot).
So nothing here has been executed yet. Before the demo, do these two things:

1. `mvn spring-boot:run` (or run `ClinicApplication` from your IDE) – if anything fails to compile, send me the error.
2. `bash scripts/smoke-test.sh` – calls every implemented endpoint (≈90 checks) and prints PASS/FAIL per call.

Treat the project as "ready to build and test", not "tested".

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| JDK | 17 or 21 | `java -version` |
| Maven | 3.9+ | or use IntelliJ / Eclipse / STS (they bundle Maven) |
| XAMPP | any | only the **MySQL** module is needed |
| Node.js | 18+ | for the React frontend |

## 2. Database (XAMPP)

1. Open XAMPP Control Panel → **Start** *MySQL* (port 3306).
2. Create the database – either:
   * phpMyAdmin → *SQL* tab → paste `database/dental_clinic_db.sql` → *Go*, **or**
   * do nothing: the JDBC URL contains `createDatabaseIfNotExist=true`, so the backend creates it itself.
3. Tables are created automatically on first start (`spring.jpa.hibernate.ddl-auto=update`).

Connection settings live in `src/main/resources/application.properties`
(`localhost:3306`, user `root`, empty password, database `dental_clinic_db`). Change them if your MySQL differs.

## 3. Run the backend

```bash
cd dental-clinic-backend
mvn spring-boot:run
```
IDE alternative: open the folder as a Maven project and run `com.swaminarayan.clinic.ClinicApplication`.

It listens on **http://localhost:7169/api** (the frontend's `.env.development` already points to port 7169, and its
Axios `baseURL` is `/api`, which is why the context path is `/api`).
Check: http://localhost:7169/api/health → `{"success":true,"message":"Dental clinic backend is running"}`

On first start you will see `Default admin created` in the log.

## 4. Run the frontend

```bash
cd AJT-project-frontend-main
npm install
npm run dev          # http://localhost:9432  – Vite proxies /api -> http://localhost:7169
```
If Vite complains about a missing module (`lightningcss`, `browserslist`, `terser`), run
`npm i -D lightningcss browserslist terser` (the frontend's config imports them without listing them).

## 5. Default login

| Field | Value |
|-------|-------|
| Login ID | `admin` (or `admin@swaminarayan.com`, or employee code `ADMIN001`) |
| Password | `Admin@123` |

Change them in `application.properties` (`app.seed.*`) **before the first start**, or edit the user row afterwards
(password is a BCrypt hash). Starter master data (payment modes Cash/UPI/Card/Net Banking, OPD statuses, specialties,
designations, medical alerts, document types, six sample treatments) is created only if missing; set
`app.seed.master-data=false` to disable it.

## 6. Quick demo flow

1. Login → Dashboard (stats for today).
2. **Doctor Master** → add a doctor (pick a specialty).
3. **Treatment Master** → check/add treatments.
4. Dashboard → *Patients* → register a patient (choose doctor, treatment, optional registration fee + payment mode).
   This creates the patient, a visit, and a payment (Credit).
5. **Appointment Booking** → book an appointment; change its status (Pending / Visited / No Visit).
6. **Transactions** → add a payment; filter by type / date / mode.
7. Open a patient → Patient Detail shows visits, appointments and payments.

---

## 7. API reference

Base URL `http://localhost:7169/api`. All endpoints except login/refresh/health need
`Authorization: Bearer <accessToken>`. Success: `{ "success": true, "message": "...", "data": ... }`.
Error: `{ "success": false, "message": "..." }` with HTTP 400 (validation), 401 (no/invalid token), 404, 409
(duplicate / record in use), 500. IDs are UUID strings.

### Authentication
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/auth/login` | `{identifier, password}` | `{success, message, data:{id,fullName,email,designation,isSuperAdmin,...}, tokens:{accessToken, refreshToken}}` |
| POST | `/auth/refresh` | `{refreshToken}` | same shape as login |
| POST | `/auth/logout` | – | `{success, message}` (tokens are stateless; the client discards them) |
| GET  | `/auth/me` | – | `{success, data:user}` |

Access token lifetime 12 h, refresh token 7 days (`app.jwt.*`). `GET /file/view?key=..&token=..` also accepts the token
as a query parameter because the frontend's `fileUrl()` helper builds `<img>` URLs that way.

### Dashboard
| Method | Path | Notes |
|--------|------|-------|
| GET | `/dashboard/stats?startDate=&endDate=` | `data:{stats:{todayPatients,todayVisits,todayAppointments,todayCollection}, todayPatients:[{id,uhid,patientName,mobileNo,doctor,patientType,paymentSummary:{credit,balance},activityDate}], appointments:[{id,patient,doctor,time,treatment}]}` |
| GET | `/dashboard/patient-visit-payment?patientId=&date=` | `data:{visit, transactions}` for the "edit visit" popup |
| PUT | `/dashboard/patient-visit-payment` | `{patientId, originalDate, newDate, visitData, transactionsData[]}` |

### Patients  (add/update are `multipart/form-data`, as the React form sends them)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/patient/getPatient?search=&genders=Male,Female&fromDate=&toDate=&page=1&limit=10` | `limit=all` returns everything. Response `{data:[...], pagination:{total,page,limit,totalPages}}`. Search matches name / mobile / UHID / email |
| GET | `/patient/detail/{id}` | `data:{patient, relatedPatients, appointments, opds, transactions, documents}` (patients sharing a mobile number are combined) |
| POST | `/patient/addPatient` | fields: `patientName`*, `mobileNo`, `gender`, `dob`, `age`, `email`, `doctorId`, `medicalAlertId`, address fields, `registrationDate`, `appointmentType`, `appointmentDateTime`, and optional payment: `registrationFee`, `paymentMode` (payment-mode id), `paymentCategories` (PaymentReceived / Refund / SurgeonCharges), `surgeonChargesAmount`. UHID (`UHID000001`…) is generated. "Future Appointment" books a pending appointment. |
| PUT | `/patient/updatePatient/{id}` | same fields (+ `transactionDate`) |
| DELETE | `/patient/deletePatient/{id}` | also deletes the patient's visits, appointments and payments |
| POST | `/patient/bulkAddPatients` | `{patients:[...]}` → `{createdCount, skippedCount}` (duplicate mobiles skipped) |

### Doctors  (add/update are `multipart/form-data`)
| Method | Path |
|--------|------|
| GET | `/doctor/getDoctors` |
| POST | `/doctor/addDoctor` – `name`*, `gender`, `mobileNo`, `alternativeMobileNo`, `doctorType` (Consultant / Visiting / Full Time), `access*`, `email`, `description`, `googleProfileUrl`, `colorCode`, `specialtyId`, `password`, optional file `authorisedSignatory` (image ≤ 2 MB) |
| PUT | `/doctor/updateDoctor/{id}` |
| DELETE | `/doctor/deleteDoctor/{id}` – 409 if the doctor has patients/visits/appointments |

### Treatments (JSON)
`GET /treatment/getTreatment` · `POST /treatment/addTreatment {text, pricePerUnit, dayCount}` ·
`PUT /treatment/updateTreatment/{id}` · `DELETE /treatment/deleteTreatment/{id}` ·
`POST /treatment/bulkAddTreatments {treatments:[{text,pricePerUnit}]}`

### Appointments (JSON)
`GET /appointment/getAppointments` · `POST /appointment/addAppointment` ·
`PUT /appointment/updateAppointment/{id}` · `DELETE /appointment/deleteAppointment/{id}`
Body: `{patientId*, doctorId*, appointmentDate* (yyyy-MM-dd), appointmentTime* (HH:mm), duration (5–480, default 15), treatmentId, note, status (pending | visit | no-visit)}`.
A doctor cannot have two overlapping appointments on the same date (409).

### Visits / OPD (JSON)
`GET /opdMaster/getOPDMaster?search=&doctorIds=&statusIds=&paymentTypeIds=&fromDate=&toDate=&page=&limit=` ·
`POST /opdMaster/addOPDMaster` · `PUT /opdMaster/updateOPDMaster/{id}` · `DELETE /opdMaster/deleteOPDMaster/{id}`
Body: `{patientId*, doctorId, date, statusId, paymentTypeId, treatmentId, remark, bloodPressure, height, weight}`

### Transactions / payments (JSON)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/transaction/getTransactions?search=&paymentByIds=&paymentType=Credit\|Debit&fromDate=&toDate=&page=&limit=` | response also has `stats:{totalCredits,totalDebits}` over all matching rows |
| POST | `/transaction/addTransaction` | `{patientId, paymentType (Credit/Debit), paymentById*, amount* (>0), paymentDateTime, remark}` |
| PUT | `/transaction/updateTransaction/{id}` | |
| DELETE | `/transaction/deleteTransaction/{id}` | |
| POST | `/transaction/bulkDelete` | `{ids:[...]}` |
| POST | `/transaction/bulkAddTransactions` | `{payments:[{patientName,mobileNo,paymentMode,amountPaid,createdAt}]}` → `{createdCount, skippedCount}` |
| GET | `/transaction/getPatientBalance/{patientId}` | `data:{totalCredit,totalDebit,outstandingBalance}` |

**Money convention:** *Credit* = payment received, *Debit* = amount charged/refunded.
Outstanding balance = total Debit − total Credit.

### Simple master lists (JSON `{text}`; designation uses `{name}`)
Each has `GET get…`, `POST add…`, `PUT update…/{id}`, `DELETE delete…/{id}`:
`/specialty/*Specialty` · `/designation/*Designation` · `/medicalAlert/*MedicalAlert` ·
`/opdStatus/*OPDStatus` · `/paymentBy/*PaymentBy` · `/consultantCharge/*ConsultantCharge` · `/documentType/*DocumentType`
(e.g. `GET /paymentBy/getPaymentBy`, `PUT /opdStatus/updateOPDStatus/{id}`). Duplicate names → 409; deleting an item that is in use → 409.

Other: `GET /form-dropdowns/patientRegistration` (dropdowns for the registration form), `GET /health`.

---

## 8. NOT implemented (these frontend screens/features will show an error or stay empty)

| Feature | Frontend calls | Effect |
|---------|----------------|--------|
| Employee Master, sessions, "Login as employee" | `/employee/*`, `/auth/impersonate` | Employee page shows an error toast. (Only the single seeded admin exists.) |
| Document upload / list / delete / bulk import | `/document/*` | Attaching documents to patients/doctors/employees fails; Patient Detail shows no documents. (The doctor *signature image* upload does work.) |
| Clinic Report page | `/report/clinic`, `/report/daily` | Page shows an error toast |
| Visit Excel import / date fix | `/opdMaster/bulkAddOPDMaster`, `/opdMaster/fixImportDates` | Import button fails (manual visit entry works) |
| Roles & permissions | – | Disabled in the frontend itself: every logged-in user has full access |
| Branches | – | Single clinic; `branchId` is always `null` |

Unknown URLs return a JSON 404 `{success:false, message:"Endpoint not found: ..."}`.

## 9. Design notes

* `entity/` JPA entities (UUID string ids) · `repository/` Spring Data · `service/` business rules & validation ·
  `controller/` REST · `dto/` request/response helpers (`Views` maps entities to the exact JSON field names the React
  pages read, e.g. `Doctor`, `MedicalAlert`, `PaymentBy`) · `security/` JWT · `config/` CORS, BCrypt, seeder · `exception/` JSON errors.
* All the simple dropdown lists share one table (`master_items`, discriminated by `master_type`) to avoid seven near-identical tables.
* Plain Spring MVC + a small JWT filter instead of full Spring Security – fewer moving parts for a demo.
* CORS allows `http://localhost:9432` (Vite dev server); in normal use Vite's proxy makes requests same-origin anyway.
* Entities use public fields and EAGER many-to-one relations on purpose (keeps the code short; fine at clinic scale).

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Communications link failure` / `Connection refused` | MySQL module not started in XAMPP |
| `Access denied for user 'root'` | you set a MySQL root password → put it in `spring.datasource.password` |
| `Port 7169 already in use` | stop the other process or change `server.port` **and** `VITE_BACKEND_URL` in the frontend `.env.development` |
| Login says "Invalid login ID or password" | use `admin` / `Admin@123`; if you changed `app.seed.*` after the first start the old user remains – delete the `app_users` row (or drop the DB) and restart |
| Frontend shows network error | backend not running, or you opened the app on a port other than 9432 |
| Multipart `PUT` (edit doctor/patient) returns 400/415 | tell me – the smoke test checks exactly this |
