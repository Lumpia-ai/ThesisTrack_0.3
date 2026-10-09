# ThesisTrack Full Data Dictionary

This document details the exact structure, data types, constraints, and foreign key relationships for all 40 tables in the system. It is automatically generated from the official SQL schema.

## Table: `academic_years`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`academic_year_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`year_label`** | `character` | NULL | - | - |
| **`start_date`** | `date` | NULL | - | - |
| **`end_date`** | `date` | NULL | - | - |
| **`is_active`** | `boolean` | NULL | `false` | - |

---

## Table: `departments`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`department_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`department_name`** | `character` | NOT NULL | - | - |
| **`department_code`** | `character` | NULL | - | - |
| **`description`** | `text` | NULL | - | - |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |
| **`updated_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `password_reset_tokens`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`reset_token_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`user_id`** | `uuid` | **PK**, **FK** | - | `users.user_id` |
| **`token`** | `text` | NULL | - | - |
| **`expires_at`** | `timestamp` | NULL | - | - |
| **`is_used`** | `boolean` | NULL | `false` | - |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `permissions`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`permission_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`permission_name`** | `character` | NOT NULL | - | - |
| **`module`** | `character` | NULL | - | - |
| **`action`** | `character` | NULL | - | - |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `role_permissions`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`role_permission_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`role_id`** | `uuid` | **PK**, **FK** | - | `roles.role_id` |
| **`permission_id`** | `uuid` | **PK**, **FK** | - | `permissions.permission_id` |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `roles`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`role_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`role_name`** | `character` | NOT NULL | - | - |
| **`role_description`** | `text` | NULL | - | - |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |
| **`updated_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `semesters`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`semester_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`academic_year_id`** | `uuid` | **PK**, **FK** | - | `academic_years.academic_year_id` |
| **`semester_name`** | `character` | NULL | - | - |
| **`semester_code`** | `character` | NULL | - | - |
| **`start_date`** | `date` | NULL | - | - |
| **`end_date`** | `date` | NULL | - | - |
| **`is_active`** | `boolean` | NULL | `false` | - |

---

## Table: `user_sessions`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`session_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`user_id`** | `uuid` | **PK**, **FK** | - | `users.user_id` |
| **`session_token`** | `text` | NULL | - | - |
| **`ip_address`** | `character` | NULL | - | - |
| **`user_agent`** | `text` | NULL | - | - |
| **`login_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |
| **`logout_at`** | `timestamp` | NULL | - | - |
| **`is_active`** | `boolean` | NULL | `true` | - |

---

## Table: `users`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`user_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`department_id`** | `uuid` | **PK**, **FK** | - | `departments.department_id` |
| **`role_id`** | `uuid` | **PK**, **FK** | - | `roles.role_id` |
| **`email`** | `character` | NOT NULL | - | - |
| **`password_hash`** | `text` | NULL | - | - |
| **`name`** | `character` | NULL | - | - |
| **`first_name`** | `character` | NULL | - | - |
| **`last_name`** | `character` | NULL | - | - |
| **`contact_number`** | `character` | NULL | - | - |
| **`address`** | `text` | NULL | - | - |
| **`birth_date`** | `date` | NULL | - | - |
| **`profile_image`** | `text` | NULL | - | - |
| **`display_name`** | `character` | NULL | - | - |
| **`auth_provider`** | `character` | NULL | `'local'::character varying` | - |
| **`provider_account_id`** | `character` | NULL | - | - |
| **`email_verified`** | `boolean` | NULL | `false` | - |
| **`is_suspended`** | `boolean` | NULL | `false` | - |
| **`suspended_at`** | `timestamp` | NULL | - | - |
| **`last_login_at`** | `timestamp` | NULL | - | - |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |
| **`updated_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `document_versions`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`document_version_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`document_id`** | `uuid` | **PK**, **FK** | - | `project_documents.document_id` |
| **`version_no`** | `integer` | NULL | - | - |
| **`file_name`** | `character` | NULL | - | - |
| **`file_path`** | `text` | NULL | - | - |
| **`mime_type`** | `character` | NULL | - | - |
| **`change_description`** | `text` | NULL | - | - |
| **`uploaded_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`uploaded_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `milestone_submissions`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`submission_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`milestone_id`** | `uuid` | **PK**, **FK** | - | `milestones.milestone_id` |
| **`submitted_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`submission_date`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |
| **`remarks`** | `text` | NULL | - | - |
| **`status`** | `character` | NULL | - | - |

