#!/usr/bin/env bash
# End-to-end smoke test of every implemented endpoint.
# Usage:  start the backend, then   bash scripts/smoke-test.sh [base-url]
# Works in Git Bash / WSL / Linux / macOS (needs bash + curl only).
BASE="${1:-http://localhost:7169/api}"
PASS=0; FAIL=0
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT

# req METHOD PATH EXPECTED_STATUS EXPECTED_BODY_TEXT [curl args...]  -> body left in $BODY
req() {
  local method="$1" path="$2" want="$3" text="$4"; shift 4
  local code
  code=$(curl -s -o "$TMP" -w '%{http_code}' -X "$method" "$BASE$path" ${TOKEN:+-H "Authorization: Bearer $TOKEN"} "$@")
  BODY="$(cat "$TMP")"
  if [[ "$code" == "$want" && "$BODY" == *"$text"* ]]; then
    PASS=$((PASS+1)); printf '  PASS  %-6s %-48s %s\n' "$method" "$path" "$code"
  else
    FAIL=$((FAIL+1)); printf '  FAIL  %-6s %-48s got %s, wanted %s containing [%s]\n        %s\n' "$method" "$path" "$code" "$want" "$text" "${BODY:0:300}"
  fi
}
id_of() { echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }
JSON=(-H 'Content-Type: application/json')
TODAY="$(date +%F)"; TOMORROW="$(date -d tomorrow +%F 2>/dev/null || date -v+1d +%F)"
SUFFIX="$RANDOM"

echo "== Auth"
TOKEN=""
req GET  /patient/getPatient 401 'Authentication required'
req POST /auth/login 401 'Invalid login' "${JSON[@]}" -d '{"identifier":"admin","password":"wrong"}'
req POST /auth/login 400 'required' "${JSON[@]}" -d '{"identifier":"","password":""}'
req POST /auth/login 200 '"accessToken"' "${JSON[@]}" -d '{"identifier":"admin","password":"Admin@123"}'
[[ "$BODY" == *'"refreshToken"'* && "$BODY" == *'"data":{'* ]] && echo "  PASS  login shape has tokens.accessToken, tokens.refreshToken, data" || { echo "  FAIL  login shape"; FAIL=$((FAIL+1)); }
TOKEN="$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)"
REFRESH="$(echo "$BODY" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)"
req GET  /auth/me 200 '"fullName"'
req POST /auth/refresh 200 '"accessToken"' "${JSON[@]}" -d "{\"refreshToken\":\"$REFRESH\"}"
req POST /auth/refresh 401 'Invalid' "${JSON[@]}" -d "{\"refreshToken\":\"$TOKEN\"}"
req POST /auth/logout 200 'Logged out'

echo "== Master lists (payment modes, specialties, statuses ...)"
req GET /paymentBy/getPaymentBy 200 'Cash'; PAYMODE="$(id_of)"
req GET /opdStatus/getOPDStatus 200 'Consulted'; STATUS="$(id_of)"
req GET /specialty/getSpecialty 200 'Orthodontics'; SPEC="$(id_of)"
req GET /designation/getDesignation 200 'Receptionist'
req GET /medicalAlert/getMedicalAlert 200 'Diabetes'; ALERT="$(id_of)"
req POST /specialty/addSpecialty 200 '"success":true' "${JSON[@]}" -d "{\"text\":\"Periodontics $SUFFIX\"}"; NEWSPEC="$(id_of)"
req POST /specialty/addSpecialty 409 'already exists' "${JSON[@]}" -d "{\"text\":\"Periodontics $SUFFIX\"}"
req POST /specialty/addSpecialty 400 'required' "${JSON[@]}" -d '{"text":"  "}'
req PUT  "/specialty/updateSpecialty/$NEWSPEC" 200 'Perio' "${JSON[@]}" -d "{\"text\":\"Perio $SUFFIX\"}"
req DELETE "/specialty/deleteSpecialty/$NEWSPEC" 200 'Deleted'
req DELETE "/specialty/deleteSpecialty/$NEWSPEC" 404 'not found'
req POST /designation/addDesignation 200 '"success":true' "${JSON[@]}" -d "{\"name\":\"Nurse $SUFFIX\"}"
req GET  /consultantCharge/getConsultantCharge 200 '"success":true'
req GET  /documentType/getDocumentType 200 'ID Proof'
req GET  /form-dropdowns/patientRegistration 200 '"paymentMethods"'

