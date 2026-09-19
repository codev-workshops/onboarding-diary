# Traceability matrix

Requirement identifiers follow `docs/REQUIREMENTS.md`.

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Recruit registration (recruit role only) | `AuthController.signup`, `UserService.register`, `templates/signup.html` | `AuthenticationIT.publicSignupAlwaysCreatesRecruitAndHashesPassword` |
| Login / logout with BCrypt | `SecurityConfig`, `AppUserDetailsService`, `templates/login.html` | `AuthenticationIT.activeUserCanLogIn`, `wrongPasswordIsRejected` |
| Disabled accounts blocked | `AppUserDetails.isEnabled`, `User.active` | `AuthenticationIT.disabledUserCannotLogIn` |
| Profile view/update, password change | `ProfileController`, `UserService.updateProfile/changePassword`, `templates/profile.html` | `DiaryFlowIT.profileUpdateAndPasswordChangeWork` |
| Task CRUD | `TaskController`, `TaskApiController`, `TaskService`, `templates/tasks/*` | `DiaryFlowIT.taskCreateUpdateDeleteRoundTrip`, `ApiIT.taskApiSupportsFullCrud` |
| Issue CRUD | `IssueController`, `IssueApiController`, `IssueService`, `templates/issues/*` | `DiaryFlowIT.issuesFeedbackAndNotesCanBeCreated`, `ApiIT.listEndpointsAreScopedToTheCaller` |
| Feedback CRUD | `FeedbackController`, `FeedbackApiController`, `FeedbackService`, `templates/feedback/*` | `DiaryFlowIT.issuesFeedbackAndNotesCanBeCreated` |
| Note CRUD | `NoteController`, `NoteApiController`, `NoteService`, `templates/notes/*` | `DiaryFlowIT.issuesFeedbackAndNotesCanBeCreated` |
| Records scoped to their owner | `AuthorizationService`, `*Repository.findByIdAndUserId` | `AuthorizationIT.recruitCannotReadAnotherRecruitsTask`, `recruitCannotEditOrDeleteAnotherRecruitsTask` |
| Filtering by date/status/category/type | `TaskFilter`, `IssueFilter`, `FeedbackFilter`, `NoteFilter` + specifications | `DiaryFlowIT.recruitSeesOnlyOwnEntriesOnEveryListPage`, `ReportIT.typeFilterLimitsSections` |
| Dashboard metrics and charts | `DashboardService`, `templates/dashboard.html`, `static/js/dashboard.js` | `DiaryFlowIT.dashboardShowsCompletionAndOpenIssueCounts`, `ApiIT.dashboardEndpointReturnsAnalytics` |
| Overdue/stale highlighting (extension) | `DashboardService.OVERDUE_AFTER_DAYS`, task list/dashboard templates | `DiaryFlowIT.dashboardShowsCompletionAndOpenIssueCounts` (overdue count) |
| Cross-category search (extension) | `SearchService`, `SearchController`, `SearchApiController`, `templates/search.html` | `DiaryFlowIT.crossCategorySearchMatchesEveryCategoryAndStaysScoped`, `ApiIT.searchApiReturnsEveryCategory` |
| CSV report | `ReportService`, `CsvReportWriter`, `ReportController` | `ReportIT.csvDownloadContainsOnlyEntriesInsideTheDateRange`, `CsvReportWriterTest` |
| PDF report | `PdfReportWriter` (PDFBox, paginated) | `ReportIT.pdfDownloadIsAValidPdf` |
| Report scope for managers/admins | `ReportService.build` → `AuthorizationService.requireReadAccess` | `ReportIT.managerCanReportOnOwnTeamOnly`, `adminCanReportOnAnyoneAndRecruitOnlyOnThemselves`, `recruitCannotDownloadSomeoneElsesReport` |
| Manager recruit list and detail | `ManagerController`, `templates/manager/*` | `AuthorizationIT.managerCanOnlySeeOwnTeam` |
| Admin user management | `AdminController`, `UserService.createByAdmin/setActive/assignManager`, `templates/admin/users.html` | `AdminIT` (4 tests) |
| Role-based route protection | `SecurityConfig` matchers | `AuthorizationIT.adminCanSeeAnyRecruitAndManagerAreaIsClosedToRecruits` |
| Validation rules (all fields) | `web/dto/*Form` constraints, mirrored in templates and DB constraints | `FormValidationTest`, `DiaryFlowIT.invalidTaskIsRejectedServerSideAndNotPersisted`, `ApiIT.apiValidationErrorsAreReportedPerField` |
| JSON API returns DTOs only | `web/dto` records, `DtoMapper` | `ApiIT.meEndpointReturnsSafeProfileWithoutPasswordHash` |
| API error contract | `ApiExceptionHandler` | `ApiIT.apiValidationErrorsAreReportedPerField`, `malformedBodyIsRejected`, `apiRequiresAuthentication` |
| CSRF protection | `SecurityConfig` (default CSRF), POST forms | `AuthorizationIT.stateChangingRequestsRequireCsrf` |
| Schema managed by Flyway | `db/migration/V1__init_schema.sql` | Applied to an empty PostgreSQL 17 database during runtime verification |
| Secrets from the environment | `application.yml`, `.env.example`, `.gitignore` | No credentials in the repository; demo password is an overridable dev default |