---

## Table: `milestones`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`milestone_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`project_id`** | `uuid` | **PK**, **FK** | - | `projects.project_id` |
| **`title`** | `character` | NULL | - | - |
| **`description`** | `text` | NULL | - | - |
| **`due_date`** | `date` | NULL | - | - |
| **`status`** | `character` | NULL | - | - |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |
| **`updated_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `project_advisers`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`project_adviser_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`project_id`** | `uuid` | **PK**, **FK** | - | `projects.project_id` |
| **`user_id`** | `uuid` | **PK**, **FK** | - | `users.user_id` |
| **`adviser_role`** | `character` | NULL | - | - |
| **`assigned_at`** | `date` | NULL | - | - |
| **`is_primary`** | `boolean` | NULL | `false` | - |

---

## Table: `project_documents`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`document_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`project_id`** | `uuid` | **PK**, **FK** | - | `projects.project_id` |
| **`uploaded_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`document_type`** | `character` | NULL | - | - |
| **`title`** | `character` | NULL | - | - |
| **`file_name`** | `character` | NULL | - | - |
| **`file_path`** | `text` | NULL | - | - |
| **`mime_type`** | `character` | NULL | - | - |
| **`description`** | `text` | NULL | - | - |
| **`uploaded_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |
| **`is_latest`** | `boolean` | NULL | `true` | - |

---

## Table: `project_members`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`project_member_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`project_id`** | `uuid` | **PK**, **FK** | - | `projects.project_id` |
| **`user_id`** | `uuid` | **PK**, **FK** | - | `users.user_id` |
| **`role_in_project`** | `character` | NULL | - | - |
| **`join_date`** | `date` | NULL | - | - |
| **`is_active`** | `boolean` | NULL | `true` | - |

---

## Table: `projects`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`project_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`department_id`** | `uuid` | **PK**, **FK** | - | `departments.department_id` |
| **`academic_year_id`** | `uuid` | **PK**, **FK** | - | `academic_years.academic_year_id` |
| **`semester_id`** | `uuid` | **PK**, **FK** | - | `semesters.semester_id` |
| **`created_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`title`** | `text` | NOT NULL | - | - |
| **`abstract`** | `text` | NULL | - | - |
| **`keywords`** | `text` | NULL | - | - |
| **`category`** | `character` | NULL | - | - |
| **`status`** | `character` | NULL | `'pending'::character varying` | - |
| **`stage`** | `character` | NULL | - | - |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |
| **`updated_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `defense_documents`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`defense_document_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`schedule_id`** | `uuid` | **PK**, **FK** | - | `defense_schedules.schedule_id` |
| **`document_type`** | `character` | NULL | - | - |
| **`file_name`** | `character` | NULL | - | - |
| **`file_path`** | `text` | NULL | - | - |
| **`uploaded_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`uploaded_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `defense_panels`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`panel_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`schedule_id`** | `uuid` | **PK**, **FK** | - | `defense_schedules.schedule_id` |
| **`user_id`** | `uuid` | **PK**, **FK** | - | `users.user_id` |
| **`panel_role`** | `character` | NULL | - | - |

---

