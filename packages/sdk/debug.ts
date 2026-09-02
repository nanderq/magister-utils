import { MagisterClient } from "magister-sdk";

function log(level: "info" | "warning" | "error", message: string) {
    console.log(`[${new Date().toISOString()}] [${level}] ${message}`);
}

function check(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(`Debug check failed: ${message}`);
}

const tenant = process.env.MAGISTER_TENANT;
const username = process.env.MAGISTER_USERNAME;
const password = process.env.MAGISTER_PASSWORD;

if (!tenant || !username || !password) {
    throw new Error("Set MAGISTER_TENANT, MAGISTER_USERNAME, and MAGISTER_PASSWORD");
}

log("info", "Starting Magister SDK debug");
const client = new MagisterClient(tenant, username, password);

log("info", "Checking for a stored session");
log("info", `Stored session available: ${await client.hasSession()}`);

log("info", "Ensuring session");
const ensuredSession = await client.ensureSession();
check(ensuredSession.accessToken, "ensureSession() returned no access token");
check(ensuredSession.baseUrl, "ensureSession() returned no base URL");

log("info", "Getting the current session");
const currentSession = await client.session();
check(currentSession.accessToken === ensuredSession.accessToken, "session() returned another access token");
check(currentSession.baseUrl === ensuredSession.baseUrl, "session() returned another base URL");

log("info", "Getting account");
const account = await client.account();
check(account.Persoon?.Id > 0, "account() returned no valid person ID");
log("info", "Account retrieved successfully");

log("info", "Getting all enrollments");
const enrollments = await client.enrollments(account.Persoon.Id);
check(Array.isArray(enrollments), "enrollments() did not return an array");
log("info", `Retrieved ${enrollments.length} enrollment(s)`);

log("info", "Getting the latest enrollment");
const latestEnrollment = await client.enrollments(account.Persoon.Id, { latest: true });
check(!Array.isArray(latestEnrollment), "enrollments({ latest: true }) returned an array");
check(latestEnrollment.id > 0, "latest enrollment has no valid ID");
log("info", "Latest enrollment retrieved successfully");

log("info", "Getting grades");
const grades = await client.grades(account.Persoon.Id);
check(Array.isArray(grades), "grades() did not return an array");
log("info", `Retrieved ${grades.length} grade(s)`);

log("info", "Getting assignments");
const assignments = await client.assignments(account.Persoon.Id);
check(Array.isArray(assignments), "assignments() did not return an array");
log("info", `Retrieved ${assignments.length} assignment(s)`);

const assignmentWithId = assignments.find((assignment) =>
    typeof assignment.Id === "number" && assignment.Id > 0);
if (assignmentWithId?.Id) {
    log("info", "Getting assignment details");
    const assignment = await client.assignment(account.Persoon.Id, assignmentWithId.Id);
    check(assignment.Id === assignmentWithId.Id, "assignment() returned another assignment");
    log("info", "Assignment details retrieved successfully");
} else {
    log("warning", "No assignment was available for the assignment detail check");
}

log("info", "Getting study guides");
const studyGuides = await client.studyGuides(account.Persoon.Id);
check(Array.isArray(studyGuides), "studyGuides() did not return an array");
log("info", `Retrieved ${studyGuides.length} study guide(s)`);

const studyGuideWithId = studyGuides.find((guide) => typeof guide.Id === "number" && guide.Id > 0);
if (studyGuideWithId?.Id) {
    log("info", "Getting study guide details");
    const studyGuide = await client.studyGuide(account.Persoon.Id, studyGuideWithId.Id);
    check(studyGuide.Id === studyGuideWithId.Id, "studyGuide() returned another study guide");
    log("info", "Study guide details retrieved successfully");

    const parts = studyGuide.Onderdelen?.Items ?? studyGuide.Onderdelen?.items ?? [];
    const partWithId = parts.find((part) => typeof part.Id === "number" && part.Id > 0);
    if (partWithId?.Id) {
        log("info", "Getting study guide part and files");
        const part = await client.studyGuidePart(
            account.Persoon.Id,
            studyGuideWithId.Id,
            partWithId.Id,
        );
        check(typeof part === "object", "studyGuidePart() did not return an object");
        const files = await client.studyGuideFiles(
            account.Persoon.Id,
            studyGuideWithId.Id,
            partWithId.Id,
        );
        check(Array.isArray(files), "studyGuideFiles() did not return an array");
        log("info", `Study guide part retrieved with ${files.length} file(s)`);
    } else {
        log("warning", "No study guide part was available for the part and file checks");
    }
} else {
    log("warning", "No study guide was available for detail checks");
}

log("info", "All non-destructive SDK debug checks passed");