echo "== Treatments"
req POST /treatment/addTreatment 200 '"pricePerUnit"' "${JSON[@]}" -d "{\"text\":\"Smoke Whitening $SUFFIX\",\"pricePerUnit\":2500,\"dayCount\":1}"; TREAT="$(id_of)"
req POST /treatment/addTreatment 409 'already exists' "${JSON[@]}" -d "{\"text\":\"Smoke Whitening $SUFFIX\",\"pricePerUnit\":1}"
req POST /treatment/addTreatment 400 'negative' "${JSON[@]}" -d '{"text":"Bad","pricePerUnit":-5}'
req PUT  "/treatment/updateTreatment/$TREAT" 200 '"3000' "${JSON[@]}" -d "{\"text\":\"Smoke Whitening $SUFFIX\",\"pricePerUnit\":3000,\"dayCount\":2}"
req GET  /treatment/getTreatment 200 "Smoke Whitening $SUFFIX"
req POST /treatment/bulkAddTreatments 200 'createdCount' "${JSON[@]}" -d "{\"treatments\":[{\"text\":\"Bulk A $SUFFIX\",\"pricePerUnit\":100},{\"text\":\"Bulk A $SUFFIX\",\"pricePerUnit\":100}]}"

echo "== Doctors (multipart form, like the React form)"
req POST /doctor/addDoctor 400 'name is required' -F 'name=' -F 'gender=Male'
req POST /doctor/addDoctor 400 'valid email' -F "name=Dr Bad" -F 'email=not-an-email'
req POST /doctor/addDoctor 200 '"colorCode":"#0d9488"' -F "name=Dr Smoke $SUFFIX" -F 'gender=Male' -F 'mobileNo=9876543210' \
  -F 'doctorType=Consultant' -F 'accessPatients=true' -F 'accessBilling=false' -F 'email=smoke@clinic.test' \
  -F 'colorCode=#0d9488' -F "specialtyId=$SPEC" -F 'password=secret123' -F 'confirmPassword=secret123'
DOC="$(id_of)"
[[ "$BODY" != *passwordHash* ]] && echo "  PASS  password hash is never returned" || { echo "  FAIL  passwordHash leaked"; FAIL=$((FAIL+1)); }
req PUT  "/doctor/updateDoctor/$DOC" 200 'Dr Smoke Updated' -F "name=Dr Smoke Updated $SUFFIX" -F 'gender=Male' -F 'doctorType=Visiting' -F "specialtyId=$SPEC"
req GET  /doctor/getDoctors 200 "Dr Smoke Updated $SUFFIX"

echo "== Patients (multipart, with registration payment)"
req POST /patient/addPatient 400 'name is required' -F 'patientName=' -F 'gender=Male'
req POST /patient/addPatient 400 'Mobile number' -F 'patientName=X' -F 'mobileNo=12'
req POST /patient/addPatient 400 'Payment method' -F 'patientName=X' -F 'mobileNo=9000000000' -F 'registrationFee=500'
MOBILE="9$(printf '%09d' $((RANDOM*RANDOM % 1000000000)))"
req POST /patient/addPatient 200 '"uhid":"UHID' -F "patientName=Smoke Patient $SUFFIX" -F "mobileNo=$MOBILE" -F 'gender=Female' -F 'age=30' \
  -F 'email=patient@test.com' -F "doctorId=$DOC" -F "medicalAlertId=$ALERT" -F 'height=' -F 'dob=' \
  -F 'registrationFee=500' -F "paymentMode=$PAYMODE" -F 'paymentCategories=PaymentReceived' -F "registrationDate=$TODAY" -F "appointmentType=Today's Visit"
PAT="$(id_of)"
req GET  "/patient/getPatient?search=Smoke%20Patient%20$SUFFIX&limit=10&page=1" 200 '"totalPages"'
[[ "$BODY" == *"$PAT"* ]] && echo "  PASS  search finds the new patient" || { echo "  FAIL  search does not return patient"; FAIL=$((FAIL+1)); }
req GET  "/patient/getPatient?limit=all&genders=Female" 200 "$PAT"
req GET  "/patient/getPatient?fromDate=$TODAY&toDate=$TODAY" 200 "$PAT"
req PUT  "/patient/updatePatient/$PAT" 200 'Smoke Patient Edited' -F "patientName=Smoke Patient Edited $SUFFIX" -F "mobileNo=$MOBILE" -F 'gender=Female' -F 'age=31'
req POST /patient/bulkAddPatients 200 'createdCount' "${JSON[@]}" -d "{\"patients\":[{\"patientName\":\"Bulk P $SUFFIX\",\"mobileNo\":\"98$(printf '%08d' $((RANDOM*RANDOM % 100000000)))\",\"gender\":\"Male\"},{\"patientName\":\"Dup\",\"mobileNo\":\"$MOBILE\"}]}"
[[ "$BODY" == *'"skippedCount":1'* ]] && echo "  PASS  duplicate mobile skipped in bulk import" || { echo "  FAIL  bulk duplicate not skipped: $BODY"; FAIL=$((FAIL+1)); }

