-- A user can never be their own manager (TRD 3.3); the service also walks the
-- manager chain to reject longer cycles.
ALTER TABLE "User"
  ADD CONSTRAINT "User_managerId_not_self" CHECK ("managerId" IS NULL OR "managerId" <> "id");