## Table: `defense_results`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`defense_result_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`schedule_id`** | `uuid` | **PK**, **FK** | - | `defense_schedules.schedule_id` |
| **`overall_decision`** | `character` | NULL | - | - |
| **`remarks`** | `text` | NULL | - | - |
| **`approved_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`approved_at`** | `timestamp` | NULL | - | - |

---

## Table: `defense_schedules`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`schedule_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`project_id`** | `uuid` | **PK**, **FK** | - | `projects.project_id` |
| **`academic_year_id`** | `uuid` | **PK**, **FK** | - | `academic_years.academic_year_id` |
| **`semester_id`** | `uuid` | **PK**, **FK** | - | `semesters.semester_id` |
| **`schedule_date`** | `date` | NULL | - | - |
| **`start_time`** | `time` | NULL | - | - |
| **`end_time`** | `time` | NULL | - | - |
| **`venue`** | `character` | NULL | - | - |
| **`status`** | `character` | NULL | - | - |
| **`created_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `evaluation_attachments`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`attachment_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`evaluation_id`** | `uuid` | **PK**, **FK** | - | `evaluations.evaluation_id` |
| **`file_name`** | `character` | NULL | - | - |
| **`file_path`** | `text` | NULL | - | - |
| **`file_type`** | `character` | NULL | - | - |
| **`uploaded_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `evaluations`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`evaluation_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`schedule_id`** | `uuid` | **PK**, **FK** | - | `defense_schedules.schedule_id` |
| **`evaluator_id`** | `uuid` | **PK**, **FK** | - | `users.user_id` |
| **`rubric_id`** | `uuid` | **PK**, **FK** | - | `rubrics.rubric_id` |
| **`score`** | `numeric(52)` | NULL | - | - |
| **`remarks`** | `text` | NULL | - | - |
| **`submitted_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `grades`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`grade_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`evaluation_id`** | `uuid` | **PK**, **FK** | - | `evaluations.evaluation_id` |
| **`final_grade`** | `character` | NULL | - | - |
| **`equivalent`** | `character` | NULL | - | - |
| **`encoded_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`updated_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `rubric_criteria`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`criterion_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`rubric_id`** | `uuid` | **PK**, **FK** | - | `rubrics.rubric_id` |
| **`criteria_description`** | `text` | NULL | - | - |
| **`weight_percentage`** | `numeric(52)` | NULL | - | - |
| **`order_no`** | `integer` | NULL | - | - |
| **`is_active`** | `boolean` | NULL | `true` | - |

---

## Table: `rubrics`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`rubric_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`name`** | `character` | NULL | - | - |
| **`description`** | `text` | NULL | - | - |
| **`is_active`** | `boolean` | NULL | `true` | - |

---

## Table: `archive_access_logs`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`access_log_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`library_archive_id`** | `uuid` | **PK**, **FK** | - | `library_archives.library_archive_id` |
| **`accessed_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`access_date`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |
| **`purpose`** | `text` | NULL | - | - |

---

## Table: `archive_requests`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`archive_request_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`repository_record_id`** | `uuid` | **PK**, **FK** | - | `repository_records.repository_record_id` |
| **`requested_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`request_date`** | `date` | NULL | - | - |
| **`purpose`** | `text` | NULL | - | - |
| **`status`** | `character` | NULL | - | - |
| **`processed_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`processed_at`** | `timestamp` | NULL | - | - |

---

## Table: `final_manuscripts`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`final_manuscript_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`repository_record_id`** | `uuid` | **PK**, **FK** | - | `repository_records.repository_record_id` |
| **`title`** | `text` | NULL | - | - |
| **`file_path`** | `text` | NULL | - | - |
| **`approved_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`approved_at`** | `timestamp` | NULL | - | - |
| **`copyright_status`** | `character` | NULL | - | - |
| **`license_type`** | `character` | NULL | - | - |
| **`embargo_until`** | `date` | NULL | - | - |

---

## Table: `library_archives`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`library_archive_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`repository_record_id`** | `uuid` | **PK**, **FK** | - | `repository_records.repository_record_id` |
| **`archive_code`** | `character` | NULL | - | - |
| **`location`** | `character` | NULL | - | - |
| **`archive_date`** | `date` | NULL | - | - |
| **`remarks`** | `text` | NULL | - | - |

---