echo "== Appointments"
req POST /appointment/addAppointment 400 'Patient is required' "${JSON[@]}" -d '{}'
req POST /appointment/addAppointment 400 'HH:mm' "${JSON[@]}" -d "{\"patientId\":\"$PAT\",\"doctorId\":\"$DOC\",\"appointmentDate\":\"$TOMORROW\",\"appointmentTime\":\"25:99\"}"
req POST /appointment/addAppointment 200 '"status":"pending"' "${JSON[@]}" -d "{\"patientId\":\"$PAT\",\"doctorId\":\"$DOC\",\"appointmentDate\":\"$TOMORROW\",\"appointmentTime\":\"10:00\",\"duration\":30,\"treatmentId\":\"$TREAT\",\"note\":\"smoke\"}"
APPT="$(id_of)"
req POST /appointment/addAppointment 409 'already has an appointment' "${JSON[@]}" -d "{\"patientId\":\"$PAT\",\"doctorId\":\"$DOC\",\"appointmentDate\":\"$TOMORROW\",\"appointmentTime\":\"10:15\"}"
req PUT  "/appointment/updateAppointment/$APPT" 200 '"status":"visit"' "${JSON[@]}" -d "{\"patientId\":\"$PAT\",\"doctorId\":\"$DOC\",\"appointmentDate\":\"$TOMORROW\",\"appointmentTime\":\"10:00\",\"duration\":30,\"treatmentId\":\"$TREAT\",\"status\":\"visit\"}"
req GET  /appointment/getAppointments 200 "$APPT"

echo "== Visits (OPD)"
req POST /opdMaster/addOPDMaster 200 '"Status"' "${JSON[@]}" -d "{\"patientId\":\"$PAT\",\"doctorId\":\"$DOC\",\"date\":\"$TODAY\",\"statusId\":\"$STATUS\",\"treatmentId\":\"$TREAT\",\"remark\":\"smoke\",\"bloodPressure\":\"120/80\"}"
OPD="$(id_of)"
req GET  "/opdMaster/getOPDMaster?search=Smoke&limit=10" 200 "$OPD"
req PUT  "/opdMaster/updateOPDMaster/$OPD" 200 'updated' "${JSON[@]}" -d "{\"patientId\":\"$PAT\",\"doctorId\":\"$DOC\",\"date\":\"$TODAY\",\"statusId\":\"$STATUS\",\"remark\":\"edited\"}"

echo "== Transactions / payments"
req POST /transaction/addTransaction 400 'greater than 0' "${JSON[@]}" -d "{\"patientId\":\"$PAT\",\"paymentById\":\"$PAYMODE\",\"amount\":0}"
req POST /transaction/addTransaction 200 '"paymentType":"Debit"' "${JSON[@]}" -d "{\"patientId\":\"$PAT\",\"paymentType\":\"Debit\",\"paymentById\":\"$PAYMODE\",\"amount\":3000,\"paymentDateTime\":\"${TODAY}T11:30\",\"remark\":\"smoke charge\"}"
TX="$(id_of)"
req POST /transaction/addTransaction 200 '"paymentType":"Credit"' "${JSON[@]}" -d "{\"patientId\":\"$PAT\",\"paymentType\":\"Credit\",\"paymentById\":\"$PAYMODE\",\"amount\":1000,\"paymentDateTime\":\"${TODAY}T12:00\"}"
TX2="$(id_of)"
req GET  "/transaction/getPatientBalance/$PAT" 200 '"outstandingBalance":1500'   # 3000 debit - (500 reg fee + 1000) credit
req GET  "/transaction/getTransactions?paymentType=Credit&limit=10" 200 '"totalCredits"'
req GET  "/transaction/getTransactions?search=Smoke&limit=all" 200 "$TX"
req PUT  "/transaction/updateTransaction/$TX" 200 '2000' "${JSON[@]}" -d "{\"patientId\":\"$PAT\",\"paymentType\":\"Debit\",\"paymentById\":\"$PAYMODE\",\"amount\":2000}"
req POST /transaction/bulkDelete 200 'deleted' "${JSON[@]}" -d "{\"ids\":[\"$TX2\"]}"

echo "== Dashboard"
req GET  "/dashboard/stats?startDate=$TODAY&endDate=$TODAY" 200 '"todayCollection"'
[[ "$BODY" == *"$PAT"* ]] && echo "  PASS  dashboard lists today's patient" || { echo "  FAIL  patient missing on dashboard"; FAIL=$((FAIL+1)); }
req GET  "/dashboard/patient-visit-payment?patientId=$PAT&date=$TODAY" 200 '"visit"'
req GET  "/patient/detail/$PAT" 200 '"relatedPatients"'
for key in appointments opds transactions; do [[ "$BODY" == *"\"$key\""* ]] || { echo "  FAIL  detail missing $key"; FAIL=$((FAIL+1)); }; done

echo "== Cleanup / delete rules"
req DELETE "/doctor/deleteDoctor/$DOC" 409 'used by other records'
req DELETE "/appointment/deleteAppointment/$APPT" 200 'cancelled'
req DELETE "/transaction/deleteTransaction/$TX" 200 'deleted'
req DELETE "/opdMaster/deleteOPDMaster/$OPD" 200 'deleted'
req DELETE "/patient/deletePatient/$PAT" 200 'deleted'
req DELETE "/doctor/deleteDoctor/$DOC" 200 'deleted'
req DELETE "/treatment/deleteTreatment/$TREAT" 200 'deleted'
req GET  /does/not/exist 404 'Endpoint not found'

echo; echo "Result: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
