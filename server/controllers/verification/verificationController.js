const path         = require('path');
const Certificate  = require('../../models/application/certificateApplicationSchema');
const Citizen      = require('../../models/citizenDetails/citizenSchema');
const DocumentRule = require('../../models/verification/DocumentRule');
const { runOcrDigits, runOcrFullText, runOcrAlphanumeric } = require('../../utils/ocr');
const uploadsBase = path.resolve(__dirname, '../../uploads/applications');


exports.checkApplication = async (req, res) => {
    try {
        // ─── 1. Load application & normalize Aadhaar / look up citizen ───
        const app = await Certificate.findById(req.params.id);
        if (!app) return res.status(404).json({ error: 'Application not found' });

        const details = Object.fromEntries(app.extractedDetails);

// 0️⃣ Build a normalizedAadhaar by checking extractedDetails _and_ OCR’ing the PDF if needed
        let rawAadhaar =
            details.aadharNumber   ??
            details.aadhar_number  ??
            details.Aadhaar_Card   ??
            details.AadhaarNumber  ??
            details.aadhaar        ??
            "";

// strip everything except digits
        rawAadhaar = rawAadhaar.replace(/\D+/g, "");

// if it wasn’t 12 digits, try OCR on the actual PDF upload
        let normalizedAadhaar = rawAadhaar.length === 12 ? rawAadhaar : "";

        if (!normalizedAadhaar) {
            // find the uploaded Aadhaar file
            const aadhaarFile = (app.flatFiles || [])
                .find(fn => /aadhar/i.test(fn));
            if (aadhaarFile) {
                try {
                    normalizedAadhaar = await runOcrDigits(
                        path.join(uploadsBase, aadhaarFile)
                    );
                } catch (e) {
                    console.error("Aadhaar OCR fallback failed:", e);
                }
            }
        }

// now normalizedAadhaar is either a 12-digit string or still ""
        console.log("looking up citizen by Aadhaar:", normalizedAadhaar);

        let citizen = normalizedAadhaar
            ? await Citizen.findOne({ aadharNumber: normalizedAadhaar })
            : null;

// fall back to name+dob if we still don’t have a citizen
        if (!citizen) {
            const first = (details.first_name || "").trim().toLowerCase();
            const last  = (details.last_name  || "").trim().toLowerCase();
            const dob   = (details.dob         || "").trim();
            if (first && last && dob) {
                citizen = await Citizen.findOne({
                    first_name: first,
                    last_name:  last,
                    dob:         dob
                });
            }
        }

        if (!citizen) {
            return res.json({
                eligible: false,
                mismatchReasons: ['No master citizen record found']
            });
        }


// ─── 3. Load DocumentRule & proceed ─────────────────────────────────
        const rule = await DocumentRule.findOne({ docType: app.documentType });
        console.log("Loaded rule:", rule);
        if (!rule) {
            return res.status(400).json({ error: 'No rule defined for this document type' });
        }

        const proofs = rule.requiredDocs.get('required_documents') || []

        const mismatches = [];
        let passedChecks = 0;
        const totalChecks = proofs.length;

        if (proofs.length === 0) {
            console.warn("Warning: rule for", app.documentType, "has no proofs defined");
        }

        // ─── 4. Iterate over each required proof ──────────────────────

        for (const proofKey of proofs) {

            const mapKey = proofKey.replace(/\s+/g, '_')
            const fileList = app.files.get(mapKey)   // if you used a JS Map
                || app.files[proofKey]

            if (!Array.isArray(fileList) || fileList.length === 0) {
                mismatches.push(`Missing upload for "${proofKey}"`)
                continue
            }

            // b) Build full path
            const pdfPath = path.join(uploadsBase, fileList[0])

            // c) Handle each proof type
            switch (proofKey) {
                // ───── Age Proof (e.g. Senior Citizen Certificate) ───────────────
                case 'Age Proof': {
                    const [dd,mm,yyyy] = citizen.dob.split('-').map(Number);
                    const birth  = new Date(yyyy,mm-1,dd);
                    const today  = new Date();
                    let age = today.getFullYear() - birth.getFullYear();
                    if (
                        today.getMonth()<birth.getMonth() ||
                        (today.getMonth()===birth.getMonth() && today.getDate()<birth.getDate())
                    ) age--;
                    // Senior Citizen needs ≥60
                    if (age>=60) passedChecks++;
                    else mismatches.push(`Applicant is ${age} yrs old (<60 required)`);
                    break;
                }
                // ───── Aadhaar Card ────────────────────────────────────────────────
                case 'Aadhaar Card': {
                    let aadhaar = details.aadharNumber || details.Aadhaar_Card || '';
                    if (!aadhaar) {
                        try { aadhaar = await runOcrDigits(pdfPath); }
                        catch { mismatches.push('Could not OCR Aadhaar'); break; }
                    }
                    if (aadhaar === citizen.aadharNumber) passedChecks++;
                    else mismatches.push('Aadhaar number mismatch');
                    break;
                }

                // ───── Identity Proof (can reuse Aadhaar) ─────────────────────────
                case "Identity Proof": {
                    let idNum = details.aadharNumber || '';
                    if (!idNum) {
                        try { idNum = await runOcrDigits(pdfPath); }
                        catch { mismatches.push('Could not OCR Identity Proof'); break; }
                    }
                    if (idNum === citizen.aadharNumber) passedChecks++;
                    else mismatches.push('Identity Proof mismatch');
                    break;
                }


                // ───── Address Proof (can reuse Aadhaar) ──────────────────────────
                case "Address Proof": {
                    let addrNum = details.aadharNumber || '';
                    if (!addrNum) {
                        try { addrNum = await runOcrDigits(pdfPath); }
                        catch { mismatches.push('Could not OCR Address Proof'); break; }
                    }
                    if (addrNum === citizen.aadharNumber) passedChecks++;
                    else mismatches.push('Address Proof mismatch');
                    break;
                }


                // ───── Parent's Identity Proof ────────────────────────────────────
                case "Parent's Identity Proof": {
                    // Extract parent name from details or via OCR of the ID
                    let parentName = details.father_name || details.mother_name || '';
                    if (!parentName) {
                        try { parentName = await runOcrFullText(pdfPath); }
                        catch { mismatches.push("Could not OCR Parent's ID"); break; }
                    }
                    // Simple substring match
                    if (parentName.toLowerCase().includes(citizen.father_name.toLowerCase()) ||
                        parentName.toLowerCase().includes(citizen.mother_name.toLowerCase())) {
                        passedChecks++;
                    } else {
                        mismatches.push("Parent's Identity mismatch");
                    }
                    break;
                }

                // ───── Parent's Address Proof ────────────────────────────────────
                case "Parent's Address Proof": {
                    // You might OCR full text & look for city, pincode, etc.
                    let raw = '';
                    try { raw = await runOcrFullText(pdfPath); }
                    catch { mismatches.push("Could not OCR Parent's Address"); break; }
                    if (raw.includes(citizen.address.split(',')[0])) passedChecks++;
                    else mismatches.push("Parent's Address mismatch");
                    break;
                }

                // ───── Parent's Marriage Certificate ──────────────────────────────
                case "Parent's Marriage Certificate": {
                    // OCR & look for both parent names on the certificate
                    let raw = '';
                    try { raw = await runOcrFullText(pdfPath); }
                    catch { mismatches.push("Could not OCR Marriage Cert"); break; }
                    if (
                        raw.includes(citizen.father_name) &&
                        raw.includes(citizen.mother_name)
                    ) passedChecks++;
                    else mismatches.push("Marriage Certificate mismatch");
                    break;
                }

                // ───── Income Proof (e.g. Salary Slip) ────────────────────────────
                case "Salary Slip":
                case "Income Proof": {
                    let raw = '';
                    try { raw = await runOcrFullText(pdfPath); }
                    catch { mismatches.push("Could not OCR Income Proof"); break; }
                    // TODO: parse a salary number, compare to rule.minIncome from DocumentRule
                    passedChecks++; // stub
                    break;
                }

                // ───── Bank Statement ─────────────────────────────────────────────
                case "Bank Statement": {
                    let raw = '';
                    try { raw = await runOcrFullText(pdfPath); }
                    catch { mismatches.push("Could not OCR Bank Statement"); break; }
                    // TODO: verify account number or name matches
                    passedChecks++; // stub
                    break;
                }


                // ───── School Leaving Certificate ─────────────────────────────────
                case "School Leaving Certificate": {
                    let raw = '';
                    try { raw = await runOcrFullText(pdfPath); }
                    catch { mismatches.push("Could not OCR School Leaving"); break; }
                    // TODO: extract year and school name, compare to DocumentRule or citizen.age
                    passedChecks++; // stub
                    break;
                }

                // ───── Residence Proof ────────────────────────────────────────────
                case "Residence Proof": {
                    let raw = '';
                    try { raw = await runOcrFullText(pdfPath); }
                    catch { mismatches.push("Could not OCR Residence Proof"); break; }
                    if (raw.includes(citizen.address.split(',')[0])) passedChecks++;
                    else mismatches.push("Residence Proof mismatch");
                    break;
                }


                // ───── Caste Proof ────────────────────────────────────────────────
                case "Caste Proof": {
                    let raw = '';
                    try { raw = await runOcrFullText(pdfPath); }
                    catch { mismatches.push("Could not OCR Caste Proof"); break; }
                    // TODO: match citizen.caste against raw
                    passedChecks++; // stub
                    break;
                }

                // ───── Land Ownership Proof ───────────────────────────────────────
                case "Land Ownership Proof": {
                    let raw = '';
                    try { raw = await runOcrFullText(pdfPath); }
                    catch { mismatches.push("Could not OCR Land Proof"); break; }
                    // TODO: verify survey number, address
                    passedChecks++; // stub
                    break;
                }

                // ───── Rent Agreement ─────────────────────────────────────────────
                case "Rent Agreement": {
                    let raw = '';
                    try { raw = await runOcrFullText(pdfPath); }
                    catch { mismatches.push("Could not OCR Rent Agreement"); break; }
                    // TODO: verify tenant name, address
                    passedChecks++; // stub
                    break;
                }

                // ───── Electricity Bill ──────────────────────────────────────────
                case "Electricity Bill": {
                    let raw = '';
                    try { raw = await runOcrFullText(pdfPath); }
                    catch { mismatches.push("Could not OCR Electricity Bill"); break; }
                    if (raw.includes(citizen.address.split(',')[0])) passedChecks++;
                    else mismatches.push("Electricity Bill mismatch");
                    break;
                }

                // ───── Employer Details ──────────────────────────────────────────
                case "Employer Details": {
                    let raw = '';
                    try { raw = await runOcrFullText(pdfPath); }
                    catch { mismatches.push("Could not OCR Employer Details"); break; }
                    // TODO: verify company name matches rule.employerName
                    passedChecks++; // stub
                    break;
                }

                // ───── Factory Layout Plan ───────────────────────────────────────
                case "Factory Layout Plan": {
                    // might not require OCR; just check file presence
                    passedChecks++;
                    break;
                }

                // ───── Manufacturer Approval / Technical Specification ──────────
                case "Manufacturer Approval":
                case "Technical Specification": {
                    // stub
                    passedChecks++;
                    break;
                }

                default:
                    mismatches.push(`No check implemented for "${proofKey}"`);
            }
        }

        // 5️⃣ Final eligibility
        const eligible = mismatches.length === 0;
        return res.json({ eligible, mismatchReasons: mismatches });
    }
    catch (err) {
        console.error('checkApplication error:', err);
        return res.status(500).json({ error:'Server error' });
    }
};