## Table: `repository_files`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`repository_file_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`repository_record_id`** | `uuid` | **PK**, **FK** | - | `repository_records.repository_record_id` |
| **`file_name`** | `character` | NULL | - | - |
| **`file_path`** | `text` | NULL | - | - |
| **`file_type`** | `character` | NULL | - | - |
| **`file_size`** | `bigint` | NULL | - | - |
| **`version_no`** | `integer` | NULL | - | - |
| **`is_main`** | `boolean` | NULL | `false` | - |
| **`uploaded_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`uploaded_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `repository_records`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`repository_record_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`project_id`** | `uuid` | **PK**, **FK** | - | `projects.project_id` |
| **`title`** | `text` | NULL | - | - |
| **`abstract`** | `text` | NULL | - | - |
| **`keywords`** | `text` | NULL | - | - |
| **`status`** | `character` | NULL | - | - |
| **`visibility`** | `character` | NULL | - | - |
| **`published_at`** | `timestamp` | NULL | - | - |
| **`archived_at`** | `timestamp` | NULL | - | - |
| **`archived_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |
| **`updated_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `collaboration_interest`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`collaboration_interest_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`partner_id`** | `uuid` | **PK**, **FK** | - | `industry_partners.partner_id` |
| **`industry_project_id`** | `uuid` | **PK**, **FK** | - | `industry_projects.industry_project_id` |
| **`interest_type`** | `character` | NULL | - | - |
| **`description`** | `text` | NULL | - | - |
| **`submitted_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |
| **`status`** | `character` | NULL | - | - |

---

## Table: `collaboration_outcomes`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`collaboration_outcome_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`industry_project_id`** | `uuid` | **PK**, **FK** | - | `industry_projects.industry_project_id` |
| **`outcome_type`** | `character` | NULL | - | - |
| **`description`** | `text` | NULL | - | - |
| **`date_achieved`** | `date` | NULL | - | - |
| **`status`** | `character` | NULL | - | - |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `impact_feedback_records`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`impact_feedback_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`industry_project_id`** | `uuid` | **PK**, **FK** | - | `industry_projects.industry_project_id` |
| **`feedback_type`** | `character` | NULL | - | - |
| **`feedback_description`** | `text` | NULL | - | - |
| **`rating`** | `integer` | NULL | - | - |
| **`feedback_date`** | `date` | NULL | - | - |
| **`submitted_by`** | `uuid` | **FK** | - | `users.user_id` |

---

## Table: `industry_partners`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`partner_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`partner_name`** | `character` | NULL | - | - |
| **`contact_person`** | `character` | NULL | - | - |
| **`"position"`** | `character` | NULL | - | - |
| **`email`** | `character` | NULL | - | - |
| **`contact_number`** | `character` | NULL | - | - |
| **`address`** | `text` | NULL | - | - |
| **`partner_type`** | `character` | NULL | - | - |
| **`website`** | `character` | NULL | - | - |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |
| **`updated_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `industry_projects`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`industry_project_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`partner_id`** | `uuid` | **PK**, **FK** | - | `industry_partners.partner_id` |
| **`project_id`** | `uuid` | **PK**, **FK** | - | `projects.project_id` |
| **`title`** | `text` | NULL | - | - |
| **`description`** | `text` | NULL | - | - |
| **`start_date`** | `date` | NULL | - | - |
| **`end_date`** | `date` | NULL | - | - |
| **`status`** | `character` | NULL | - | - |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |
| **`updated_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `audit_logs`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`audit_log_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`user_id`** | `uuid` | **PK**, **FK** | - | `users.user_id` |
| **`action`** | `character` | NULL | - | - |
| **`module`** | `character` | NULL | - | - |
| **`table_name`** | `character` | NULL | - | - |
| **`record_id`** | `uuid` | **PK** | - | - |
| **`old_values`** | `text` | NULL | - | - |
| **`new_values`** | `text` | NULL | - | - |
| **`ip_address`** | `character` | NULL | - | - |
| **`user_agent`** | `text` | NULL | - | - |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `notification_read_logs`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`notification_read_log_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`notification_id`** | `uuid` | **PK**, **FK** | - | `notifications.notification_id` |
| **`user_id`** | `uuid` | **PK**, **FK** | - | `users.user_id` |
| **`read_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `notifications`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`notification_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`user_id`** | `uuid` | **PK**, **FK** | - | `users.user_id` |
| **`title`** | `character` | NULL | - | - |
| **`message`** | `text` | NULL | - | - |
| **`type`** | `character` | NULL | - | - |
| **`reference_id`** | `uuid` | **PK** | - | - |
| **`reference_type`** | `character` | NULL | - | - |
| **`is_read`** | `boolean` | NULL | `false` | - |
| **`created_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

## Table: `system_settings`

| Field Name | Data Type | Constraints | Default Value | Foreign Key Reference |
|---|---|---|---|---|
| **`setting_id`** | `uuid` | **PK**, NOT NULL | `gen_random_uuid() NOT NULL` | - |
| **`setting_key`** | `character` | NULL | - | - |
| **`setting_value`** | `text` | NULL | - | - |
| **`description`** | `text` | NULL | - | - |
| **`updated_by`** | `uuid` | **FK** | - | `users.user_id` |
| **`updated_at`** | `timestamp` | NULL | `CURRENT_TIMESTAMP` | - |

---

