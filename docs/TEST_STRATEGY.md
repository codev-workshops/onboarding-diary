# Test strategy

## Layers

| Layer | Tooling | What it proves |
| --- | --- | --- |
| Unit | JUnit 5, AssertJ, Jakarta Validation | pure calculations (completion percentage), CSV writing/escaping, every form constraint |
| MVC / API | `@SpringBootTest` + MockMvc + Spring Security Test | routes, binding, server-side validation, redirects, JSON contracts, status codes |
| Security | MockMvc with `user(...)` / `formLogin()` / `csrf()` | authentication, role restrictions, per-record ownership, CSRF, anonymous redirects |
| Reporting | MockMvc + `ReportService` | date-range and type filtering, CSV contents, PDF validity, target-user scope |

Integration tests share `com.codev.onboardingdiary.support.IntegrationTest`, which builds a fixture of
admin, two managers, two managed recruits (one per manager), a disabled recruit, and diary entries in all
four categories. Tests are `@Transactional` and roll back.

Databases: tests run on H2 in PostgreSQL mode with Hibernate schema generation (fast, hermetic). Flyway
migrations are verified against PostgreSQL 17 by starting the application against an empty database
(`docker compose up -d` + `java -jar`), which is part of the release checklist.

## Coverage of the required scenarios

| Required scenario | Test |
| --- | --- |
| Recruit cannot edit/delete another recruit's task | `AuthorizationIT.recruitCannotEditOrDeleteAnotherRecruitsTask` |
| Recruit cannot read another recruit's record (UI + API) | `AuthorizationIT.recruitCannotReadAnotherRecruitsTask`, `ApiIT.apiRejectsCrossUserMutation` |
| Manager cannot access an unassigned recruit | `AuthorizationIT.managerCanOnlySeeOwnTeam`, `ReportIT.managerCanReportOnOwnTeamOnly` |
| Admin can access any recruit | `AuthorizationIT.adminCanSeeAnyRecruitAndManagerAreaIsClosedToRecruits`, `ReportIT.adminCanReportOnAnyoneAndRecruitOnlyOnThemselves` |
| Public registration cannot create Manager/Admin | `AuthenticationIT.publicSignupAlwaysCreatesRecruitAndHashesPassword` |
| Disabled user cannot log in | `AuthenticationIT.disabledUserCannotLogIn` |
| Invalid email / duplicate email | `AuthenticationIT.signupRejectsInvalidEmailAndShortPassword`, `signupRejectsDuplicateEmailCaseInsensitively`, `AdminIT.duplicateEmailIsRejectedWithFieldError` |
| Future diary date rejected | `FormValidationTest.futureDiaryDateIsRejected`, `DiaryFlowIT.invalidTaskIsRejectedServerSide...` |
| Required fields / oversized text | `FormValidationTest.requiredTaskFieldsAreEnforced`, `shortAndOversizedTaskTextIsRejected`, `feedbackAndNoteLimitsAreEnforced` |
| Completion percentage and open issue count | `DashboardCalculationTest`, `DiaryFlowIT.dashboardShowsCompletionAndOpenIssueCounts`, `ApiIT.dashboardEndpointReturnsAnalytics` |
| Report filtering and CSV contents | `ReportIT.csvDownloadContainsOnlyEntriesInsideTheDateRange`, `typeFilterLimitsSections`, `CsvReportWriterTest` |
| PDF generation | `ReportIT.pdfDownloadIsAValidPdf` |
| Cross-category search | `DiaryFlowIT.crossCategorySearchMatchesEveryCategoryAndStaysScoped`, `ApiIT.searchApiReturnsEveryCategory` |
| CSRF required for state changes | `AuthorizationIT.stateChangingRequestsRequireCsrf` |
| No password hash leaks in JSON | `ApiIT.meEndpointReturnsSafeProfileWithoutPasswordHash` |

## Running

```bash
mvn verify                                   # everything (50 tests)
mvn -Dtest=ReportIT test                     # single class
```
