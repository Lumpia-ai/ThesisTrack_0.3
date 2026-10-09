UPDATE "User"
SET "role" = 'research_head'::"UserRole"
WHERE "role" = 'admin'::"UserRole";
